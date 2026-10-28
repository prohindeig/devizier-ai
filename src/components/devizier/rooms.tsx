'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { NumberField } from './number-field'
import { PlanImportDialog } from './plan-import'
import { useApp } from '@/lib/store'
import { computeRoomGeometry, parseRoomConfig } from '@/lib/calc/engine'
import {
  CEILING_TYPE_LABELS, DEDICATED_CIRCUIT_LABELS, ELECTRIC_POINTS, FLOOR_TYPE_LABELS, ROOM_TYPE_LABELS, WALL_FINISH_LABELS,
  type CeilingType, type DedicatedCircuit, type FloorType, type RoomConfig, type RoomData, type RoomType, type WallFinish,
} from '@/lib/calc/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Pencil, Trash2, Ruler, Plug, Droplets, ScanLine } from 'lucide-react'
import { toast } from 'sonner'

const emptyDraft = (): Partial<RoomData> => ({
  name: '', type: 'camera', floorIndex: 0, length: 4, width: 3.5, height: null,
  doorCount: 1, doorWidth: 0.9, doorHeight: 2.05, windowCount: 0, windowWidth: 1.4, windowHeight: 1.5,
  floorType: 'laminat', wallFinish: 'tencuiala_vopsea', ceilingType: 'vopsea',
  config: {},
})

const DEDICATED_ALL = Object.keys(DEDICATED_CIRCUIT_LABELS) as DedicatedCircuit[]

/** curăță configul: elimină câmpurile goale ca „gol = automat" să funcționeze */
function cleanConfig(cfg: RoomConfig | undefined): RoomConfig {
  const out: RoomConfig = {}
  if (!cfg) return out
  const nums: (keyof RoomConfig)[] = ['sockets', 'switches', 'lightPoints', 'wc', 'lavabo', 'cadaDus', 'bideu', 'chiuvetaBucatarie', 'masinaSpalat', 'masinaVase', 'radiators']
  for (const k of nums) {
    const v = cfg[k]
    if (typeof v === 'number' && isFinite(v) && v > 0) out[k] = Math.round(v)
  }
  if (Array.isArray(cfg.dedicatedCircuits) && cfg.dedicatedCircuits.length > 0) {
    out.dedicatedCircuits = cfg.dedicatedCircuits
  }
  return out
}

