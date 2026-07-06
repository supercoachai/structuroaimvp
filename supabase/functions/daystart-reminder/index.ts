/**
 * Cron-vriendelijke Edge Function: stuur een ochtend-push naar gebruikers die
 * vandaag (Europe/Amsterdam) nog geen dagstart hebben gedaan.
 *
 * Secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (bijv. mailto:info@structuro.eu)
 *
 * Schedule: 06:30 UTC (08:30 zomer / 07:30 winter Amsterdam), pg_cron job "daystart_reminder_daily".
 *
 * Anti-spam ontwerp (Chrome flagt pushes via on-device ML op titel/body en
 * kan permissies intrekken voor sites die dagelijks naar inactieve gebruikers pushen):
 * - alleen gebruikers die de afgelopen 7 dagen actief waren (profiles.last_seen_at)
 * - maximaal 1 dagstart-push per dag per gebruiker (daystart_reminder_sends)
 * - concrete, kalme NL-copy met "Structuro" als herkenbare afzender
 * - TTL van 4 uur zodat een gemiste ochtendpush niet uren later alsnog binnenkomt
 */
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EndpointKind = "apple" | "fcm" | "windows" | "mozilla" | "unknown";

const ACTIVE_WINDOW_DAYS = 7;

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

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const today = todayAmsterdamYmd();

    // Gebruikers die vandaag al een dagstart hebben gedaan
    const { data: checkins, error: checkErr } = await supabase
      .from("daily_checkins")
      .select("user_id")
      .eq("date", today);

    if (checkErr) {
      console.error("daystart-reminder checkins:", checkErr);
      return new Response(JSON.stringify({ error: checkErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Alleen recent actieve gebruikers: pushes naar mensen die de app niet
    // meer gebruiken zijn precies wat Chrome als notification-spam markeert.
    const activeSince = new Date(
      Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const { data: activeProfiles, error: activeErr } = await supabase
      .from("profiles")
      .select("id")
      .gte("last_seen_at", activeSince);

    if (activeErr) {
      console.error("daystart-reminder profiles:", activeErr);
      return new Response(JSON.stringify({ error: activeErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: allSubs, error: allSubsErr } = await supabase
      .from("push_subscriptions")
      .select("user_id");

    if (allSubsErr) {
      console.error("daystart-reminder push_subscriptions:", allSubsErr);
      return new Response(JSON.stringify({ error: allSubsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: alreadySentRows, error: sentErr } = await supabase
      .from("daystart_reminder_sends")
      .select("user_id")
      .eq("date", today);

    const sentTableMissing =
      Boolean(sentErr?.message) &&
      sentErr!.message.toLowerCase().includes("daystart_reminder_sends");

    if (sentErr && !sentTableMissing) {
      console.error("daystart-reminder already-sent:", sentErr);
      return new Response(JSON.stringify({ error: sentErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (sentTableMissing) {
      console.warn("[daystart-reminder] daystart_reminder_sends ontbreekt. Dedupe tijdelijk uit.");
    }

    const checkinUserIds = new Set((checkins ?? []).map((c) => c.user_id));
    const activeUserIds = new Set((activeProfiles ?? []).map((p) => p.id));
    const alreadySentUserIds = new Set(
      sentTableMissing ? [] : (alreadySentRows ?? []).map((s) => s.user_id)
    );

    const userIds = [
      ...new Set(
        (allSubs ?? [])
          .map((s) => s.user_id)
          .filter(
            (id): id is string =>
              Boolean(id) &&
              activeUserIds.has(id) &&
              !checkinUserIds.has(id) &&
              !alreadySentUserIds.has(id)
          )
      ),
    ];

    console.log(
      `[daystart-reminder] date=${today} active_users=${activeUserIds.size} target_users=${userIds.length}`
    );

    let sent = 0;
    const errors: string[] = [];
    let totalSubscriptionsFetched = 0;
    const endpointTypeCounts: Record<EndpointKind, number> = {
      apple: 0, fcm: 0, windows: 0, mozilla: 0, unknown: 0,
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

      let userHadSuccessfulPush = false;

      for (const sub of subs ?? []) {
        if (!sub.endpoint || !sub.p256dh || !sub.auth) continue;
        const kind = endpointKind(sub.endpoint);
        endpointTypeCounts[kind] += 1;

        const payload = JSON.stringify({
          title: "Structuro: dagstart",
          body: "Goedemorgen. Je dagstart staat voor je klaar. Kies rustig je taken voor vandaag.",
          url: "/dagstart",
          tag: "structuro-dagstart",
        });

        try {
          // TTL van 4 uur: een ochtendpush die pas in de middag zou binnenkomen
          // vervalt in plaats van out-of-context af te leveren.
          const response = await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: 4 * 3600, urgency: "normal" }
          );
          const status = (response as { statusCode?: number } | undefined)?.statusCode ?? 201;
          console.log(`[daystart-reminder] push success user=${userId} type=${kind} status=${status}`);
          sent++;
          userHadSuccessfulPush = true;
        } catch (e: unknown) {
          const statusCode =
            e && typeof e === "object" && "statusCode" in e
              ? (e as { statusCode: number }).statusCode
              : null;
          console.error(`[daystart-reminder] push failed user=${userId} type=${kind} status=${statusCode}`, e);

          if (statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
            console.log("[daystart-reminder] deleted gone subscription");
          }
          if (statusCode === 401 || statusCode === 403) {
            console.error("[daystart-reminder] VAPID key mismatch or expired");
          }
        }
      }

      if (userHadSuccessfulPush && !sentTableMissing) {
        const { error: markSentErr } = await supabase
          .from("daystart_reminder_sends")
          .upsert(
            { date: today, user_id: userId, sent_at: new Date().toISOString() },
            { onConflict: "date,user_id" }
          );
        if (markSentErr) {
          console.error("[daystart-reminder] failed to mark sent:", markSentErr);
        }
      }
    }

    console.log(
      `[daystart-reminder] summary date=${today} target_users=${userIds.length} fetched_subscriptions=${totalSubscriptionsFetched} sent=${sent}`
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
    console.error("[daystart-reminder] uncaught_error", err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
