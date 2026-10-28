'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MaterialLine } from '@/lib/calc/types'

export function StatusBadge({ status }: { status: MaterialLine['priceStatus'] }) {
  if (status === 'ok') return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">preț confirmat</Badge>
  if (status === 'lipsa') return <Badge className="bg-orange-600 text-white hover:bg-orange-600">preț lipsă</Badge>
  return <Badge variant="outline" className="border-amber-500 text-amber-600">indicativ</Badge>
}

export function KpiCard({
  label,
  value,
  sub,
  tone = 'default',
  icon,
}: {
  label: string
  value: string
  sub?: string
  tone?: 'default' | 'navy' | 'orange' | 'green' | 'red'
  icon?: React.ReactNode
}) {
  const tones: Record<string, string> = {
    default: 'bg-white border',
    navy: 'bg-slate-900 text-white border-transparent',
    orange: 'bg-orange-50 border-orange-200',
    green: 'bg-emerald-50 border-emerald-200',
    red: 'bg-red-50 border-red-200',
  }
  const subTones: Record<string, string> = {
    default: 'text-muted-foreground',
    navy: 'text-slate-300',
    orange: 'text-orange-700',
    green: 'text-emerald-700',
    red: 'text-red-700',
  }
  return (
    <Card className={cn('shadow-sm', tones[tone])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-xs font-medium uppercase tracking-wide', subTones[tone])}>{label}</p>
          {icon && <span className="opacity-70">{icon}</span>}
        </div>
        <p className={cn('mt-1.5 text-xl font-bold tabular-nums sm:text-2xl', tone === 'navy' ? 'text-white' : '')}>{value}</p>
        {sub && <p className={cn('mt-1 text-xs', subTones[tone])}>{sub}</p>}
      </CardContent>
    </Card>
  )
}

export function WarningList({ warnings, assumptions, compact }: { warnings: string[]; assumptions: string[]; compact?: boolean }) {
  return (
    <div className="space-y-2">
      {warnings.length > 0 && (
        <ul className="space-y-1.5">
          {warnings.map((w, i) => (
            <li key={`w${i}`} className="flex gap-2 text-sm text-orange-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
      {!compact && assumptions.length > 0 && (
        <ul className="space-y-1.5">
          {assumptions.map((a, i) => (
            <li key={`a${i}`} className="flex gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{a}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
    </div>
  )
}
