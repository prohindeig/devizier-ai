'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { NumberField } from './number-field'
import { Label } from '@/components/ui/label'
import { useApp } from '@/lib/store'
import { toast } from 'sonner'

/** Dialog de administrare a cursurilor valutare (prețurile rămân în MDL la bază). */
export function RatesDialog() {
  const { rates, saveRates } = useApp()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(rates)

  const save = () => {
    saveRates(draft)
    toast.success('Cursurile au fost salvate')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(rates) }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Curs valutar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cursuri valutare</DialogTitle>
          <DialogDescription>
            Câte MDL pentru o unitate din moneda respectivă. Prețurile din baza de date rămân stocate în MDL.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {(['EUR', 'USD', 'RON'] as const).map((c) => (
            <div key={c} className="flex items-center justify-between gap-3">
              <Label className="w-14">1 {c}</Label>
              <NumberField value={draft[c] ?? 0} min={0.01} suffix="MDL" className="flex-1"
                onCommit={(v) => v !== null && setDraft((d) => ({ ...d, [c]: v }))} />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
          <Button onClick={save}>Salvează</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
