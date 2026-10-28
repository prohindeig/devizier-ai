import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError, toProjectData, guardProject } from '@/lib/api-utils'
import { computeEstimate } from '@/lib/calc/engine'

type Ctx = { params: Promise<{ id: string }> }

/** Deviz calculat pe server (motor determinist) — folosit de exporturi și AI. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params

    const g = await guardProject(id)
    if (!g.ok) return g.res
  const row = await db.project.findUnique({ where: { id }, include: { rooms: { orderBy: { order: 'asc' } } } })
  if (!row) return jsonError('Proiectul nu a fost găsit', 404)
  const materials = await db.material.findMany()
  const labor = await db.laborRate.findMany()
  const estimate = computeEstimate({
    project: toProjectData(row),
    rooms: row.rooms,
    materials,
    labor,
  })
  return NextResponse.json(estimate)
}
