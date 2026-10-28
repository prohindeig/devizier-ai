import { db } from '@/lib/db'
import { createHash } from 'crypto'

/**
 * Sistem de versiuni (backup) — „copiază versiunea precedență înainte de orice modificare".
 * - snapshotJson(): serializează integral baza (proiecte+camere+materiale+manoperă+setări)
 * - autoBackup(): rate-limit 60s per etichetă + sare peste conținut identic (hash)
 * - păstrează ultimele 30 de versiuni
 */

export const BACKUP_KEEP = 30
export const AUTO_BACKUP_MIN_INTERVAL_MS = 60_000

export interface SnapshotPayload {
  app: string
  version: number
  createdAt: string
  projects: unknown[]
  rooms: unknown[]
  materials: unknown[]
  labor: unknown[]
  settings: unknown[]
}

export async function snapshotJson(): Promise<SnapshotPayload> {
  const [projects, rooms, materials, labor, settings] = await Promise.all([
    db.project.findMany({ orderBy: { createdAt: 'asc' } }),
    db.room.findMany({ orderBy: [{ projectId: 'asc' }, { order: 'asc' }] }),
    db.material.findMany({ orderBy: [{ code: 'asc' }, { isPrimary: 'desc' }] }),
    db.laborRate.findMany({ orderBy: { code: 'asc' } }),
    db.appSetting.findMany({ orderBy: { key: 'asc' } }),
  ])
  return {
    app: 'devizier-ai',
    version: 1,
    createdAt: new Date().toISOString(),
    projects,
    rooms,
    materials,
    labor,
    settings,
  }
}

export function hashPayload(payload: SnapshotPayload): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16)
}

/** Ultima copie de siguranță (pentru comparație). */
async function lastBackupHash(): Promise<string | null> {
  const last = await db.backup.findFirst({ orderBy: { createdAt: 'desc' }, select: { hash: true } })
  return last?.hash ?? null
}

async function insertBackup(label: string, kind: string, payload: SnapshotPayload): Promise<string | null> {
  const json = JSON.stringify(payload)
  const row = await db.backup.create({
    data: {
      label,
      kind,
      hash: hashPayload(payload),
      sizeBytes: Buffer.byteLength(json, 'utf8'),
      data: json,
    },
    select: { id: true },
  })
  // păstrează doar ultimele BACKUP_KEEP versiuni
  const stale = await db.backup.findMany({
    orderBy: { createdAt: 'desc' },
    skip: BACKUP_KEEP,
    select: { id: true },
  })
  if (stale.length > 0) {
    await db.backup.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } })
  }
  return row.id
}

/**
 * Copie automată înainte de o modificare. Sare peste:
 * - apeluri mai rapide de 60s cu aceeași etichetă (rate-limit),
 * - conținut identic cu ultima copie (hash).
 * Returnează id-ul copiei create sau null.
 */
export async function autoBackup(label: string, kind = 'auto'): Promise<string | null> {
  try {
    const lastMeta = await db.backup.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { hash: true, label: true, createdAt: true },
    })
    if (
      lastMeta &&
      lastMeta.label === label &&
      Date.now() - new Date(lastMeta.createdAt).getTime() < AUTO_BACKUP_MIN_INTERVAL_MS
    ) {
      return null // rate-limit: prea multe copii cu același motiv, în succesiune rapidă
    }

    const payload = await snapshotJson()
    if (lastMeta && lastMeta.hash === hashPayload(payload)) return null // nimic schimbat

    return await insertBackup(label, kind, payload)
  } catch (e) {
    console.error('autoBackup failed', e)
    return null // backup-ul nu trebuie să blocheze niciodată operația principală
  }
}

/** Copie manuală (buton „Creează backup acum") — întotdeauna creată. */
export async function manualBackup(label: string, kind = 'manual'): Promise<string> {
  const payload = await snapshotJson()
  const finalLabel = label.trim() || `Backup manual ${new Date().toLocaleString('ro-RO')}`
  const id = await insertBackup(finalLabel, kind, payload)
  return id ?? ''
}

/** Restaurează integral din JSON, cu copie automată înainte de suprascriere. */
export async function restoreFromJson(json: string): Promise<{ ok: boolean; error?: string }> {
  let payload: SnapshotPayload
  try {
    payload = JSON.parse(json) as SnapshotPayload
  } catch {
    return { ok: false, error: 'Fișierul nu este un JSON valid' }
  }
  if (payload.app !== 'devizier-ai' || !Array.isArray(payload.projects)) {
    return { ok: false, error: 'Fișierul nu este un export Devizier AI' }
  }

  // copie a stării curente înainte de restaurare
  try {
    const current = await snapshotJson()
    await insertBackup(`Înainte de restaurare (${new Date().toLocaleString('ro-RO')})`, 'restore', current)
  } catch (e) {
    console.error('pre-restore snapshot failed', e)
  }

  // SQLite nu suportă tranzacții interactive în Prisma pe sqlite? Suportă (interactive transactions).
  // Folosim o tranzacție ca restaurarea să fie atomică.
  await db.$transaction(async (tx) => {
    await tx.room.deleteMany({})
    await tx.project.deleteMany({})
    await tx.material.deleteMany({})
    await tx.laborRate.deleteMany({})
    await tx.appSetting.deleteMany({})

    const proj = payload.projects as Record<string, unknown>[]
    for (const p of proj) {
      const { id, createdAt, updatedAt, rooms: _r, ...data } = p
      void _r
      await tx.project.create({
        data: {
          ...(data as object),
          id: String(id),
          ...(createdAt ? { createdAt: new Date(String(createdAt)) } : {}),
          ...(updatedAt ? { updatedAt: new Date(String(updatedAt)) } : {}),
        } as never,
      })
    }
    for (const r of payload.rooms as Record<string, unknown>[]) {
      const { id, createdAt, updatedAt, ...data } = r
      await tx.room.create({
        data: {
          ...(data as object),
          id: String(id),
          ...(createdAt ? { createdAt: new Date(String(createdAt)) } : {}),
        } as never,
      })
    }
    for (const m of payload.materials as Record<string, unknown>[]) {
      const { id, createdAt, updatedAt, ...data } = m
      await tx.material.create({
        data: {
          ...(data as object),
          id: String(id),
          ...(createdAt ? { createdAt: new Date(String(createdAt)) } : {}),
        } as never,
      })
    }
    for (const l of payload.labor as Record<string, unknown>[]) {
      const { id, createdAt, updatedAt, ...data } = l
      await tx.laborRate.create({
        data: {
          ...(data as object),
          id: String(id),
          ...(createdAt ? { createdAt: new Date(String(createdAt)) } : {}),
        } as never,
      })
    }
    for (const s of payload.settings as Record<string, unknown>[]) {
      const { id, updatedAt, ...data } = s
      await tx.appSetting.create({ data: { ...(data as object), id: String(id) } as never })
    }
  })
  return { ok: true }
}
