'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Input numeric cu salvare la blur/Enter — evită PATCH la fiecare tastă. */
export function NumberField({
  value,
  onCommit,
  className,
  suffix,
  min,
  max,
  step = 0.1,
  placeholder,
  allowEmpty = false,
}: {
  value: number | null
  onCommit: (v: number | null) => void
  className?: string
  suffix?: string
  min?: number
  max?: number
  step?: number
  placeholder?: string
  allowEmpty?: boolean
}) {
  // text !== null doar în timpul editării; altfel afișăm valoarea din props
  const [text, setText] = useState<string | null>(null)

  const display = text !== null ? text : value === null ? '' : String(Math.round(value * 1000) / 1000)

  const commit = () => {
    setText(null)
    if (text === null) return
    if (text.trim() === '') {
      if (allowEmpty) onCommit(null)
      else onCommit(min ?? 0)
      return
    }
    let n = Number(text.replace(',', '.'))
    if (!isFinite(n)) {
      onCommit(value)
      return
    }
    if (min !== undefined) n = Math.max(min, n)
    if (max !== undefined) n = Math.min(max, n)
    n = Math.round(n * 1000) / 1000
    onCommit(n)
  }

  return (
    <div className={cn('relative', className)}>
      <Input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={display}
        placeholder={placeholder}
        onFocus={() => setText(value === null ? '' : String(value))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        onChange={(e) => setText(e.target.value)}
        className={cn(suffix && 'pr-12')}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  )
}
