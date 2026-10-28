'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { NumberField } from './number-field'
import { useApp } from '@/lib/store'
import { formatDate, fmtNum, fmtQty } from '@/lib/format'
import { Hammer } from 'lucide-react'
import type { EstimateResult } from '@/lib/calc/types'

export function LaborPanel({ estimate, currency, rates }: { estimate: EstimateResult | null; currency: string; rates: Record<string, number> }) {
  const { labor, updateLabor } = useApp()

  // cantitățile totale din deviz per cod lucrare
  const qtyByCode = useMemo(() => {
    const map = new Map<string, { qty: number; unit: string; total: number }>()
    if (!estimate) return map
    for (const st of estimate.stages) {
      for (const l of st.labor) {
        const cur = map.get(l.code)
        if (cur) {
          cur.qty += l.qty
          cur.total += l.totalPrice
        } else {
          map.set(l.code, { qty: l.qty, unit: l.unit, total: l.totalPrice })
        }
      }
    }
    return map
  }, [estimate])

  const totalLabor = estimate?.totals.labor ?? 0

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold"><Hammer className="h-5 w-5" /> Manoperă</h2>
        <p className="text-sm text-muted-foreground">
          Tarife orientative pe unitate de măsură (MDL). Modifică-le cu prețurile reale ale echipelor tale —
          costurile se recalculează instantaneu. Materialele și manopera sunt ținute separat.
        </p>
      </div>

      {estimate && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-slate-900 p-4 text-white">
            <p className="text-xs uppercase tracking-wide text-slate-300">Total manoperă în deviz</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{fmtNum(totalLabor, 0)} MDL</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Lucrări incluse în deviz</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{qtyByCode.size}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tarife configurate</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{labor.length}</p>
          </div>
        </div>
      )}

      <div className="max-h-[62vh] overflow-y-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-100">
            <TableRow>
              <TableHead>Lucrare</TableHead>
              <TableHead>UM</TableHead>
              <TableHead className="text-right">Tarif (MDL/unit)</TableHead>
              <TableHead>Sursă</TableHead>
              {estimate && (
                <>
                  <TableHead className="text-right">Cantitate în deviz</TableHead>
                  <TableHead className="text-right">Cost total</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {labor.map((l) => {
              const inDeviz = qtyByCode.get(l.code)
              return (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.unit}</TableCell>
                  <TableCell className="w-40 text-right">
                    <NumberField value={l.price} min={0} step={10} className="ml-auto w-32" suffix="MDL"
                      onCommit={(v) => v !== null && updateLabor(l.id, { price: v, source: 'manual', priceDate: new Date().toISOString().slice(0, 10) })} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={l.source === 'manual' ? 'default' : 'outline'}
                      className={l.source === 'manual' ? 'bg-emerald-600 text-white' : 'border-amber-500 text-amber-600'}>
                      {l.source}
                    </Badge>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(l.priceDate)}</p>
                  </TableCell>
                  {estimate && (
                    <>
                      <TableCell className="text-right tabular-nums">
                        {inDeviz ? fmtQty(inDeviz.qty, inDeviz.unit) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {inDeviz ? `${fmtNum(inDeviz.total, 0)} MDL` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-4 text-sm text-muted-foreground">
          Tarifele „indicativ" sunt orientative pentru piața din Republica Moldova și NU reprezintă oferte.
          Pentru lucrări de instalații pe gaz sau electric, folosește echipe autorizate și prețuri confirmate.
        </CardContent>
      </Card>
    </div>
  )
}
