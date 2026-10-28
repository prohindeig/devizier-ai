'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useApp } from '@/lib/store'
import { APP_VERSION } from '@/lib/version'
import { Download, History, RotateCcw, Trash2, UploadCloud, ShieldCheck, FilePlus2 } from 'lucide-react'
import { toast } from 'sonner'

interface BackupMeta {
  id: string
  label: string
  kind: string // auto | manual | restore | import
  hash: string
  sizeBytes: number
  createdAt: string
}

const KIND_LABELS: Record<string, string> = {
  auto: 'Automat',
  manual: 'Manual',
  restore: 'Înainte de restaurare',
  import: 'Înainte de import',
}

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

export function BackupPanel() {
  const store = useApp()
  const [items, setItems] = useState<BackupMeta[] | null>(null)
  const [manualLabel, setManualLabel] = useState('')
  const [restoreTarget, setRestoreTarget] = useState<BackupMeta | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<BackupMeta | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/backups', { cache: 'no-store' })
      setItems(res.ok ? ((await res.json()) as BackupMeta[]) : [])
    } catch {
      setItems([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const createManual = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: manualLabel }),
      })
      if (!res.ok) throw new Error()
      toast.success('Versiune salvată')
      setManualLabel('')
      await load()
    } catch {
      toast.error('Nu am putut salva versiunea')
    } finally {
      setBusy(false)
    }
  }

  const restore = async () => {
    if (!restoreTarget) return
    setBusy(true)
    try {
      const res = await fetch(`/api/backups/${restoreTarget.id}`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success(`Restaurat din: ${restoreTarget.label}`)
      setRestoreTarget(null)
      await store.loadAll()
      await load()
    } catch {
      toast.error('Restaurarea a eșuat')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      const res = await fetch(`/api/backups/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Versiune ștearsă')
      setDeleteTarget(null)
      await load()
    } catch {
      toast.error('Ștergerea a eșuat')
    } finally {
      setBusy(false)
    }
  }

  const importFile = async (file: File) => {
    setBusy(true)
    try {
      const json = await file.text()
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error)
      }
      toast.success('Import finalizat — toate datele au fost înlocuite')
      await store.loadAll()
      await load()
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'Importul a eșuat')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-slate-900">Copie automată la fiecare modificare</p>
              <p className="text-muted-foreground">
                Înainte de orice editare/ștergere, aplicația salvează automat versiunea precedentă.
                Se păstrează ultimele 30.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-slate-900">Restaurare cu un click</p>
              <p className="text-muted-foreground">
                Revenirea la o versiune anterioară creează automat o copie și a stării curente.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <UploadCloud className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" aria-hidden />
            <div className="text-sm">
              <p className="font-medium text-slate-900">Export / import JSON</p>
              <p className="text-muted-foreground">
                Copie de siguranță în afara aplicației (PC, cloud) sau transfer pe alt dispozitiv.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" aria-hidden /> Versiuni salvate
              </CardTitle>
              <CardDescription>
                Aplicația v{APP_VERSION} · ultima modificare aparține celei mai recente intrări „Automat"
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href="/api/backup/export" download>
                <Button variant="outline" size="sm" type="button">
                  <Download className="mr-1.5 h-4 w-4" aria-hidden /> Exportă tot (JSON)
                </Button>
              </a>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
                <UploadCloud className="mr-1.5 h-4 w-4" aria-hidden /> Importă din fișier
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void importFile(f)
                }}
                aria-label="Fișier de import"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Input
              value={manualLabel}
              onChange={(e) => setManualLabel(e.target.value)}
              placeholder={'Etichetă opțională, ex. „înainte de schimbarea acoperișului"'}
              className="max-w-md"
            />
            <Button onClick={createManual} disabled={busy}>
              <FilePlus2 className="mr-1.5 h-4 w-4" aria-hidden /> Salvează versiune acum
            </Button>
          </div>

          {items === null ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Se încarcă versiunile…</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Încă nu există versiuni — apar automat la prima modificare.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Motiv</th>
                    <th className="px-3 py-2">Tip</th>
                    <th className="px-3 py-2">Mărime</th>
                    <th className="px-3 py-2 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((b) => (
                    <tr key={b.id} className="border-t">
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                        {new Date(b.createdAt).toLocaleString('ro-RO', { dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td className="max-w-[280px] truncate px-3 py-2" title={b.label}>{b.label}</td>
                      <td className="px-3 py-2">
                        <Badge variant={b.kind === 'auto' ? 'secondary' : 'outline'}>
                          {KIND_LABELS[b.kind] ?? b.kind}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 tabular-nums">{fmtSize(b.sizeBytes)}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <a href={`/api/backups/${b.id}`} download aria-label={`Descarcă versiunea din ${b.createdAt}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Download className="h-4 w-4" aria-hidden />
                            </Button>
                          </a>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setRestoreTarget(b)} aria-label={`Restaurează versiunea din ${b.createdAt}`}>
                            <RotateCcw className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => setDeleteTarget(b)} aria-label={`Șterge versiunea din ${b.createdAt}`}>
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!restoreTarget} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurezi versiunea din {restoreTarget ? new Date(restoreTarget.createdAt).toLocaleString('ro-RO') : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              Toate datele actuale (proiecte, camere, prețuri, manoperă) vor fi înlocuite cu conținutul versiunii
              selectate. Starea curentă se salvează automat ca „Înainte de restaurare", deci poți reveni oricând.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction className="bg-slate-900 hover:bg-slate-800" onClick={restore} disabled={busy}>
              Restaurează
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi această versiune?</AlertDialogTitle>
            <AlertDialogDescription>Versiunea salvată va fi ștearsă definitiv.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={remove} disabled={busy}>
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
