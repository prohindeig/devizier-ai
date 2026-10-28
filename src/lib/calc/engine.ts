import {
  MATERIAL_DEFS,
  LABOR_DEFS,
  NORMS,
  type MaterialDef,
  type PricingMode,
} from './catalog'
import {
  STAGE_LIST,
  ELECTRIC_POINTS,
  type EstimateResult,
  type LaborLine,
  type LaborRateRow,
  type MaterialLine,
  type MaterialPriceRow,
  type ProjectData,
  type RoomConfig,
  type RoomData,
  type StageResult,
  type ProgressCheck,
} from './types'

/** Configul camerei (acceptă obiect, JSON din DB sau valori lipsă). */
export function parseRoomConfig(v: RoomData['config']): RoomConfig {
  if (!v) return {}
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as RoomConfig
    } catch {
      return {}
    }
  }
  if (typeof v === 'object') return v as RoomConfig
  return {}
}

// ─────────────────────────────────────────────────────────────
// Motor de calcul DETERMINIST.
// Nu folosește AI și nu inventează prețuri: fiecare cantitate
// provine din geometrie + norme de consum explicit documentate.
// ─────────────────────────────────────────────────────────────

const r2 = (x: number) => Math.round(x * 100) / 100
// Format ro-RO (virgulă zecimală) pentru șirurile de ipoteze/note
const fmtRo = (x: number, d = 2) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: d }).format(x)

export interface RoomGeometry {
  floorArea: number
  perimeter: number
  grossWallArea: number
  openingsArea: number
  netWallArea: number
  ceilingArea: number
  volume: number
  height: number
}

/** Geometria unei camere: suprafețe calculate automat din dimensiuni. */
export function computeRoomGeometry(room: RoomData, projectRoomHeight: number): RoomGeometry {
  const h = room.height && room.height > 0 ? room.height : projectRoomHeight
  const floorArea = room.length * room.width
  const perimeter = 2 * (room.length + room.width)
  const grossWallArea = perimeter * h
  const openingsArea =
    room.doorCount * room.doorWidth * room.doorHeight +
    room.windowCount * room.windowWidth * room.windowHeight
  const netWallArea = Math.max(grossWallArea - openingsArea, 0)
  return {
    floorArea: r2(floorArea),
    perimeter: r2(perimeter),
    grossWallArea: r2(grossWallArea),
    openingsArea: r2(openingsArea),
    netWallArea: r2(netWallArea),
    ceilingArea: r2(floorArea),
    volume: r2(floorArea * h),
    height: h,
  }
}

// ── Acumulator intern ────────────────────────────────────────

interface AccLine {
  code: string
  net: number
  notes: string[]
}

class StageBuilder {
  materials = new Map<string, AccLine>()
  labor = new Map<string, { code: string; qty: number }>()
  assumptions: string[] = []
  warnings: string[] = []

  add(code: string, netQty: number, note?: string) {
    if (!netQty || !isFinite(netQty) || netQty <= 0) return
    const cur = this.materials.get(code)
    if (cur) {
      cur.net += netQty
      if (note && !cur.notes.includes(note)) cur.notes.push(note)
    } else {
      this.materials.set(code, { code, net: netQty, notes: note ? [note] : [] })
    }
  }

  addLabor(code: string, qty: number) {
    if (!qty || !isFinite(qty) || qty <= 0) return
    const cur = this.labor.get(code)
    if (cur) cur.qty += qty
    else this.labor.set(code, { code, qty })
  }
}

export interface EngineInput {
  project: ProjectData
  rooms: RoomData[]
  materials: MaterialPriceRow[]
  labor: LaborRateRow[]
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Etapele activate în funcție de tipul proiectului. */
export function isStageEnabled(project: ProjectData, stageKey: string): boolean {
  const t = project.type
  switch (stageKey) {
    case 'pregatire':
    case 'fundatie':
    case 'structura':
    case 'acoperis':
      return t === 'casa_noua' || t === 'extindere'
    case 'pereti':
      return t === 'casa_noua' || t === 'extindere' || t === 'renovare'
    case 'exterior':
      return project.exteriorEnabled
    default:
      return true
  }
}

// ─────────────────────────────────────────────────────────────
// FUNCȚIA PRINCIPALĂ — calculează devizul complet
// ─────────────────────────────────────────────────────────────

export function computeEstimate(input: EngineInput): EstimateResult {
  const { project, rooms } = input
  const options = project.options ?? {}

  // Index de prețuri: rândul principal (isPrimary) per cod, determinist
  const priceRows = new Map<string, MaterialPriceRow>()
  const offersPerCode = new Map<string, number>()
  for (const m of [...input.materials].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.price - b.price)) {
    offersPerCode.set(m.code, (offersPerCode.get(m.code) ?? 0) + 1)
    if (!priceRows.has(m.code)) priceRows.set(m.code, m)
  }
  const laborRows = new Map<string, LaborRateRow>()
  for (const l of input.labor) laborRows.set(l.code, l)

  // ── Geometria casei (ipoteze documentate) ─────────────────
  const builtArea = Math.max(project.builtArea, 1)
  const houseWidth = Math.sqrt(builtArea / 1.3) // latură scurtă, raport 1:1,3
  const houseLength = houseWidth * 1.3
  const extPerim = 2 * (houseWidth + houseLength)
  const floors = Math.max(project.floors, 1)
  const roomH = project.roomHeight

  // Pereți interiori: derivați din perimetrele camerelor (scalati cu
  // gradul de acoperire al amprentei, ipoteză documentată)
  const roomsPerimeter = rooms.reduce((s, r) => s + 2 * (r.length + r.width), 0)
  const totalRoomArea = rooms.reduce((s, r) => s + r.length * r.width, 0)
  const coverage = Math.min(totalRoomArea / builtArea, 1)
  const partitions = Math.max(roomsPerimeter / 2 - extPerim * coverage, 0)

  const roomGeos = rooms.map((r) => computeRoomGeometry(r, roomH))
  const totalFloorArea = roomGeos.reduce((s, g) => s + g.floorArea, 0)
  const totalNetWallArea = roomGeos.reduce((s, g) => s + g.netWallArea, 0)
  const totalCeilingArea = roomGeos.reduce((s, g) => s + g.ceilingArea, 0)
  const windowsArea = rooms.reduce((s, r) => s + r.windowCount * r.windowWidth * r.windowHeight, 0)
  const windowsCount = rooms.reduce((s, r) => s + r.windowCount, 0)
  const doorsTotal = rooms.reduce((s, r) => s + r.doorCount, 0)
  const extDoors = Math.max(options.extDoors ?? 1, 0)
  const intDoors = Math.max(doorsTotal - extDoors, rooms.length > 0 ? 1 : 0)
  const extDoorsArea = extDoors * 1.0 * 2.05
  const openingsFacade = windowsArea + extDoorsArea
  const facadeArea = Math.max(extPerim * roomH * floors - openingsFacade, 0)
  const usefulArea = project.usefulArea > 0 ? project.usefulArea : builtArea * floors * 0.85

