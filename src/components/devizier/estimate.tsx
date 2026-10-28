'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { StatusBadge, WarningList } from './common'
import { fmtMoney, fmtNum, fmtQty } from '@/lib/format'
import type { EstimateResult, MaterialLine, StageResult } from '@/lib/calc/types'
import { FilterX, FileWarning, TriangleAlert, Info } from 'lucide-react'

export function DevizPanel({ estimate, currency, rates }: { estimate: EstimateResult; currency: string; rates: Record<string, number> }) {
  const [fCategory, setFCategory] = useState('toate')
  const [fSupplier, setFSupplier] = useState('toți')
  const [fUnit, setFUnit] = useState('toate')
  const [fMinPrice, setFMinPrice] = useState('')
  const [fMaxPrice, setFMaxPrice] = useState('')

  const allCategories = useMemo(
    () => Array.from(new Set(estimate.stages.flatMap((s) => s.materials.map((m) => m.category)))).sort(),
    [estimate]
  )
  const allSuppliers = useMemo(
    () => Array.from(new Set(estimate.stages.flatMap((s) => s.materials.map((m) => m.priceSource)))).sort(),
    [estimate]
  )
  const allUnits = useMemo(
    () => Array.from(new Set(estimate.stages.flatMap((s) => s.materials.map((m) => m.unit)))).sort(),
    [estimate]
  )

  const filterActive = fCategory !== 'toate' || fSupplier !== 'toți' || fUnit !== 'toate' || fMinPrice !== '' || fMaxPrice !== ''

  const match = (m: MaterialLine) => {
    if (fCategory !== 'toate' && m.category !== fCategory) return false
    if (fSupplier !== 'toți' && m.priceSource !== fSupplier) return false
    if (fUnit !== 'toate' && m.unit !== fUnit) return false
    if (fMinPrice !== '' && m.unitPrice < Number(fMinPrice)) return false
    if (fMaxPrice !== '' && m.unitPrice > Number(fMaxPrice)) return false
    return true
  }

  const filteredTotals = useMemo(() => {
    let mat = 0, lab = 0
    for (const st of estimate.stages) {
      for (const m of st.materials) if (match(m)) mat += m.totalPrice
      if (!filterActive) lab += st.laborTotal
    }
    return { mat, lab }
  }, [estimate, fCategory, fSupplier, fUnit, fMinPrice, fMaxPrice, filterActive])

  return (
    <div className="space-y-4">
      {estimate.isEstimate && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Devizul are statut de ESTIMARE PRELIMINARĂ</AlertTitle>
          <AlertDescription>
            {estimate.missingPrices.length > 0 && (
              <>Există <b>{estimate.missingPrices.length}</b> materiale fără preț completat. </>
            )}
            {estimate.rooms.length === 0 && <>Nu sunt definite camere — cantitățile derivă doar din suprafață. </>}
            Completează datele lipsă pentru o evaluare mai precisă.
          </AlertDescription>
        </Alert>
      )}

      {/* Filtre */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-40 space-y-1">
            <Label className="text-xs">Categorie</Label>
            <Select value={fCategory} onValueChange={setFCategory}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="toate">Toate categoriile</SelectItem>
                {allCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-40 space-y-1">
            <Label className="text-xs">Furnizor / sursă preț</Label>
            <Select value={fSupplier} onValueChange={setFSupplier}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="toți">Toți furnizorii</SelectItem>
                {allSuppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-28 space-y-1">
            <Label className="text-xs">Unitate de măsură</Label>
            <Select value={fUnit} onValueChange={setFUnit}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="toate">Toate</SelectItem>
                {allUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-xs">Preț min. (MDL)</Label>
            <Input className="h-9" type="number" value={fMinPrice} onChange={(e) => setFMinPrice(e.target.value)} placeholder="0" />
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-xs">Preț max. (MDL)</Label>
            <Input className="h-9" type="number" value={fMaxPrice} onChange={(e) => setFMaxPrice(e.target.value)} placeholder="∞" />
          </div>
          {filterActive && (
            <button
              className="flex h-9 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted"
              onClick={() => { setFCategory('toate'); setFSupplier('toți'); setFUnit('toate'); setFMinPrice(''); setFMaxPrice('') }}
            >
              <FilterX className="h-4 w-4" /> Șterge filtrele
            </button>
          )}
          <div className="ml-auto text-sm text-muted-foreground">
            Se afișează: <b className="text-slate-900">{fmtMoney(filteredTotals.mat, currency, rates)}</b> materiale
            {!filterActive && <> + <b className="text-slate-900">{fmtMoney(filteredTotals.lab, currency, rates)}</b> manoperă</>}
          </div>
        </CardContent>
      </Card>

      {/* Etape */}
      <Accordion type="multiple" defaultValue={['fundatie', 'pereti']} className="space-y-3">
        {estimate.stages.map((st) => (
          <StageCard key={st.key} stage={st} currency={currency} rates={rates} filterActive={filterActive} match={match} />
        ))}
      </Accordion>

      {/* Total general */}
      <Card className="border-slate-800 bg-slate-900 text-white">
        <CardContent className="space-y-2 p-5">
          <TotalRow label="Total materiale" value={fmtMoney(estimate.totals.materials, currency, rates)} />
          <TotalRow label="Total manoperă" value={fmtMoney(estimate.totals.labor, currency, rates)} />
          <TotalRow label="Costuri suplimentare (transport, utilaje, deșeuri)" value={fmtMoney(estimate.totals.extra, currency, rates)} />
          {estimate.totals.contingency > 0 && (
            <TotalRow label="Rezervă imprevizite" value={fmtMoney(estimate.totals.contingency, currency, rates)} />
          )}
          <Separator className="bg-slate-700" />
          <div className="flex items-center justify-between pt-1">
            <span className="text-base font-semibold">TOTAL GENERAL</span>
            <span className="text-2xl font-bold tabular-nums">{fmtMoney(estimate.totals.grand, currency, rates)}</span>
          </div>
          <p className="pt-1 text-xs text-slate-400">
            {estimate.totals.perSqm > 0 && <>≈ {fmtNum(estimate.totals.perSqm, 0)} MDL/m² util · </>}
            Generat: {new Date(estimate.generatedAt).toLocaleString('ro-RO')} · Deviz de planificare, nu ofertă comercială.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function StageCard({
  stage, currency, rates, filterActive, match,
}: {
  stage: StageResult
  currency: string
  rates: Record<string, number>
  filterActive: boolean
  match: (m: MaterialLine) => boolean
}) {
  const materials = filterActive ? stage.materials.filter(match) : stage.materials
  const empty = stage.materials.length === 0 && stage.labor.length === 0
  if (empty && !filterActive) {
    return (
      <Card className="opacity-60">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <div>
            <b>{stage.title}</b> — nu conține poziții.
            {stage.warnings.length > 0 && <span> {stage.warnings[0]}</span>}
          </div>
        </CardContent>
      </Card>
    )
  }
  return (
    <AccordionItem value={stage.key} className="rounded-lg border bg-white">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 pr-2 text-left">
          <div>
            <p className="font-semibold">{stage.title}</p>
            <p className="text-xs text-muted-foreground">{stage.subtitle}</p>
          </div>
          <div className="text-right">
            <p className="font-bold tabular-nums">{fmtMoney(stage.stageTotal, currency, rates)}</p>
            <p className="text-xs text-muted-foreground">
              mat. {fmtMoney(stage.materialsTotal, currency, rates)} + manop. {fmtMoney(stage.laborTotal, currency, rates)}
            </p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        {(stage.assumptions.length > 0 || stage.warnings.length > 0) && (
          <div className="mb-3 rounded-md border bg-slate-50 p-3">
            <WarningList warnings={stage.warnings} assumptions={stage.assumptions} />
          </div>
        )}
        {materials.length > 0 && (
          <div className="max-h-[480px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-slate-100">
                <TableRow>
                  <TableHead className="w-1/4">Material</TableHead>
                  <TableHead>Netă</TableHead>
                  <TableHead>Pierderi</TableHead>
                  <TableHead>Rezervă</TableHead>
                  <TableHead>Finală</TableHead>
                  <TableHead>Ambalaj</TableHead>
                  <TableHead>Achiziție</TableHead>
                  <TableHead className="text-right">Preț unitar</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Sursă</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((m) => (
                  <TableRow key={`${m.code}-${m.name}`} className={m.priceStatus === 'lipsa' ? 'bg-orange-50/60' : undefined}>
                    <TableCell>
                      <p className="font-medium leading-tight">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.category}{m.note ? ` · ${m.note}` : ''}</p>
                    </TableCell>
                    <TableCell className="tabular-nums">{fmtNum(m.netQty, 2)} {m.unit}</TableCell>
                    <TableCell className="tabular-nums">{m.wastePct}%</TableCell>
                    <TableCell className="tabular-nums">+{m.reservePct}%</TableCell>
                    <TableCell className="font-medium tabular-nums">{fmtNum(m.finalQty, 2)} {m.unit}</TableCell>
                    <TableCell className="text-xs">
                      {m.pricing === 'continuous' ? '—' : m.packageLabel}
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums">
                      {m.pricing === 'continuous' ? `${fmtNum(m.purchaseQty, 2)} ${m.unit}` : `${m.packages} × ${m.packageLabel}`}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.priceStatus === 'lipsa' ? (
                        <span className="font-semibold text-orange-600">de completat</span>
                      ) : (
                        fmtMoney(m.unitPrice, currency, rates)
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{fmtMoney(m.totalPrice, currency, rates)}</TableCell>
                    <TableCell>
                      <StatusBadge status={m.priceStatus} />
                      <p className="mt-1 text-[11px] text-muted-foreground">{m.priceSource}<br />{m.priceDate}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {filterActive && stage.materials.length > 0 && materials.length === 0 && (
          <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><FilterX className="h-4 w-4" /> Nicio poziție nu corespunde filtrelor în această etapă.</p>
        )}
        {stage.labor.length > 0 && !filterActive && (
          <div className="mt-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <FileWarning className="h-4 w-4" /> Manoperă — {stage.title.split('—')[0].replace('ETAPA', 'Etapa').trim()}
            </p>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lucrare</TableHead>
                    <TableHead>Cantitate</TableHead>
                    <TableHead className="text-right">Tarif unitar</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Tarif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stage.labor.map((l) => (
                    <TableRow key={l.code}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="tabular-nums">{fmtQty(l.qty, l.unit)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtMoney(l.unitPrice, currency, rates)}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{fmtMoney(l.totalPrice, currency, rates)}</TableCell>
                      <TableCell>
                        <Badge variant={l.source === 'manual' ? 'default' : 'outline'} className={l.source === 'manual' ? 'bg-emerald-600' : 'border-amber-500 text-amber-600'}>
                          {l.source === 'manual' ? 'manual' : 'indicativ'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-300">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}
