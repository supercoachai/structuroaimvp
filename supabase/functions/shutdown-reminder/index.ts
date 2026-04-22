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

function todayAmsterdamYmd(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

Deno.serve(async (req) => {
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

  const shutdownUserIds = new Set((shutdowns ?? []).map((s) => s.user_id));
  const userIds = [
    ...new Set(
      (checkins ?? [])
        .map((c) => c.user_id)
        .filter((id): id is string => Boolean(id) && !shutdownUserIds.has(id))
    ),
  ];

  let sent = 0;
  const errors: string[] = [];

  for (const userId of userIds) {
    const { data: subs, error: subErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (subErr) {
      errors.push(`${userId}: ${subErr.message}`);
      continue;
    }

    for (const sub of subs ?? []) {
      if (!sub.endpoint || !sub.p256dh || !sub.auth) continue;

      const payload = JSON.stringify({
        title: "Dag afsluiten",
        body: "Neem even 2 minuten. Sluit je dag af en maak je hoofd leeg.",
        url: "/shutdown",
      });

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (e: unknown) {
        const statusCode =
          e && typeof e === "object" && "statusCode" in e
            ? (e as { statusCode: number }).statusCode
            : null;
        console.error("Push mislukt:", sub.endpoint, e);
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ date: today, targetUsers: userIds.length, sent, errors }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
