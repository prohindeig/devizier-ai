// Test izolat: etapa electric + sanitare cu config detaliat (baie)
import { computeEstimate } from '../src/lib/calc/engine'
import type { ProjectData, RoomData, MaterialPriceRow, LaborRateRow } from '../src/lib/calc/types'

const project = {
  id: 'p1', name: 'Test', locality: '', type: 'casa_noua', builtArea: 100, usefulArea: 85,
  floors: 1, roomHeight: 2.7, roofType: 'doua_ape', roofSlope: 30, roofCovering: 'tigla_metal',
  foundationType: 'banda', extWallSystem: 'beton_celular', intWallSystem: 'beton_celular_10',
  ceilingSystem: 'monolit', finishLevel: 'standard', budget: 0, currency: 'MDL',
  exteriorEnabled: false, exteriorArea: 0, exteriorFence: 0, exteriorGate: 0,
  options: {},
} as unknown as ProjectData

const mk = (o: Partial<RoomData>): RoomData => ({
  id: o.id ?? 'r', projectId: 'p1', order: 0, name: o.name ?? 'X', type: o.type ?? 'camera',
  floorIndex: 0, length: o.length ?? 4, width: o.width ?? 3.5, height: null,
  doorCount: 1, doorWidth: 0.9, doorHeight: 2.05, windowCount: 1, windowWidth: 1.4, windowHeight: 1.5,
  floorType: 'laminat', wallFinish: 'tencuiala_vopsea', ceilingType: 'vopsea', ...o,
} as RoomData)

const rooms: RoomData[] = [
  mk({ id: 'r1', name: 'Living', type: 'living', length: 5.5, width: 4.2 }),
  mk({ id: 'r2', name: 'Dormitor', type: 'dormitor', length: 4, width: 3.5 }),
  mk({ id: 'r3', name: 'Bucătărie', type: 'bucatarie', length: 3.5, width: 3 }),
  mk({ id: 'r4', name: 'Baie', type: 'baie', length: 2.4, width: 2,
    config: { wc: 1, lavabo: 1, cadaDus: 1, bideu: 1, masinaSpalat: 1, sockets: 4, lightPoints: 2, dedicatedCircuits: ['masina_spalat', 'boiler'] } }),
  mk({ id: 'r5', name: 'Hol', type: 'hol', length: 3, width: 2 }),
]

const materials: MaterialPriceRow[] = []
const labor: LaborRateRow[] = []

const est = computeEstimate({ project, rooms, materials, labor })
for (const st of est.stages) {
  if (st.key === 'electric' || st.key === 'sanitare') {
    console.log(`\n=== ${st.title} ===`)
    for (const a of st.assumptions) console.log('  ipoteză:', a)
    for (const m of st.materials) console.log(`  ${m.code}: net ${m.netQty} → cumpărare ${m.purchaseQty} ${m.unit}`)
    for (const l of st.labor) console.log(`  manoperă ${l.code}: ${l.qty}`)
  }
}
