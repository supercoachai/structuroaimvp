// shared/track.js
export function track(event, props = {}) {
  try {
    console.log("[track]", event, props); // vervang later door echte endpoint
    // fetch("/api/track", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({event, ...props, t: Date.now()}) });
  } catch {}
}
