import { CURRENCY_RATES_DEFAULT, type CurrencyCode } from './calc/catalog'

/** Formatare numere în stil ro-RO: 1.234,56 */
export function fmtNum(value: number, decimals = 2): string {
  if (!isFinite(value)) return '0'
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Formatare cantități: fără zecimale inutile */
export function fmtQty(value: number, unit: string): string {
  const decimals = unit === 'buc' || unit === 'set' || unit === 'sac' ? 0 : value < 10 ? 2 : 1
  return `${fmtNum(value, decimals)} ${unit}`
}

export function fmtMoney(valueMdl: number, currency: string, rates?: Record<string, number>): string {
  const rate = rates?.[currency] ?? CURRENCY_RATES_DEFAULT[currency as CurrencyCode] ?? 1
  const converted = valueMdl / rate
  const decimals = currency === 'MDL' ? 0 : 2
  const num = fmtNum(converted, decimals)
  switch (currency) {
    case 'EUR': return `€ ${num}`
    case 'USD': return `$ ${num}`
    case 'RON': return `${num} lei`
    default: return `${num} MDL`
  }
}

export function currencyRate(currency: string, rates?: Record<string, number>): number {
  return rates?.[currency] ?? CURRENCY_RATES_DEFAULT[currency as CurrencyCode] ?? 1
}

export function convertFromMdl(valueMdl: number, currency: string, rates?: Record<string, number>): number {
  return valueMdl / currencyRate(currency, rates)
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return iso
  }
}
