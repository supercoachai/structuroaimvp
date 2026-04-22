"use client";

import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function saveSubscriptionToSupabase(userId: string, subscription: PushSubscription) {
  const supabase = createClient();
  const sub = subscription.toJSON();
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    console.warn("push: onvolledige subscription JSON");
    return;
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" }
  );

  if (error) {
    console.error("push: opslaan subscription mislukt:", error.message);
    throw error;
  }
}

/**
 * Vraagt notificatietoestemming, registreert `/sw.js` en slaat de push subscription op in Supabase.
 * Vereist NEXT_PUBLIC_VAPID_PUBLIC_KEY. Faalt stil als push niet ondersteund wordt.
 */
export async function registerPushSubscription(userId: string): Promise<PushSubscription | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.log("Push niet ondersteund op dit apparaat");
    return null;
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublic) {
    console.warn("Geen NEXT_PUBLIC_VAPID_PUBLIC_KEY: web push overgeslagen");
    return null;
  }

  let permission = Notification.permission;
  if (permission === "denied") {
    return null;
  }
  if (permission !== "granted") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return null;
  }

  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    await saveSubscriptionToSupabase(userId, existing);
    return existing;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublic),
  });

  await saveSubscriptionToSupabase(userId, subscription);
  return subscription;
}
