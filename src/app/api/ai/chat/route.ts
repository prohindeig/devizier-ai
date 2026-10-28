import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toProjectData } from '@/lib/api-utils'
import { computeEstimate } from '@/lib/calc/engine'
import { fmtNum } from '@/lib/format'

type ChatMsg = { role: 'user' | 'assistant'; content: string }

/** Sinteză compactă a devizului pentru contextul AI (fără inventare). */
function buildEstimateContext(est: ReturnType<typeof computeEstimate>): string {
  const lines: string[] = []
  const p = est.project
  lines.push(`PROIECT: ${p.name} | Localitate: ${p.locality || '—'} | Tip: ${p.type}`)
  lines.push(`Suprafață construită: ${p.builtArea} m² | utilă: ${p.usefulArea || '—'} m² | etaje: ${p.floors} | înălțime: ${p.roomHeight} m`)
  lines.push(`Acoperiș: ${p.roofType} ${p.roofSlope}° (${p.roofCovering}) | Fundație: ${p.foundationType} | Pereți ext: ${p.extWallSystem} | Partiții: ${p.intWallSystem} | Finisare: ${p.finishLevel}`)
  lines.push(`Buget: ${p.budget} MDL | TOTAL ESTIMAT: ${fmtNum(est.totals.grand, 0)} MDL | Materiale: ${fmtNum(est.totals.materials, 0)} | Manoperă: ${fmtNum(est.totals.labor, 0)} | Suplimentare: ${fmtNum(est.totals.extra, 0)} | Cost/m²: ${fmtNum(est.totals.perSqm, 0)} MDL/m²`)
  lines.push(`Geometrie: perimetru ${est.geometry.exteriorPerimeter} m | fațadă ${est.geometry.facadeArea} m² | acoperiș real ${est.geometry.roofRealArea} m² | ferestre ${est.geometry.windowsArea} m² | pereți interiori ${est.geometry.totalWallArea} m²`)
  lines.push(`Camere definite: acoperire ${est.geometry.roomsCoveredPct}% din aria utilă; pereți nete ${est.geometry.totalWallArea} m²`)
  for (const st of est.stages) {
    if (st.materials.length === 0 && st.labor.length === 0) continue
    lines.push(`  ${st.title}: materiale ${fmtNum(st.materialsTotal, 0)} MDL + manoperă ${fmtNum(st.laborTotal, 0)} MDL (${st.materials.length} poziții materiale)`)
  }
  lines.push(`Top 15 poziții după cost:`)
  const all = est.stages
    .flatMap((s) => s.materials.map((m) => ({ ...m, stage: s.title })))
    .sort((a, b) => b.totalPrice - a.totalPrice)
    .slice(0, 15)
  for (const m of all) {
    lines.push(`  ${m.stage} | ${m.name} | ${fmtNum(m.purchaseQty, 1)} ${m.unit} × ${fmtNum(m.unitPrice, 2)} MDL = ${fmtNum(m.totalPrice, 0)} MDL | preț: ${m.priceStatus}`)
  }
  if (est.missingPrices.length > 0) {
    lines.push(`PREȚURI LIPSĂ (${est.missingPrices.length}): ${est.missingPrices.slice(0, 10).map((m) => m.name).join(', ')}`)
  }
  if (est.globalWarnings.length > 0) {
    lines.push(`AVERTISMENTE: ${est.globalWarnings.join(' | ')}`)
  }
  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message: string = typeof body.message === 'string' ? body.message.slice(0, 4000) : ''
    const projectId: string | undefined = body.projectId
    const history: ChatMsg[] = Array.isArray(body.history)
      ? body.history
          .filter((m: ChatMsg) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-8)
      : []

    if (!message.trim()) {
      return NextResponse.json({ error: 'Mesajul lipsește' }, { status: 400 })
    }

    let estimateContext = 'Nu există proiect activ.'
    if (projectId) {
      const row = await db.project.findUnique({ where: { id: projectId }, include: { rooms: true } })
      if (row) {
        const materials = await db.material.findMany()
        const labor = await db.laborRate.findMany()
        const est = computeEstimate({ project: toProjectData(row), rooms: row.rooms, materials, labor })
        estimateContext = buildEstimateContext(est)
      }
    }

    const systemPrompt = `Ești „Asistentul Devizier AI" — expert în construcții pentru piața din Republica Moldova. Răspunzi EXCLUSIV în limba română, concis și clar.

DATELE REALE ALE PROIECTULUI (calculate de motorul determinist al aplicației — NU le modifica, NU inventa alte cifre):
${estimateContext}

REGULI STRICTE:
1. NU inventa niciodată prețuri, cantități, norme tehnice sau rezultate de calcul. Când vorbești despre cifre, folosește DOAR datele de mai sus și spune de unde provin.
2. Poți explica materialele, diferențele dintre variante economice/premium, avantajele și limitele soluțiilor, în general.
3. Dacă lipesc informații (dimensiuni, tipuri de finisaj, obiecte sanitare), identifică-le și cere clarificări.
4. Sugerează alternative de materiale cu argumente generale, dar precizează că prețurile exacte trebuie verificate în modulul „Prețuri".
5. Pentru structuri portante, fundații, armături, instalații electrice și de gaz: recomandă întotdeauna verificarea de către un proiectant autorizat.
6. Dacă utilizatorul cere estimări pe care nu le ai în date, spune clar că nu ai datele necesare și ce trebuie completat.
7. Format: texte scurte, liste cu pauze, fără markdown excesiv (max. titluri cu **text**).`

    const { default: ZAI } = await import('z-ai-web-dev-sdk')
    const zai = await ZAI.create()
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
      max_tokens: 900,
    })

    const reply = completion.choices?.[0]?.message?.content ?? 'Scuză, nu am putut genera un răspuns.'
    return NextResponse.json({ reply })
  } catch (e) {
    console.error('POST /api/ai/chat', e)
    return NextResponse.json(
      { error: 'Asistentul AI nu este disponibil pe acest server. Restul aplicației funcționează normal.' },
      { status: 503 }
    )
  }
}
