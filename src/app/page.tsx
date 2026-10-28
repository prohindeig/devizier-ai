'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp, computeCurrentEstimate, type ProjectWithRooms } from '@/lib/store'
import { ProjectForm } from '@/components/devizier/project-form'
import { RoomsPanel } from '@/components/devizier/rooms'
import { DevizPanel } from '@/components/devizier/estimate'
import { DashboardPanel } from '@/components/devizier/dashboard'
import { PricesPanel } from '@/components/devizier/prices'
import { LaborPanel } from '@/components/devizier/labor-panel'
import { ExportPanel } from '@/components/devizier/export-panel'
import { BackupPanel } from '@/components/devizier/backup-panel'
import { VersionPanel } from '@/components/devizier/version-panel'
import { SuppliersPanel } from '@/components/devizier/suppliers-panel'
import { AiAssistant } from '@/components/devizier/ai-chat'
import { InstallAppButton } from '@/components/devizier/install-app'
import { AccountButton, type SessionUserLite } from '@/components/devizier/account-button'
import { RatesDialog } from '@/components/devizier/rates-dialog'
import { AuthScreen, BrandMark, type AuthedUser } from '@/components/devizier/auth-screen'
import { Spinner, WarningList } from '@/components/devizier/common'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { fmtMoney, fmtNum } from '@/lib/format'
import { APP_VERSION } from '@/lib/version'
import { PROJECT_TYPE_LABELS, type ProjectData, type ProjectType } from '@/lib/calc/types'
import {
  Plus, Copy, Trash2, ClipboardList, DoorOpen, ReceiptText, FileDown, LayoutDashboard,
  Tags, Truck, Hammer, DatabaseBackup, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

const TAB_TRIGGER =
  'flex items-center gap-1.5 rounded-md border border-transparent px-3 py-1.5 text-sm data-[state=active]:border-slate-200 data-[state=active]:bg-white data-[state=active]:shadow-sm'

export default function Home() {
  const store = useApp()
  const { loading, loaded, projects, currentId, project, rooms, materials, currency, rates } = store
  const [newOpen, setNewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [user, setUser] = useState<AuthedUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [draft, setDraft] = useState({ name: '', locality: '', type: 'casa_noua', builtArea: 100, floors: 1, budget: 0, currency: 'MDL', withSampleRooms: true })

  // Verificăm sesiunea ÎNAINTE de a încărca datele: fără cont → ecran de înregistrare
  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return
        const u = d?.user ?? null
        setUser(u)
        if (u) store.loadAll()
      })
      .catch(() => setUser(null))
      .finally(() => !cancelled && setAuthReady(true))
    return () => { cancelled = true }
  }, [])

  const estimate = useMemo(
    () => computeCurrentEstimate({ project, rooms, materials, labor: store.labor }),
    [project, rooms, materials, store.labor]
  )

  const handleAuthed = async (u: AuthedUser) => {
    setUser(u)
    await store.loadAll()
  }

  const createProject = async () => {
    if (!draft.name.trim()) {
      toast.error('Completează denumirea proiectului')
      return
    }
    const created = await store.createProject({ ...draft, name: draft.name.trim() })
    if (created) {
      toast.success('Proiect creat! Completează formularul și adaugă camerele.')
      setNewOpen(false)
      setDraft({ name: '', locality: '', type: 'casa_noua', builtArea: 100, floors: 1, budget: 0, currency: 'MDL', withSampleRooms: true })
    } else {
      toast.error('Nu am putut crea proiectul')
    }
  }

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <BrandMark className="mx-auto h-14 w-14 animate-pulse" />
          <Spinner className="py-3" />
          <p className="text-sm text-muted-foreground">Se încarcă Devizier AI...</p>
        </div>
      </main>
    )
  }

  // ── POARTA DE AUTENTIFICARE: fără sesiune → ecranul de înregistrare ──
  if (!user) {
    return <AuthScreen onAuthed={handleAuthed} />
  }

  if (loading || !loaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <BrandMark className="mx-auto h-14 w-14 animate-pulse" />
          <Spinner className="py-3" />
          <p className="mt-2 text-sm text-muted-foreground">Se încarcă proiectele tale...</p>
        </div>
      </main>
    )
  }

  // ── Stare goală: fără proiecte ─────────────────────────────
  if (!project) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-xl rounded-2xl border bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <BrandMark className="h-12 w-12" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Devizier AI</h1>
              <p className="text-sm text-muted-foreground">Calculator inteligent pentru construcții — Republica Moldova</p>
            </div>
          </div>
          <p className="mb-5 text-sm text-muted-foreground">
            Bun venit, {user.firstName || user.name || 'drag utilizator'}! Creează primul proiect: introdu suprafața,
            sistemul constructiv și camerele — aplicația calculează automat materialele până la ultimul șurub,
            manopera și costul total.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Denumirea proiectului *</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="ex. Casă Orhei, str. Centrală" />
            </div>
            <div className="space-y-1.5">
              <Label>Localitatea</Label>
              <Input value={draft.locality} onChange={(e) => setDraft((d) => ({ ...d, locality: e.target.value }))} placeholder="Chișinău" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipul proiectului</Label>
              <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Suprafața construită (m²)</Label>
              <Input type="number" value={draft.builtArea} onChange={(e) => setDraft((d) => ({ ...d, builtArea: Number(e.target.value) || 100 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Număr de etaje</Label>
              <Input type="number" min={1} max={4} value={draft.floors} onChange={(e) => setDraft((d) => ({ ...d, floors: Number(e.target.value) || 1 }))} />
            </div>
          </div>
          <Button className="mt-5 w-full bg-slate-900 py-6 text-base hover:bg-slate-800" onClick={createProject}>
            <Plus className="mr-2 h-5 w-5" /> Creează primul proiect
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Instrument de planificare și estimare. Nu înlocuiește proiectarea tehnică autorizată.
          </p>
        </div>
        <AiAssistant projectId={null} />
      </main>
    )
  }

  // ── Aplicația principală ───────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900 text-white pt-[max(0px,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-9 w-9 shadow-orange-900/40" />
            <div className="leading-tight">
              <p className="font-bold">Devizier AI</p>
              <p className="text-[11px] text-slate-400">Calculator construcții</p>
            </div>
          </div>

          <Select value={currentId ?? ''} onValueChange={(v) => store.selectProject(v)}>
            <SelectTrigger className="h-9 w-full max-w-64 border-slate-700 bg-slate-800 text-white sm:w-64" aria-label="Proiectul activ">
              <SelectValue placeholder="Selectează proiectul" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p: ProjectWithRooms) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <InstallAppButton />
            <AccountButton user={user as SessionUserLite} onUserChanged={setUser} />
            <RatesDialog />
            <Button size="sm" variant="outline" className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700" onClick={() => setNewOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Proiect nou
            </Button>
            <Button size="icon" variant="outline" className="h-9 w-9 border-slate-700 bg-slate-800 hover:bg-slate-700" onClick={() => currentId && store.duplicateProject(currentId)} aria-label="Duplică proiectul">
              <Copy className="h-4 w-4 text-white" />
            </Button>
            <Button size="icon" variant="outline" className="h-9 w-9 border-red-800 bg-red-900/40 hover:bg-red-900/70" onClick={() => setDeleteOpen(true)} aria-label="Șterge proiectul">
              <Trash2 className="h-4 w-4 text-red-300" />
            </Button>
          </div>
        </div>
      </header>

      {/* Bară de stare */}
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 text-sm">
          <span className="font-semibold text-slate-900">{project.name}</span>
          <span className="text-muted-foreground">{project.locality || '—'}</span>
          <Badge variant="secondary">{PROJECT_TYPE_LABELS[project.type]}</Badge>
          <Badge variant="outline">{project.builtArea} m² construiți</Badge>
          <Badge variant="outline">{rooms.length} camere</Badge>
          <Badge variant="outline">{project.windowsCount > 0 ? `${project.windowsCount} geamuri` : `${estimate?.geometry.windowsCount ?? 0} geamuri`}</Badge>
          <span className="ml-auto flex items-center gap-3">
            {estimate && estimate.missingPrices.length > 0 && (
              <span className="text-xs font-medium text-orange-600">{estimate.missingPrices.length} prețuri lipsă</span>
            )}
            {estimate && (
              <>
                <span className="text-xs text-muted-foreground">Progres date: {estimate.progress.pct}%</span>
                <div className="w-24"><Progress value={estimate.progress.pct} className="h-1.5" aria-label="Progres completare" /></div>
                <span className="font-bold tabular-nums text-slate-900">{fmtMoney(estimate.totals.grand, currency, rates)}</span>
              </>
            )}
            <Select value={currency} onValueChange={(v) => { store.setCurrency(v); store.saveProject({ currency: v }) }}>
              <SelectTrigger className="h-8 w-24 text-sm" aria-label="Moneda de afișare"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MDL">MDL</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="RON">RON</SelectItem>
              </SelectContent>
            </Select>
          </span>
        </div>
      </div>

      {/* Conținut */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5">
        <Tabs defaultValue="proiect" className="space-y-4">
          <div className="overflow-x-auto pb-0.5">
            <TabsList className="flex h-auto w-max min-w-full items-center gap-1 rounded-xl bg-white p-1.5 shadow-sm">
              <TabsTrigger value="proiect" className={TAB_TRIGGER}><ClipboardList className="h-4 w-4 text-slate-500" /> Proiect</TabsTrigger>
              <TabsTrigger value="camere" className={TAB_TRIGGER}><DoorOpen className="h-4 w-4 text-slate-500" /> Camere</TabsTrigger>
              <TabsTrigger value="deviz" className={TAB_TRIGGER}><ReceiptText className="h-4 w-4 text-slate-500" /> Deviz</TabsTrigger>
              <TabsTrigger value="export" className={`${TAB_TRIGGER} text-orange-700 data-[state=active]:text-orange-700`}>
                <FileDown className="h-4 w-4" /> Export PDF
              </TabsTrigger>
              <TabsTrigger value="dashboard" className={TAB_TRIGGER}><LayoutDashboard className="h-4 w-4 text-slate-500" /> Dashboard</TabsTrigger>
              <TabsTrigger value="preturi" className={TAB_TRIGGER}><Tags className="h-4 w-4 text-slate-500" /> Prețuri</TabsTrigger>
              <TabsTrigger value="furnizori" className={TAB_TRIGGER}><Truck className="h-4 w-4 text-slate-500" /> Furnizori</TabsTrigger>
              <TabsTrigger value="manopera" className={TAB_TRIGGER}><Hammer className="h-4 w-4 text-slate-500" /> Manoperă</TabsTrigger>
              <TabsTrigger value="backup" className={TAB_TRIGGER}><DatabaseBackup className="h-4 w-4 text-slate-500" /> Backup</TabsTrigger>
              <TabsTrigger value="versiune" className={`${TAB_TRIGGER} text-emerald-700 data-[state=active]:text-emerald-700`}>
                <RefreshCw className="h-4 w-4" /> Verifică versiune
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="proiect"><ProjectForm estimate={estimate} /></TabsContent>
          <TabsContent value="camere"><RoomsPanel /></TabsContent>
          <TabsContent value="deviz">
            {estimate ? (
              <DevizPanel estimate={estimate} currency={currency} rates={rates} />
            ) : <Spinner />}
          </TabsContent>
          <TabsContent value="export"><ExportPanel estimate={estimate} currentId={currentId} /></TabsContent>
          <TabsContent value="dashboard">
            {estimate ? (
              <DashboardPanel estimate={estimate} currency={currency} rates={rates} />
            ) : <Spinner />}
          </TabsContent>
          <TabsContent value="preturi"><PricesPanel /></TabsContent>
          <TabsContent value="furnizori">
            {estimate ? (
              <SuppliersPanel estimate={estimate} currency={currency} rates={rates} />
            ) : <Spinner />}
          </TabsContent>
          <TabsContent value="manopera">
            <LaborPanel estimate={estimate} currency={currency} rates={rates} />
          </TabsContent>
          <TabsContent value="backup"><BackupPanel /></TabsContent>
          <TabsContent value="versiune"><VersionPanel /></TabsContent>
        </Tabs>
      </main>

      {/* Footer sticky */}
      <footer className="mt-auto border-t bg-white py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-7xl px-4">
          {estimate && (
            <div className="mb-2">
              <WarningList warnings={estimate.globalWarnings.slice(0, 1)} assumptions={[]} compact />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Devizier AI v{APP_VERSION} — instrument de planificare și estimare pentru Republica Moldova. Nu este o ofertă comercială reală.</span>
            <span>
              {materials.length} materiale în catalog ·
              {estimate && ` ${fmtNum(estimate.totals.perSqm, 0)} MDL/m² util`}
              {project.usefulArea > 0 ? ` (suprafață utilă declarată ${project.usefulArea} m²)` : ''}
            </span>
          </div>
        </div>
      </footer>

      <AiAssistant projectId={currentId} />

      {/* Dialog proiect nou */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Proiect nou</DialogTitle>
            <DialogDescription>Creează un proiect separat. Poți duplica sau șterge proiecte oricând.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Denumirea proiectului *</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="ex. Casă maică — Ialoveni" />
            </div>
            <div className="space-y-1.5">
              <Label>Localitatea</Label>
              <Input value={draft.locality} onChange={(e) => setDraft((d) => ({ ...d, locality: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipul proiectului</Label>
              <Select value={draft.type} onValueChange={(v) => setDraft((d) => ({ ...d, type: v as ProjectType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROJECT_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Suprafața construită (m²)</Label>
              <Input type="number" value={draft.builtArea} onChange={(e) => setDraft((d) => ({ ...d, builtArea: Number(e.target.value) || 100 }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Număr de etaje</Label>
              <Input type="number" min={1} max={4} value={draft.floors} onChange={(e) => setDraft((d) => ({ ...d, floors: Number(e.target.value) || 1 }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
              <div>
                <Label>Camere exemplu</Label>
                <p className="text-xs text-muted-foreground">Adaugă 5 camere cu dimensiuni standard pentru start rapid</p>
              </div>
              <Switch checked={draft.withSampleRooms} onCheckedChange={(v) => setDraft((d) => ({ ...d, withSampleRooms: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Anulează</Button>
            <Button className="bg-slate-900 hover:bg-slate-800" onClick={createProject}>Creează proiectul</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmare ștergere proiect */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi proiectul „{project.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Se șterg definitiv proiectul și toate camerele lui. Acțiunea nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => {
              if (currentId) {
                store.deleteProject(currentId)
                toast.success('Proiect șters')
              }
              setDeleteOpen(false)
            }}>Șterge definitiv</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
