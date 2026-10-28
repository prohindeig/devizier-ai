import type { PricingMode } from './catalog'

// ─────────────────────────────────────────────────────────────
// Tipuri de domeniu — partajate între client și server
// ─────────────────────────────────────────────────────────────

export type ProjectType = 'casa_noua' | 'extindere' | 'renovare' | 'finisare'
export type RoofType = 'doua_ape' | 'patru_ape' | 'plan'
export type RoofCovering = 'tigla_metal' | 'carton_ondulat' | 'tabla_seam' | 'tigla_ceramica'
export type FoundationType = 'banda' | 'placa' | 'piloni'
export type ExtWallSystem = 'beton_celular' | 'caramida' | 'caramida_izolatie' | 'cadru_metalic' | 'lemn'
export type IntWallSystem = 'beton_celular_10' | 'caramida' | 'gips_carton'
export type FinishLevel = 'economic' | 'standard' | 'premium'
export type MetalSystem = 'grila_standard' | 'grila_consolidata' | 'profil_otel'
export type RoomType =
  | 'dormitor' | 'living' | 'bucatarie' | 'baie' | 'hol' | 'birou'
  | 'copil' | 'camera_tehnica' | 'garaj' | 'balcon' | 'camera'
export type FloorType = 'laminat' | 'parchet' | 'gresie' | 'beton'
export type WallFinish = 'tencuiala_vopsea' | 'gips_carton' | 'faianta'
export type CeilingType = 'vopsea' | 'gips_carton' | 'extensibil'

export interface ProjectData {
  id: string
  name: string
  locality: string
  type: ProjectType
  builtArea: number
  usefulArea: number
  floors: number
  roomHeight: number
  roofType: RoofType
  roofSlope: number
  roofCovering: RoofCovering
  foundationType: FoundationType
  extWallSystem: ExtWallSystem
  intWallSystem: IntWallSystem
  ceilingSystem: string
  finishLevel: FinishLevel
  budget: number
  currency: string
  exteriorEnabled: boolean
  exteriorArea: number
  exteriorFence: number
  exteriorGate: number
  landArea: number          // metraj: suprafața terenului, m²
  windowsCount: number      // geamuri total (0 = automat din camere)
  doorsCount: number        // uși interioare total (0 = automat din camere)
  metalSystem: MetalSystem  // gradul de armare / tip structură metalică
  metalKgM3: number         // armare manuală kg/m³ (0 = automat după metalSystem)
  options: ProjectOptions
}

export interface ProjectOptions {
  extDoors?: number        // uși exterioare (default 1)
  floorHeating?: boolean   // încălzire în pardoseală la băi (default true)
  boiler?: boolean         // boiler separat (default false)
  transport?: number       // cost transport MDL (default 6000)
  utilaj?: number          // cost utilaje MDL (default 8000)
  deseuri?: number         // evacuare deșeuri MDL (default 4500)
  imprevizitePct?: number  // rezervă imprevizite % din materiale+manoperă (default 0)
  reservePct?: number      // rezervă globală suplimentară % (default 3)
}

export interface RoomData {
  id: string
  projectId: string
  order: number
  name: string
  type: RoomType
  floorIndex: number
  length: number
  width: number
  height: number | null
  doorCount: number
  doorWidth: number
  doorHeight: number
  windowCount: number
  windowWidth: number
  windowHeight: number
  floorType: FloorType
  wallFinish: WallFinish
  ceilingType: CeilingType
  config?: RoomConfig | string | null // obiect sau JSON (din DB)
}

/**
 * Configurare detaliată electric + sanitar per cameră.
 * Câmpurile omise = norme automate după tipul încăperii.
 */
export interface RoomConfig {
  // electric
  sockets?: number
  switches?: number
  lightPoints?: number
  dedicatedCircuits?: DedicatedCircuit[]
  // sanitar (obiecte)
  wc?: number
  lavabo?: number
  cadaDus?: number
  bideu?: number
  chiuvetaBucatarie?: number
  masinaSpalat?: number
  masinaVase?: number
  // încălzire
  radiators?: number
}

export type DedicatedCircuit =
  | 'plita' | 'cuptor' | 'masina_spalat' | 'masina_vase' | 'boiler' | 'ac' | 'uscator'

