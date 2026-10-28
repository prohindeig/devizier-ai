import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError } from '@/lib/api-utils'
import { verifyPassword, createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTS } from '@/lib/auth'
import { issueCode } from '@/lib/verification'
import { sendMail, codeEmailHtml } from '@/lib/mailer'
import { APP_NAME } from '@/lib/mail-config'

/**
 * Autentificare cu e-mail + parolă.
 * Dacă e-mailul nu este încă confirmat, se re-trimite codul de activare
 * și clientul e trimis la pasul de verificare (fără a deschide sesiunea).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const raw = typeof body.email === 'string' ? body.email.trim() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!raw || !password) return jsonError('Completează e-mailul și parola')

    // Conectare cu e-mail SAU număr de telefon
    const looksEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw)
    let email = raw.toLowerCase()
    if (!looksEmail) {
      const digits = raw.replace(/\D/g, '')
      if (digits.length < 6) return jsonError('E-mail sau parolă incorectă', 401)
      const users = await db.user.findMany({ where: { phone: { not: '' } }, select: { email: true, phone: true } })
      email = users.find((u) => u.phone.replace(/\D/g, '') === digits)?.email ?? ''
      if (!email) return jsonError('E-mail sau parolă incorectă', 401)
    }

    const user = await db.user.findUnique({ where: { email } })
    if (!user || !verifyPassword(password, user.passHash)) {
      return jsonError('E-mail sau parolă incorectă', 401)
    }

    if (!user.emailVerifiedAt) {
      const code = await issueCode(email, 'verify_email')
      const mail = await sendMail({
        to: email,
        subject: `${APP_NAME} — cod de confirmare: ${code}`,
        text: `Codul tău de confirmare: ${code} (valabil 15 minute)`,
        html: codeEmailHtml(code, 'verify_email'),
      })
      return NextResponse.json(
        { ok: false, needsVerification: true, demoCode: mail.demoMode ? code : undefined },
        { status: 403 }
      )
    }

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, firstName: user.firstName, lastName: user.lastName, phone: user.phone, emailVerified: true },
    })
    res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), SESSION_COOKIE_OPTS)
    return res
  } catch (e) {
    console.error('POST /api/auth/login', e)
    return jsonError('Eroare la autentificare', 500)
  }
}
