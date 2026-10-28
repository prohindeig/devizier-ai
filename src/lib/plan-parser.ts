import type { RoomData, RoomType } from './calc/types'

/**
 * Parser de plan textual — transformă rânduri precum:
 *   „Living 5.5x4.2x2.7, 2 ferestre 1.4x1.5, usa 0.9x2.05"
 *   „Dormitor 4 x 3,5"
 * în camere structurate. Toate valorile lipsă primesc norme implicite.
 */

export interface ParsedRoom {
  name: string
  type: RoomType
  length: number
  width: number
  height: number | null
  doorCount: number
  doorWidth: number
  doorHeight: number
  windowCount: number
  windowWidth: number
  windowHeight: number
  issues: string[] // avertismente de interpretare pentru utilizator
}

const TYPE_KEYWORDS: [RegExp, RoomType][] = [
  [/dormitor|dorm|sleep/i, 'dormitor'],
  [/living|sufrala|comun/i, 'living'],
  [/bucat|kitchen|cucina/i, 'bucatarie'],
  [/baie|bath|wc|spalator/i, 'baie'],
  [/hol|antreu|coridor|cupa/i, 'hol'],
  [/birou|office|cabinet/i, 'birou'],
  [/copil|children|kids/i, 'copil'],
  [/tehnic|centrala|spalatorie|depozit/i, 'camera_tehnica'],
  [/garaj|auto/i, 'garaj'],
  [/balcon|terasa|veranda/i, 'balcon'],
]

function detectType(name: string): RoomType {
  for (const [re, t] of TYPE_KEYWORDS) {
    if (re.test(name)) return t
  }
  return 'camera'
}

/** normalizează „4,5" → 4.5; acceptă și × sau * ca separator */
function normNum(s: string): number {
  return Number(s.replace(',', '.').trim())
}

const DIM_RE = /(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)(?:\s*[x×*]\s*(\d+(?:[.,]\d+)?))?/

export function parsePlanText(text: string): ParsedRoom[] {
  const out: ParsedRoom[] = []
  const lines = text
    .split(/\n|;/)
    .map((l) => l.trim())
    .filter(Boolean)

  for (const [idx, line] of lines.entries()) {
    const issues: string[] = []
    const dimMatch = line.match(DIM_RE)
    if (!dimMatch) {
      issues.push('Nu am găsit dimensiuni (format: 4.5x3.2) — rând ignorat sau completat implicit')
      continue
    }
    const length = normNum(dimMatch[1])
    const width = normNum(dimMatch[2])
    const height = dimMatch[3] ? normNum(dimMatch[3]) : null

    // numele = textul dinaintea dimensiunilor (curățat de separatoare)
    const nameRaw = line.slice(0, dimMatch.index ?? 0).replace(/[:,;.\-–—]+\s*$/, '').trim()
    const name = nameRaw || `Cameră ${idx + 1}`
    const type = detectType(name)

    // uși: „2 usi 0.9x2.05" / „usa 0.9x2" / implicit 1
    let doorCount = 1
    let doorWidth = 0.9
    let doorHeight = 2.05
    const doorM = line.match(/(\d+)?\s*(?:u[sș]i|u[sș]a|u[sș]ă)\s*(?:(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?))?/i)
    if (doorM) {
      if (doorM[1]) doorCount = Math.max(0, parseInt(doorM[1], 10))
      if (doorM[2]) doorWidth = normNum(doorM[2])
      if (doorM[3]) doorHeight = normNum(doorM[3])
    } else if (/f[aă]r[aă]\s*u[sș]i/i.test(line)) {
      doorCount = 0
    }

    // ferestre: „2 ferestre 1.4x1.5" / „fereastra 1.2x1.4" / implicit 0 (baie/hol auto-deducem)
    let windowCount = 0
    let windowWidth = 1.4
    let windowHeight = 1.5
    const winM = line.match(/(\d+)?\s*(?:ferestre|fereastr[aă]|geamuri|geam)\s*(?:(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?))?/i)
    if (winM) {
      if (winM[1]) windowCount = Math.max(0, parseInt(winM[1], 10))
      if (winM[2]) windowWidth = normNum(winM[2])
      if (winM[3]) windowHeight = normNum(winM[3])
    } else if (/\b\d+\s*(?:ferestre|geamuri)\b/i.test(nameRaw)) {
      // caz rar: contor înainte de dimensiuni, deja acoperit
    }

    if (length <= 0 || width <= 0) {
      issues.push('Dimensiuni invalide — trebuie numere pozitive')
      continue
    }
    if (height != null && (height < 2 || height > 4.5)) {
      issues.push(`Înălțimea ${height} m pare neobișnuită — verifică`)
    }

    out.push({
      name,
      type,
      length,
      width,
      height,
      doorCount,
      doorWidth,
      doorHeight,
      windowCount,
      windowWidth,
      windowHeight,
      issues,
    })
  }
  return out
}
