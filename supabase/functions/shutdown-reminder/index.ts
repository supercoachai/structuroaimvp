/**
 * Cron-vriendelijke Edge Function: stuur web push naar gebruikers die vandaag (Europe/Amsterdam)
 * wel daily_checkins hebben maar nog geen daily_shutdowns.
 *
 * Secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (bijv. mailto:info@structuro.eu)
 *   SUPABASE_URL en SUPABASE_SERVICE_ROLE_KEY staan meestal al automatisch.
 *
 * Schedule (bijv. 20:30 Amsterdam = 19:30 UTC winter / 18:30 zomer): stel in onder Edge Functions → Schedules.
 */
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EndpointKind = "apple" | "fcm" | "windows" | "mozilla" | "unknown";

function todayAmsterdamYmd(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

function endpointKind(endpoint: string): EndpointKind {
  const ep = endpoint.toLowerCase();
  if (ep.includes("push.apple.com")) return "apple";
  if (ep.includes("fcm.googleapis.com") || ep.includes("googleapis.com/gcm")) return "fcm";
  if (ep.includes("wns.windows.com") || ep.includes("notify.windows.com")) return "windows";
  if (ep.includes("mozilla.com")) return "mozilla";
  return "unknown";
}

Deno.serve(async (req) => {
  try {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")!;
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")!;
  const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

  if (!vapidPublic || !vapidPrivate || !vapidSubject) {
    return new Response(
      JSON.stringify({ error: "VAPID_* secrets ontbreken" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  console.log(
    `[shutdown-reminder] VAPID env present. subject=${vapidSubject}, public_key_len=${vapidPublic.length}, public_key_prefix=${vapidPublic.slice(0, 12)}`
  );
  console.log(
    "[shutdown-reminder] Browser subscriptions are created with NEXT_PUBLIC_VAPID_PUBLIC_KEY (see src/utils/pushNotifications.ts). Ensure this exactly matches VAPID_PUBLIC_KEY in Edge secrets."
  );

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const supabase = createClient(supabaseUrl, supabaseKey);
  const today = todayAmsterdamYmd();

  const { data: checkins, error: checkErr } = await supabase
    .from("daily_checkins")
    .select("user_id")
    .eq("date", today);

  if (checkErr) {
    console.error("shutdown-reminder checkins:", checkErr);
    return new Response(JSON.stringify({ error: checkErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: shutdowns, error: shutErr } = await supabase
    .from("daily_shutdowns")
    .select("user_id")
    .eq("date", today);

  if (shutErr) {
    console.error("shutdown-reminder shutdowns:", shutErr);
    return new Response(JSON.stringify({ error: shutErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: allSubs, error: allSubsErr } = await supabase
    .from("push_subscriptions")
    .select("user_id");

  if (allSubsErr) {
    console.error("shutdown-reminder push_subscriptions:", allSubsErr);
    return new Response(JSON.stringify({ error: allSubsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: alreadySentRows, error: sentErr } = await supabase
    .from("shutdown_reminder_sends")
    .select("user_id")
    .eq("date", today);

  const sentTableMissing =
    Boolean(sentErr?.message) &&
    sentErr.message.toLowerCase().includes("shutdown_reminder_sends");
  if (sentErr && !sentTableMissing) {
    console.error("shutdown-reminder already-sent:", sentErr);
    return new Response(JSON.stringify({ error: sentErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (sentTableMissing) {
    console.warn(
      "[shutdown-reminder] shutdown_reminder_sends ontbreekt. Dedupe tijdelijk uit."
    );
  }

  const shutdownUserIds = new Set((shutdowns ?? []).map((s) => s.user_id));
  const checkinUserIds = new Set((checkins ?? []).map((c) => c.user_id));
  const alreadySentUserIds = new Set(
    sentTableMissing ? [] : (alreadySentRows ?? []).map((s) => s.user_id)
  );

  // Stuur naar iedereen met push subscriptions die nog geen dagafsluiting heeft
  // en vandaag nog geen shutdown-reminder heeft ontvangen.
  const userIds = [
    ...new Set(
      (allSubs ?? [])
        .map((s) => s.user_id)
        .filter(
          (id): id is string =>
            Boolean(id) && !shutdownUserIds.has(id) && !alreadySentUserIds.has(id)
        )
    ),
  ];

  let sent = 0;
  const errors: string[] = [];
  let totalSubscriptionsFetched = 0;
  const endpointTypeCounts: Record<EndpointKind, number> = {
    apple: 0,
    fcm: 0,
    windows: 0,
    mozilla: 0,
    unknown: 0,
  };

  for (const userId of userIds) {
    const { data: subs, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (subErr) {
      errors.push(`${userId}: ${subErr.message}`);
      continue;
    }
    const subCount = subs?.length ?? 0;
    totalSubscriptionsFetched += subCount;
    console.log(`[shutdown-reminder] user=${userId}: fetched_subscriptions=${subCount}`);

    let userHadSuccessfulPush = false;
    for (const sub of subs ?? []) {
      if (!sub.endpoint || !sub.p256dh || !sub.auth) continue;
      const kind = endpointKind(sub.endpoint);
      endpointTypeCounts[kind] += 1;
      console.log(
        `[shutdown-reminder] user=${userId} endpoint_type=${kind} endpoint=${sub.endpoint.slice(0, 90)}...`
      );

      const payload = JSON.stringify({
        title: "Dag afsluiten",
        body: "Neem even 2 minuten. Sluit je dag af en maak je hoofd leeg.",
        url: "/shutdown",
      });

      try {
        const response = await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        const status = (response as { statusCode?: number } | undefined)?.statusCode ?? 201;
        console.log(
          `[shutdown-reminder] push success user=${userId} endpoint_type=${kind} status=${status}`
        );
        sent++;
        userHadSuccessfulPush = true;
      } catch (e: unknown) {
        const statusCode =
          e && typeof e === "object" && "statusCode" in e
            ? (e as { statusCode: number }).statusCode
            : null;
        console.error(
          `[shutdown-reminder] push failed user=${userId} endpoint_type=${kind} status=${statusCode}`,
          sub.endpoint,
          e
        );
        if (statusCode === 410) {
          const { error: deleteErr } = await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
          if (deleteErr) {
            console.error(
              `[shutdown-reminder] failed to delete gone subscription endpoint=${sub.endpoint.slice(0, 90)}...`,
              deleteErr
            );
          } else {
            console.log(
              `[shutdown-reminder] deleted gone subscription endpoint=${sub.endpoint.slice(0, 90)}...`
            );
          }
        }
        if (statusCode === 401 || statusCode === 403) {
          console.error("[shutdown-reminder] VAPID key mismatch or expired");
        }
      }
    }

    if (userHadSuccessfulPush && !sentTableMissing) {
      const { error: markSentErr } = await supabase
        .from("shutdown_reminder_sends")
        .upsert(
          {
            date: today,
            user_id: userId,
            sent_at: new Date().toISOString(),
          },
          { onConflict: "date,user_id" }
        );
      if (markSentErr) {
        errors.push(`${userId}: could_not_mark_sent ${markSentErr.message}`);
        console.error("[shutdown-reminder] failed to mark sent:", markSentErr);
      }
    }
  }

  console.log(
    `[shutdown-reminder] summary date=${today} checkin_users=${checkinUserIds.size} target_users=${userIds.length} fetched_subscriptions=${totalSubscriptionsFetched} endpoint_types=${JSON.stringify(endpointTypeCounts)} sent=${sent}`
  );

  return new Response(
    JSON.stringify({
      date: today,
      targetUsers: userIds.length,
      fetchedSubscriptions: totalSubscriptionsFetched,
      endpointTypes: endpointTypeCounts,
      sent,
      errors,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[shutdown-reminder] uncaught_error", err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
