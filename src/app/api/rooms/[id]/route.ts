import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError, roomUpdateData } from '@/lib/api-utils'
import { autoBackup } from '@/lib/backup'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const body = await req.json()
    const data = roomUpdateData(body)
    if (Object.keys(data).length === 0) return jsonError('Niciun câmp de actualizat')
    await autoBackup('înainte de modificarea camerei')
    const room = await db.room.update({ where: { id }, data })
    return NextResponse.json(room)
  } catch (e) {
    console.error('PATCH /api/rooms/[id]', e)
    return jsonError('Eroare la actualizarea camerei', 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params
  await autoBackup('înainte de ștergerea camerei')
  await db.room.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
