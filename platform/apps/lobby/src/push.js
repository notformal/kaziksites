// Client Web Push helper: register the service worker, subscribe via PushManager
// with the server's VAPID key, and mirror the subscription to the API. All calls
// are guarded so an unsupported browser (or blocked permission) degrades quietly.
import { api } from "./api";

export const pushSupported = () =>
  typeof navigator !== "undefined" &&
  "serviceWorker" in navigator &&
  typeof window !== "undefined" &&
  "PushManager" in window &&
  "Notification" in window;

// base64url VAPID key -> Uint8Array (what PushManager.subscribe expects).
function toUint8Array(base64url) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const b64 = (base64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const register = () => navigator.serviceWorker.register("/sw.js");

export async function pushState() {
  if (!pushSupported()) return { supported: false, enabled: false };
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    return { supported: true, enabled: !!sub, denied: Notification.permission === "denied" };
  } catch {
    return { supported: true, enabled: false };
  }
}

export async function enablePush() {
  if (!pushSupported()) throw new Error("unsupported");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("denied");
  const reg = await register();
  const { publicKey } = await api.pushVapid();
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: toUint8Array(publicKey),
  });
  const json = sub.toJSON();
  await api.pushSubscribe({ endpoint: json.endpoint, keys: json.keys });
  return true;
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg && (await reg.pushManager.getSubscription());
  if (sub) {
    await api.pushUnsubscribe({ endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
  }
  return true;
}