  const wallHTotal = roomH * floors

  // ── Constructori de etape ─────────────────────────────────
  const builders = new Map<string, StageBuilder>()
  for (const st of STAGE_LIST) builders.set(st.key, new StageBuilder())
  const B = (key: string) => builders.get(key)!

  // ─────────── ETAPA 1 — PREGĂTIREA TERENULUI ──────────────
  if (isStageEnabled(project, 'pregatire')) {
    const b = B('pregatire')
    let digVol = 0
    if (project.foundationType === 'banda') {
      const interiorFound = (houseWidth + houseLength) * 0.5
      digVol = extPerim * NORMS.latimeSapatura * NORMS.adancimeSapatura +
        interiorFound * 0.4 * NORMS.adancimeSapatura
      b.assumptions.push(`Săpătură bandă: perimetru ${fmtRo(extPerim)} m × ${fmtRo(NORMS.latimeSapatura)} m lățime × ${fmtRo(NORMS.adancimeSapatura)} m adâncime + pereți portanți interiori ${fmtRo(interiorFound)} m (ipoteză: linie centrală)`)
    } else if (project.foundationType === 'placa') {
      digVol = (houseWidth + 2) * (houseLength + 2) * 0.4
      b.assumptions.push(`Excavare placă: ${fmtRo(houseWidth + 2)} × ${fmtRo(houseLength + 2)} m × 0,4 m adâncime`)
    } else {
      const nrPiloni = Math.ceil(extPerim / 3)
      digVol = extPerim * 0.35 * 1.2 + nrPiloni * Math.PI * 0.09 * 2.0
      b.assumptions.push(`Săpături grinzi perimetrale + ${nrPiloni} foraje piloni Ø0,6 m × 2,0 m (ipoteză)`)
    }
    b.add('nisip', builtArea * 0.1 * 1.25, 'strat nisip 10 cm, factor compactare 1,25')
    b.add('piatris', builtArea * 0.15 * 1.25, 'strat piatriș 15 cm, factor compactare 1,25')
    b.addLabor('decopertare', builtArea)
    b.addLabor('sapatura_utilaj', digVol * 0.8)
    b.addLabor('sapatura_manuala', digVol * 0.2, )
    b.addLabor('evacuare_pamant', digVol * 1.15)
    b.addLabor('nivelare', builtArea)
    b.addLabor('compactare', builtArea * 2)
    b.assumptions.push('Strat vegetal decopertat 20 cm, inclus în evacuare (15% răspândire)')
    b.assumptions.push('Săpături: 80% excavator, 20% manual (dreptunghiulare, evacuare 100%)')
    b.warnings.push('Verificați natura terenului și nivelul freatic — pot fi necesare studii geotehnice.')
  }

  // ─────────── ETAPA 2 — FUNDAȚIA ──────────────────────────
  if (isStageEnabled(project, 'fundatie')) {
    const b = B('fundatie')
    const betonCode = 'beton_c20_25'
    if (project.foundationType === 'banda') {
      const interiorFound = (houseWidth + houseLength) * 0.5
      const foundLen = extPerim + interiorFound
      const betonVol = foundLen * NORMS.latimeBanda * NORMS.inaltimeBanda
      b.add(betonCode, betonVol)
      const armKg = betonVol * NORMS.armaturaFundaBanda
      b.add('armatura_d12', armKg, `normă ${NORMS.armaturaFundaBanda} kg/m³ beton`)
      b.add('sarma_legat', armKg * NORMS.sarmaLegat, '1,5% din masa armăturii')
      b.add('distantiere', foundLen * NORMS.distantiereBanda, '2,5 buc/m fundație')
      const cofrajArea = foundLen * NORMS.inaltimeBanda * 2
      b.add('scanduri_cofraj', cofrajArea, 'două fețe × înălțimea benzii')
      b.add('cuie', cofrajArea * NORMS.cuieCofraj, `normă ${NORMS.cuieCofraj} kg/m² cofraj`)
      const hidroArea = foundLen * NORMS.latimeBanda + foundLen * NORMS.inaltimeBanda
      b.add('membrana_bitum', hidroArea * 1.15, 'orizontal + vertical, suprapuneri 15%')
      b.add('tub_dren', extPerim * 1.05, 'perimetru + 5% racorduri')
      b.add('piatris_sor', extPerim * 0.3 * 0.2, 'șanț dren 0,3 × 0,2 m')
      b.add('geotextil', extPerim * 0.6, 'înălțime șanț dren × 2 fețe')
      b.addLabor('turnare_beton', betonVol)
      b.addLabor('armare', armKg / 1000)
      b.addLabor('cofraj', cofrajArea)
      b.addLabor('hidroizolatie', hidroArea)
      b.assumptions.push(`Secțiune bandă ${NORMS.latimeBanda}×${NORMS.inaltimeBanda} m — DIMENSIUNILE DEFINITIVE SE STABILESC PRIN PROIECT TEHNIC`)
      b.assumptions.push(`Lungime fundație = perimetru exterior + ipoteză pereți portanți interiori`)
    } else if (project.foundationType === 'placa') {
      const betonVol = builtArea * NORMS.grosimePlaca
      b.add(betonCode, betonVol)
      const armKg = betonVol * NORMS.armaturaPlaca
      b.add('armatura_d10', armKg, `normă ${NORMS.armaturaPlaca} kg/m³ (dublu rețea)`)
      b.add('sarma_legat', armKg * NORMS.sarmaLegat)
      b.add('distantiere', builtArea * NORMS.distantierePlaca, '4 buc/m²')
      const cofrajArea = extPerim * NORMS.grosimePlaca
      b.add('scanduri_cofraj', cofrajArea)
      b.add('cuie', cofrajArea * NORMS.cuieCofraj)
      b.add('folie_plastic', builtArea * 1.2, 'sub placă, 20% suprapuneri')
      b.add('membrana_bitum', builtArea * 1.15)
      b.add('geotextil', builtArea * 1.1)
      b.addLabor('turnare_beton', betonVol)
      b.addLabor('armare', armKg / 1000)
      b.addLabor('cofraj', cofrajArea)
      b.addLabor('hidroizolatie', builtArea)
      b.assumptions.push(`Grosime placă ${NORMS.grosimePlaca} m, dublu rețea de armătură — necesită calcul static`)
    } else {
      const nrPiloni = Math.ceil(extPerim / 3)
      const betonPiloni = nrPiloni * Math.PI * 0.09 * 2.0
      const betonGrinzi = extPerim * 0.3 * 0.4
      const betonVol = betonPiloni + betonGrinzi
      b.add(betonCode, betonVol)
      const armKg = betonVol * NORMS.armaturaFundaBanda
      b.add('armatura_d12', armKg, `normă ${NORMS.armaturaFundaBanda} kg/m³`)
      b.add('sarma_legat', armKg * NORMS.sarmaLegat)
      b.add('distantiere', extPerim * NORMS.distantiereBanda)
      const cofrajArea = extPerim * 0.4 * 2
      b.add('scanduri_cofraj', cofrajArea, 'cofraj grinzi, 2 fețe')
      b.add('cuie', cofrajArea * NORMS.cuieCofraj)
      b.add('membrana_bitum', extPerim * 0.3 * 1.15)
      b.addLabor('turnare_beton', betonVol)
      b.addLabor('armare', armKg / 1000)
      b.addLabor('cofraj', cofrajArea)
      b.addLabor('hidroizolatie', extPerim * 0.3)
      b.assumptions.push(`${nrPiloni} piloni Ø0,6 m la pas de 3 m + grinzi perimetrale 0,3×0,4 m`)
      b.warnings.push('Sistemul „piloni + grinzi" necesită obligatoriu proiect geotehnic.')
    }
    b.warnings.push('⚠ Calculul fundației este ESTIMATIV. Dimensiunile structurale definitive se stabilesc prin proiect tehnic autorizat.')
  }

