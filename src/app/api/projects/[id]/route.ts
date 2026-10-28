import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError, projectUpdateData, toProjectData, guardProject } from '@/lib/api-utils'
import { autoBackup } from '@/lib/backup'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params

    const g = await guardProject(id)
    if (!g.ok) return g.res
  const row = await db.project.findUnique({ where: { id }, include: { rooms: { orderBy: { order: 'asc' } } } })
  if (!row) return jsonError('Proiectul nu a fost găsit', 404)
  return NextResponse.json({ ...toProjectData(row), rooms: row.rooms })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params

    const g = await guardProject(id)
    if (!g.ok) return g.res
    const body = await req.json()
    const data = projectUpdateData(body)
    if (Object.keys(data).length === 0) return jsonError('Niciun câmp de actualizat')
    await autoBackup('înainte de modificarea proiectului')
    const row = await db.project.update({ where: { id }, data, include: { rooms: { orderBy: { order: 'asc' } } } })
    return NextResponse.json({ ...toProjectData(row), rooms: row.rooms })
  } catch (e) {
    console.error('PATCH /api/projects/[id]', e)
    return jsonError('Eroare la actualizarea proiectului', 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params

    const g = await guardProject(id)
    if (!g.ok) return g.res
  await autoBackup('înainte de ștergerea proiectului')
  await db.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
