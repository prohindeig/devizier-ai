import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError, materialUpdateData } from '@/lib/api-utils'
import { autoBackup } from '@/lib/backup'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const q = searchParams.get('q')
  const rows = await db.material.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { code: { contains: q } }, { supplier: { contains: q } }] } : {}),
    },
    orderBy: [{ code: 'asc' }, { isPrimary: 'desc' }, { price: 'asc' }],
  })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  await autoBackup('înainte de adăugarea materialelor')
  try {
    const body = await req.json()
    if (!body.code || !body.name) return jsonError('Codul și denumirea sunt obligatorii')
    const data = materialUpdateData(body)
    const row = await db.material.create({
      data: {
        code: body.code,
        name: body.name,
        category: typeof body.category === 'string' ? body.category : 'Consumabile',
        unit: typeof body.unit === 'string' ? body.unit : 'buc',
        ...(data as object),
      } as never,
    })
    return NextResponse.json(row)
  } catch (e) {
    console.error('POST /api/materials', e)
    return jsonError('Eroare la adăugarea materialului', 500)
  }
}