  // ─────────── ETAPA 3 — STRUCTURA CASEI ───────────────────
  if (isStageEnabled(project, 'structura')) {
    const b = B('structura')
    if (project.extWallSystem === 'cadru_metalic' || project.extWallSystem === 'lemn') {
      const frameArea = extPerim * roomH * floors
      b.add('profil_metalic_cadru', frameArea * 3.2, 'cadru ~3,2 m profil/m² perete (estimativ)')
      b.add('vata_cadru', frameArea * 1.05)
      b.add('osb_3', frameArea * 1.07 * 2, 'atămare exterior + interior')
      b.warnings.push('Structura din cadru metalic/lemn necesită proiect specializat — cantitățile sunt estimative.')
    } else {
      // zidărie purtătoare cu centuri monolite
      const beltLen = extPerim + partitions * 0.5
      const nrNivele = floors + 1 // centură de fundație + coronament + intermediare
      const beltVol = beltLen * 0.25 * 0.25 * nrNivele
      const nrStalpi = Math.ceil(extPerim / 4) + 1
      const stalpiVol = nrStalpi * 0.25 * 0.25 * roomH * floors
      const betonVol = beltVol + stalpiVol
      b.add('beton_c20_25', betonVol, `centuri ${nrNivele} nivele × ${fmtRo(beltLen)} m + ${nrStalpi} stâlpi 25×25`)
      const armKg = (beltVol * NORMS.armaturaPlanseu + stalpiVol * NORMS.armaturaStalpi)
      b.add('armatura_d12', armKg, 'centuri ~85 kg/m³, stâlpi ~110 kg/m³')
      b.add('sarma_legat', armKg * NORMS.sarmaLegat)
      b.add('distantiere', beltLen * nrNivele * 2)
      const cofrajArea = beltLen * 0.25 * 2 * nrNivele + nrStalpi * 0.25 * 4 * roomH * floors
      b.add('scanduri_cofraj', cofrajArea, 'centuri 2 fețe + stâlpi 4 fețe')
      b.add('cuie', cofrajArea * NORMS.cuieCofraj)
      if (floors > 1 || project.ceilingSystem === 'monolit') {
        const slabArea = builtArea * (floors - 1)
        if (slabArea > 0) {
          const slabBeton = slabArea * 0.16
          b.add('beton_c20_25', slabBeton, `planșee intermediare ${fmtRo(slabArea)} m² × 0,16 m`)
          b.add('armatura_d10', slabArea * 0.16 * NORMS.armaturaPlanseu)
          b.add('sarma_legat', slabArea * 0.16 * NORMS.armaturaPlanseu * NORMS.sarmaLegat)
          b.add('scanduri_cofraj', slabArea * 1.05, 'cofraj planșeu (rezervă 5%)')
          b.add('distantiere', slabArea * NORMS.distantierePlaca)
          b.addLabor('turnare_beton', slabBeton)
          b.addLabor('armare', slabArea * 0.16 * NORMS.armaturaPlanseu / 1000)
          b.addLabor('cofraj', slabArea * 1.05)
        }
      }
      b.addLabor('turnare_beton', betonVol)
      b.addLabor('armare', armKg / 1000)
      b.addLabor('cofraj', cofrajArea)
      b.assumptions.push('Zidărie purtătoare + centuri monolite la toate nivelele + stâlpi la colțuri și la pas de 4 m')
      b.assumptions.push('Planșee monolite 16 cm (dacă există etaje superioare)')
      b.warnings.push('⚠ Stâlpii, centurile și planșeele NU se dimensionează automat din suprafață — necesită proiect static autorizat.')
    }
  }

  // ─────────── ETAPA 4 — PEREȚI EXTERIORI ȘI INTERIORI ─────
  if (isStageEnabled(project, 'pereti')) {
    const b = B('pereti')
    const wallGross = extPerim * roomH * floors
    const wallNet = Math.max(wallGross - openingsFacade, 0)
    if (project.extWallSystem === 'beton_celular') {
      const vol = wallNet * 0.25
      b.add('bloc_bc_25', wallNet / NORMS.blocBcAria, `aria netă ${fmtRo(wallNet)} m² / 0,15 m² per bloc`)
      b.add('adeziv_bc', vol * NORMS.adezivBetonCelular / 25, `${NORMS.adezivBetonCelular} kg/m³ → saci de 25 kg`)
      b.addLabor('zidarie_bc', vol)
    } else if (project.extWallSystem === 'caramida') {
      const vol = wallNet * 0.38
      b.add('caramida_et', wallNet * NORMS.caramidaEtM2, `${NORMS.caramidaEtM2} buc/m² perete 38 cm`)
      b.add('mortar_zidarie', vol * NORMS.mortarCaramida, `${NORMS.mortarCaramida} kg/m³ zidărie`)
      b.addLabor('zidarie_caramida', vol)
    } else if (project.extWallSystem === 'caramida_izolatie') {
      const volPortant = wallNet * 0.25
      const volFatza = wallNet * 0.12
      b.add('caramida_et', wallNet * NORMS.caramidaEtM2 * 0.62, 'perete portant 25 cm')
      b.add('polistiren_10', wallNet * 1.02, 'izolație între straturi, 10 cm')
      b.add('caramida_pl', wallNet * NORMS.caramidaPlM2, 'strat față 12 cm')
      b.add('mortar_zidarie', (volPortant + volFatza) * NORMS.mortarCaramida)
      b.add('plasa_armare', extPerim * 2 * 1.05, 'legături între straturi, 2 rânduri/m')
      b.addLabor('zidarie_caramida', volPortant + volFatza)
    } else {
      const frameArea = wallNet
      b.add('profil_metalic_cadru', frameArea * 3.2, 'estimativ')
      b.add('vata_cadru', frameArea * 1.05)
      b.add('osb_3', frameArea * 1.07)
      b.warnings.push('Cadru metalic: cantități estimative, necesită proiect specializat.')
    }
    // armare zidărie + buiandrugi peste goluri
    const nrOpenings = windowsCount + extDoors + intDoors * 0.3
    b.add('plasa_armare', extPerim * 2 * 1.05, 'primul rând + deasupra golurilor')
    b.add('buiandrug_25', nrOpenings * (1.5 + 0.6), 'lungime medie gol + 60 cm reazem (estimativ)')
    // partiții interioare
    if (partitions > 0) {
      if (project.intWallSystem === 'beton_celular_10') {
        const area = partitions * roomH * floors
        b.add('bloc_bc_10', area / 0.15, `partiții ${fmtRo(partitions)} m × ${fmtRo(roomH)} m`)
        b.add('adeziv_bc', area * 0.1 * NORMS.adezivBetonCelular / 25)
        b.addLabor('zidarie_interioara', area)
      } else if (project.intWallSystem === 'caramida') {
        const area = partitions * roomH * floors
        b.add('caramida_pl', area * NORMS.caramidaPlM2)
        b.add('mortar_zidarie', area * 0.12 * NORMS.mortarCaramida)
        b.addLabor('zidarie_caramida', area * 0.12)
      } else {
        const area = partitions * roomH * floors * 2 // ambele fețe
        b.add('gips_placa', area * 1.05)
        b.add('profil_cd', area * NORMS.profilCdPerete * 0.5)
        b.add('profil_ud', partitions * 2 * 2)
        b.add('surub_gips', area * NORMS.surubGipsPerete)
        b.add('banda_rost', area * NORMS.bandaRostM2)
        b.add('chit_rosturi', area * NORMS.chitRostM2)
        b.addLabor('gips_carton', area)
      }
      b.assumptions.push(`Lungime partiții interioare derivată din perimetrele camerelor: ${fmtRo(partitions)} m`)
    }
    b.assumptions.push(`Aria pereți exteriori: ${fmtRo(wallGross)} m² brut − ${fmtRo(openingsFacade)} m² goluri = ${fmtRo(wallNet)} m² net`)
    b.assumptions.push('Rezervă pentru pierderi aplicată la fiecare material (vezi coloana „Pierderi")')
  }

