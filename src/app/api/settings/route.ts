import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSettings } from '@/lib/api-utils'
import { autoBackup } from '@/lib/backup'

export async function GET() {
  const rates = (await getSettings('currency_rates')) ?? { MDL: 1, EUR: 19.6, USD: 17.6, RON: 4.42 }
  return NextResponse.json({ currency_rates: rates })
}

export async function PATCH(req: NextRequest) {
  await autoBackup('înainte de modificarea setărilor')
  try {
    const body = await req.json()
    if (!body.currency_rates || typeof body.currency_rates !== 'object') {
      return NextResponse.json({ error: 'currency_rates lipsește' }, { status: 400 })
    }
    await db.appSetting.upsert({
      where: { key: 'currency_rates' },
      update: { value: JSON.stringify(body.currency_rates) },
      create: { key: 'currency_rates', value: JSON.stringify(body.currency_rates) },
    })
    return NextResponse.json({ currency_rates: body.currency_rates })
  } catch (e) {
    console.error('PATCH /api/settings', e)
    return NextResponse.json({ error: 'Eroare la salvarea setărilor' }, { status: 500 })
  }
}
