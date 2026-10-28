import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError } from '@/lib/api-utils'

export async function GET() {
  const rows = await db.laborRate.findMany({ orderBy: { code: 'asc' } })
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.code || !body.name) return jsonError('Codul și denumirea sunt obligatorii')
    const row = await db.laborRate.upsert({
      where: { code: body.code },
      update: {
        name: body.name,
        unit: typeof body.unit === 'string' ? body.unit : 'buc',
        price: typeof body.price === 'number' ? body.price : 0,
        source: 'manual',
        priceDate: new Date().toISOString().slice(0, 10),
      },
      create: {
        code: body.code,
        name: body.name,
        unit: typeof body.unit === 'string' ? body.unit : 'buc',
        price: typeof body.price === 'number' ? body.price : 0,
        source: 'manual',
        priceDate: new Date().toISOString().slice(0, 10),
      },
    })
    return NextResponse.json(row)
  } catch (e) {
    console.error('POST /api/labor', e)
    return jsonError('Eroare la adăugarea tarifului', 500)
  }
}