  // ─────────── ETAPA 5 — ACOPERIȘUL ────────────────────────
  if (isStageEnabled(project, 'acoperis')) {
    const b = B('acoperis')
    const roofPlan = builtArea * 1.08 // cornișe ~0,4 m
    const rad = (project.roofSlope * Math.PI) / 180
    const slopeFactor = 1 / Math.cos(rad)
    let roofReal = roofPlan * slopeFactor
    if (project.roofType === 'patru_ape') roofReal *= 1.05
    if (project.roofType === 'plan') roofReal *= 1.02
    const woodNorm = project.roofCovering === 'tigla_ceramica' ? 0.06 : NORMS.lemnAcoperis
    const woodVol = roofReal * woodNorm
    b.add('lemn_structura', woodVol, `normă ${woodNorm} m³/m² acoperiș (căpriori + pane + șipci)`)
    b.add('antiseptic', woodVol * 0.25, '0,25 L/m³ lemn')
    b.add('folie_acoperis', roofReal * 1.15, 'suprapuneri 15%')
    b.add(project.roofCovering, roofReal, `suprafață reală ${fmtRo(roofReal)} m² (plan ${fmtRo(roofPlan)} m² × pantă ${fmtRo(project.roofSlope, 0)}°)`)
    b.add('surub_acoperis', roofReal * NORMS.suruburiInvelitoare, `${NORMS.suruburiInvelitoare} buc/m²`)
    if (project.roofType !== 'plan') {
      const coamaLen = project.roofType === 'doua_ape' ? houseLength : houseLength * 0.4
      b.add('coama', coamaLen * 1.05, 'lungime coamă + 5%')
      b.add('jgheab', houseLength * 2 * 1.05, 'două laturi lungi')
      b.add('burlan', 4 * (wallHTotal + 0.5), '4 căzătoare')
      b.add('conector_lemn', Math.ceil(roofReal / 0.8 * 0.6), 'plăci și suporturi la căpriori')
      b.addLabor('jgheaburi', houseLength * 2 + 4 * (wallHTotal + 0.5))
    }
    b.add('vata_15', builtArea * 1.02, 'izolație planșeu ultim nivel, 15 cm')
    b.add('folie_vapori', builtArea * 1.05, 'barieră vapori sub izolație')
    b.addLabor('structura_acoperis', roofReal)
    b.addLabor('invelitoare', roofReal)
    b.assumptions.push(`Suprafața reală a acoperișului = aria orizontală / cos(${fmtRo(project.roofSlope, 0)}°) — NU aria construită`)
    b.assumptions.push('Panta configurabilă în formularul proiectului (implicit 30°)')
    if (project.roofType === 'plan') b.warnings.push('Acoperiș plan: necesită hidroizolație specializată (membrană TPO/PVC) — se completează după proiect.')
    b.warnings.push('⚠ Structura acoperișului (secțiune căpriori, pas) necesită calcul static.')
  }

  // ─────────── ETAPA 6 — TÂMPLĂRIE ─────────────────────────
  {
    const b = B('tamplarie')
    b.add('fereastra_pvc', windowsArea, `${windowsCount} ferestre × dimensiunile din camere`)
    b.add('glaf', rooms.reduce((s, r) => s + r.windowCount * r.windowWidth, 0) * 1.1, 'lungime ferestre + 10%')
    if (extDoors > 0) b.add('usa_ext', extDoors)
    if (intDoors > 0) {
      b.add('usa_int', intDoors)
      b.add('maner_usa', intDoors)
    }
    const nrMontaje = windowsCount + extDoors + intDoors
    b.add('spuma_montaj', nrMontaje * 1.1, '~1,1 tuburi/element de montaj')
    const sealLen = rooms.reduce((s, r) => s + r.windowCount * 2 * (r.windowWidth + r.windowHeight) + r.doorCount * 2 * (r.doorWidth + r.doorHeight), 0)
    b.add('banda_etansare', sealLen * 1.05, 'perimetru goluri + 5%')
    b.addLabor('montaj_ferestre', windowsArea)
    b.addLabor('montaj_usa_ext', extDoors)
    b.addLabor('montaj_usa_int', intDoors)
    if (rooms.length > 0) b.assumptions.push('Ferestrele și ușile se dimensionează din configuratorul camerelor (număr + dimensiuni goluri)')
  }