export const DEDICATED_CIRCUIT_LABELS: Record<DedicatedCircuit, string> = {
  plita: 'Plita electrică',
  cuptor: 'Cuptor electric',
  masina_spalat: 'Mașină de spălat rufe',
  masina_vase: 'Mașină de spălat vase',
  boiler: 'Boiler apă caldă',
  ac: 'Aer condiționat',
  uscator: 'Uscător de rufe',
}

export interface MaterialPriceRow {
  id: string
  code: string
  name: string
  category: string
  manufacturer: string
  spec: string
  unit: string
  packageQty: number
  packageLabel: string
  price: number
  priceCurrency: string
  supplier: string
  locality: string
  source: string
  priceDate: string
  link: string
  isPrimary: boolean
}

export interface LaborRateRow {
  id: string
  code: string
  name: string
  unit: string
  price: number
  source: string
  priceDate: string
}

export interface MaterialLine {
  code: string
  name: string
  category: string
  spec: string
  netQty: number          // cantitate netă
  wastePct: number        // pierderi estimate %
  reservePct: number      // rezervă suplimentară %
  finalQty: number        // cantitate finală (netă × (1+waste) × (1+reserve))
  unit: string
  packageQty: number
  packageLabel: string
  packages: number        // nr. ambalaje de achiziționat
  purchaseQty: number     // cantitate de achiziționat = packages × packageQty
  unitPrice: number       // MDL
  totalPrice: number      // MDL
  priceSource: string
  priceDate: string
  priceStatus: 'ok' | 'indicativ' | 'lipsa'
  pricing: PricingMode
  note?: string
}

export interface LaborLine {
  code: string
  name: string
  unit: string
  qty: number
  unitPrice: number
  totalPrice: number
  source: string
}

export interface StageResult {
  key: string
  index: number
  title: string
  subtitle: string
  materials: MaterialLine[]
  labor: LaborLine[]
  assumptions: string[]
  warnings: string[]
  materialsTotal: number
  laborTotal: number
  stageTotal: number
}

export interface ProgressCheck {
  label: string
  weight: number
  done: boolean
}

export interface EstimateTotals {
  materials: number
  labor: number
  extra: number
  contingency: number
  grand: number
  perSqm: number
  budget: number
  budgetDiff: number
  currency: string
}

export interface EstimateResult {
  project: ProjectData
  stages: StageResult[]
  totals: EstimateTotals
  geometry: {
    houseLength: number
    houseWidth: number
    exteriorPerimeter: number
    partitionsLength: number
    windowsArea: number
    windowsCount: number
    interiorDoors: number
    exteriorDoors: number
    totalFloorArea: number
    totalWallArea: number
    roofRealArea: number
    facadeArea: number
    roomsCoveredPct: number
  }
  missingPrices: { code: string; name: string; stage: string }[]
  globalWarnings: string[]
  progress: { pct: number; checks: ProgressCheck[] }
  isEstimate: boolean // true = estimare preliminară (lipsesc date)
  generatedAt: string
}

export const STAGE_LIST = [
  { key: 'pregatire', title: 'ETAPA 1 — Pregătirea terenului', subtitle: 'Decopertare, săpături, strat suport, compactare' },
  { key: 'fundatie', title: 'ETAPA 2 — Fundația', subtitle: 'Beton, armătură, cofraj, hidroizolație, drenaj' },
  { key: 'structura', title: 'ETAPA 3 — Structura casei', subtitle: 'Stâlpi, grinzi, centuri, planșee' },
  { key: 'pereti', title: 'ETAPA 4 — Pereți exteriori și interiori', subtitle: 'Zidărie, adeziv, armare, buiandrugi' },
  { key: 'acoperis', title: 'ETAPA 5 — Acoperișul', subtitle: 'Structură, folii, învelitoare, jgheaburi, izolație' },
  { key: 'tamplarie', title: 'ETAPA 6 — Tâmplărie', subtitle: 'Ferestre, uși, glafuri, montaj, etanșare' },
  { key: 'electric', title: 'ETAPA 7 — Instalații electrice', subtitle: 'Cabluri, prize, tablou, protecții, iluminat' },
  { key: 'sanitare', title: 'ETAPA 8 — Instalații sanitare și termice', subtitle: 'Țevi, obiecte sanitare, încălzire' },
  { key: 'fatada', title: 'ETAPA 9 — Izolație și fațadă', subtitle: 'Termosistem, grund, tencuială decorativă' },
  { key: 'finisaje', title: 'ETAPA 10 — Tencuieli și finisaje interioare', subtitle: 'Per cameră: pereți, pardoseli, tavane' },
  { key: 'exterior', title: 'ETAPA 11 — Exterior și amenajare', subtitle: 'Opțional: pavaj, borduri, gard, poartă' },
] as const

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  dormitor: 'Dormitor',
  living: 'Living / compartiment comun',
  bucatarie: 'Bucătărie',
  baie: 'Baie',
  hol: 'Hol / antreu',
  birou: 'Birou',
  copil: 'Cameră copii',
  camera_tehnica: 'Cameră tehnică',
  garaj: 'Garaj',
  balcon: 'Balcon / terasă acoperită',
  camera: 'Cameră',
}

