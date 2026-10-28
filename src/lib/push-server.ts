import webpush from "web-push";
import { db } from "@/lib/db";
import { APP_VERSION, APP_CHANGELOG } from "@/lib/version";

/**
 * Trimiterea notificărilor Web Push de pe server (web-push + chei VAPID).
 * Când publicăm o versiune nouă, toate dispozitivele abonate care nu au
 * primit încă versiunea curentă primesc o notificare pe telefon — chiar
 * dacă aplicația este complet închisă (Android) sau instalată din Safari
 * (iOS 16.4+).
 */

const PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BN_gfmXsnXRjCZNnMe0qCw5iZo1tZ9PYjN4UigeyQOtQE0OA4XqCvHTOZUVPah0lldojLdTzOqJh-4-0ktMAN6M";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "CpIo2iFSufxWWHCw81n_ONpDc0ect9yToBj2iYL7cOg";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:contact@devizier.ai";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
    return true;
  } catch {
    return false;
  }
}

export function pushConfigured(): boolean {
  return Boolean(PUBLIC_KEY && PRIVATE_KEY);
}

export interface FanoutResult {
  version: string;
  checked: number; // dispozitive care nu primiseră versiunea curentă
  sent: number; // notificări trimise cu succes
  removed: number; // subscripții expirate/șterse
}

/** Corpul notificării — mesaj scurt, clar, în română. */
function payload(): string {
  const short = APP_CHANGELOG.replace(new RegExp(`^v\\d[\\d.]*: `), "");
  return JSON.stringify({
    title: `Devizier AI — versiune nouă ${APP_VERSION}`,
    body: short || "Se instalează automat la următoarea deschidere a aplicației.",
    tag: "devizier-update",
    version: APP_VERSION,
    url: "/",
    icon: "/icons/icon-192.png",
  });
}

/**
 * Trimite notificarea de versiune nouă către toate dispozitivele abonate
 * care nu au primit încă versiunea curentă. Apelat:
 *  - după fiecare GET /api/version (orice dispozitiv deschis declanșează
 *    fanout-ul pentru cele închise)
 *  - de cron-ul zilnic din vercel.json (/api/push/fanout)
 */
export async function sendUpdateNotifications(): Promise<FanoutResult> {
  const result: FanoutResult = { version: APP_VERSION, checked: 0, sent: 0, removed: 0 };
  if (!ensureConfigured()) return result;

  const subs = await db.pushSubscription.findMany({
    where: { lastVersion: { not: APP_VERSION } },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  result.checked = subs.length;
  if (subs.length === 0) return result;

  const body = payload();
  const options = { TTL: 7 * 24 * 3600, urgency: "high" as const };

  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
        options
      );
      await db.pushSubscription.update({ where: { id: s.id }, data: { lastVersion: APP_VERSION } });
      result.sent++;
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      // 404/410 = subscripția a expirat (browser curățat, permisiune retrasă)
      if (statusCode === 404 || statusCode === 410) {
        await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        result.removed++;
      }
    }
  }
  return result;
}
