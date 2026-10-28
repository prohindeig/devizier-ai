import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError, guardProject } from '@/lib/api-utils'
import { autoBackup } from '@/lib/backup'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, { params }: Ctx) {
  await autoBackup('înainte de duplicarea proiectului')
  try {
    const { id } = await params

    const g = await guardProject(id)
    if (!g.ok) return g.res
    const original = await db.project.findUnique({ where: { id }, include: { rooms: true } })
    if (!original) return jsonError('Proiectul nu a fost găsit', 404)
    const { id: _omit, rooms, createdAt, updatedAt, ...rest } = original
    const copy = await db.project.create({
      data: { ...rest, name: `${original.name} (copie)` },
    })
    for (const room of rooms) {
      const { id: _rid, projectId: _pid, createdAt: _rc, updatedAt: _ru, ...roomData } = room
      await db.room.create({ data: { ...roomData, projectId: copy.id } })
    }
    return NextResponse.json(copy)
  } catch (e) {
    console.error('POST /api/projects/[id]/duplicate', e)
    return jsonError('Eroare la duplicare', 500)
  }
}
