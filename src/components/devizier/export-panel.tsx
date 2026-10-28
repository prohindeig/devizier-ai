'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { exportPdf } from './pdf'
import type { EstimateResult } from '@/lib/calc/types'
import { FileDown, FileSpreadsheet, FileText, Info, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'

export function ExportPanel({ estimate, currentId }: { estimate: EstimateResult | null; currentId: string | null }) {
  const [currency, setCurrency] = useState('MDL')
  const [pdfBusy, setPdfBusy] = useState(false)

  const download = (path: string) => {
    if (!currentId) return
    const url = `/api/projects/${currentId}/export?format=${path}&currency=${currency}`
    window.open(url, '_blank')
    toast.success('Exportul a fost generat')
  }

  const doPdf = async () => {
    if (!estimate) return
    setPdfBusy(true)
    try {
      await exportPdf(estimate)
      toast.success('PDF generat — se deschide fereastra de salvare')
    } catch (e) {
      console.error(e)
      toast.error('Eroare la generarea PDF. Încearcă din nou.')
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Acțiunea principală: tot devizul în PDF */}
      <Card className="border-orange-200 shadow-md shadow-orange-100/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white">
              <Printer className="h-4.5 w-4.5" />
            </span>
            Tot devizul, în PDF
          </CardTitle>
          <CardDescription>
            Un singur click: PDF cu toate cele 11 etape, materialele cu cantități și prețuri, manopera,
            costurile suplimentare, totalurile și ipotezele de calcul. Ideal de trimis antreprenorului sau băncii.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={doPdf}
              disabled={!estimate || pdfBusy}
              className="h-12 flex-1 bg-orange-600 px-6 text-base font-semibold hover:bg-orange-700 sm:flex-none"
            >
              {pdfBusy ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Se generează…</> : <><FileText className="mr-2 h-5 w-5" /> Descarcă devizul în PDF</>}
            </Button>
            <div className="w-44 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Moneda exportului</p>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger aria-label="Moneda exportului"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MDL">MDL (bază)</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="RON">RON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Prețurile se convertesc cu cursul din setări. PDF-ul se generează direct din aplicație — și offline, dacă e instalată.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alte formate</CardTitle>
          <CardDescription>Pentru ajustări în foaie de calcul sau alte aplicații.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <ExportCard
              icon={<FileSpreadsheet className="h-6 w-6 text-emerald-700" />}
              title="Excel (XLSX)"
              desc="Foarte util pentru ajustări: schimbi prețul/cursul → totalurile se recalculează automat."
              action={<>Descarcă XLSX</>}
              onClick={() => download('xlsx')}
              disabled={!currentId}
            />
            <ExportCard
              icon={<FileDown className="h-6 w-6 text-slate-700" />}
              title="CSV"
              desc="Format simplu pentru orice altă aplicație (foi de calcul, ERP)."
              action={<>Descarcă CSV</>}
              onClick={() => download('csv')}
              disabled={!currentId}
            />
          </div>

          <Alert className="border-slate-200 bg-slate-50 text-slate-700">
            <Info className="h-4 w-4" />
            <AlertTitle>Ce conține exportul</AlertTitle>
            <AlertDescription>
              Datele proiectului și specificațiile casei, lista completă de materiale cu cantități nete, pierderi, rezerve,
              ambalaje și prețuri, manopera separat, costurile suplimentare, ipotezele de calcul, avertismentele și data generării.
              Foșa „Deviz" din Excel conține formule — editează prețurile fără să strici calculele.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}

function ExportCard({ icon, title, desc, action, onClick, disabled }: {
  icon: React.ReactNode
  title: string
  desc: string
  action: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col rounded-lg border p-4">
      <div className="mb-2">{icon}</div>
      <p className="font-semibold">{title}</p>
      <p className="mb-3 flex-1 text-xs text-muted-foreground">{desc}</p>
      <Button onClick={onClick} disabled={disabled} variant="outline" className="w-full">{action}</Button>
    </div>
  )
}
