import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError, roomUpdateData, guardProject } from '@/lib/api-utils'
import { autoBackup } from '@/lib/backup'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params

    const g = await guardProject(id)
    if (!g.ok) return g.res
  const rooms = await db.room.findMany({ where: { projectId: id }, orderBy: { order: 'asc' } })
  return NextResponse.json(rooms)
}

export async function POST(req: NextRequest, { params }: Ctx) {
  await autoBackup('înainte de adăugarea camerei')
  try {
    const { id } = await params

    const g = await guardProject(id)
    if (!g.ok) return g.res
    const body = await req.json()
    const count = await db.room.count({ where: { projectId: id } })
    const data = roomUpdateData(body)
    const room = await db.room.create({
      data: {
        projectId: id,
        order: count,
        name: typeof body.name === 'string' && body.name ? body.name : `Cameră ${count + 1}`,
        ...(data as object),
      } as never,
    })
    return NextResponse.json(room)
  } catch (e) {
    console.error('POST /api/projects/[id]/rooms', e)
    return jsonError('Eroare la adăugarea camerei', 500)
  }
}
