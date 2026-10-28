import { NextRequest, NextResponse } from 'next/server'
import { jsonError } from '@/lib/api-utils'
import { getSessionUser, hashPassword, verifyPassword } from '@/lib/auth'
import { db } from '@/lib/db'

/** Schimbarea parolei de către utilizatorul conectat (din meniul de cont). */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser()
    if (!session) return jsonError('Nu ești conectat', 401)

    const body = await req.json()
    const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
    if (!currentPassword || !newPassword) return jsonError('Completează parola actuală și parola nouă')
    if (newPassword.length < 6) return jsonError('Parola nouă trebuie să aibă minim 6 caractere')

    const user = await db.user.findUnique({ where: { id: session.id } })
    if (!user || !verifyPassword(currentPassword, user.passHash)) {
      return jsonError('Parola actuală este incorectă')
    }

    await db.user.update({ where: { id: user.id }, data: { passHash: hashPassword(newPassword) } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('POST /api/auth/change-password', e)
    return jsonError('Eroare la schimbarea parolei', 500)
  }
}
