import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError } from '@/lib/api-utils'
import { hashPassword, createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTS } from '@/lib/auth'

/** Înregistrare: creează contul, adoptă proiectele „fără cont" și deschide sesiunea. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return jsonError('Adresa de e-mail nu este validă')
    if (password.length < 6) return jsonError('Parola trebuie să aibă minim 6 caractere')

    const exists = await db.user.findUnique({ where: { email }, select: { id: true } })
    if (exists) return jsonError('Există deja un cont cu acest e-mail')

    const user = await db.user.create({
      data: { email, name, passHash: hashPassword(password) },
      select: { id: true, email: true, name: true },
    })

    // adoptă proiectele create fără cont (flux: utilizatorul testează, apoi își face cont)
    await db.project.updateMany({ where: { ownerId: '' }, data: { ownerId: user.id } })

    const res = NextResponse.json({ ok: true, user })
    res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), SESSION_COOKIE_OPTS)
    return res
  } catch (e) {
    console.error('POST /api/auth/register', e)
    return jsonError('Eroare la crearea contului', 500)
  }
}
