import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError, materialUpdateData } from '@/lib/api-utils'
import { autoBackup } from '@/lib/backup'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  await autoBackup('înainte de modificarea materialelor')
  try {
    const { id } = await params
    const body = await req.json()
    const data = materialUpdateData(body)
    if (Object.keys(data).length === 0) return jsonError('Niciun câmp de actualizat')
    // Setare „ofertă principală": deselectează celelalte oferte ale aceluiași cod
    if (data.isPrimary === true) {
      const current = await db.material.findUnique({ where: { id }, select: { code: true } })
      if (current) {
        await db.material.updateMany({ where: { code: current.code, NOT: { id } }, data: { isPrimary: false } })
      }
    }
    const row = await db.material.update({ where: { id }, data })
    return NextResponse.json(row)
  } catch (e) {
    console.error('PATCH /api/materials/[id]', e)
    return jsonError('Eroare la actualizarea materialului', 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  await autoBackup('înainte de ștergerea materialului')
  const { id } = await params
  await db.material.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
