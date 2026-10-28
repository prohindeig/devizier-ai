import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError } from '@/lib/api-utils'
import { hashPassword } from '@/lib/auth'
import { checkCode } from '@/lib/verification'

/**
 * „Ai uitat parola?" pasul 2: codul primit pe e-mail + parola nouă.
 * Acceptă același identificator ca pasul 1 (e-mail SAU telefon) —
 * dacă se scrie telefonul, codul se verifică pe e-mailul contului respectiv.
 * Cod corect → parola se schimbă.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const raw = typeof body.email === 'string' ? body.email.trim() : ''
    const code = typeof body.code === 'string' ? body.code : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!raw) return jsonError('Lipsește e-mailul sau telefonul')
    if (password.length < 6) return jsonError('Parola nouă trebuie să aibă minim 6 caractere')

    // Rezolvăm identificatorul la e-mailul contului (același algoritm ca la forgot-password)
    const looksEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw)
    let userEmail: string | null = null
    if (looksEmail) {
      userEmail = raw.toLowerCase()
    } else {
      const digits = raw.replace(/\D/g, '')
      const users = await db.user.findMany({ where: { phone: { not: '' } }, select: { email: true, phone: true } })
      userEmail = users.find((u) => u.phone.replace(/\D/g, '') === digits)?.email ?? null
    }
    if (!userEmail) return jsonError('Nu am găsit contul. Încearcă din nou cu e-mailul sau telefonul contului.')

    const user = await db.user.findUnique({ where: { email: userEmail } })
    if (!user) return jsonError('Contul nu a fost găsit')

    const check = await checkCode(userEmail, 'reset_password', code)
    if (!check.ok) return jsonError(check.error ?? 'Cod incorect')

    await db.user.update({ where: { id: user.id }, data: { passHash: hashPassword(password) } })
    // marcăm e-mailul ca verificat (dovada că a primit mesajul)
    if (!user.emailVerifiedAt) {
      await db.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } })
    }

    return NextResponse.json({ ok: true, changed: true })
  } catch (e) {
    console.error('POST /api/auth/reset-password', e)
    return jsonError('Eroare la resetarea parolei', 500)
  }
}
