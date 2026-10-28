'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { NumberField } from './number-field'
import { useApp } from '@/lib/store'
import { parsePlanText, type ParsedRoom } from '@/lib/plan-parser'
import { ROOM_TYPE_LABELS, type RoomType } from '@/lib/calc/types'
import { FileText, ImageIcon, Loader2, ScanLine, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

type Mode = 'text' | 'ai'

/**
 * Comprimă poza client-side (canvas → JPEG) înainte de trimitere.
 * Pe hosting serverless (Vercel) corpul cererii e limitat la ~4,5 MB —
 * redimensionarea la max 1800 px + JPEG 0,85 aduce orice poză de telefon
 * la câteva sute de KB, suficient pentru citirea dimensiunilor de pe plan.
 */
async function downscaleImage(file: File, maxDim = 1800, quality = 0.85): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas indisponibil')
    ctx.drawImage(bitmap, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    bitmap.close()
  }
}

const EXAMPLE = `Living 5.5x4.2x2.7, 2 ferestre 1.6x1.5, usa 0.9x2.05
Dormitor 4x3.5, 1 fereastra 1.4x1.5
Bucătărie 3.5x3, 1 fereastra 1.2x1.4
Baie 2.4x2, fara usi 1 usa 0.8x2, 1 fereastra 0.6x0.8
Hol 3x2`

