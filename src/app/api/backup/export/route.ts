import { NextResponse } from 'next/server'
import { snapshotJson } from '@/lib/backup'

/** Exportă integral datele (JSON) fără a salva o versiune. */
export async function GET() {
  const payload = await snapshotJson()
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="devizier_export_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json"`,
    },
  })
}