export const FLOOR_TYPE_LABELS: Record<FloorType, string> = {
  laminat: 'Laminat',
  parchet: 'Parchet (inginerie)',
  gresie: 'Gresie',
  beton: 'Șapă / beton (fără finisaj)',
}

export const WALL_FINISH_LABELS: Record<WallFinish, string> = {
  tencuiala_vopsea: 'Tencuială + glet + vopsea',
  gips_carton: 'Gips-carton + vopsea',
  faianta: 'Faianță ceramică',
}

export const CEILING_TYPE_LABELS: Record<CeilingType, string> = {
  vopsea: 'Glet + vopsea',
  gips_carton: 'Tavan fals din gips-carton',
  extensibil: 'Tavan extensibil',
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  casa_noua: 'Casă nouă',
  extindere: 'Extindere',
  renovare: 'Renovare',
  finisare: 'Finisare',
}

export const FINISH_LEVEL_LABELS: Record<FinishLevel, string> = {
  economic: 'Economic',
  standard: 'Standard',
  premium: 'Premium',
}

export const FOUNDATION_LABELS: Record<FoundationType, string> = {
  banda: 'Fundație continuă (bandă)',
  placa: 'Placă monolită',
  piloni: 'Piloni + grinzi',
}

export const ROOF_TYPE_LABELS: Record<RoofType, string> = {
  doua_ape: 'Acoperiș cu două ape',
  patru_ape: 'Acoperiș cu patru ape',
  plan: 'Acoperiș plan',
}

export const ROOF_COVERING_LABELS: Record<RoofCovering, string> = {
  tigla_metal: 'Țiglă metalică',
  carton_ondulat: 'Carton ondulat bituminos',
  tabla_seam: 'Tablă cută dublă',
  tigla_ceramica: 'Țiglă ceramică',
}

export const EXT_WALL_LABELS: Record<ExtWallSystem, string> = {
  beton_celular: 'Beton celular 25 cm',
  caramida: 'Cărămidă eficientă 38 cm',
  caramida_izolatie: 'Cărămidă 25 cm + izolație + cărămidă față 12 cm',
  cadru_metalic: 'Cadru metalic izolat (LT)',
  lemn: 'Cadru din lemn izolat',
}

export const INT_WALL_LABELS: Record<IntWallSystem, string> = {
  beton_celular_10: 'Bloc beton celular 10 cm',
  caramida: 'Cărămidă plină 12 cm',
  gips_carton: 'Partiții gips-carton',
}

export const METAL_SYSTEM_LABELS: Record<MetalSystem, string> = {
  grila_standard: 'Grilă de armare standard (85–110 kg/m³)',
  grila_consolidata: 'Armare consolidată — zonă seismică (+30%)',
  profil_otel: 'Profile de oțel — structură metalică',
}

// Puncte electrice implicite per tip de cameră (edibil prin norme)
export const ELECTRIC_POINTS: Record<RoomType, { prize: number; intrerupatoare: number; iluminat: number }> = {
  dormitor: { prize: 4, intrerupatoare: 1, iluminat: 1 },
  living: { prize: 6, intrerupatoare: 2, iluminat: 2 },
  bucatarie: { prize: 8, intrerupatoare: 1, iluminat: 2 },
  baie: { prize: 2, intrerupatoare: 1, iluminat: 2 },
  hol: { prize: 2, intrerupatoare: 1, iluminat: 1 },
  birou: { prize: 6, intrerupatoare: 1, iluminat: 2 },
  copil: { prize: 4, intrerupatoare: 1, iluminat: 1 },
  camera_tehnica: { prize: 2, intrerupatoare: 1, iluminat: 1 },
  garaj: { prize: 2, intrerupatoare: 1, iluminat: 2 },
  balcon: { prize: 1, intrerupatoare: 0, iluminat: 1 },
  camera: { prize: 4, intrerupatoare: 1, iluminat: 1 },
}
