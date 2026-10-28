'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { KpiCard } from './common'
import { fmtMoney, fmtNum } from '@/lib/format'
import type { EstimateResult } from '@/lib/calc/types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'
import { Wallet, Hammer, Package, TrendingDown, TrendingUp, PiggyBank, Layers } from 'lucide-react'

const STAGE_SHORT: Record<string, string> = {
  pregatire: 'Pregătire', fundatie: 'Fundația', structura: 'Structura', pereti: 'Pereți',
  acoperis: 'Acoperiș', tamplarie: 'Tâmplărie', electric: 'Electric', sanitare: 'Sanitare',
  fatada: 'Fațadă', finisaje: 'Finisaje', exterior: 'Exterior',
}

const BAR_COLORS = ['#1e3a5f', '#2c5282', '#f97316', '#3182ce', '#4a6d8c', '#dd6b20', '#2d3748', '#63b3ed', '#c05621', '#34495e', '#e67e22']

export function DashboardPanel({ estimate, currency, rates }: { estimate: EstimateResult; currency: string; rates: Record<string, number> }) {
  const stageData = useMemo(
    () => estimate.stages
      .filter((s) => s.stageTotal > 0)
      .map((s) => ({
        name: STAGE_SHORT[s.key] ?? s.title,
        Materiale: Math.round(s.materialsTotal),
        Manoperă: Math.round(s.laborTotal),
        total: s.stageTotal,
      })),
    [estimate]
  )

  const pieData = useMemo(
    () => [
      { name: 'Materiale', value: Math.round(estimate.totals.materials) },
      { name: 'Manoperă', value: Math.round(estimate.totals.labor) },
      { name: 'Suplimentare', value: Math.round(estimate.totals.extra) },
      ...(estimate.totals.contingency > 0 ? [{ name: 'Imprevizite', value: Math.round(estimate.totals.contingency) }] : []),
    ],
    [estimate]
  )

  const budgetOver = estimate.project.budget > 0 && estimate.totals.grand > estimate.project.budget
  const budgetUnder = estimate.project.budget > 0 && estimate.totals.grand <= estimate.project.budget
  const budgetPct = estimate.project.budget > 0 ? Math.min(Math.round((estimate.totals.grand / estimate.project.budget) * 100), 999) : 0

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Cost total estimat" value={fmtMoney(estimate.totals.grand, currency, rates)}
          sub={`${fmtNum(estimate.totals.perSqm, 0)} MDL/m² util`} tone="navy" icon={<Wallet className="h-4 w-4" />} />
        <KpiCard label="Materiale" value={fmtMoney(estimate.totals.materials, currency, rates)}
          sub={`${Math.round((estimate.totals.materials / (estimate.totals.grand || 1)) * 100)}% din total`} icon={<Package className="h-4 w-4" />} />
        <KpiCard label="Manoperă" value={fmtMoney(estimate.totals.labor, currency, rates)}
          sub={`${Math.round((estimate.totals.labor / (estimate.totals.grand || 1)) * 100)}% din total`} icon={<Hammer className="h-4 w-4" />} />
        <KpiCard label="Costuri suplimentare" value={fmtMoney(estimate.totals.extra + estimate.totals.contingency, currency, rates)}
          sub="transport, utilaje, deșeuri" icon={<Layers className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Buget */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><PiggyBank className="h-4 w-4" /> Buget vs. estimare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {estimate.project.budget > 0 ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Buget disponibil</span>
                  <span className="font-semibold tabular-nums">{fmtMoney(estimate.project.budget, currency, rates)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cost estimat</span>
                  <span className="font-semibold tabular-nums">{fmtMoney(estimate.totals.grand, currency, rates)}</span>
                </div>
                <Progress value={Math.min(budgetPct, 100)} className="h-2.5" aria-label="Procent buget folosit" />
                <div className={`flex items-center gap-2 rounded-lg p-3 text-sm font-medium ${budgetOver ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {budgetOver ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {budgetOver
                    ? `Buget depășit cu ${fmtMoney(estimate.totals.grand - estimate.project.budget, currency, rates)} (${budgetPct}% din buget)`
                    : `Rămân ${fmtMoney(estimate.project.budget - estimate.totals.grand, currency, rates)} sub buget (${budgetPct}% din buget)`}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Bugetul nu este setat. Introdu-l în formularul proiectului pentru comparație și avertismente de depășire.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Progres completare */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Progresul completării proiectului</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex items-center gap-3">
              <Progress value={estimate.progress.pct} className="h-2.5" aria-label="Progres completare date" />
              <span className="w-12 text-right text-sm font-bold tabular-nums">{estimate.progress.pct}%</span>
            </div>
            <ul className="space-y-1.5 text-sm">
              {estimate.progress.checks.map((c, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className={c.done ? 'text-emerald-700' : 'text-muted-foreground'}>{c.label}</span>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${c.done ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Grafic etape */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Costuri pe etape (MDL)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-32} textAnchor="end" height={58} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  formatter={(value) => new Intl.NumberFormat('ro-RO').format(Number(value)) + ' MDL'}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Materiale" stackId="a" fill="#1e3a5f" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Manoperă" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]}>
                  {stageData.map((_, i) => <Cell key={i} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Grafic structură */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Structura costurilor</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i * 2 % BAR_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => new Intl.NumberFormat('ro-RO').format(Number(value)) + ' MDL'} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Completare camere */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Acoperirea camerelor & geometrie</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Geo label="Suprafață camere definite" value={`${fmtNum(estimate.geometry.totalFloorArea, 1)} m²`} />
          <Geo label="Acoperire din aria utilă" value={`${estimate.geometry.roomsCoveredPct}%`} />
          <Geo label="Perimetru exterior estimat" value={`${fmtNum(estimate.geometry.exteriorPerimeter, 1)} m`} />
          <Geo label="Lungime partiții estimată" value={`${fmtNum(estimate.geometry.partitionsLength, 1)} m`} />
          <Geo label="Fațadă (netă)" value={`${fmtNum(estimate.geometry.facadeArea, 1)} m²`} />
          <Geo label="Acoperiș (reală, cu panta)" value={`${fmtNum(estimate.geometry.roofRealArea, 1)} m²`} />
          <Geo label="Ferestre" value={`${estimate.geometry.windowsCount} buc · ${fmtNum(estimate.geometry.windowsArea, 1)} m²`} />
          <Geo label="Uși int./ext." value={`${estimate.geometry.interiorDoors} / ${estimate.geometry.exteriorDoors} buc`} />
        </CardContent>
      </Card>
    </div>
  )
}

function Geo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  )
}
