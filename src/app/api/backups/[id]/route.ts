import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError } from '@/lib/api-utils'
import { restoreFromJson } from '@/lib/backup'

type Ctx = { params: Promise<{ id: string }> }

/** Descarcă versiunea (JSON complet). */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  const row = await db.backup.findUnique({ where: { id }, select: { label: true, data: true, createdAt: true } })
  if (!row) return jsonError('Versiunea nu a fost găsită', 404)
  return new NextResponse(row.data, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="devizier_backup_${new Date(row.createdAt).toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json"`,
    },
  })
}

/** Restaurează versiunea (cu copie automată a stării curente înainte). */
export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const row = await db.backup.findUnique({ where: { id }, select: { data: true, label: true } })
    if (!row) return jsonError('Versiunea nu a fost găsită', 404)
    const res = await restoreFromJson(row.data)
    if (!res.ok) return jsonError(res.error ?? 'Restaurarea a eșuat', 400)
    return NextResponse.json({ ok: true, restoredFrom: row.label })
  } catch (e) {
    console.error('POST /api/backups/[id] restore', e)
    return jsonError('Eroare la restaurare', 500)
  }
}

/** Șterge o versiune. */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  await db.backup.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