export function PlanImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const store = useApp()
  const [mode, setMode] = useState<Mode>('text')
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<ParsedRoom[] | null>(null)
  const [aiImage, setAiImage] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setPreview(null)
    setText('')
    setAiImage(null)
    setMode('text')
  }

  const close = (v: boolean) => {
    if (!v) reset()
    onOpenChange(v)
  }

  const parseText = () => {
    const rooms = parsePlanText(text)
    if (rooms.length === 0) {
      toast.error('Niciun rând valid — folosește formatul din exemplu')
      return
    }
    setPreview(rooms)
  }

  const pickImage = async (file: File) => {
    if (file.size > 12 * 1024 * 1024) {
      toast.error('Imaginea depășește 12 MB')
      return
    }
    try {
      // comprimă automat (max 1800 px, JPEG) — necesar pentru hosting serverless
      const dataUrl = await downscaleImage(file)
      setAiImage(dataUrl)
    } catch {
      // fallback: trimite originalul (funcționează în sandbox / local)
      const reader = new FileReader()
      reader.onload = () => setAiImage(String(reader.result))
      reader.readAsDataURL(file)
    }
  }

  const runAi = async () => {
    if (!aiImage) return
    setAiBusy(true)
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: aiImage }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Procesarea AI a eșuat')
      const rooms: ParsedRoom[] = (data.rooms ?? []).map((r: ParsedRoom) => ({
        ...r,
        doorWidth: 0.9,
        doorHeight: 2.05,
        windowWidth: 1.4,
        windowHeight: 1.5,
        issues: [],
      }))
      if (rooms.length === 0) {
        toast.error('AI-ul nu a identificat camere — încearcă o poză mai clară sau modul Text')
        return
      }
      setPreview(rooms)
      toast.info(`${rooms.length} camere identificate — verifică dimensiunile înainte de salvare`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Procesarea AI a eșuat')
    } finally {
      setAiBusy(false)
    }
  }

  const addRooms = async () => {
    if (!preview || preview.length === 0) return
    setAdding(true)
    try {
      let added = 0
      for (const r of preview) {
        await store.addRoom({
          name: r.name,
          type: r.type,
          length: r.length,
          width: r.width,
          height: r.height,
          doorCount: r.doorCount,
          doorWidth: r.doorWidth,
          doorHeight: r.doorHeight,
          windowCount: r.windowCount,
          windowWidth: r.windowWidth,
          windowHeight: r.windowHeight,
        })
        added++
      }
      toast.success(`${added} camere adăugate din plan`)
      close(false)
    } finally {
      setAdding(false)
    }
  }

  const patchPreview = (i: number, patch: Partial<ParsedRoom>) =>
    setPreview((p) => (p ? p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) : p))

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-orange-600" aria-hidden /> Importă camere din plan
          </DialogTitle>
          <DialogDescription>
            Din text (lista camerelor) sau din fotografie/poză a planului de arhitectură, cu citire AI.
            Rezultatul este o <b>schiță</b> — verifică dimensiunile înainte de a le adăuga în deviz.
          </DialogDescription>
        </DialogHeader>

        {!preview && (
          <>
            <div className="flex gap-2" role="tablist" aria-label="Mod de import">
              <Button variant={mode === 'text' ? 'default' : 'outline'} size="sm" className="bg-slate-900 hover:bg-slate-800" onClick={() => setMode('text')} aria-pressed={mode === 'text'}>
                <FileText className="mr-1.5 h-4 w-4" aria-hidden /> Text / listă camere
              </Button>
              <Button variant={mode === 'ai' ? 'default' : 'outline'} size="sm" className={mode === 'ai' ? 'bg-slate-900 hover:bg-slate-800' : ''} onClick={() => setMode('ai')} aria-pressed={mode === 'ai'}>
                <ImageIcon className="mr-1.5 h-4 w-4" aria-hidden /> Fotografie plan (AI)
              </Button>
            </div>

            {mode === 'text' ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="plan-text">Un rând per cameră: „Nume L×L×H, N ferestre L×L, usa L×L"</Label>
                  <Textarea
                    id="plan-text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={EXAMPLE}
                    rows={7}
                    className="font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Acceptă virgulă zecimală (4,5), spații în jurul „×" și înălțimea opțională (a treia valoare).
                  Tipul camerei se deduce din denumire (baie, bucătărie, dormitor…).
                </p>
                <Button onClick={parseText} disabled={!text.trim()}>
                  <ScanLine className="mr-1.5 h-4 w-4" aria-hidden /> Analizează textul
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    const f = e.dataTransfer.files?.[0]
                    if (f) pickImage(f)
                  }}
                >
                  {aiImage ? (
                    <img src={aiImage} alt="Previzualizare plan" className="max-h-56 rounded-lg border object-contain" />
                  ) : (
                    <>
                      <ImageIcon className="h-10 w-10 text-muted-foreground/40" aria-hidden />
                      <p className="text-sm text-muted-foreground">Trage poza aici sau alege fișierul (JPG/PNG — comprimată automat la trimitere)</p>
                    </>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) pickImage(f)
                    }}
                    aria-label="Fișier plan (imagine)"
                  />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    Alege imaginea
                  </Button>
                </div>
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>
                    AI-ul citește <b>doar dimensiunile scrise pe plan</b> și nu calculează prețuri. Fotografia trebuie
                    să fie clară, perpendiculară pe plan. Verifici fiecare dimensiune înainte de salvare.
                  </span>
                </div>
                <Button onClick={runAi} disabled={!aiImage || aiBusy}>
                  {aiBusy ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> Se procesează…
                    </>
                  ) : (
                    <>
                      <ScanLine className="mr-1.5 h-4 w-4" aria-hidden /> Citește planul cu AI
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {preview && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{preview.length} camere identificate — corectează dacă e nevoie:</p>
              <Badge variant="outline">schiță de verificat</Badge>
            </div>
            <div className="max-h-[46vh] overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2">Denumire</th>
                    <th className="px-2 py-2">Lung.</th>
                    <th className="px-2 py-2">Lăț.</th>
                    <th className="px-2 py-2">H</th>
                    <th className="px-2 py-2">Uși</th>
                    <th className="px-2 py-2">Fereastre</th>
                    <th className="px-2 py-2">Tip</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={`${r.name}-${i}`} className="border-t align-middle">
                      <td className="px-2 py-1.5">
                        <Input value={r.name} onChange={(e) => patchPreview(i, { name: e.target.value })} className="h-8 min-w-32" aria-label={`Denumire cameră ${i + 1}`} />
                      </td>
                      <td className="px-2 py-1.5"><NumberField value={r.length} onCommit={(v) => patchPreview(i, { length: v ?? 1 })} min={0.5} className="h-8 w-16" /></td>
                      <td className="px-2 py-1.5"><NumberField value={r.width} onCommit={(v) => patchPreview(i, { width: v ?? 1 })} min={0.5} className="h-8 w-16" /></td>
                      <td className="px-2 py-1.5"><NumberField value={r.height} onCommit={(v) => patchPreview(i, { height: v })} min={1.8} allowEmpty className="h-8 w-16" /></td>
                      <td className="px-2 py-1.5"><NumberField value={r.doorCount} onCommit={(v) => patchPreview(i, { doorCount: Math.round(v ?? 0) })} min={0} step={1} className="h-8 w-14" /></td>
                      <td className="px-2 py-1.5"><NumberField value={r.windowCount} onCommit={(v) => patchPreview(i, { windowCount: Math.round(v ?? 0) })} min={0} step={1} className="h-8 w-14" /></td>
                      <td className="px-2 py-1.5">
                        <select
                          value={r.type}
                          onChange={(e) => patchPreview(i, { type: e.target.value as RoomType })}
                          className="h-8 rounded-md border bg-background px-1.5 text-sm"
                          aria-label={`Tip cameră ${r.name}`}
                        >
                          {Object.entries(ROOM_TYPE_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>{label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.some((r) => r.issues.length > 0) && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                {preview.filter((r) => r.issues.length > 0).map((r, i) => (
                  <p key={i}>„{r.name}": {r.issues.join('; ')}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {preview ? (
            <>
              <Button variant="outline" onClick={() => setPreview(null)}>Înapoi</Button>
              <Button onClick={addRooms} disabled={adding || preview.length === 0}>
                {adding ? 'Se adaugă…' : `Adaugă ${preview.length} camere`}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => close(false)}>Anulează</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