  // ─────────── ETAPA 7 — INSTALAȚII ELECTRICE ──────────────
  {
    const b = B('electric')
    let prize = 0, intrerupatoare = 0, iluminat = 0
    let manualRooms = 0
    let nrDedic = 0
    for (const r of rooms) {
      const cfg = parseRoomConfig(r.config)
      const pts = ELECTRIC_POINTS[r.type] ?? ELECTRIC_POINTS.camera
      prize += cfg.sockets ?? pts.prize
      intrerupatoare += cfg.switches ?? pts.intrerupatoare
      iluminat += cfg.lightPoints ?? pts.iluminat
      if (cfg.sockets != null || cfg.switches != null || cfg.lightPoints != null) manualRooms++
      nrDedic += cfg.dedicatedCircuits?.length ?? 0
    }
    if (rooms.length === 0) {
      prize = Math.round(usefulArea * 0.45)
      intrerupatoare = Math.max(Math.round(usefulArea / 25), 3)
      iluminat = Math.max(Math.round(usefulArea / 18), 4)
      b.assumptions.push('Camerele nu sunt definite — puncte estimate din suprafața utilă (0,45 prize/m²)')
    } else if (manualRooms > 0) {
      b.assumptions.push(`${manualRooms} ${manualRooms === 1 ? 'cameră are puncte electrice' : 'camere au puncte electrice'} definite manual; restul după normele pe tip de cameră`)
    } else {
      b.assumptions.push('Puncte electrice conform planului implicit per tip de cameră (prize, întrerupătoare, iluminat)')
    }
    const traseuPrize = prize * NORMS.traseuPriza
    const traseuInt = intrerupatoare * NORMS.traseuIntrerupator
    const traseuIlum = iluminat * NORMS.traseuIluminat
    b.add('cablu_3x25', traseuPrize * 1.1, `${prize} prize × ${NORMS.traseuPriza} m traseu mediu`)
    b.add('cablu_3x15', (traseuInt + traseuIlum) * 1.1, 'circuite întrerupătoare + iluminat')
    // circuite dedicate configurate: plită/cuptor pe secțiune mare, restul pe 3×2,5 mm²
    const putereDedic = rooms.reduce((s, r) => {
      const c = parseRoomConfig(r.config).dedicatedCircuits ?? []
      return s + c.filter((x) => x === 'plita' || x === 'cuptor').length
    }, 0)
    const semnalDedic = nrDedic - putereDedic
    b.add('cablu_5x4', 12 + putereDedic * 10, putereDedic > 0 ? `alimentare plită + ${putereDedic} circuit(e) putere × 10 m` : 'alimentare plită electrică (traseu ~12 m)')
    if (semnalDedic > 0) {
      b.add('cablu_3x25', semnalDedic * 12, `${semnalDedic} circuit(e) dedicate × 12 m`)
      b.add('priza', semnalDedic, 'prize pentru aparate pe circuite dedicate')
    }
    b.add('tub_ondulat', (traseuPrize + traseuInt + traseuIlum + semnalDedic * 12) * 1.05)
    b.add('doza_instal', (prize + intrerupatoare + iluminat) * NORMS.dozePentruPunct)
    b.add('priza', prize)
    b.add('intrerupator', intrerupatoare)
    b.add('corp_iluminat', iluminat + 1, '+ 1 corp exterior')
    b.add('tablou_electric', floors > 1 ? 2 : 1)
    const circuite = Math.ceil(prize / 8) + Math.ceil(iluminat / 12) + 3 + nrDedic
    b.add('disjunctor', circuite, `~${circuite} circuite (prize/iluminat/bucătărie/baie${nrDedic ? ` + ${nrDedic} dedicate` : ''})`)
    b.add('diferential', 3, '2 generale + 1 pentru baie')
    b.add('impamintare', 1)
    b.add('clema_wago', (prize + intrerupatoare + iluminat) * NORMS.clemePunct)
    b.addLabor('electric_punct', prize + intrerupatoare + iluminat)
    b.addLabor('electric_tablou', 1)
    b.warnings.push('⚠ Schema electrică definitivă (trasee, secțiuni, protecții) se proiectează obligatoriu cu un electrician autorizat.')
  }

  // ─────────── ETAPA 8 — INSTALAȚII SANITARE ȘI TERMICE ────
  const bai = rooms.filter((r) => r.type === 'baie')
  const bucatarii = rooms.filter((r) => r.type === 'bucatarie')
  {
    const b = B('sanitare')
    const nrBai = Math.max(bai.length, rooms.length > 0 ? 0 : 1)
    const nrBuc = bucatarii.length
    // obiecte sanitare: din configurarea detaliată a camerei, altfel norme pe tip
    const fixtures = rooms.map((r) => ({ r, cfg: parseRoomConfig(r.config) }))
    const totalWc = fixtures.reduce((s, x) => s + (x.cfg.wc ?? (x.r.type === 'baie' ? 1 : 0)), 0)
    const totalLavabo = fixtures.reduce((s, x) => s + (x.cfg.lavabo ?? (x.r.type === 'baie' ? 1 : 0)), 0)
    const totalCadaDus = fixtures.reduce((s, x) => s + (x.cfg.cadaDus ?? (x.r.type === 'baie' ? 1 : 0)), 0)
    const totalBideu = fixtures.reduce((s, x) => s + (x.cfg.bideu ?? 0), 0)
    const totalChiuveta = fixtures.reduce((s, x) => s + (x.cfg.chiuvetaBucatarie ?? (x.r.type === 'bucatarie' ? 1 : 0)), 0)
    const totalMasinaSpalat = fixtures.reduce((s, x) => s + (x.cfg.masinaSpalat ?? 0), 0)
    const totalMasinaVase = fixtures.reduce((s, x) => s + (x.cfg.masinaVase ?? 0), 0)
    const nrObiecte = totalWc + totalLavabo + totalCadaDus + totalBideu + totalChiuveta
    const manualFixtures = fixtures.filter((x) => x.cfg.wc != null || x.cfg.lavabo != null || x.cfg.cadaDus != null || x.cfg.bideu != null || x.cfg.chiuvetaBucatarie != null || x.cfg.masinaSpalat != null || x.cfg.masinaVase != null).length
    const teviAlimentare = nrBai * NORMS.teviBaie + nrBuc * NORMS.teviBucatarie + NORMS.teviDinCentrala
    b.add('teava_ppr', teviAlimentare * 1.1, `baie × ${NORMS.teviBaie} m + bucătărie × ${NORMS.teviBucatarie} m + traseu centrală`)
    b.add('fiting_ppr', teviAlimentare * NORMS.fitingPerM)
    b.add('robinet', nrObiecte + 2, 'câte un robinet/obiect + intrare/ieșire distribuitor')
    b.add('distribuitor', nrBai + 1, 'circuit apă rece/caldă + încălzire')
    b.add('sifon', nrObiecte + totalMasinaSpalat + totalMasinaVase, 'câte un sifon pe obiect + racorduri mașini')
    b.add('teava_canal_110', nrBai * 5 + 2, 'racorduri WC + coloană')
    b.add('teava_canal_50', nrBai * 3 + nrBuc * 4 + (totalMasinaSpalat + totalMasinaVase) * 2, 'racorduri obiecte + mașini (2 m/fiecare)')
    b.add('cot_canal_110', nrBai * 3)
    b.add('te_canal_50', nrBai * 2 + nrBuc + totalMasinaSpalat + totalMasinaVase)
    b.add('izolatie_teava', teviAlimentare * 0.5 * 1.05, 'trasee apă caldă ~50%')
    if (totalWc > 0) b.add('vas_wc', totalWc)
    if (totalLavabo > 0) b.add('lavoar', totalLavabo)
    if (totalCadaDus > 0) b.add('cada_dus', totalCadaDus)
    if (totalBideu > 0) b.add('bideu', totalBideu)
    const nrBaterii = totalLavabo + totalCadaDus + totalBideu + totalChiuveta
    if (nrBaterii > 0) b.add('baterie', nrBaterii, 'câte o baterie pe lavoar/cadă-duș/bideu/chiuvetă')
    if (totalChiuveta > 0) b.add('chiuveta_bucatarie', totalChiuveta)
    // Încălzire
    const heatingRooms = rooms.filter((r) => !['baie', 'balcon', 'camera_tehnica', 'garaj'].includes(r.type))
    const nrRadiatoare = rooms.length > 0
      ? heatingRooms.reduce((s, r) => s + (parseRoomConfig(r.config).radiators ?? 1), 0)
      : Math.max(Math.round(usefulArea / 14), 3)
    b.add('centrala', 1, 'centrală pe gaz (configurabilă)')
    b.add('radiator', nrRadiatoare)
    if (options.floorHeating !== false) {
      const baieArea = bai.reduce((s, r) => s + r.length * r.width, 0)
      b.add('teava_pex', baieArea * NORMS.pexM2Pardoseala, `încălzire în pardoseală băi: ${fmtRo(baieArea)} m² × ${fmtRo(NORMS.pexM2Pardoseala)} m/m²`)
    }
    if (options.boiler) b.add('baterie', 1, 'boiler configurat — vezi obiecte')
    b.addLabor('sanitar_punct', nrObiecte + 2)
    b.addLabor('montaj_radiator', nrRadiatoare)
    b.addLabor('montaj_centrala', 1)
    if (rooms.length === 0) {
      b.assumptions.push('Camerele nu sunt definite — obiecte sanitare estimate (1 baie + 1 bucătărie)')
    } else if (manualFixtures > 0) {
      b.assumptions.push(`${manualFixtures} ${manualFixtures === 1 ? 'cameră are obiecte sanitare' : 'camere au obiecte sanitare'} definite manual (total: ${totalWc} WC, ${totalLavabo} lavoare, ${totalCadaDus} căzi/dusuri, ${totalChiuveta} chiuvete bucătărie, ${totalMasinaSpalat + totalMasinaVase} mașini)`)
    } else {
      b.assumptions.push('Obiecte sanitare după tipul camerelor (baie: WC + lavoar + cadă/dus; bucătărie: chiuvetă) — se pot personaliza per cameră')
    }
    b.warnings.push('⚠ Schema hidraulică și dimensionarea centralei/radiatoarelor necesită calcul termic autorizat.')
  }

