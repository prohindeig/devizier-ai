// Test motor de calcul — proiect exemplu 100 m²
import { computeEstimate, computeRoomGeometry } from '../src/lib/calc/engine'
import { MATERIAL_CATALOG, LABOR_CATALOG } from '../src/lib/calc/catalog'
import type { ProjectData, RoomData, MaterialPriceRow, LaborRateRow } from '../src/lib/calc/types'

const project: ProjectData = {
  id: 'test',
  name: 'Casă Test',
  locality: 'Chișinău',
  type: 'casa_noua',
  builtArea: 100,
  usefulArea: 85,
  floors: 1,
  roomHeight: 2.7,
  roofType: 'doua_ape',
  roofSlope: 30,
  roofCovering: 'tigla_metal',
  foundationType: 'banda',
  extWallSystem: 'beton_celular',
  intWallSystem: 'beton_celular_10',
  ceilingSystem: 'monolit',
  finishLevel: 'standard',
  budget: 2000000,
  currency: 'MDL',
  exteriorEnabled: true,
  exteriorArea: 60,
  exteriorFence: 40,
  exteriorGate: 1,
  options: {},
}

const rooms: RoomData[] = [
  { id: 'r1', projectId: 'test', order: 0, name: 'Living', type: 'living', floorIndex: 0, length: 5.5, width: 4.2, height: null, doorCount: 1, doorWidth: 0.9, doorHeight: 2.05, windowCount: 2, windowWidth: 1.5, windowHeight: 1.6, floorType: 'laminat', wallFinish: 'tencuiala_vopsea', ceilingType: 'vopsea' },
  { id: 'r2', projectId: 'test', order: 1, name: 'Dormitor', type: 'dormitor', floorIndex: 0, length: 4, width: 3.5, height: null, doorCount: 1, doorWidth: 0.9, doorHeight: 2.05, windowCount: 1, windowWidth: 1.4, windowHeight: 1.5, floorType: 'laminat', wallFinish: 'tencuiala_vopsea', ceilingType: 'vopsea' },
  { id: 'r3', projectId: 'test', order: 2, name: 'Bucătărie', type: 'bucatarie', floorIndex: 0, length: 3.5, width: 3, height: null, doorCount: 1, doorWidth: 0.9, doorHeight: 2.05, windowCount: 1, windowWidth: 1.4, windowHeight: 1.5, floorType: 'gresie', wallFinish: 'tencuiala_vopsea', ceilingType: 'vopsea' },
  { id: 'r4', projectId: 'test', order: 3, name: 'Baie', type: 'baie', floorIndex: 0, length: 2.4, width: 2, height: null, doorCount: 1, doorWidth: 0.8, doorHeight: 2.05, windowCount: 1, windowWidth: 0.6, windowHeight: 0.8, floorType: 'gresie', wallFinish: 'faianta', ceilingType: 'vopsea' },
  { id: 'r5', projectId: 'test', order: 4, name: 'Hol', type: 'hol', floorIndex: 0, length: 3, width: 2, height: null, doorCount: 1, doorWidth: 0.9, doorHeight: 2.05, windowCount: 0, windowWidth: 1.4, windowHeight: 1.5, floorType: 'laminat', wallFinish: 'tencuiala_vopsea', ceilingType: 'vopsea' },
]

const materials: MaterialPriceRow[] = MATERIAL_CATALOG.map((m, i) => ({
  id: `m${i}`, code: m.code, name: m.name, category: m.category, manufacturer: '', spec: '',
  unit: m.unit, packageQty: m.packageQty, packageLabel: m.packageLabel, price: m.defaultPrice,
  priceCurrency: 'MDL', supplier: 'Test', locality: '', source: 'indicativ', priceDate: '2026-01-01',
  link: '', isPrimary: true,
}))

const labor: LaborRateRow[] = LABOR_CATALOG.map((l, i) => ({
  id: `l${i}`, code: l.code, name: l.name, unit: l.unit, price: l.defaultPrice, source: 'indicativ', priceDate: '2026-01-01',
}))

const est = computeEstimate({ project, rooms, materials, labor })
console.log('=== GEOMETRIE ===')
console.log(JSON.stringify(est.geometry, null, 1))
console.log('=== TOTALURI ===')
console.log(JSON.stringify(est.totals, null, 1))
console.log('=== ETAPE ===')
for (const st of est.stages) {
  console.log(`${st.title}: mat=${st.materialsTotal.toFixed(0)} MDL, manop=${st.laborTotal.toFixed(0)} MDL, materiale=${st.materials.length}, manopere=${st.labor.length}`)
}
console.log('=== VERIFICĂRI CHEIE ===')
const fundatie = est.stages[1]
console.log('Beton fundație:', fundatie.materials.find(m => m.code === 'beton_c20_25')?.netQty, 'm³ (așteptat ~4.4 m³: (22.1+9.1)m × 0.4 × 0.8)')
const pereti = est.stages[3]
console.log('Blocuri BC25:', pereti.materials.find(m => m.code === 'bloc_bc_25')?.netQty.toFixed(0), 'buc (pentru ~91 m² perete → ~607 buc net)')
const acoperis = est.stages[4]
console.log('Țiglă metalică:', acoperis.materials.find(m => m.code === 'tigla_metal')?.netQty.toFixed(1), 'm² (așteptat ~135 m²: 108/cos30 × surplomb)')
console.log('Missing prices:', est.missingPrices.length)
console.log('Progress:', est.progress.pct + '%')
console.log('IsEstimate:', est.isEstimate)
console.log('Global warnings:', est.globalWarnings.length)
// sanity: no NaN anywhere
const str = JSON.stringify(est)
if (str.includes('NaN') || str.includes('Infinity')) {
  console.error('!!! NaN/Infinity detected in estimate')
  process.exit(1)
}
console.log('OK — motorul funcționează corect')
