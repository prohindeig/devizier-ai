'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { NumberField } from './number-field'
import { useApp } from '@/lib/store'
import { CATEGORIES } from '@/lib/calc/catalog'
import { formatDate, fmtNum } from '@/lib/format'
import type { MaterialPriceRow } from '@/lib/calc/types'
import { Plus, Pencil, Trash2, Search, GitCompareArrows } from 'lucide-react'
import { toast } from 'sonner'

const emptyDraft = {
  code: '', name: '', category: 'Consumabile', unit: 'buc', packageQty: 1, packageLabel: '',
  price: 0, supplier: '', locality: '', manufacturer: '', spec: '', link: '',
  source: 'manual', priceDate: new Date().toISOString().slice(0, 10), isPrimary: true,
}

export function PricesPanel() {
  const { materials, updateMaterial, addMaterial, deleteMaterial } = useApp()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('toate')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MaterialPriceRow | null>(null)
  const [draft, setDraft] = useState<typeof emptyDraft>(emptyDraft)
  const [deleteTarget, setDeleteTarget] = useState<MaterialPriceRow | null>(null)
  const [compareCode, setCompareCode] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return materials.filter((m) => {
      if (cat !== 'toate' && m.category !== cat) return false
      if (onlyMissing && m.price > 0) return false
      if (!needle) return true
      return (
        m.name.toLowerCase().includes(needle) ||
        m.code.toLowerCase().includes(needle) ||
        m.supplier.toLowerCase().includes(needle) ||
        m.manufacturer.toLowerCase().includes(needle)
      )
    })
  }, [materials, q, cat, onlyMissing])

  const missingCount = materials.filter((m) => m.price <= 0).length
  const compareOffers = useMemo(
    () => (compareCode ? materials.filter((m) => m.code === compareCode) : []),
    [materials, compareCode]
  )

  const openEdit = (m: MaterialPriceRow) => {
    setEditing(m)
    setDraft({ ...m } as typeof emptyDraft)
    setDialogOpen(true)
  }

  const openNew = () => {
    setEditing(null)
    setDraft({ ...emptyDraft, code: '', name: '' })
    setDialogOpen(true)
  }

  const save = () => {
    if (!draft.code.trim() || !draft.name.trim()) {
      toast.error('Codul și denumirea sunt obligatorii')
      return
    }
    if (editing) {
      updateMaterial(editing.id, draft)
      toast.success('Material actualizat')
    } else {
      addMaterial(draft)
      toast.success('Material adăugat în baza de prețuri')
    }
    setDialogOpen(false)
  }

  const offerCount = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of materials) map.set(m.code, (map.get(m.code) ?? 0) + 1)
    return map
  }, [materials])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Baza de date a prețurilor</h2>
          <p className="text-sm text-muted-foreground">
            {materials.length} materiale · {missingCount > 0 ? <span className="text-orange-600 font-medium">{missingCount} fără preț</span> : 'toate prețurile completate'} ·
            prețurile „indicativ" sunt orientative și trebuie verificate
          </p>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Adaugă material</Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-56 flex-1 space-y-1">
            <Label className="text-xs">Caută</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="denumire, cod, furnizor..." />
            </div>
          </div>
          <div className="min-w-44 space-y-1">
            <Label className="text-xs">Categorie</Label>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="toate">Toate categoriile</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex h-9 items-center gap-2">
            <input type="checkbox" id="onlyMissing" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="h-4 w-4 accent-orange-600" />
            <Label htmlFor="onlyMissing" className="text-sm font-normal">Doar fără preț</Label>
          </div>
        </CardContent>
      </Card>

      <div className="max-h-[62vh] overflow-y-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-100">
            <TableRow>
              <TableHead>Material</TableHead>
              <TableHead>Categorie</TableHead>
              <TableHead>UM</TableHead>
              <TableHead>Ambalaj</TableHead>
              <TableHead className="text-right">Preț (MDL)</TableHead>
              <TableHead>Furnizor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-28">Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <TableRow key={m.id} className={m.price <= 0 ? 'bg-orange-50/50' : undefined}>
                <TableCell>
                  <p className="font-medium leading-tight">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.code}{m.manufacturer ? ` · ${m.manufacturer}` : ''}{m.spec ? ` · ${m.spec}` : ''}
                  </p>
                </TableCell>
                <TableCell className="text-xs">{m.category}</TableCell>
                <TableCell>{m.unit}</TableCell>
                <TableCell className="text-xs">{m.packageLabel || '—'}</TableCell>
                <TableCell className="text-right">
                  {m.price > 0 ? (
                    <span className="font-semibold tabular-nums">{fmtNum(m.price, 2)}</span>
                  ) : (
                    <Badge className="bg-orange-600 text-white">de completat</Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {m.supplier || '—'}
                  <Badge variant="outline" className={`ml-1 ${m.source === 'indicativ' ? 'border-amber-500 text-amber-600' : 'border-emerald-500 text-emerald-600'}`}>
                    {m.source}
                  </Badge>
                  {(offerCount.get(m.code) ?? 0) > 1 && (
                    <button className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-slate-700 underline hover:text-slate-900"
                      onClick={() => setCompareCode(m.code)}>
                      <GitCompareArrows className="h-3 w-3" /> {offerCount.get(m.code)} oferte
                    </button>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(m.priceDate)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)} aria-label={`Editează ${m.name}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setDeleteTarget(m)} aria-label={`Șterge ${m.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Niciun material găsit.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog editare / adăugare */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Editează: ${editing.name}` : 'Material nou'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Actualizează prețul și datele produsului. Sursa devine „manual" după modificare.'
                : 'Adaugă un produs nou în baza de date (sursă: manual).'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cod produs *</Label>
              <Input value={draft.code} onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))} disabled={!!editing} />
            </div>
            <div className="space-y-1.5">
              <Label>Denumire *</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Categorie</Label>
              <Select value={draft.category} onValueChange={(v) => setDraft((d) => ({ ...d, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unitate de măsură</Label>
              <Select value={draft.unit} onValueChange={(v) => setDraft((d) => ({ ...d, unit: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['m', 'm²', 'm³', 'kg', 'tone', 'litri', 'buc', 'sac', 'rolă', 'set', 'cutie'].map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Preț (MDL)</Label>
              <NumberField value={draft.price || null} suffix="MDL" min={0} step={1} allowEmpty onCommit={(v) => setDraft((d) => ({ ...d, price: v ?? 0 }))} />
              <p className="text-xs text-muted-foreground">Lasă 0 dacă nu cunoști prețul — devizul va marca materialul ca „preț lipsă".</p>
            </div>
            <div className="space-y-1.5">
              <Label>Cantitate pe ambalaj</Label>
              <NumberField value={draft.packageQty} min={0.001} onCommit={(v) => setDraft((d) => ({ ...d, packageQty: v ?? 1 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Ambalaj (descriere)</Label>
              <Input value={draft.packageLabel} onChange={(e) => setDraft((d) => ({ ...d, packageLabel: e.target.value }))} placeholder="ex. sac 25 kg, rolă 75 m²" />
            </div>
            <div className="space-y-1.5">
              <Label>Producător</Label>
              <Input value={draft.manufacturer} onChange={(e) => setDraft((d) => ({ ...d, manufacturer: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Furnizor</Label>
              <Input value={draft.supplier} onChange={(e) => setDraft((d) => ({ ...d, supplier: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Localitate</Label>
              <Input value={draft.locality} onChange={(e) => setDraft((d) => ({ ...d, locality: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Data actualizării prețului</Label>
              <Input type="date" value={draft.priceDate} onChange={(e) => setDraft((d) => ({ ...d, priceDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Specificații tehnice</Label>
              <Input value={draft.spec} onChange={(e) => setDraft((d) => ({ ...d, spec: e.target.value }))} placeholder="ex. D500, 0,5 mm, clasa C20/25" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Link produs (opțional)</Label>
              <Input value={draft.link} onChange={(e) => setDraft((d) => ({ ...d, link: e.target.value }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Anulează</Button>
            <Button onClick={save}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comparare oferte */}
      <Dialog open={!!compareCode} onOpenChange={(open) => !open && setCompareCode(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Compară oferte — {compareCode}</DialogTitle>
            <DialogDescription>
              {compareOffers[0]?.name}. Devizul folosește oferta marcată „utilizat".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {compareOffers.map((m) => (
              <div key={m.id} className={`flex items-center justify-between rounded-lg border p-3 ${m.isPrimary ? 'border-slate-800 bg-slate-50' : ''}`}>
                <div>
                  <p className="font-medium">{m.supplier || 'Fără furnizor'}</p>
                  <p className="text-xs text-muted-foreground">{m.locality} · {formatDate(m.priceDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tabular-nums">{fmtNum(m.price, 2)} MDL</span>
                  {m.isPrimary
                    ? <Badge className="bg-slate-900 text-white">utilizat</Badge>
                    : <Button size="sm" variant="outline" onClick={() => { updateMaterial(m.id, { isPrimary: true }); setCompareCode(null); toast.success('Ofertă selectată pentru deviz') }}>
                        Folosește
                      </Button>}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi materialul „{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Materialul va disparea din baza de prețuri. Devizul îl va afișa ca „preț lipsă" dacă apare în calcul.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => {
              if (deleteTarget) { deleteMaterial(deleteTarget.id); toast.success('Material șters') }
            }}>Șterge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
