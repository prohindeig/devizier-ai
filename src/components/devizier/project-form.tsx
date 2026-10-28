'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { NumberField } from './number-field'
import { useApp } from '@/lib/store'
import { Spinner, WarningList } from './common'
import type { EstimateResult } from '@/lib/calc/types'
import {
  PROJECT_TYPE_LABELS, FOUNDATION_LABELS, ROOF_TYPE_LABELS, ROOF_COVERING_LABELS,
  EXT_WALL_LABELS, INT_WALL_LABELS, FINISH_LEVEL_LABELS,
  type FoundationType, type FinishLevel, type IntWallSystem, type ProjectData,
  type ProjectType, type RoofCovering, type RoofType, type ExtWallSystem,
} from '@/lib/calc/types'
import { toast } from 'sonner'

export function ProjectForm({ estimate }: { estimate: EstimateResult | null }) {
  const { project, saveProject } = useApp()
  const [local, setLocal] = useState<ProjectData | null>(project)

  useEffect(() => setLocal(project), [project?.id])

  if (!local) return <Spinner />

  const upd = (patch: Partial<ProjectData>) => {
    setLocal((p) => (p ? { ...p, ...patch } : p))
    saveProject(patch)
  }

  const updOption = (key: string, value: number | boolean) => {
    const opts = { ...(local.options ?? {}), [key]: value }
    upd({ options: opts })
  }

  const sel = <T extends string>(key: keyof ProjectData, value: T) => upd({ [key]: value } as Partial<ProjectData>)

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Date generale</CardTitle>
            <CardDescription>Identifică proiectul tău. Modificările se salvează automat.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Denumirea proiectului *</Label>
              <Input value={local.name} onChange={(e) => setLocal((p) => (p ? { ...p, name: e.target.value } : p))}
                onBlur={(e) => e.target.value.trim() && saveProject({ name: e.target.value.trim() })} />
            </div>
            <div className="space-y-1.5">
              <Label>Localitatea construcției</Label>
              <Input value={local.locality} placeholder="ex. Chișinău, Orhei..."
                onChange={(e) => setLocal((p) => (p ? { ...p, locality: e.target.value } : p))}
                onBlur={(e) => saveProject({ locality: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipul proiectului</Label>
              <Select value={local.type} onValueChange={(v) => sel('type', v as ProjectType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nivelul de finisare</Label>
              <Select value={local.finishLevel} onValueChange={(v) => sel('finishLevel', v as FinishLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FINISH_LEVEL_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Suprafața construită (amprenta) *</Label>
              <NumberField value={local.builtArea} suffix="m²" min={1} onCommit={(v) => v !== null && upd({ builtArea: v })} />
            </div>
            <div className="space-y-1.5">
              <Label>Suprafața utilă</Label>
              <NumberField value={local.usefulArea || null} suffix="m²" min={0} allowEmpty
                placeholder="dacă nu știi, lasă gol" onCommit={(v) => upd({ usefulArea: v ?? 0 })} />
              <p className="text-xs text-muted-foreground">Nu este identică cu suprafața construită (fără pereți, goluri). Dacă e goală, se estimează 85% din construită.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Numărul de etaje</Label>
              <NumberField value={local.floors} min={1} max={4} step={1} suffix="et." onCommit={(v) => v !== null && upd({ floors: Math.round(v) })} />
            </div>
            <div className="space-y-1.5">
              <Label>Înălțimea camerelor</Label>
              <NumberField value={local.roomHeight} suffix="m" min={2} max={5} onCommit={(v) => v !== null && upd({ roomHeight: v })} />
            </div>
            <div className="space-y-1.5">
              <Label>Bugetul disponibil</Label>
              <NumberField value={local.budget || null} suffix="MDL" min={0} allowEmpty step={1000}
                onCommit={(v) => upd({ budget: v ?? 0 })} />
            </div>
            <div className="space-y-1.5">
              <Label>Moneda de calcul</Label>
              <Select value={local.currency} onValueChange={(v) => upd({ currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MDL">MDL — leu moldovenesc</SelectItem>
                  <SelectItem value="EUR">EUR — euro</SelectItem>
                  <SelectItem value="USD">USD — dolar</SelectItem>
                  <SelectItem value="RON">RON — leu românesc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Soluția constructivă</CardTitle>
            <CardDescription>Materialele din deviz se adaptează după selecțiile de aici.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipul fundației</Label>
              <Select value={local.foundationType} onValueChange={(v) => sel('foundationType', v as FoundationType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FOUNDATION_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pereți exteriori</Label>
              <Select value={local.extWallSystem} onValueChange={(v) => sel('extWallSystem', v as ExtWallSystem)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EXT_WALL_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Pereți interiori (partiții)</Label>
              <Select value={local.intWallSystem} onValueChange={(v) => sel('intWallSystem', v as IntWallSystem)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INT_WALL_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipul acoperișului</Label>
              <Select value={local.roofType} onValueChange={(v) => sel('roofType', v as RoofType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROOF_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Panta acoperișului</Label>
              <NumberField value={local.roofSlope} suffix="°" min={5} max={60} onCommit={(v) => v !== null && upd({ roofSlope: v })} />
            </div>
            <div className="space-y-1.5">
              <Label>Învelitoare</Label>
              <Select value={local.roofCovering} onValueChange={(v) => sel('roofCovering', v as RoofCovering)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROOF_COVERING_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Accordion type="single" collapsible>
          <AccordionItem value="exterior">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Exterior și amenajare curte (opțional)</CardTitle>
                    <CardDescription>Pavaj, borduri, gard, poartă — se include în deviz doar dacă activezi.</CardDescription>
                  </div>
                  <Switch checked={local.exteriorEnabled} onCheckedChange={(v) => upd({ exteriorEnabled: v })} aria-label="Activează etapa exterior" />
                </div>
              </CardHeader>
              {local.exteriorEnabled && (
                <CardContent className="grid gap-4 pt-2 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Suprafață pavaj / trotuare</Label>
                    <NumberField value={local.exteriorArea || null} suffix="m²" min={0} allowEmpty onCommit={(v) => upd({ exteriorArea: v ?? 0 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Lungime gard</Label>
                    <NumberField value={local.exteriorFence || null} suffix="m" min={0} allowEmpty onCommit={(v) => upd({ exteriorFence: v ?? 0 })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Porți</Label>
                    <NumberField value={local.exteriorGate} suffix="buc" min={0} max={3} step={1} onCommit={(v) => v !== null && upd({ exteriorGate: Math.round(v) })} />
                  </div>
                </CardContent>
              )}
            </Card>
          </AccordionItem>
          <AccordionItem value="extras">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Costuri suplimentare & rezerve</CardTitle>
                <CardDescription>Transport, utilaje, evacuare deșeuri, rezervă pentru imprevizite.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 pt-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Transport materiale</Label>
                  <NumberField value={(local.options?.transport ?? 6000) || null} suffix="MDL" min={0} allowEmpty step={500} onCommit={(v) => updOption('transport', v ?? 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Utilaje (excavator, autobetonieră)</Label>
                  <NumberField value={(local.options?.utilaj ?? 8000) || null} suffix="MDL" min={0} allowEmpty step={500} onCommit={(v) => updOption('utilaj', v ?? 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Evacuare deșeuri / container</Label>
                  <NumberField value={(local.options?.deseuri ?? 4500) || null} suffix="MDL" min={0} allowEmpty step={500} onCommit={(v) => updOption('deseuri', v ?? 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Rezervă imprevizite</Label>
                  <NumberField value={local.options?.imprevizitePct ?? 0} suffix="%" min={0} max={30} step={1} onCommit={(v) => updOption('imprevizitePct', v ?? 0)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Rezervă suplimentară pe materiale</Label>
                  <NumberField value={local.options?.reservePct ?? 3} suffix="%" min={0} max={20} step={1} onCommit={(v) => updOption('reservePct', v ?? 0)} />
                  <p className="text-xs text-muted-foreground">Se aplică suplimentar peste pierderile tehnologice ale fiecărui material.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Uși exterioare</Label>
                  <NumberField value={local.options?.extDoors ?? 1} suffix="buc" min={0} max={4} step={1} onCommit={(v) => updOption('extDoors', v ?? 0)} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                  <div>
                    <Label>Încălzire în pardoseală la băi</Label>
                    <p className="text-xs text-muted-foreground">Adaugă teavă PEX conform ariei băilor</p>
                  </div>
                  <Switch checked={local.options?.floorHeating !== false} onCheckedChange={(v) => updOption('floorHeating', v)} />
                </div>
              </CardContent>
            </Card>
          </AccordionItem>
        </Accordion>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rezumat rapid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {estimate ? (
              <>
                <Row label="Total estimat" value={estimate.totals.grand.toLocaleString('ro-RO', { maximumFractionDigits: 0 }) + ' MDL'} strong />
                <Row label="Materiale" value={estimate.totals.materials.toLocaleString('ro-RO', { maximumFractionDigits: 0 }) + ' MDL'} />
                <Row label="Manoperă" value={estimate.totals.labor.toLocaleString('ro-RO', { maximumFractionDigits: 0 }) + ' MDL'} />
                <Row label="Suplimentare" value={estimate.totals.extra.toLocaleString('ro-RO', { maximumFractionDigits: 0 }) + ' MDL'} />
                <Row label="Cost / m² util" value={estimate.totals.perSqm.toLocaleString('ro-RO') + ' MDL/m²'} />
                <Separator />
                <Row label="Perimetru estimat" value={`${estimate.geometry.exteriorPerimeter} m`} />
                <Row label="Fațadă" value={`${estimate.geometry.facadeArea} m²`} />
                <Row label="Acoperiș (real, cu panta)" value={`${estimate.geometry.roofRealArea} m²`} />
                <Row label="Camere definite" value={`${estimate.rooms ? '' : ''}${useApp.getState().rooms.length} (${estimate.geometry.roomsCoveredPct}% din util)`} />
                <Separator />
                <WarningList warnings={estimate.globalWarnings.slice(0, 3)} assumptions={[]} compact />
              </>
            ) : (
              <p className="text-muted-foreground">Devizul se generează după completarea datelor.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-bold text-slate-900 tabular-nums' : 'tabular-nums font-medium'}>{value}</span>
    </div>
  )
}
