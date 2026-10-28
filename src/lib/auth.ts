import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

/**
 * Autentificare locală, fără dependențe externe:
 * - parole: scrypt cu sare per utilizator
 * - sesiuni: cookie httpOnly semnat HMAC-SHA256 (format: userId.exp.sig)
 * Structura User corespunde auth.users din Supabase — migrarea ulterioară
 * păstrează id-urile și e-mailurile.
 */

const COOKIE = 'devizier_session'
const SESSION_DAYS = 30

function secret(): string {
  const s = process.env.AUTH_SECRET
  if (s && s.length >= 16) return s
  // secret implicit pentru mediul sandbox — în producție se setează AUTH_SECRET
  return 'devizier-ai-local-secret-v1'
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function createSessionToken(userId: string): string {
  const exp = Date.now() + SESSION_DAYS * 24 * 3600 * 1000
  const payload = `${userId}.${exp}`
  return `${payload}.${sign(payload)}`
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [userId, exp, sig] = parts
  const payload = `${userId}.${exp}`
  const expected = sign(payload)
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  if (Number(exp) < Date.now()) return null
  return userId
}

export interface SessionUser {
  id: string
  email: string
  name: string
  firstName: string
  lastName: string
  phone: string
  emailVerified: boolean
}

/** Citeste utilizatorul din cookie-ul de sesiune (server). */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies()
    const userId = verifySessionToken(store.get(COOKIE)?.value)
    if (!userId) return null
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, firstName: true, lastName: true, phone: true, emailVerifiedAt: true },
    })
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      emailVerified: Boolean(user.emailVerifiedAt),
    }
  } catch {
    return null
  }
}

/** ID-ul de proprietar pentru filtrarea proiectelor: utilizatorul conectat sau „" (fără cont). */
export async function currentOwnerId(): Promise<string> {
  const user = await getSessionUser()
  return user?.id ?? ''
}

export const SESSION_COOKIE = COOKIE
export const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_DAYS * 24 * 3600,
  secure: process.env.NODE_ENV === 'production',
}
