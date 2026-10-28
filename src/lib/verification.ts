import { createHash, randomInt } from 'crypto'
import { db } from '@/lib/db'

/**
 * Coduri de verificare tip „captcha din e-mail” (OTP pe 6 cifre):
 * - confirmarea e-mailului la înregistrare (purpose: verify_email)
 * - resetarea parolei (purpose: reset_password)
 *
 * Codul se salvează hash-uit (SHA-256 + salt de server), valabil 15 minute,
 * maximum 6 încercări greșite per cod. La fiecare cod nou trimis, cele
 * vechi, neconsumate, pentru același scop sunt invalidate.
 */

const CODE_TTL_MIN = 15
const MAX_ATTEMPTS = 6
const SALT = process.env.AUTH_SECRET || 'devizier-ai-local-secret-v1'

export type CodePurpose = 'verify_email' | 'reset_password'

function hashCode(target: string, purpose: string, code: string): string {
  return createHash('sha256').update(`${SALT}:${target}:${purpose}:${code}`).digest('hex')
}

/** Generează un cod nou, îl salvează hash-uit și îl întoarce în clar (pentru e-mail / mod demo). */
export async function issueCode(target: string, purpose: CodePurpose): Promise<string> {
  const t = target.trim().toLowerCase()
  // invalidează codurile anterioare, neconsumate
  await db.verificationCode.updateMany({
    where: { target: t, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  })
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await db.verificationCode.create({
    data: {
      target: t,
      purpose,
      codeHash: hashCode(t, purpose, code),
      expiresAt: new Date(Date.now() + CODE_TTL_MIN * 60_000),
    },
  })
  return code
}

/** Rezultatul verificării unui cod introdus de utilizator. */
export async function checkCode(
  target: string,
  purpose: CodePurpose,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const t = target.trim().toLowerCase()
  const clean = code.replace(/\D/g, '')
  if (clean.length !== 6) return { ok: false, error: 'Codul trebuie să aibă 6 cifre' }

  const row = await db.verificationCode.findFirst({
    where: { target: t, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  if (!row) return { ok: false, error: 'Nu există un cod activ. Solicită unul nou.' }
  if (row.expiresAt < new Date()) return { ok: false, error: 'Codul a expirat. Solicită unul nou.' }
  if (row.attempts >= MAX_ATTEMPTS) {
    await db.verificationCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } })
    return { ok: false, error: 'Prea multe încercări. Solicită un cod nou.' }
  }

  if (row.codeHash !== hashCode(t, purpose, clean)) {
    await db.verificationCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } })
    const left = MAX_ATTEMPTS - row.attempts - 1
    return { ok: false, error: `Cod incorect. ${left > 0 ? `Mai ai ${left} încercări.` : 'Solicită un cod nou.'}` }
  }

  await db.verificationCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } })
  return { ok: true }
}
