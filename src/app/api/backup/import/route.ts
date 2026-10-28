import { NextRequest, NextResponse } from 'next/server'
import { jsonError } from '@/lib/api-utils'
import { restoreFromJson } from '@/lib/backup'

/** Importă un export Devizier AI (JSON) — înlocuiește integral datele, cu copie automată înainte. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (typeof body.json !== 'string' || body.json.length < 10) {
      return jsonError('Conținutul importului lipsește')
    }
    const res = await restoreFromJson(body.json)
    if (!res.ok) return jsonError(res.error ?? 'Importul a eșuat', 400)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/backup/import', e)
    return jsonError('Eroare la import', 500)
  }
}
