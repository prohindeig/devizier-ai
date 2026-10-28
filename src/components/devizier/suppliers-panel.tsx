'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useApp, type ProjectWithRooms } from '@/lib/store'
import { computeEstimate } from '@/lib/calc/engine'
import { fmtMoney, fmtNum } from '@/lib/format'
import { TrendingDown, Star, ExternalLink, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { EstimateResult } from '@/lib/calc/types'

interface OfferRow {
  id: string
  supplier: string
  price: number
  locality: string
  source: string
  priceDate: string
  link: string
  isPrimary: boolean
}

interface Group {
  code: string
  name: string
  spec: string
  unit: string
  offers: OfferRow[]
  minPrice: number
  maxPrice: number
  primaryPrice: number
  usedQty: number // cantitate din deviz (purchaseQty)
}

export function SuppliersPanel({ estimate, currency, rates }: { estimate: EstimateResult | null; currency: string; rates: Record<string, number> }) {
  const store = useApp()
  const { materials } = store
  const [onlyUsed, setOnlyUsed] = useState(true)
  const [search, setSearch] = useState('')

  const groups = useMemo<Group[]>(() => {
    // cantități folosite în deviz, per cod
    const used = new Map<string, { qty: number; name: string; spec: string; unit: string }>()
    if (estimate) {
      for (const st of estimate.stages) {
        for (const m of st.materials) {
          const cur = used.get(m.code)
          used.set(m.code, {
            qty: (cur?.qty ?? 0) + m.purchaseQty,
            name: m.name,
            spec: m.spec,
            unit: m.unit,
          })
        }
      }
    }
    const byCode = new Map<string, MaterialRow[]>()
    for (const m of materials) {
      const list = byCode.get(m.code) ?? []
      list.push(m)
      byCode.set(m.code, list)
    }
    const out: Group[] = []
    for (const [code, list] of byCode) {
      if (list.length < 2) continue // comparație doar unde există ≥2 oferte
      const u = used.get(code)
      if (onlyUsed && !u) continue
      if (search && !(`${code} ${u?.name ?? list[0].name}`.toLowerCase().includes(search.toLowerCase()))) continue
      const offers: OfferRow[] = list
        .map((m) => ({
          id: m.id,
          supplier: m.supplier || '—',
          price: m.price,
          locality: m.locality,
          source: m.source,
          priceDate: m.priceDate,
          link: m.link,
          isPrimary: m.isPrimary,
        }))
        .sort((a, b) => a.price - b.price)
      const primary = list.find((m) => m.isPrimary) ?? list[0]
      out.push({
        code,
        name: u?.name ?? list[0].name,
        spec: u?.spec ?? list[0].spec,
        unit: u?.unit ?? list[0].unit,
        offers,
        minPrice: offers[0].price,
        maxPrice: offers[offers.length - 1].price,
        primaryPrice: primary.price,
        usedQty: u?.qty ?? 0,
      })
    }
    return out.sort((a, b) => b.usedQty * (b.primaryPrice - b.minPrice) - a.usedQty * (a.primaryPrice - a.minPrice))
  }, [materials, estimate, onlyUsed, search])

  const potentialSavings = useMemo(
    () => groups.reduce((s, g) => s + (g.primaryPrice - g.minPrice) * g.usedQty, 0),
    [groups]
  )

  const setPrimary = async (offer: OfferRow, code: string) => {
    // optimist local: mută marcajul
    store.updateMaterial(offer.id, { isPrimary: true })
    toast.success(`Ofertă principală setată pentru ${code}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Comparație oferte furnizori</h2>
          <p className="text-sm text-muted-foreground">
            {groups.length} materiale cu oferte multiple{estimate ? ' · sortate după potențial de economie în devizul curent' : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="only-used" checked={onlyUsed} onCheckedChange={setOnlyUsed} />
            <Label htmlFor="only-used" className="text-sm">Doar materiale din deviz</Label>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Caută material…" className="w-56 pl-8" aria-label="Caută material" />
          </div>
        </div>
      </div>

      {potentialSavings > 0 && (
        <Card className="border-emerald-300 bg-emerald-50/60">
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingDown className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
            <div>
              <p className="font-semibold text-emerald-800">
                Economie potențială: {fmtMoney(potentialSavings, currency, rates)}
              </p>
              <p className="text-sm text-emerald-700">
                Dacă alegi oferta cea mai ieftină pentru toate pozițiile de mai jos (prețul principal vs. minimul ofertelor).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {groups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">Nicio comparație disponibilă</p>
            <p className="mx-auto max-w-lg">
              Adaugă în tabul „Prețuri" mai multe oferte pentru același material (același cod, furnizori diferiți) —
              aici apar comparate automat, cu setarea ofertei principale folosită în deviz.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const saving = (g.primaryPrice - g.minPrice) * g.usedQty
            return (
              <Card key={g.code}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{g.name}</CardTitle>
                      <CardDescription>
                        {g.spec ? `${g.spec} · ` : ''}cod {g.code} · UM {g.unit}
                        {g.usedQty > 0 && ` · în deviz: ${fmtNum(g.usedQty, 1)} ${g.unit}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{g.offers.length} oferte</Badge>
                      {g.primaryPrice > g.minPrice && (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          −{fmtMoney(saving, currency, rates)} dacă alegi minimul
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Furnizor</th>
                          <th className="px-3 py-2">Localitate</th>
                          <th className="px-3 py-2 text-right">Preț</th>
                          <th className="px-3 py-2">Sursă / dată</th>
                          <th className="px-3 py-2 text-right">Acțiuni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.offers.map((o, idx) => (
                          <tr key={o.id} className={`border-t ${o.isPrimary ? 'bg-orange-50/60' : idx === 0 && g.primaryPrice > g.minPrice ? 'bg-emerald-50/40' : ''}`}>
                            <td className="px-3 py-2 font-medium">
                              {o.supplier}
                              {o.isPrimary && (
                                <Badge className="ml-2 bg-orange-600 text-white hover:bg-orange-600">
                                  <Star className="mr-1 h-3 w-3" aria-hidden /> principală
                                </Badge>
                              )}
                              {!o.isPrimary && idx === 0 && g.primaryPrice > g.minPrice && (
                                <Badge variant="outline" className="ml-2 border-emerald-500 text-emerald-700">cea mai ieftină</Badge>
                              )}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{o.locality || '—'}</td>
                            <td className="px-3 py-2 text-right font-semibold tabular-nums">{fmtMoney(o.price, 'MDL', rates)} / {g.unit}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {o.source === 'indicativ' ? 'orientativ' : o.source} {o.priceDate && `· ${o.priceDate}`}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex justify-end gap-1.5">
                                {o.link && (
                                  <a href={o.link} target="_blank" rel="noreferrer" aria-label="Deschide linkul ofertei">
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <ExternalLink className="h-4 w-4" aria-hidden />
                                    </Button>
                                  </a>
                                )}
                                {!o.isPrimary && (
                                  <Button variant="outline" size="sm" className="h-8" onClick={() => setPrimary(o, g.code)}>
                                    <Star className="mr-1 h-3.5 w-3.5" aria-hidden /> Setează principală
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

type MaterialRow = {
  id: string
  code: string
  name: string
  spec: string
  unit: string
  price: number
  supplier: string
  locality: string
  source: string
  priceDate: string
  link: string
  isPrimary: boolean
}

export type { ProjectWithRooms }
