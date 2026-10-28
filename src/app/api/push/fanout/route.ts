import { NextResponse } from "next/server";
import { sendUpdateNotifications } from "@/lib/push-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/push/fanout — trimite notificările push „versiune nouă" către
 * dispozitivele care nu au primit încă versiunea curentă.
 * Este apelat de cron-ul zilnic definit în vercel.json (Vercel îl rulează
 * chiar dacă nimeni nu deschide aplicația), dar poate fi apelat și manual.
 */
export async function GET() {
  try {
    const result = await sendUpdateNotifications();
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ ok: false, error: "Fanout-ul push a eșuat" }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
