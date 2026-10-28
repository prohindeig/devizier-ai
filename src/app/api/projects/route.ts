import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError, toProjectData } from '@/lib/api-utils'
import { autoBackup } from '@/lib/backup'
import { currentOwnerId } from '@/lib/auth'

export async function GET() {
  const ownerId = await currentOwnerId()
  const rows = await db.project.findMany({
    where: { ownerId },
    orderBy: { updatedAt: 'desc' },
    include: { rooms: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json(rows.map((r) => ({ ...toProjectData(r), rooms: r.rooms })))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.name || typeof body.name !== 'string') return jsonError('Denumirea proiectului este obligatorie')
    await autoBackup('înainte de crearea unui proiect')
    const ownerId = await currentOwnerId()
    const project = await db.project.create({
      data: {
        ownerId,
        name: body.name,
        locality: typeof body.locality === 'string' ? body.locality : '',
        type: typeof body.type === 'string' ? body.type : 'casa_noua',
        builtArea: typeof body.builtArea === 'number' ? body.builtArea : 100,
        usefulArea: typeof body.usefulArea === 'number' ? body.usefulArea : 0,
        floors: typeof body.floors === 'number' ? Math.max(1, body.floors) : 1,
        roomHeight: typeof body.roomHeight === 'number' ? body.roomHeight : 2.7,
        roofType: typeof body.roofType === 'string' ? body.roofType : 'doua_ape',
        roofSlope: typeof body.roofSlope === 'number' ? body.roofSlope : 30,
        roofCovering: typeof body.roofCovering === 'string' ? body.roofCovering : 'tigla_metal',
        foundationType: typeof body.foundationType === 'string' ? body.foundationType : 'banda',
        extWallSystem: typeof body.extWallSystem === 'string' ? body.extWallSystem : 'beton_celular',
        intWallSystem: typeof body.intWallSystem === 'string' ? body.intWallSystem : 'beton_celular_10',
        ceilingSystem: typeof body.ceilingSystem === 'string' ? body.ceilingSystem : 'monolit',
        finishLevel: typeof body.finishLevel === 'string' ? body.finishLevel : 'standard',
        budget: typeof body.budget === 'number' ? body.budget : 0,
        currency: typeof body.currency === 'string' ? body.currency : 'MDL',
        exteriorEnabled: !!body.exteriorEnabled,
        exteriorArea: typeof body.exteriorArea === 'number' ? body.exteriorArea : 0,
        exteriorFence: typeof body.exteriorFence === 'number' ? body.exteriorFence : 0,
        exteriorGate: typeof body.exteriorGate === 'number' ? body.exteriorGate : 0,
        options: JSON.stringify(body.options && typeof body.options === 'object' ? body.options : {}),
      },
    })

    // Camere exemplu doar la primul proiect (start rapid, opțional)
    const count = await db.project.count()
    if (body.withSampleRooms || count === 1) {
      const samples = [
        { order: 0, name: 'Living', type: 'living', length: 5.5, width: 4.2, doorCount: 1, windowCount: 2, floorType: 'laminat', wallFinish: 'tencuiala_vopsea', ceilingType: 'vopsea' },
        { order: 1, name: 'Dormitor', type: 'dormitor', length: 4, width: 3.5, doorCount: 1, windowCount: 1, floorType: 'laminat', wallFinish: 'tencuiala_vopsea', ceilingType: 'vopsea' },
        { order: 2, name: 'Bucătărie', type: 'bucatarie', length: 3.5, width: 3, doorCount: 1, windowCount: 1, floorType: 'gresie', wallFinish: 'tencuiala_vopsea', ceilingType: 'vopsea' },
        { order: 3, name: 'Baie', type: 'baie', length: 2.4, width: 2, doorCount: 1, doorWidth: 0.8, windowCount: 1, windowWidth: 0.6, windowHeight: 0.8, floorType: 'gresie', wallFinish: 'faianta', ceilingType: 'vopsea' },
        { order: 4, name: 'Hol', type: 'hol', length: 3, width: 2, doorCount: 1, windowCount: 0, floorType: 'laminat', wallFinish: 'tencuiala_vopsea', ceilingType: 'vopsea' },
      ]
      for (const s of samples) {
        await db.room.create({ data: { ...s, projectId: project.id } as never })
      }
    }
    const full = await db.project.findUnique({ where: { id: project.id }, include: { rooms: { orderBy: { order: 'asc' } } } })
    return NextResponse.json(full)
  } catch (e) {
    console.error('POST /api/projects', e)
    return jsonError('Eroare la crearea proiectului', 500)
  }
}
