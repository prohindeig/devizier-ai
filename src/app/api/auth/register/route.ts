import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError } from '@/lib/api-utils'
import { hashPassword, createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTS } from '@/lib/auth'
import { issueCode } from '@/lib/verification'
import { sendMail, codeEmailHtml } from '@/lib/mailer'
import { APP_NAME } from '@/lib/mail-config'

/**
 * Înregistrare pasul 1: creează contul (neconfirmat) și trimite codul de
 * verificare pe e-mail. Contul devine activ doar după confirmarea codului
 * (vezi /api/auth/verify-email).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim().slice(0, 60) : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim().slice(0, 60) : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 24) : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!firstName) return jsonError('Completează prenumele')
    if (!lastName) return jsonError('Completează numele de familie')
    if (!/^[+0-9 ()-]{6,24}$/.test(phone)) return jsonError('Numărul de telefon nu este valid')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return jsonError('Adresa de e-mail nu este validă')
    if (password.length < 6) return jsonError('Parola trebuie să aibă minim 6 caractere')

    const exists = await db.user.findUnique({ where: { email }, select: { id: true, emailVerifiedAt: true } })
    if (exists) {
      // dacă cineva s-a înregistrat dar nu a confirmat e-mailul, permitem re-trimiterea codului
      if (!exists.emailVerifiedAt) {
        const code = await issueCode(email, 'verify_email')
        const mail = await sendMail({
          to: email,
          subject: `${APP_NAME} — cod de confirmare: ${code}`,
          text: `Codul tău de confirmare: ${code} (valabil 15 minute)`,
          html: codeEmailHtml(code, 'verify_email'),
        })
        return NextResponse.json({ ok: true, needsVerification: true, demoCode: mail.demoMode ? code : undefined })
      }
      return jsonError('Există deja un cont cu acest e-mail. Folosește „Ai uitat parola?".')
    }

    const user = await db.user.create({
      data: {
        email,
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        phone,
        passHash: hashPassword(password),
      },
      select: { id: true, email: true },
    })

    // adoptă proiectele create fără cont (flux: utilizatorul testează, apoi își face cont)
    await db.project.updateMany({ where: { ownerId: '' }, data: { ownerId: user.id } })

    const code = await issueCode(email, 'verify_email')
    const mail = await sendMail({
      to: email,
      subject: `${APP_NAME} — cod de confirmare: ${code}`,
      text: `Bine ai venit la ${APP_NAME}! Codul tău de confirmare: ${code} (valabil 15 minute)`,
      html: codeEmailHtml(code, 'verify_email'),
    })

    // NU deschidem sesiunea încă — contul se activează după confirmarea codului
    return NextResponse.json({ ok: true, needsVerification: true, demoCode: mail.demoMode ? code : undefined })
  } catch (e) {
    console.error('POST /api/auth/register', e)
    return jsonError('Eroare la crearea contului', 500)
  }
}
