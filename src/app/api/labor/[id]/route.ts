import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError } from '@/lib/api-utils'
import { autoBackup } from '@/lib/backup'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  await autoBackup('înainte de modificarea manoperei')
  try {
    const { id } = await params
    const body = await req.json()
    const data: Record<string, unknown> = {}
    for (const f of ['name', 'unit', 'source', 'priceDate']) {
      if (typeof body[f] === 'string') data[f] = body[f]
    }
    if (typeof body.price === 'number' && isFinite(body.price)) data.price = body.price
    if (Object.keys(data).length === 0) return jsonError('Niciun câmp de actualizat')
    const row = await db.laborRate.update({ where: { id }, data })
    return NextResponse.json(row)
  } catch (e) {
    console.error('PATCH /api/labor/[id]', e)
    return jsonError('Eroare la actualizarea tarifului', 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  await autoBackup('înainte de ștergerea manoperei')
  const { id } = await params
  await db.laborRate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
