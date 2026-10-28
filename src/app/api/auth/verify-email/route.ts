import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError } from '@/lib/api-utils'
import { createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTS } from '@/lib/auth'
import { checkCode, issueCode } from '@/lib/verification'
import { sendMail, codeEmailHtml } from '@/lib/mailer'
import { APP_NAME } from '@/lib/mail-config'

/**
 * Înregistrare pasul 2: confirmarea e-mailului cu codul primit („captcha").
 * Cod corect → contul se activează și sesiunea se deschide.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const code = typeof body.code === 'string' ? body.code : ''
    if (!email) return jsonError('Lipsește adresa de e-mail')

    const user = await db.user.findUnique({ where: { email } })
    if (!user) return jsonError('Contul nu a fost găsit. Începe înregistrarea din nou.')

    const check = await checkCode(email, 'verify_email', code)
    if (!check.ok) return jsonError(check.error ?? 'Cod incorect')

    await db.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date() },
    })

    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name, firstName: user.firstName, lastName: user.lastName, phone: user.phone, emailVerified: true },
    })
    res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), SESSION_COOKIE_OPTS)
    return res
  } catch (e) {
    console.error('POST /api/auth/verify-email', e)
    return jsonError('Eroare la confirmarea codului', 500)
  }
}

/** Re-trimiterea codului de confirmare pentru e-mail. */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email) return jsonError('Lipsește adresa de e-mail')

    const user = await db.user.findUnique({ where: { email }, select: { id: true, emailVerifiedAt: true } })
    if (!user) return jsonError('Contul nu a fost găsit')
    if (user.emailVerifiedAt) return jsonError('E-mailul este deja confirmat. Te poți conecta.')

    const code = await issueCode(email, 'verify_email')
    const mail = await sendMail({
      to: email,
      subject: `${APP_NAME} — cod nou de confirmare: ${code}`,
      text: `Codul tău nou de confirmare: ${code} (valabil 15 minute)`,
      html: codeEmailHtml(code, 'verify_email'),
    })
    return NextResponse.json({ ok: true, demoCode: mail.demoMode ? code : undefined })
  } catch (e) {
    console.error('PUT /api/auth/verify-email', e)
    return jsonError('Eroare la re-trimiterea codului', 500)
  }
}