  // ─────────── ETAPA 9 — IZOLAȚIE ȘI FAȚADĂ ────────────────
  if (isStageEnabled(project, 'fatada')) {
    const b = B('fatada')
    if (project.extWallSystem === 'caramida_izolatie') {
      b.warnings.push('Sistem „cărămidă față" selectat — fațada nu necesită termosistem (izolația este în perete).')
    } else if (project.extWallSystem !== 'cadru_metalic' && project.extWallSystem !== 'lemn') {
      const izolCode = project.finishLevel === 'economic' ? 'polistiren_5' : project.finishLevel === 'premium' ? 'vata_10' : 'polistiren_10'
      b.add(izolCode, facadeArea * 1.05, `fațadă ${fmtRo(facadeArea)} m² + 5% pierderi`)
      b.add('adeziv_termosistem', facadeArea * (NORMS.adezivFixare + NORMS.adezivPlasa) / 25, `${NORMS.adezivFixare} kg/m² fixare + ${NORMS.adezivPlasa} kg/m² încorporare plasă`)
      b.add('dibluri_termo', facadeArea * NORMS.dibluriFatada, `${NORMS.dibluriFatada} buc/m²`)
      b.add('plasa_fatada', facadeArea * 1.1, 'suprapuneri 10%')
      b.add('profil_start', extPerim * 1.05)
      b.add('coltar_profil', Math.ceil((wallHTotal * 4 * 1.05) / 2.5), '4 colțuri × înălțimea')
      b.add('grund_aderent', facadeArea * NORMS.grundAderent)
      b.add('tencuiala_deco', facadeArea * NORMS.tencuialaDeco, `${NORMS.tencuialaDeco} kg/m²`)
      b.add('vopsea_fatada', facadeArea * NORMS.vopseaFatada, '2 straturi')
      b.addLabor('izolatie_fatada', facadeArea)
      b.addLabor('tencuiala_fatada', facadeArea)
      b.assumptions.push(`Fațadă = perimetru × înălțime × etaje − goluri: ${fmtRo(extPerim)} × ${fmtRo(roomH)} × ${floors} − ${fmtRo(openingsFacade)} = ${fmtRo(facadeArea)} m²`)
      b.assumptions.push(`Nivel de finisare „${project.finishLevel}": ${izolCode.replace('_', ' ')} 10/5 cm`)
    }
  }

