'use client'

import type { EstimateResult } from '@/lib/calc/types'

/**
 * Export PDF client-side cu jsPDF + jspdf-autotable.
 * Font DejaVu Sans (încărcat din public/fonts) pentru diacritice românești.
 */
export async function exportPdf(estimate: EstimateResult) {
  const { default: jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const loadFont = async (path: string): Promise<string> => {
    const res = await fetch(path)
    if (!res.ok) throw new Error(`Font lipsă: ${path}`)
    const buf = await res.arrayBuffer()
    let binary = ''
    const bytes = new Uint8Array(buf)
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }
    return btoa(binary)
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const regular = await loadFont('/fonts/DejaVuSans.ttf')
  const bold = await loadFont('/fonts/DejaVuSans-Bold.ttf')
  doc.addFileToVFS('DejaVuSans.ttf', regular)
  doc.addFont('DejaVuSans.ttf', 'DejaVu', 'normal')
  doc.addFileToVFS('DejaVuSans-Bold.ttf', bold)
  doc.addFont('DejaVuSans-Bold.ttf', 'DejaVu', 'bold')
  doc.setFont('DejaVu', 'normal')

  const p = estimate.project
  const money = (v: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(v) + ' MDL'
  const num = (v: number, d = 2) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: d, minimumFractionDigits: d }).format(v)

  // ── Pagina 1: antet + date proiect ───────────────────────
  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, 210, 34, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('DejaVu', 'bold')
  doc.setFontSize(20)
  doc.text('Devizier AI', 14, 15)
  doc.setFont('DejaVu', 'normal')
  doc.setFontSize(10)
  doc.text('Calculator inteligent pentru construcții — deviz estimativ', 14, 23)
  doc.setFontSize(8)
  doc.text(`Generat: ${new Date().toLocaleString('ro-RO')}`, 196, 15, { align: 'right' })
  doc.text(estimate.isEstimate ? 'STATUS: ESTIMARE PRELIMINARĂ' : 'STATUS: calcul complet pe datele introduse', 196, 23, { align: 'right' })

  doc.setTextColor(30, 41, 59)
  autoTable(doc, {
    startY: 40,
    head: [['Datele proiectului', '']],
    body: [
      ['Denumire', p.name],
      ['Localitate', p.locality || '—'],
      ['Tip proiect', p.type],
      ['Nivel finisare', p.finishLevel],
      ['Suprafață construită', `${num(p.builtArea, 1)} m²`],
      ['Suprafață utilă', p.usefulArea > 0 ? `${num(p.usefulArea, 1)} m²` : `≈ ${num(p.builtArea * p.floors * 0.85, 1)} m² (estimat)`],
      ['Etaje / înălțime camere', `${p.floors} et. / ${num(p.roomHeight, 2)} m`],
      ['Fundație', p.foundationType],
      ['Pereți exteriori', p.extWallSystem],
      ['Pereți interiori', p.intWallSystem],
      ['Acoperiș', `${p.roofType}, pantă ${p.roofSlope}°, ${p.roofCovering}`],
      ['Buget disponibil', p.budget > 0 ? money(p.budget) : 'neindicat'],
      ['Moneda de calcul', p.currency],
    ],
    theme: 'grid',
    styles: { font: 'DejaVu', fontSize: 8.5, cellPadding: 1.8 },
    headStyles: { font: 'DejaVu', fillColor: [30, 58, 95], fontSize: 9 },
    columnStyles: { 0: { cellWidth: 55, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  })

  const geoY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4
  autoTable(doc, {
    startY: geoY,
    head: [['Geometrie calculată (motor determinist)', 'Valoare']],
    body: [
      ['Perimetru exterior estimat', `${num(estimate.geometry.exteriorPerimeter, 1)} m`],
      ['Suprafață fațadă (netă)', `${num(estimate.geometry.facadeArea, 1)} m²`],
      ['Suprafață acoperiș (reală, cu panta)', `${num(estimate.geometry.roofRealArea, 1)} m²`],
      ['Pereți interiori neti', `${num(estimate.geometry.totalWallArea, 1)} m²`],
      ['Goluri ferestre', `${estimate.geometry.windowsCount} buc / ${num(estimate.geometry.windowsArea, 1)} m²`],
      ['Uși interior / exterior', `${estimate.geometry.interiorDoors} / ${estimate.geometry.exteriorDoors} buc`],
    ],
    theme: 'grid',
    styles: { font: 'DejaVu', fontSize: 8.5, cellPadding: 1.8 },
    headStyles: { font: 'DejaVu', fillColor: [100, 116, 139], fontSize: 9 },
    columnStyles: { 0: { cellWidth: 75 } },
    margin: { left: 14, right: 14 },
  })

  // ── Etapele devizului ────────────────────────────────────
  for (const st of estimate.stages) {
    if (st.materials.length === 0 && st.labor.length === 0) continue
    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
      head: [[`${st.title}`, 'Cant.', 'UM', 'Preț unitar', 'Cost total']],
      body: [
        ...st.materials.map((m) => [
          m.name + (m.priceStatus === 'lipsa' ? '  [PREȚ LIPSĂ]' : ''),
          m.pricing === 'continuous' ? num(m.purchaseQty, 1) : `${m.packages} amb.`,
          m.pricing === 'continuous' ? m.unit : m.packageLabel,
          m.priceStatus === 'lipsa' ? 'de completat' : money(m.unitPrice),
          money(m.totalPrice),
        ]),
        ...st.labor.map((l) => [
          `Manoperă: ${l.name}`,
          num(l.qty, 1),
          l.unit,
          money(l.unitPrice),
          money(l.totalPrice),
        ]),
      ],
      foot: [[`Subtotal ${st.title.split('—')[0].trim()}`, '', '', '', money(st.stageTotal)]],
      theme: 'striped',
      styles: { font: 'DejaVu', fontSize: 7.6, cellPadding: 1.5 },
      headStyles: { font: 'DejaVu', fillColor: [30, 58, 95], fontSize: 8.5 },
      footStyles: { font: 'DejaVu', fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 84 }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
  }

  // ── Totaluri ─────────────────────────────────────────────
  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
    head: [['TOTALURI', 'MDL']],
    body: [
      ['Materiale', money(estimate.totals.materials)],
      ['Manoperă', money(estimate.totals.labor)],
      ['Costuri suplimentare (transport, utilaje, deșeuri)', money(estimate.totals.extra)],
      ...(estimate.totals.contingency > 0 ? [['Rezervă imprevizite', money(estimate.totals.contingency)]] : []),
      ['TOTAL GENERAL', money(estimate.totals.grand)],
      ['Cost pe m² util', `${new Intl.NumberFormat('ro-RO').format(estimate.totals.perSqm)} MDL/m²`],
      ...(p.budget > 0 ? [['Diferența față de buget', money(estimate.totals.budgetDiff)]] : []),
    ],
    theme: 'grid',
    styles: { font: 'DejaVu', fontSize: 9, cellPadding: 2 },
    headStyles: { font: 'DejaVu', fillColor: [30, 58, 95], fontSize: 10 },
    columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [249, 115, 22]
        data.cell.styles.textColor = [255, 255, 255]
      }
    },
    margin: { left: 14, right: 14 },
  })

  // ── Ipoteze & avertismente ───────────────────────────────
  const hypBody: string[][] = []
  for (const st of estimate.stages) {
    for (const a of st.assumptions) hypBody.push([st.title.split('—')[0].trim(), a])
  }
  for (const w of estimate.globalWarnings) hypBody.push(['GENERAL', w])
  for (const st of estimate.stages) {
    for (const w of st.warnings) hypBody.push([st.title.split('—')[0].trim(), w])
  }
  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
    head: [['IPOTEZE DE CALCUL ȘI AVERTISMENTE', 'Descriere']],
    body: hypBody,
    theme: 'grid',
    styles: { font: 'DejaVu', fontSize: 7.2, cellPadding: 1.4 },
    headStyles: { font: 'DejaVu', fillColor: [100, 116, 139], fontSize: 8.5 },
    columnStyles: { 0: { cellWidth: 34, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  })

  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFont('DejaVu', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 116, 139)
    doc.text('Devizier AI — instrument de planificare și estimare. NU este o ofertă comercială reală. Verificați calculele structurale și instalațiile cu specialiști autorizați.', 14, 290)
    doc.text(`Pagina ${i} / ${pages}`, 196, 290, { align: 'right' })
  }

  doc.save(`deviz_${p.name.replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 40)}.pdf`)
}
