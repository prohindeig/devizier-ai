import { NextResponse } from "next/server";
import { after } from "next/server";
import { APP_VERSION, APP_CHANGELOG } from "@/lib/version";
import { sendUpdateNotifications } from "@/lib/push-server";

export const dynamic = "force-dynamic";

/**
 * GET /api/version — versiunea publicată pe server.
 * Clientul o compară cu versiunea rulată local: dacă diferă, declanșează
 * instalarea automată (service worker nou → skipWaiting → reload).
 *
 * În plus, după răspuns declanșăm „fanout"-ul push: dispozitivele cu
 * aplicația închisă primesc notificarea de versiune nouă de îndată ce
 * ORICE utilizator deschis verifică versiunea (sau la cron-ul zilnic).
 */
export async function GET() {
  after(async () => {
    try {
      await sendUpdateNotifications();
    } catch {
      // fanout-ul nu trebuie să afecteze răspunsul de versiune
    }
  });

  return NextResponse.json(
    { version: APP_VERSION, changelog: APP_CHANGELOG, checkedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
