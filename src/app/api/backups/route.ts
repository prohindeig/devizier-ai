import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError } from '@/lib/api-utils'
import { autoBackup, manualBackup } from '@/lib/backup'

/** Lista versiunilor (fără conținutul complet). */
export async function GET() {
  const rows = await db.backup.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, label: true, kind: true, hash: true, sizeBytes: true, createdAt: true },
    take: 100,
  })
  return NextResponse.json(rows)
}

/** Creează o copie manuală. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    await autoBackup('înainte de backup manual') // protejează și versiunea curentă
    const id = await manualBackup(String(body.label ?? ''), 'manual')
    return NextResponse.json({ ok: true, id })
  } catch (e) {
    console.error('POST /api/backups', e)
    return jsonError('Eroare la crearea backup-ului', 500)
  }
}