export function RoomsPanel() {
  const { project, rooms, addRoom, updateRoom, deleteRoom } = useApp()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<RoomData>>(emptyDraft())
  const [deleteTarget, setDeleteTarget] = useState<RoomData | null>(null)

  if (!project) return null

  const openNew = () => {
    setEditingId(null)
    setDraft({ ...emptyDraft(), name: `Cameră ${rooms.length + 1}` })
    setDialogOpen(true)
  }

  const openEdit = (room: RoomData) => {
    setEditingId(room.id)
    setDraft({ ...room, config: parseRoomConfig(room.config) })
    setDialogOpen(true)
  }

  const save = () => {
    if (!draft.name || !draft.name.trim()) {
      toast.error('Completează denumirea camerei')
      return
    }
    if ((draft.length ?? 0) <= 0 || (draft.width ?? 0) <= 0) {
      toast.error('Lungimea și lățimea trebuie să fie pozitive')
      return
    }
    const withCleanConfig = { ...draft, config: cleanConfig(draft.config as RoomConfig) }
    if (editingId) {
      updateRoom(editingId, withCleanConfig)
      toast.success('Camera a fost actualizată')
    } else {
      addRoom(withCleanConfig)
      toast.success('Camera a fost adăugată')
    }
    setDialogOpen(false)
  }

  const totalFloor = rooms.reduce((s, r) => s + r.length * r.width, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Configuratorul camerelor</h2>
          <p className="text-sm text-muted-foreground">
            {rooms.length} camere · suprafață totală {totalFloor.toLocaleString('ro-RO', { maximumFractionDigits: 1 })} m²
            {project.builtArea > 0 && ` din amprenta de ${project.builtArea} m²`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} aria-label="Importă camere din plan">
            <ScanLine className="mr-2 h-4 w-4" aria-hidden /> Importă din plan
          </Button>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" aria-hidden /> Adaugă cameră</Button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Ruler className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">Nu ai adăugat încă camere</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Adaugă fiecare încăpere cu dimensiunile ei pentru calcule precise: pereți cu scăderea golurilor,
              finisaje pe cameră, puncte electrice și instalații sanitare conform tipului încăperii.
            </p>
            <Button className="mt-2" onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Adaugă prima cameră</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => {
            const g = computeRoomGeometry(room, project.roomHeight)
            return (
              <Card key={room.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{room.name}</CardTitle>
                      <CardDescription>{ROOM_TYPE_LABELS[room.type]} · etaj {room.floorIndex + 1}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(room)} aria-label={`Editează ${room.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => setDeleteTarget(room)} aria-label={`Șterge ${room.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <div className="rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <Geo label="Dimensiuni" value={`${room.length} × ${room.width} × ${g.height} m`} />
                      <Geo label="Pardoseală" value={`${g.floorArea} m²`} />
                      <Geo label="Pereți bruti" value={`${g.grossWallArea} m²`} />
                      <Geo label="Goluri (uși+ferestre)" value={`− ${g.openingsArea} m²`} />
                      <Geo label="Pereți nete" value={`${g.netWallArea} m²`} strong />
                      <Geo label="Volum" value={`${g.volume} m³`} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{FLOOR_TYPE_LABELS[room.floorType]}</Badge>
                    <Badge variant="secondary">{WALL_FINISH_LABELS[room.wallFinish]}</Badge>
                    <Badge variant="secondary">{CEILING_TYPE_LABELS[room.ceilingType]}</Badge>
                    <Badge variant="outline">{room.doorCount} uși</Badge>
                    <Badge variant="outline">{room.windowCount} ferestre</Badge>
                    {(() => {
                      const rc = parseRoomConfig(room.config)
                      const hasEl = rc.sockets != null || rc.switches != null || rc.lightPoints != null || (rc.dedicatedCircuits?.length ?? 0) > 0
                      const hasSan = rc.wc != null || rc.lavabo != null || rc.cadaDus != null || rc.bideu != null || rc.chiuvetaBucatarie != null || rc.masinaSpalat != null || rc.masinaVase != null || rc.radiators != null
                      return (
                        <>
                          {hasEl && <Badge variant="outline" className="border-amber-400 text-amber-700">electric personalizat</Badge>}
                          {hasSan && <Badge variant="outline" className="border-sky-400 text-sky-700">sanitare personalizate</Badge>}
                        </>
                      )
                    })()}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <PlanImportDialog open={importOpen} onOpenChange={setImportOpen} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editează camera' : 'Cameră nouă'}</DialogTitle>
            <DialogDescription>
              Suprafețele (pardoseală, pereți, tavan, volum) se calculează automat din dimensiuni, cu scăderea golurilor.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Denumirea camerei *</Label>
              <Input value={draft.name ?? ''} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="ex. Dormitor matrimonial" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipul încăperii</Label>
              <Select value={draft.type ?? 'camera'} onValueChange={(v) => setDraft((d) => ({ ...d, type: v as RoomType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROOM_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lungime *</Label>
              <NumberField value={draft.length ?? 0} suffix="m" min={0.5} onCommit={(v) => setDraft((d) => ({ ...d, length: v ?? 1 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Lățime *</Label>
              <NumberField value={draft.width ?? 0} suffix="m" min={0.5} onCommit={(v) => setDraft((d) => ({ ...d, width: v ?? 1 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Înălțime</Label>
              <NumberField value={draft.height ?? null} suffix="m" min={1.8} max={6} allowEmpty
                placeholder={`implicit ${project.roomHeight} m`} onCommit={(v) => setDraft((d) => ({ ...d, height: v }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Etajul</Label>
              <NumberField value={(draft.floorIndex ?? 0) + 1} suffix="et." min={1} max={project.floors} step={1}
                onCommit={(v) => setDraft((d) => ({ ...d, floorIndex: Math.max(0, (v ?? 1) - 1) }))} />
            </div>

            <div className="sm:col-span-2 mt-1 rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-medium text-slate-700">Previzualizare calcul</p>
              {(() => {
                const g = computeRoomGeometry(
                  { ...emptyDraft(), ...draft } as RoomData, project.roomHeight
                )
                return (
                  <p className="mt-1 text-muted-foreground">
                    Pardoseală <b>{g.floorArea} m²</b> · pereți bruti <b>{g.grossWallArea} m²</b> − goluri <b>{g.openingsArea} m²</b> = nete <b>{g.netWallArea} m²</b> · volum <b>{g.volume} m³</b>
                  </p>
                )
              })()}
            </div>

            <div className="sm:col-span-2 font-medium text-sm pt-1">Uși</div>
            <div className="space-y-1.5">
              <Label>Număr de uși</Label>
              <NumberField value={draft.doorCount ?? 0} suffix="buc" min={0} max={6} step={1} onCommit={(v) => setDraft((d) => ({ ...d, doorCount: Math.round(v ?? 0) }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lățime ușă</Label>
                <NumberField value={draft.doorWidth ?? 0.9} suffix="m" min={0.6} onCommit={(v) => setDraft((d) => ({ ...d, doorWidth: v ?? 0.9 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Înălțime ușă</Label>
                <NumberField value={draft.doorHeight ?? 2.05} suffix="m" min={1.8} onCommit={(v) => setDraft((d) => ({ ...d, doorHeight: v ?? 2.05 }))} />
              </div>
            </div>

            <div className="sm:col-span-2 font-medium text-sm pt-1">Ferestre</div>
            <div className="space-y-1.5">
              <Label>Număr de ferestre</Label>
              <NumberField value={draft.windowCount ?? 0} suffix="buc" min={0} max={8} step={1} onCommit={(v) => setDraft((d) => ({ ...d, windowCount: Math.round(v ?? 0) }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lățime fereastră</Label>
                <NumberField value={draft.windowWidth ?? 1.4} suffix="m" min={0.4} onCommit={(v) => setDraft((d) => ({ ...d, windowWidth: v ?? 1.4 }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Înălțime fereastră</Label>
                <NumberField value={draft.windowHeight ?? 1.5} suffix="m" min={0.4} onCommit={(v) => setDraft((d) => ({ ...d, windowHeight: v ?? 1.5 }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tipul pardoselii</Label>
              <Select value={draft.floorType ?? 'laminat'} onValueChange={(v) => setDraft((d) => ({ ...d, floorType: v as FloorType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FLOOR_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Finisajul pereților</Label>
              <Select value={draft.wallFinish ?? 'tencuiala_vopsea'} onValueChange={(v) => setDraft((d) => ({ ...d, wallFinish: v as WallFinish }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(WALL_FINISH_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Tipul tavanului</Label>
              <Select value={draft.ceilingType ?? 'vopsea'} onValueChange={(v) => setDraft((d) => ({ ...d, ceilingType: v as CeilingType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CEILING_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(() => {
              const cfg = (draft.config ?? {}) as RoomConfig
              const auto = ELECTRIC_POINTS[(draft.type ?? 'camera') as RoomType] ?? ELECTRIC_POINTS.camera
              const setCfg = (patch: Partial<RoomConfig>) => setDraft((d) => ({ ...d, config: { ...((d.config ?? {}) as RoomConfig), ...patch } }))
              const toggleDedic = (c: DedicatedCircuit) => {
                const cur = cfg.dedicatedCircuits ?? []
                setCfg({ dedicatedCircuits: cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c] })
              }
              return (
                <>
                  <div className="sm:col-span-2 mt-2 border-t pt-3">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <Plug className="h-4 w-4" aria-hidden /> Instalații electrice — detalii (opțional)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lasă gol pentru valorile automate ({auto.prize} prize, {auto.intrerupatoare} întrerupătoare, {auto.iluminat} puncte iluminat pentru „{ROOM_TYPE_LABELS[(draft.type ?? 'camera') as RoomType]}").
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Prize</Label>
                    <NumberField value={cfg.sockets ?? null} suffix="buc" min={0} max={30} step={1} allowEmpty placeholder={`auto: ${auto.prize}`} onCommit={(v) => setCfg({ sockets: v ?? undefined })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Întrerupătoare</Label>
                    <NumberField value={cfg.switches ?? null} suffix="buc" min={0} max={10} step={1} allowEmpty placeholder={`auto: ${auto.intrerupatoare}`} onCommit={(v) => setCfg({ switches: v ?? undefined })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Puncte de iluminat</Label>
                    <NumberField value={cfg.lightPoints ?? null} suffix="buc" min={0} max={15} step={1} allowEmpty placeholder={`auto: ${auto.iluminat}`} onCommit={(v) => setCfg({ lightPoints: v ?? undefined })} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Circuite dedicate (aparate cu consumator propriu)</Label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {DEDICATED_ALL.map((c) => (
                        <label key={c} className="flex cursor-pointer items-center gap-1.5 text-sm">
                          <Checkbox checked={(cfg.dedicatedCircuits ?? []).includes(c)} onCheckedChange={() => toggleDedic(c)} />
                          {DEDICATED_CIRCUIT_LABELS[c]}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2 mt-2 border-t pt-3">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                      <Droplets className="h-4 w-4" aria-hidden /> Obiecte sanitare — detalii (opțional)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Gol = automat: 1 WC + 1 lavoar + 1 cadă/dus pentru băi, 1 chiuvetă pentru bucătării.
                      Numără abaterile: ex. 2 în „WC" înseamnă 2 obiecte în această cameră.
                    </p>
                  </div>
                  <div className="space-y-1.5"><Label>WC</Label>
                    <NumberField value={cfg.wc ?? null} suffix="buc" min={0} max={5} step={1} allowEmpty placeholder="auto" onCommit={(v) => setCfg({ wc: v ?? undefined })} /></div>
                  <div className="space-y-1.5"><Label>Lavoare</Label>
                    <NumberField value={cfg.lavabo ?? null} suffix="buc" min={0} max={5} step={1} allowEmpty placeholder="auto" onCommit={(v) => setCfg({ lavabo: v ?? undefined })} /></div>
                  <div className="space-y-1.5"><Label>Căzi / cabine dus</Label>
                    <NumberField value={cfg.cadaDus ?? null} suffix="buc" min={0} max={5} step={1} allowEmpty placeholder="auto" onCommit={(v) => setCfg({ cadaDus: v ?? undefined })} /></div>
                  <div className="space-y-1.5"><Label>Bideuri</Label>
                    <NumberField value={cfg.bideu ?? null} suffix="buc" min={0} max={5} step={1} allowEmpty placeholder="—" onCommit={(v) => setCfg({ bideu: v ?? undefined })} /></div>
                  <div className="space-y-1.5"><Label>Chiuvete bucătărie</Label>
                    <NumberField value={cfg.chiuvetaBucatarie ?? null} suffix="buc" min={0} max={5} step={1} allowEmpty placeholder="auto" onCommit={(v) => setCfg({ chiuvetaBucatarie: v ?? undefined })} /></div>
                  <div className="space-y-1.5"><Label>Mașină de spălat rufe</Label>
                    <NumberField value={cfg.masinaSpalat ?? null} suffix="buc" min={0} max={3} step={1} allowEmpty placeholder="—" onCommit={(v) => setCfg({ masinaSpalat: v ?? undefined })} /></div>
                  <div className="space-y-1.5"><Label>Mașină de spălat vase</Label>
                    <NumberField value={cfg.masinaVase ?? null} suffix="buc" min={0} max={3} step={1} allowEmpty placeholder="—" onCommit={(v) => setCfg({ masinaVase: v ?? undefined })} /></div>
                  <div className="space-y-1.5"><Label>Radiatoare</Label>
                    <NumberField value={cfg.radiators ?? null} suffix="buc" min={0} max={6} step={1} allowEmpty placeholder="auto: 1" onCommit={(v) => setCfg({ radiators: v ?? undefined })} /></div>
                </>
              )
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulează</Button>
            <Button onClick={save}>{editingId ? 'Salvează modificările' : 'Adaugă camera'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi camera „{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Devizul se recalculează fără această încăpere. Acțiunea nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteTarget) {
                  deleteRoom(deleteTarget.id)
                  toast.success('Camera a fost ștearsă')
                }
              }}>
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Geo({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={strong ? 'font-bold text-slate-900 tabular-nums' : 'font-medium tabular-nums'}>{value}</span>
    </div>
  )
}
