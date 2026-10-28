import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

/**
 * POST /api/push/subscribe — salvează/actualizează subscripția push a
 * dispozitivului curent (după activarea notificărilor din tab-ul „Verifică versiune").
 * DELETE — șterge subscripția (utilizatorul dezactivează notificările).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const endpoint = body?.subscription?.endpoint;
    const keys = body?.subscription?.keys;
    if (!endpoint || !keys?.p256dh || !keys?.auth)
      return NextResponse.json({ error: "Subscripție invalidă" }, { status: 400 });

    const user = await getSessionUser();
    const userAgent = (req.headers.get("user-agent") || "").slice(0, 180);
    const data = {
      endpoint: String(endpoint),
      p256dh: String(keys.p256dh),
      auth: String(keys.auth),
      userId: user?.id ?? "",
      userAgent,
      // dispozitivul tocmai a activat notificările — consideră versiunea curentă „văzută”
      lastVersion: APP_VERSION,
    };
    await db.pushSubscription.upsert({ where: { endpoint: data.endpoint }, create: data, update: data });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Eroare la salvarea subscripției" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const endpoint = body?.endpoint;
    if (!endpoint) return NextResponse.json({ error: "Lipsește endpoint" }, { status: 400 });
    await db.pushSubscription.deleteMany({ where: { endpoint: String(endpoint) } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
