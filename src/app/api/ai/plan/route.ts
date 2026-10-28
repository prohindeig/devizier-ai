import { NextRequest, NextResponse } from 'next/server'
import { jsonError } from '@/lib/api-utils'

type AiRoom = {
  name?: unknown
  type?: unknown
  length?: unknown
  width?: unknown
  height?: unknown
  doorCount?: unknown
  windowCount?: unknown
}

const VALID_TYPES = new Set([
  'dormitor', 'living', 'bucatarie', 'baie', 'hol', 'birou', 'copil', 'camera_tehnica', 'garaj', 'balcon', 'camera',
])

const TYPE_ALIASES: Record<string, string> = {
  dormitor: 'dormitor', bedroom: 'dormitor',
  living: 'living', sufragerie: 'living',
  bucatarie: 'bucatarie', kitchen: 'bucatarie', bucatária: 'bucatarie',
  baie: 'baie', bathroom: 'baie', wc: 'baie',
  hol: 'hol', antreu: 'hol', coridor: 'hol', hol_intrare: 'hol',
  birou: 'birou', office: 'birou',
  copil: 'copil', dormitor_copil: 'copil',
  camera_tehnica: 'camera_tehnica', tehnic: 'camera_tehnica',
  garaj: 'garaj',
  balcon: 'balcon', terasa: 'balcon',
  camera: 'camera', room: 'camera',
}

function toNum(v: unknown, min: number, max: number): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN
  if (!isFinite(n) || n < min || n > max) return undefined
  return Math.round(n * 100) / 100
}

/**
 * Procesare plan de arhitectură (fotografie / poză) cu modelul vision.
 * AI-ul DOAR citește dimensiunile scrise pe plan — nu calculează prețuri.
 * Rezultatul este SCHIȚĂ: utilizatorul verifică și confirmă camerele.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const image: string | undefined = typeof body.image === 'string' ? body.image : undefined
    if (!image || image.length < 100) return jsonError('Trimite o imagine a planului (base64 sau data URL)')

    const dataUrl = image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`
    if (dataUrl.length > 12_000_000) return jsonError('Imaginea este prea mare — max ~8 MB')

    // Import dinamic: pe hosting-uri fără SDK-ul AI configurat (ex. Vercel)
    // eroarea este prinsă curat mai jos, fără să cascadeze în toată ruta.
    const { default: ZAI } = await import('z-ai-web-dev-sdk')
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Acesta este un plan de arhitectură al unei locuințe. Citește camerele din plan și returnează STRICT un JSON, fără niciun alt text, în formatul:\n' +
                '{"rooms":[{"name":"Denumirea din plan","type":"living|dormitor|bucatarie|baie|hol|birou|copil|camera_tehnica|garaj|balcon|camera","length":numar_metri,"width":numar_metri,"height":numar_metri_sau_null,"doorCount":numar,"windowCount":numar}]}\n' +
                'Reguli: citește dimensiunile EXACT cum sunt scrise pe plan (în metri, cu zecimal la punct sau virgulă). Dacă un câmp nu apare pe plan, folosește null sau valoarea 1 pentru uși/0 pentru ferestre. Nu inventa camere care nu apar. Nu calcula suprafețe. Răspunde doar cu JSON-ul.',
            },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const raw: string =
      completion?.choices?.[0]?.message?.content ??
      completion?.choices?.[0]?.message?.reasoning_content ??
      ''
    // extrage JSON-ul din răspuns (poate fi închis în ```json ...```)
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) return jsonError('AI-ul nu a putut citi planul — încearcă o poză mai clară, perpendiculară pe plan, cu dimensiuni lizibile', 422)

    let parsed: { rooms?: AiRoom[] }
    try {
      parsed = JSON.parse(m[0]) as { rooms?: AiRoom[] }
    } catch {
      return jsonError('Răspuns AI invalid — reia poza sau completează manual camerele', 422)
    }

    const rooms = (Array.isArray(parsed.rooms) ? parsed.rooms : [])
      .slice(0, 25)
      .map((r, i) => {
        const name = typeof r.name === 'string' && r.name.trim() ? r.name.trim() : `Cameră ${i + 1}`
        const rawType = typeof r.type === 'string' ? r.type.toLowerCase().replace(/\s+/g, '_') : ''
        const type = VALID_TYPES.has(rawType) ? rawType : (TYPE_ALIASES[rawType] ?? 'camera')
        return {
          name,
          type,
          length: toNum(r.length, 1, 20) ?? 4,
          width: toNum(r.width, 1, 20) ?? 3.5,
          height: toNum(r.height, 2, 4.5) ?? null,
          doorCount: toNum(r.doorCount, 0, 6) ?? 1,
          windowCount: toNum(r.windowCount, 0, 8) ?? 0,
        }
      })

    return NextResponse.json({ ok: true, rooms, note: 'Schiță AI — verifică toate dimensiunile înainte de a adăuga camerele.' })
  } catch (e) {
    console.error('POST /api/ai/plan', e)
    return jsonError(
      'Procesarea AI nu este disponibilă pe acest server — folosește modul Text (funcționează identic, fără AI)',
      503
    )
  }
}