  // ─────────── ETAPA 10 — FINISAJE INTERIOARE (per cameră) ─
  {
    const b = B('finisaje')
    if (rooms.length === 0) {
      // fallback din suprafață — marcat estimativ
      const wallA = usefulArea * 2.6
      b.add('tencuiala_int', wallA * NORMS.tencuialaIntKgM2)
      b.add('glet_pasta', wallA * NORMS.gletKgM2)
      b.add('grund_abs', wallA * NORMS.grundIntM2)
      b.add('vopsea_interioara', wallA * NORMS.vopseaIntM2)
      b.assumptions.push('Camerele nu sunt definite — suprafețe estimate din aria utilă (factor perete 2,6 m²/m²)')
      b.warnings.push('Adăugați camere în configurator pentru calcul precis pe încăperi.')
    } else {
      const gipsIntSistem = project.intWallSystem === 'gips_carton' && isStageEnabled(project, 'pereti')
      for (const r of rooms) {
        const g = computeRoomGeometry(r, roomH)
        // ── Pereți ──
        if (r.wallFinish === 'tencuiala_vopsea') {
          b.add('tencuiala_int', g.netWallArea * NORMS.tencuialaIntKgM2, r.name)
          b.add('glet_pasta', g.netWallArea * NORMS.gletKgM2, r.name)
          b.add('grund_abs', g.netWallArea * NORMS.grundIntM2, r.name)
          b.add('vopsea_interioara', g.netWallArea * NORMS.vopseaIntM2, r.name)
          b.addLabor('tencuiala_int', g.netWallArea)
        } else if (r.wallFinish === 'gips_carton') {
          if (gipsIntSistem) {
            // partițiile sunt deja din gips (etapa 4) — doar finisare
            b.add('glet_pasta', g.netWallArea * NORMS.gletKgM2 * 0.8, r.name)
            b.add('grund_abs', g.netWallArea * NORMS.grundIntM2, r.name)
            b.add('vopsea_interioara', g.netWallArea * NORMS.vopseaIntM2, r.name)
          } else {
            const area = g.netWallArea * 1.05
            b.add('gips_placa', area, r.name)
            b.add('profil_cd', area * NORMS.profilCdPerete * 0.5, r.name)
            b.add('surub_gips', area * NORMS.surubGipsPerete, r.name)
            b.add('banda_rost', area * NORMS.bandaRostM2, r.name)
            b.add('chit_rosturi', area * NORMS.chitRostM2, r.name)
            b.add('glet_pasta', g.netWallArea * NORMS.gletKgM2 * 0.8, r.name)
            b.add('grund_abs', g.netWallArea * NORMS.grundIntM2, r.name)
            b.add('vopsea_interioara', g.netWallArea * NORMS.vopseaIntM2, r.name)
            b.addLabor('gips_carton', g.netWallArea)
          }
          b.addLabor('gletuire', g.netWallArea)
          b.addLabor('vopsire', g.netWallArea)
        } else if (r.wallFinish === 'faianta') {
          b.add('faianta', g.netWallArea * 1.12, r.name)
          b.add('adeziv_gresie', g.netWallArea * NORMS.adezivGresie, r.name)
          b.add('chit_gresie', g.netWallArea * NORMS.chitGresie, r.name)
          b.add('crosete', g.netWallArea * 2, r.name)
          b.addLabor('faianta', g.netWallArea)
        }
        // ── Pardoseală ──
        if (r.floorType === 'laminat' || r.floorType === 'parchet') {
          const code = r.floorType === 'laminat' ? 'laminat' : 'parchet_inginerie'
          b.add(code, g.floorArea * 1.07, r.name)
          b.add('substrat_pardoseala', g.floorArea * 1.05, r.name)
          b.add('plinta', (g.perimeter - r.doorCount * r.doorWidth) * 1.05, r.name)
          b.add('profil_tranzitie', 1, r.name)
          b.add('silicon', 0.5, r.name)
          b.addLabor('pardoseli', g.floorArea)
          b.addLabor('plinte', g.perimeter - r.doorCount * r.doorWidth)
        } else if (r.floorType === 'gresie') {
          b.add('gresie', g.floorArea * 1.1, r.name)
          b.add('adeziv_gresie', g.floorArea * NORMS.adezivGresie, r.name)
          b.add('chit_gresie', g.floorArea * NORMS.chitGresie, r.name)
          b.add('crosete', g.floorArea * 2, r.name)
          b.addLabor('gresie', g.floorArea)
        } else {
          b.warnings.push(`${r.name}: pardoseală beton — șapa nu este inclusă în normele actuale.`)
        }
        // ── Tavan ──
        if (r.ceilingType === 'vopsea') {
          b.add('glet_pasta', g.ceilingArea * NORMS.gletKgM2, `${r.name} — tavan`)
          b.add('grund_abs', g.ceilingArea * NORMS.grundIntM2, `${r.name} — tavan`)
          b.add('vopsea_interioara', g.ceilingArea * 0.25, `${r.name} — tavan`)
          b.addLabor('gletuire', g.ceilingArea)
          b.addLabor('vopsire', g.ceilingArea)
        } else if (r.ceilingType === 'gips_carton') {
          const area = g.ceilingArea * 1.05
          b.add('gips_placa', area, `${r.name} — tavan`)
          b.add('profil_cd', g.ceilingArea * NORMS.profilCdTavan, `${r.name} — tavan`)
          b.add('profil_ud', g.perimeter * 1.05, `${r.name} — tavan`)
          b.add('surub_gips', g.ceilingArea * NORMS.surubGipsTavan, `${r.name} — tavan`)
          b.add('banda_rost', g.ceilingArea * NORMS.bandaRostM2, `${r.name} — tavan`)
          b.add('chit_rosturi', g.ceilingArea * NORMS.chitRostM2, `${r.name} — tavan`)
          b.add('glet_pasta', g.ceilingArea * NORMS.gletKgM2, `${r.name} — tavan`)
          b.add('grund_abs', g.ceilingArea * NORMS.grundIntM2, `${r.name} — tavan`)
          b.add('vopsea_interioara', g.ceilingArea * 0.25, `${r.name} — tavan`)
          b.addLabor('gips_carton', g.ceilingArea)
          b.addLabor('gletuire', g.ceilingArea)
          b.addLabor('vopsire', g.ceilingArea)
        } else if (r.ceilingType === 'extensibil') {
          b.add('tavan_extensibil', g.ceilingArea, `${r.name} — montaj inclus`)
        }
      }
      b.add('silicon', bai.length > 0 || bucatarii.length > 0 ? (bucatarii.length + bai.length) * 0.5 : 0, 'etanșare obiecte sanitare')
      b.assumptions.push('Finisajele se calculează separat pentru fiecare cameră, cu scăderea golurilor de uși și ferestre')
    }
  }

  // ─────────── ETAPA 11 — EXTERIOR (opțional) ──────────────
  if (project.exteriorEnabled) {
    const b = B('exterior')
    if (project.exteriorArea > 0) {
      b.add('pavaj', project.exteriorArea * 1.08, `arie introdusă ${fmtRo(project.exteriorArea)} m² + tăieri 8%`)
      b.add('nisip', project.exteriorArea * 0.05 * 1.2, 'pat nisip 5 cm')
      b.add('bordura', Math.ceil(Math.sqrt(project.exteriorArea) * 4) * 1.05, 'perimetru amprentă pavaj (ipoteză)')
      b.addLabor('pavaj', project.exteriorArea)
    }
    if (project.exteriorFence > 0) {
      b.add('gard_profil', project.exteriorFence)
      b.addLabor('gard', project.exteriorFence)
    }
    if (project.exteriorGate > 0) b.add('poarta', project.exteriorGate)
    if (project.exteriorArea === 0 && project.exteriorFence === 0 && project.exteriorGate === 0) {
      b.warnings.push('Etapă activată, dar fără cantități — completați suprafața pavajului, gardul și porțile în proiect.')
    }
  }

  // ── Compune rezultatul ───────────────────────────────────
  const reservePct = options.reservePct ?? 3
  const missingPrices: EstimateResult['missingPrices'] = []
  const stages: StageResult[] = []

