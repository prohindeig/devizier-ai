"use client";

/** Utilitare client pentru notificările Web Push (versiune nouă pe telefon). */

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BN_gfmXsnXRjCZNnMe0qCw5iZo1tZ9PYjN4UigeyQOtQE0OA4XqCvHTOZUVPah0lldojLdTzOqJh-4-0ktMAN6M";

export type PushSupport = "ready" | "unsupported" | "insecure" | "denied";

/** Verifică suportul browserului pentru notificări push. */
export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return "unsupported";
  if (!window.isSecureContext) return "insecure"; // push funcționează doar pe HTTPS
  if (Notification.permission === "denied") return "denied";
  return "ready";
}

export interface PushState {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
}

/** Stadiul actual al notificărilor pe acest dispozitiv. */
export async function getPushState(): Promise<PushState> {
  const support = pushSupport();
  if (support === "unsupported" || support === "insecure")
    return { supported: false, permission: "unsupported", subscribed: false };
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    return { supported: true, permission: Notification.permission, subscribed: !!sub };
  } catch {
    return { supported: true, permission: Notification.permission, subscribed: false };
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

/** Activează notificările push: cere permisiunea, creează subscripția și o salvează pe server. */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  try {
    const support = pushSupport();
    if (support === "unsupported" || support === "insecure")
      return {
        ok: false,
        error:
          "Acest browser nu suportă notificări push. Pe iPhone funcționează doar pentru aplicația instalată din Safari (iOS 16.4+).",
      };
    const permission = await Notification.requestPermission();
    if (permission !== "granted")
      return {
        ok: false,
        error: "Permisiunea pentru notificări a fost refuzată. O poți activa din setările browserului.",
      };
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
      });
    }
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    if (!res.ok) return { ok: false, error: "Serverul nu a putut salva subscripția. Încearcă din nou." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Nu am putut activa notificările pe acest dispozitiv." };
  }
}

/** Dezactivează notificările push și șterge subscripția de pe server. */
export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
  } catch {
    // silențios — dezactivarea nu trebuie să blocheze interfața
  }
}
