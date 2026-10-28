import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { currentOwnerId } from '@/lib/auth'
import type { ProjectData, ProjectOptions } from '@/lib/calc/types'

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Verifică accesul la proiect: utilizatorul conectat vede doar propriile
 * proiecte; fără cont, doar cele cu ownerId „" (create pe dispozitiv).
 * Returnează { ok } sau { res: 404/403 }.
 */
export async function guardProject(id: string): Promise<{ ok: true; ownerId: string } | { ok: false; res: NextResponse }> {
  const ownerId = await currentOwnerId()
  const row = await db.project.findUnique({ where: { id }, select: { ownerId: true } })
  if (!row) return { ok: false, res: jsonError('Proiectul nu a fost găsit', 404) }
  if (row.ownerId !== ownerId) return { ok: false, res: jsonError('Nu ai acces la acest proiect', 403) }
  return { ok: true, ownerId }
}

export async function getSettings(key: string): Promise<Record<string, unknown> | null> {
  const row = await db.appSetting.findUnique({ where: { key } })
  if (!row) return null
  try {
    return JSON.parse(row.value)
  } catch {
    return null
  }
}

export interface ProjectRow {
  id: string
  name: string
  locality: string
  type: string
  builtArea: number
  usefulArea: number
  floors: number
  roomHeight: number
  roofType: string
  roofSlope: number
  roofCovering: string
  foundationType: string
  extWallSystem: string
  intWallSystem: string
  ceilingSystem: string
  finishLevel: string
  budget: number
  currency: string
  exteriorEnabled: boolean
  exteriorArea: number
  exteriorFence: number
  exteriorGate: number
  options: string
}

/** Convertește rândul DB în ProjectData (cu options parsate). */
export function toProjectData(row: ProjectRow): ProjectData {
  let options: ProjectOptions = {}
  try {
    options = JSON.parse(row.options || '{}')
  } catch {
    options = {}
  }
  return { ...row, options } as ProjectData
}

export function projectUpdateData(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}
  const strFields = ['name', 'locality', 'type', 'roofType', 'roofCovering', 'foundationType', 'extWallSystem', 'intWallSystem', 'ceilingSystem', 'finishLevel', 'currency']
  for (const f of strFields) {
    if (typeof body[f] === 'string') data[f] = body[f]
  }
  const numFields = ['builtArea', 'usefulArea', 'roofSlope', 'budget', 'exteriorArea', 'exteriorFence']
  for (const f of numFields) {
    if (typeof body[f] === 'number' && isFinite(body[f] as number)) data[f] = body[f]
  }
  if (typeof body.floors === 'number') data.floors = Math.max(1, Math.round(body.floors))
  if (typeof body.roomHeight === 'number' && (body.roomHeight as number) > 0) data.roomHeight = body.roomHeight
  if (typeof body.exteriorGate === 'number') data.exteriorGate = Math.max(0, Math.round(body.exteriorGate))
  if (typeof body.exteriorEnabled === 'boolean') data.exteriorEnabled = body.exteriorEnabled
  if (body.options && typeof body.options === 'object') {
    data.options = JSON.stringify(body.options)
  }
  return data
}

export function roomUpdateData(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}
  for (const f of ['name', 'type', 'floorType', 'wallFinish', 'ceilingType']) {
    if (typeof body[f] === 'string') data[f] = body[f]
  }
  for (const f of ['length', 'width', 'doorWidth', 'doorHeight', 'windowWidth', 'windowHeight']) {
    if (typeof body[f] === 'number' && (body[f] as number) > 0) data[f] = body[f]
  }
  if (body.height === null || typeof body.height === 'number') {
    data.height = typeof body.height === 'number' && (body.height as number) > 0 ? body.height : null
  }
  for (const f of ['doorCount', 'windowCount', 'floorIndex', 'order']) {
    if (typeof body[f] === 'number' && (body[f] as number) >= 0) data[f] = Math.round(body[f] as number)
  }
  if (body.config && typeof body.config === 'object' && !Array.isArray(body.config)) {
    data.config = JSON.stringify(body.config)
  }
  return data
}

export function materialUpdateData(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {}
  for (const f of ['code', 'name', 'category', 'manufacturer', 'spec', 'unit', 'packageLabel', 'supplier', 'locality', 'source', 'priceDate', 'link']) {
    if (typeof body[f] === 'string') data[f] = body[f]
  }
  for (const f of ['packageQty', 'price']) {
    if (typeof body[f] === 'number' && isFinite(body[f] as number)) data[f] = body[f]
  }
  if (typeof body.isPrimary === 'boolean') data.isPrimary = body.isPrimary
  return data
}