  STAGE_LIST.forEach((st, idx) => {
    const b = builders.get(st.key)!
    const enabled = isStageEnabled(project, st.key)
    const materials: MaterialLine[] = []
    for (const acc of b.materials.values()) {
      const def: MaterialDef = MATERIAL_DEFS[acc.code]
      if (!def) continue
      const row = priceRows.get(acc.code)
      const waste = def.wastePct
      const finalQty = acc.net * (1 + waste / 100) * (1 + reservePct / 100)
      const pricing: PricingMode = def.pricing ?? 'package'
      let packages: number
      let purchaseQty: number
      if (pricing === 'continuous') {
        packages = 0
        purchaseQty = finalQty
      } else {
        const pq = def.packageQty > 0 ? def.packageQty : 1
        packages = Math.ceil(finalQty / pq)
        purchaseQty = packages * pq
      }
      let unitPrice = 0
      let priceStatus: MaterialLine['priceStatus'] = 'indicativ'
      let priceSource = 'Catalog Devizier AI (preț orientativ)'
      let priceDate = today()
      if (row) {
        priceSource = row.supplier || priceSource
        priceDate = row.priceDate || priceDate
        if (row.price > 0) {
          unitPrice = row.price
          priceStatus = row.source === 'indicativ' ? 'indicativ' : 'ok'
        } else {
          priceStatus = 'lipsa'
        }
      }
      const totalPrice = purchaseQty * unitPrice
      if (priceStatus === 'lipsa') {
        missingPrices.push({ code: acc.code, name: def.name, stage: st.title })
      }
      materials.push({
        code: acc.code,
        name: def.name,
        category: def.category,
        spec: def.spec ?? '',
        netQty: r2(acc.net),
        wastePct: waste,
        reservePct,
        finalQty: r2(finalQty),
        unit: def.unit,
        packageQty: def.packageQty,
        packageLabel: def.packageLabel,
        packages,
        purchaseQty: Math.round(purchaseQty * 100) / 100,
        unitPrice,
        totalPrice: Math.round(totalPrice * 100) / 100,
        priceSource,
        priceDate,
        priceStatus,
        pricing,
        note: acc.notes.length > 0 ? acc.notes.join(' • ') : undefined,
      })
    }
    const labor: LaborLine[] = []
    for (const acc of b.labor.values()) {
      const def = LABOR_DEFS[acc.code]
      if (!def) continue
      const row = laborRows.get(acc.code)
      const unitPrice = row && row.price > 0 ? row.price : def.defaultPrice
      labor.push({
        code: acc.code,
        name: def.name,
        unit: def.unit,
        qty: Math.round(acc.qty * 100) / 100,
        unitPrice,
        totalPrice: Math.round(acc.qty * unitPrice * 100) / 100,
        source: row ? (row.source === 'indicativ' ? 'indicativ' : 'manual') : 'indicativ',
      })
    }
    const materialsTotal = Math.round(materials.reduce((s, m) => s + m.totalPrice, 0) * 100) / 100
    const laborTotal = Math.round(labor.reduce((s, l) => s + l.totalPrice, 0) * 100) / 100
    if (!enabled) {
      b.warnings.unshift('Etapă neinclusă pentru tipul de proiect selectat.')
    }
    stages.push({
      key: st.key,
      index: idx + 1,
      title: st.title,
      subtitle: st.subtitle,
      materials,
      labor,
      assumptions: b.assumptions,
      warnings: b.warnings,
      materialsTotal,
      laborTotal,
      stageTotal: materialsTotal + laborTotal,
    })
  });

  // ── Costuri suplimentare ─────────────────────────────────
  const materialsSum = stages.reduce((s, st) => s + st.materialsTotal, 0)
  const laborSum = stages.reduce((s, st) => s + st.laborTotal, 0)
  const transport = options.transport ?? 6000
  const utilaj = options.utilaj ?? 8000
  const deseuri = options.deseuri ?? 4500
  const extra = (project.exteriorEnabled || project.type === 'casa_noua' || project.type === 'extindere') ? transport + utilaj + deseuri : Math.round((transport + utilaj + deseuri) * 0.3)
  const contingency = Math.round((materialsSum + laborSum) * ((options.imprevizitePct ?? 0) / 100))
  const grand = materialsSum + laborSum + extra + contingency

  // ── Progresul completării ────────────────────────────────
  const checks: ProgressCheck[] = [
    { label: 'Date generale complete', weight: 15, done: !!(project.name && project.locality && project.builtArea > 0) },
    { label: 'Camere definite (≥1)', weight: 15, done: rooms.length > 0 },
    {
      label: 'Camerele acoperă ≥ 60% din suprafața utilă',
      weight: 10,
      done: totalFloorArea >= usefulArea * 0.6,
    },
    { label: 'Goluri (uși/ferestre) configurate', weight: 10, done: rooms.length > 0 && windowsCount > 0 },
    { label: 'Prețuri materiale completate', weight: 25, done: false },
    { label: 'Tarife manoperă configurate', weight: 15, done: input.labor.length > 0 },
    { label: 'Buget setat', weight: 10, done: project.budget > 0 },
  ]
  const priceCheck = checks[4]
  const totalMatLines = stages.reduce((s, st) => s + st.materials.length, 0)
  priceCheck.done = totalMatLines > 0 && missingPrices.length === 0
  // progres parțial pentru prețuri
  const priceFraction = totalMatLines > 0 ? (totalMatLines - missingPrices.length) / totalMatLines : 0
  const pct = Math.round(checks.reduce((s, c) => s + (c.done ? c.weight : c === priceCheck ? priceFraction * c.weight : 0), 0))

  const globalWarnings: string[] = [
    'Devizul este o ESTIMARE de planificare și nu constituie ofertă comercială reală.',
    'Pentru fundații, structuri portante, armături, instalații electrice și gaz, verificați calculele cu un proiectant/specialist autorizat.',
    'Prețurile marcate „indicativ" sunt orientative și trebuie verificate/actualizate în modulul „Prețuri".',
  ]
  if (missingPrices.length > 0) {
    globalWarnings.unshift(`${missingPrices.length} materiale nu au preț completat — costurile totale sunt subestimate.`)
  }
  if (rooms.length === 0) {
    globalWarnings.unshift('Nu sunt definite camere — multe cantități sunt estimate doar din suprafața totală.')
  }
  if (totalFloorArea > 0 && totalFloorArea < usefulArea * 0.6) {
    globalWarnings.unshift('Suprafața camerelor definite acoperă sub 60% din suprafața utilă — devizul acoperă doar încăperile introduse.')
  }

  return {
    project,
    stages,
    totals: {
      materials: Math.round(materialsSum * 100) / 100,
      labor: Math.round(laborSum * 100) / 100,
      extra,
      contingency,
      grand: Math.round(grand * 100) / 100,
      perSqm: usefulArea > 0 ? Math.round(grand / usefulArea) : 0,
      budget: project.budget,
      budgetDiff: Math.round((project.budget > 0 ? project.budget - grand : 0) * 100) / 100,
      currency: 'MDL',
    },
    geometry: {
      houseLength: r2(houseLength),
      houseWidth: r2(houseWidth),
      exteriorPerimeter: r2(extPerim),
      partitionsLength: r2(partitions),
      windowsArea: r2(windowsArea),
      windowsCount,
      interiorDoors: intDoors,
      exteriorDoors: extDoors,
      totalFloorArea: r2(totalFloorArea),
      totalWallArea: r2(totalNetWallArea),
      roofRealArea: Math.round(builtArea * 1.08 * (1 / Math.cos((project.roofSlope * Math.PI) / 180)) * 100) / 100,
      facadeArea: r2(facadeArea),
      roomsCoveredPct: usefulArea > 0 ? Math.min(Math.round((totalFloorArea / usefulArea) * 100), 100) : 0,
    },
    missingPrices,
    globalWarnings,
    progress: { pct, checks },
    isEstimate: missingPrices.length > 0 || rooms.length === 0,
    generatedAt: new Date().toISOString(),
  }
}
