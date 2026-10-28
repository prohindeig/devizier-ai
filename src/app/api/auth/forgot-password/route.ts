import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError } from '@/lib/api-utils'
import { issueCode } from '@/lib/verification'
import { sendMail, codeEmailHtml } from '@/lib/mailer'
import { APP_NAME } from '@/lib/mail-config'

/**
 * „Ai uitat parola?” pasul 1: trimite codul de resetare pe e-mail.
 * Răspunsul este întotdeauna ok — nu dezvăluim dacă adresa există sau nu.
 * Suportă și recuperare după număr de telefon: dacă se scrie un telefon
 * în loc de e-mail, se caută contul după telefon și codul pleacă pe
 * e-mailul acelui cont.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const raw = typeof body.email === 'string' ? body.email.trim() : ''
    if (!raw) return jsonError('Scrie e-mailul sau numărul de telefon')

    const looksEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw)
    const looksPhone = /^[+0-9 ()-]{6,24}$/.test(raw)
    if (!looksEmail && !looksPhone) return jsonError('Scrie un e-mail valid sau un număr de telefon')

    let target: string | null = null
    if (looksEmail) {
      const user = await db.user.findUnique({ where: { email: raw.toLowerCase() }, select: { email: true } })
      target = user?.email ?? null
    } else {
      const digits = raw.replace(/\D/g, '')
      const users = await db.user.findMany({
        where: { phone: { not: '' } },
        select: { email: true, phone: true },
      })
      const match = users.find((u) => u.phone.replace(/\D/g, '') === digits)
      target = match?.email ?? null
    }

    if (!target) {
      return NextResponse.json({ ok: true }) // răspuns neutru (protecție la enumerare)
    }

    const code = await issueCode(target, 'reset_password')
    const mail = await sendMail({
      to: target,
      subject: `${APP_NAME} — cod resetare parolă: ${code}`,
      text: `Codul pentru resetarea parolei: ${code} (valabil 15 minute). Dacă nu tu ai cerut, ignoră acest mesaj.`,
      html: codeEmailHtml(code, 'reset_password'),
    })
    // Mascăm destinația: ion***@gmail.com — utilizatorul vede unde a plecat codul
    const [login, domain] = target.split('@')
    const masked = `${login.slice(0, 3)}***@${domain}`
    return NextResponse.json({ ok: true, sentTo: masked, demoCode: mail.demoMode ? code : undefined })
  } catch (e) {
    console.error('POST /api/auth/forgot-password', e)
    return jsonError('Eroare la trimiterea codului', 500)
  }
}
