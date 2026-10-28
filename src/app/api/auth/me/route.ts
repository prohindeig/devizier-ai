import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'

/** Utilizatorul conectat (sau null). */
export async function GET() {
  const user = await getSessionUser()
  return NextResponse.json({ user })
}
