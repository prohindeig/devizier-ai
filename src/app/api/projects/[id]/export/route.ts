import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { toProjectData, guardProject } from '@/lib/api-utils'
import { computeEstimate } from '@/lib/calc/engine'

type Ctx = { params: Promise<{ id: string }> }

// Nume fișier ASCII-safe (header-urile HTTP nu acceptă diacritice)
const norm = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'proiect'

/**
 * Export deviz:
 *  ?format=xlsx — Excel cu FORMULE (modifici prețul/cursul → se recalculează)
 *  ?format=csv  — CSV simplu
 *  ?currency=EUR|USD|RON|MDL — conversie cu cursul indicat în fișier
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params

    const g = await guardProject(id)
    if (!g.ok) return g.res
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'xlsx'
  const currency = (searchParams.get('currency') ?? 'MDL').toUpperCase()

  const row = await db.project.findUnique({ where: { id }, include: { rooms: { orderBy: { order: 'asc' } } } })
  if (!row) return new Response(JSON.stringify({ error: 'Proiect inexistent' }), { status: 404 })
  const materials = await db.material.findMany()
  const labor = await db.laborRate.findMany()
  const est = computeEstimate({ project: toProjectData(row), rooms: row.rooms, materials, labor })

  // Cursul din setări (editabil)
  const settingsRow = await db.appSetting.findUnique({ where: { key: 'currency_rates' } })
  const rates = settingsRow ? (JSON.parse(settingsRow.value) as Record<string, number>) : { MDL: 1, EUR: 19.6, USD: 17.6, RON: 4.42 }
  const rate = rates[currency] ?? 1

  if (format === 'csv') {
    const lines: string[] = []
    lines.push(`Devizier AI - Deviz estimativ;${est.project.name};${est.project.locality};Generat: ${new Date().toLocaleString('ro-RO')};Moneda: ${currency};Curs: 1 ${currency} = ${rate} MDL`)
    lines.push('Etapa;Cod;Material;Categorie;Cantitate neta;Pierderi %;Rezerva %;Cantitate finala;UM;Ambalaj;Nr ambalaje;Cantitate achizitie;Pret unitar MDL;Pret unitar ' + currency + ';Cost total ' + currency + ';Sursa pret;Data pret')
    for (const st of est.stages) {
      for (const m of st.materials) {
        const cells = [
          st.title, m.code, m.name, m.category,
          m.netQty, m.wastePct, m.reservePct, m.finalQty, m.unit,
          m.packageLabel, m.packages || '-', m.purchaseQty,
          m.unitPrice, (m.unitPrice / rate).toFixed(2), (m.totalPrice / rate).toFixed(2),
          m.priceSource, m.priceDate,
        ]
        lines.push(cells.join(';'))
      }
      for (const l of st.labor) {
        const cells = [
          st.title, l.code, `MANOPERA: ${l.name}`, 'Manopera',
          l.qty, '', '', l.qty, l.unit, '', '-', l.qty,
          l.unitPrice, (l.unitPrice / rate).toFixed(2), (l.totalPrice / rate).toFixed(2),
          l.source === 'manual' ? 'manual' : 'indicativ', '',
        ]
        lines.push(cells.join(';'))
      }
    }
    lines.push(`;;;;;;;TOTAL MATERIALE;;;;;;${(est.totals.materials / rate).toFixed(2)};`)
    lines.push(`;;;;;;;TOTAL MANOPERA;;;;;;${(est.totals.labor / rate).toFixed(2)};`)
    lines.push(`;;;;;;;COSTURI SUPLIMENTARE;;;;;;${(est.totals.extra / rate).toFixed(2)};`)
    lines.push(`;;;;;;;TOTAL GENERAL;;;;;;${(est.totals.grand / rate).toFixed(2)};`)
    const csv = '\uFEFF' + lines.join('\n') // BOM pentru Excel ro
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="deviz_${norm(est.project.name)}.csv"`,
      },
    })
  }

  // ── XLSX cu formule ───────────────────────────────────────
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  const wsRows: (string | number | { f: string })[][] = []
  wsRows.push([`DEVIZ ESTIMATIV — ${est.project.name}`])
  wsRows.push([`Localitate: ${est.project.locality || '—'}   Tip proiect: ${est.project.type}   Suprafață construită: ${est.project.builtArea} m²   Suprafață utilă: ${est.project.usefulArea || '—'} m²   Etaje: ${est.project.floors}`])
  wsRows.push([`Generat: ${new Date().toLocaleString('ro-RO')}   Moneda: ${currency}   Cursul se editează în celula D4 → toate totalurile se recalculează automat`])
  const RATE_CELL = 'D4'
  wsRows.push(['CURS:', '', `${currency}`, rate])
  wsRows.push([])
  wsRows.push(['Etapa', 'Cod', 'Material / Lucrare', 'Categorie', 'Cant. netă', 'Pierderi %', 'Rezervă %', 'Cant. finală', 'UM', 'Ambalaj', 'Nr. amb.', 'Cant. achiziție', 'Preț MDL', `Preț ${currency}`, `Total ${currency}`, 'Sursă preț', 'Data preț'])
  const subtotalRows: number[] = []
  for (const st of est.stages) {
    if (st.materials.length === 0 && st.labor.length === 0) continue
    wsRows.push([st.title])
    const stageRows: number[] = []
    for (const m of st.materials) {
      const rowIdx = wsRows.length + 1
      const purchaseCell = m.pricing === 'continuous' ? `H${rowIdx}` : `K${rowIdx}*J${rowIdx}`
      const priceCell = `M${rowIdx}/${RATE_CELL}`
      const totalCell = `N${rowIdx}*O${rowIdx}`
      wsRows.push([
        '', m.code, m.name, m.category,
        m.netQty, m.wastePct, m.reservePct, m.finalQty, m.unit,
        m.packageLabel, m.packages || '', m.purchaseQty,
        m.unitPrice, { f: priceCell }, { f: totalCell },
        m.priceStatus === 'lipsa' ? 'PREȚ LIPSĂ' : m.priceSource, m.priceDate,
      ])
      stageRows.push(rowIdx)
    }
    for (const l of st.labor) {
      const rowIdx = wsRows.length + 1
      const priceCell = `M${rowIdx}/${RATE_CELL}`
      const totalCell = `N${rowIdx}*O${rowIdx}`
      wsRows.push([
        '', l.code, `MANOPERA: ${l.name}`, 'Manoperă',
        l.qty, '', '', l.qty, l.unit, '', '', l.qty,
        l.unitPrice, { f: priceCell }, { f: totalCell },
        l.source === 'manual' ? 'manual' : 'indicativ', '',
      ])
      stageRows.push(rowIdx)
    }
    if (stageRows.length > 0) {
      const rowIdx = wsRows.length + 1
      wsRows.push([`SUBTOTAL ${st.title.split('—')[0].trim()}`, '', '', '', '', '', '', '', '', '', '', '', '', '', { f: `SUM(O${stageRows[0]}:O${stageRows[stageRows.length - 1]})` }])
      subtotalRows.push(rowIdx)
    }
  }
  wsRows.push([])
  wsRows.push(['TOTAL GENERAL (materiale + manoperă)', '', '', '', '', '', '', '', '', '', '', '', '', '', { f: subtotalRows.map((x) => `O${x}`).join('+') }])
  const ws = XLSX.utils.aoa_to_sheet(wsRows)
  ws['!cols'] = [{ wch: 32 }, { wch: 16 }, { wch: 52 }, { wch: 22 }, { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 10 }, { wch: 6 }, { wch: 24 }, { wch: 7 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 26 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Deviz')

  // Sheet 2: Baza de prețuri
  const priceRows: (string | number)[][] = [['Cod', 'Denumire', 'Categorie', 'Producător', 'Specificații', 'UM', 'Ambalaj', 'Cant./amb.', 'Preț MDL', 'Furnizor', 'Localitate', 'Sursă', 'Data', 'Link']]
  for (const m of [...materials].sort((a, b) => a.code.localeCompare(b.code))) {
    priceRows.push([m.code, m.name, m.category, m.manufacturer, m.spec, m.unit, m.packageLabel, m.packageQty, m.price, m.supplier, m.locality, m.source, m.priceDate, m.link])
  }
  const wsPrices = XLSX.utils.aoa_to_sheet(priceRows)
  wsPrices['!cols'] = [{ wch: 18 }, { wch: 50 }, { wch: 22 }, { wch: 14 }, { wch: 28 }, { wch: 6 }, { wch: 22 }, { wch: 9 }, { wch: 10 }, { wch: 24 }, { wch: 16 }, { wch: 10 }, { wch: 11 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsPrices, 'Baza de prețuri')

  // Sheet 3: Camere & geometrie
  const roomRows: (string | number)[][] = [['Cameră', 'Tip', 'Etaj', 'Lungime m', 'Lățime m', 'Înălțime m', 'Suprafață pardoseală m²', 'Perimetru m', 'Pereți bruti m²', 'Goluri m²', 'Pereți nete m²', 'Tavan m²', 'Volum m³', 'Pardoseală', 'Finisaj pereți', 'Tavan']]
  for (const room of row.rooms) {
    const g = roomGeo(room, row.roomHeight)
    roomRows.push([room.name, room.type, room.floorIndex + 1, room.length, room.width, g.height, g.floorArea, g.perimeter, g.grossWallArea, g.openingsArea, g.netWallArea, g.ceilingArea, g.volume, room.floorType, room.wallFinish, room.ceilingType])
  }
  const wsRooms = XLSX.utils.aoa_to_sheet(roomRows)
  wsRooms['!cols'] = [{ wch: 18 }, { wch: 12 }, { wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsRooms, 'Camere')

  // Sheet 4: Ipoteze & avertismente
  const hypRows: string[][] = [['IPOTEZE DE CALCUL, NORME ȘI AVERTISMENTE'], ['Generat:', new Date().toLocaleString('ro-RO')], ['Status:', est.isEstimate ? 'ESTIMARE PRELIMINARĂ (lipsesc date)' : 'Calcul complet pe datele introduse'], []]
  for (const st of est.stages) {
    if (st.assumptions.length === 0 && st.warnings.length === 0) continue
    hypRows.push([st.title])
    for (const a of st.assumptions) hypRows.push(['IPOTEZĂ', a])
    for (const w of st.warnings) hypRows.push(['AVERTISMENT', w])
    hypRows.push([])
  }
  hypRows.push(['AVERTISMENTE GENERALE'])
  for (const w of est.globalWarnings) hypRows.push(['', w])
  hypRows.push([])
  hypRows.push(['IMPORTANT', 'Aplicația este un instrument de planificare și estimare, nu un substitut pentru proiectarea tehnică autorizată.'])
  hypRows.push(['IMPORTANT', 'Prețurile „indicativ" sunt orientative pentru piața din Republica Moldova și trebuie verificate. Normele de consum apar în coloanele „Pierderi/Rezervă" și în notele fiecărui material.'])
  const wsHyp = XLSX.utils.aoa_to_sheet(hypRows)
  wsHyp['!cols'] = [{ wch: 22 }, { wch: 130 }]
  XLSX.utils.book_append_sheet(wb, wsHyp, 'Ipoteze')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="deviz_${norm(est.project.name)}.xlsx"`,
    },
  })
}

function roomGeo(room: { length: number; width: number; height: number | null; doorCount: number; doorWidth: number; doorHeight: number; windowCount: number; windowWidth: number; windowHeight: number }, projectRoomHeight: number) {
  const h = room.height && room.height > 0 ? room.height : projectRoomHeight
  const floorArea = room.length * room.width
  const perimeter = 2 * (room.length + room.width)
  const gross = perimeter * h
  const openings = room.doorCount * room.doorWidth * room.doorHeight + room.windowCount * room.windowWidth * room.windowHeight
  return {
    height: h,
    floorArea: Math.round(floorArea * 100) / 100,
    perimeter: Math.round(perimeter * 100) / 100,
    grossWallArea: Math.round(gross * 100) / 100,
    openingsArea: Math.round(openings * 100) / 100,
    netWallArea: Math.round(Math.max(gross - openings, 0) * 100) / 100,
    ceilingArea: Math.round(floorArea * 100) / 100,
    volume: Math.round(floorArea * h * 100) / 100,
  }
}
