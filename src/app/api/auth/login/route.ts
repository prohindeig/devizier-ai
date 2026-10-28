import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { jsonError } from '@/lib/api-utils'
import { verifyPassword, createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTS } from '@/lib/auth'

/** Autentificare cu e-mail + parolă. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password) return jsonError('Completează e-mailul și parola')

    const user = await db.user.findUnique({ where: { email } })
    if (!user || !verifyPassword(password, user.passHash)) {
      return jsonError('E-mail sau parolă incorectă', 401)
    }

    const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } })
    res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), SESSION_COOKIE_OPTS)
    return res
  } catch (e) {
    console.error('POST /api/auth/login', e)
    return jsonError('Eroare la autentificare', 500)
  }
}
