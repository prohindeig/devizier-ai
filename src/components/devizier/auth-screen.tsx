'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, BadgeCheck, Building2, Calculator, Eye, EyeOff, Hammer,
  KeyRound, Lock, Mail, MailCheck, Phone, RefreshCw, ShieldCheck, TrendingUp, UserRound,
} from 'lucide-react'
import { toast } from 'sonner'

export interface AuthedUser {
  id: string
  email: string
  name: string
  firstName: string
  lastName: string
  phone: string
  emailVerified: boolean
}

type Mode = 'register' | 'verify' | 'login' | 'forgot' | 'reset' | 'done'

/**
 * Ecranul de start al aplicației: înregistrare / conectare.
 * Aplicația se deschide ÎNTOTDEAUNA pe acest ecran dacă nu există sesiune.
 */
export function AuthScreen({ onAuthed }: { onAuthed: (user: AuthedUser) => void }) {
  const [mode, setMode] = useState<Mode>('register')

  // câmpuri înregistrare
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [showPass, setShowPass] = useState(false)

  // verificare / resetare
  const [code, setCode] = useState('')
  const [demoCode, setDemoCode] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const post = async (url: string, body: unknown) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error ?? 'A apărut o eroare')
    return data
  }

  // ── Înregistrare pasul 1 ─────────────────────────────────────
  const submitRegister = async () => {
    if (!firstName.trim()) return toast.error('Completează prenumele')
    if (!lastName.trim()) return toast.error('Completează numele de familie')
    if (!/^[+0-9 ()-]{6,24}$/.test(phone.trim())) return toast.error('Completează un număr de telefon valid')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return toast.error('Completează un e-mail valid')
    if (password.length < 6) return toast.error('Parola trebuie să aibă minim 6 caractere')
    if (password !== password2) return toast.error('Parolele nu coincid')
    if (!acceptTerms) return toast.error('Bifează acceptarea condițiilor de utilizare')

    setBusy(true)
    try {
      const data = await post('/api/auth/register', { firstName, lastName, phone, email, password })
      setDemoCode(data.demoCode ?? null)
      setCode('')
      setMode('verify')
      toast.success(data.demoCode ? 'Cont creat! Introdu codul de mai jos (mod demo).' : 'Cont creat! Verifică-ți e-mailul pentru cod.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Înregistrarea a eșuat')
    } finally {
      setBusy(false)
    }
  }

  // ── Verificarea codului („captcha” din e-mail) ───────────────
  const submitVerify = async (value?: string) => {
    const c = value ?? code
    if (c.replace(/\D/g, '').length !== 6) return
    setBusy(true)
    try {
      const data = await post('/api/auth/verify-email', { email: email.trim(), code: c })
      toast.success('E-mail confirmat! Contul este activ. Bine ai venit!')
      onAuthed(data.user)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Confirmarea a eșuat')
    } finally {
      setBusy(false)
    }
  }

  const resendCode = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Nu am putut re-trimite codul')
      setDemoCode(data.demoCode ?? null)
      setCode('')
      toast.success('Cod nou trimis')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Re-trimiterea a eșuat')
    } finally {
      setBusy(false)
    }
  }

  // ── Conectare ────────────────────────────────────────────────
  const submitLogin = async () => {
    if (!email.trim() || !password) return toast.error('Completează e-mailul și parola')
    setBusy(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        toast.success('Bine ai revenit!')
        onAuthed(data.user)
      } else if (data.needsVerification) {
        setDemoCode(data.demoCode ?? null)
        setCode('')
        setMode('verify')
        toast.info('E-mailul nu este confirmat — introdu codul trimis.')
      } else {
        toast.error(data.error ?? 'Conectarea a eșuat')
      }
    } catch {
      toast.error('Conectarea a eșuat — verifică conexiunea')
    } finally {
      setBusy(false)
    }
  }

  // ── Ai uitat parola pasul 1 ──────────────────────────────────
  const submitForgot = async () => {
    if (!email.trim()) return toast.error('Scrie e-mailul sau numărul de telefon')
    setBusy(true)
    try {
      const data = await post('/api/auth/forgot-password', { email })
      setDemoCode(data.demoCode ?? null)
      setSentTo(data.sentTo ?? null)
      setCode('')
      setPassword('')
      setMode('reset')
      toast.success('Cod de resetare trimis')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Trimiterea a eșuat')
    } finally {
      setBusy(false)
    }
  }

  // ── Ai uitat parola pasul 2 ──────────────────────────────────
  const submitReset = async () => {
    if (newPassword.length < 6) return toast.error('Parola nouă trebuie să aibă minim 6 caractere')
    setBusy(true)
    try {
      await post('/api/auth/reset-password', { email: email.trim(), code, password: newPassword })
      toast.success('Parola a fost schimbată! Conectează-te cu parola nouă.')
      setMode('login')
      setPassword(newPassword)
      setPassword2('')
      setNewPassword('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Resetarea a eșuat')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-100 via-white to-orange-50 lg:flex-row">
      {/* Panoul de brand (desktop stânga, mobil sus) */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-slate-900 px-6 py-10 text-white lg:w-[46%] lg:px-14 lg:py-14">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-orange-600/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" aria-hidden />

        <div className="relative flex items-center gap-3">
          <BrandMark className="h-12 w-12" />
          <div className="leading-tight">
            <p className="text-xl font-bold">Devizier AI</p>
            <p className="text-xs text-slate-400">Calculator inteligent pentru construcții</p>
          </div>
        </div>

        <div className="relative my-10 max-w-md lg:my-0">
          <h1 className="text-3xl font-bold leading-tight lg:text-4xl">
            De la idee la <span className="text-orange-500">deviz complet</span> — în câteva minute
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Introdu metrajul, camerele, etajele și materialele — aplicația calculează automat
            cantitățile, manopera și costul total, cu prețuri reale de pe piața din Moldova.
          </p>
          <ul className="mt-8 space-y-3.5 text-sm">
            <Feature icon={<Calculator className="h-4 w-4" />} text="Deviz pe 11 etape: fundație, pereți, acoperiș, finisaje…" />
            <Feature icon={<Building2 className="h-4 w-4" />} text="Prețuri reale din 12 surse de piață, comparate" />
            <Feature icon={<Hammer className="h-4 w-4" />} text="Materiale + manoperă, până la ultimul șurub" />
            <Feature icon={<TrendingUp className="h-4 w-4" />} text="Buget comparat, export PDF și Excel" />
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">
          Instrument de planificare și estimare. Nu înlocuiește proiectarea tehnică autorizată.
        </p>
      </div>

      {/* Zona de formulare */}
      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
        <div className="w-full max-w-md">
          {mode === 'register' && (
            <Card className="shadow-xl shadow-slate-200/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Creează-ți contul</CardTitle>
                <CardDescription>Gratuit — proiectele tale rămân salvate și protejate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-first">Prenume *</Label>
                    <Input id="reg-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ion" autoComplete="given-name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-last">Nume *</Label>
                    <Input id="reg-last" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Popescu" autoComplete="family-name" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-phone">Număr de telefon *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input id="reg-phone" type="tel" className="pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+373 69 000 000" autoComplete="tel" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">E-mail *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input id="reg-email" type="email" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nume@exemplu.md" autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-pass">Parola *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input id="reg-pass" type={showPass ? 'text' : 'password'} className="pl-9 pr-10" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="minim 6 caractere" autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPass((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPass ? 'Ascunde parola' : 'Arată parola'}>
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reg-pass2">Repetă parola *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input id="reg-pass2" type={showPass ? 'text' : 'password'} className="pl-9" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="aceeași parolă" autoComplete="new-password" />
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg bg-slate-50 p-3 text-xs text-muted-foreground">
                  <Checkbox checked={acceptTerms} onCheckedChange={(v) => setAcceptTerms(v === true)} className="mt-0.5" aria-label="Accept condițiile" />
                  <span>
                    Accept că Devizier AI este un instrument de <b>estimare și planificare</b>, iar rezultatele
                    nu constituie ofertă comercială și nu înlocuiesc un proiect tehnic autorizat.
                  </span>
                </label>
                <Button className="w-full bg-slate-900 py-6 text-base hover:bg-slate-800" onClick={submitRegister} disabled={busy}>
                  {busy ? 'Se creează contul…' : 'Creează contul'}
                </Button>
                <Separator />
                <p className="text-center text-sm text-muted-foreground">
                  Ai deja cont?{' '}
                  <button className="font-semibold text-orange-600 hover:underline" onClick={() => setMode('login')}>Conectează-te</button>
                </p>
              </CardContent>
            </Card>
          )}

          {mode === 'verify' && (
            <Card className="shadow-xl shadow-slate-200/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl"><MailCheck className="h-5 w-5 text-emerald-600" /> Confirmă e-mailul</CardTitle>
                <CardDescription>
                  Am trimis un cod din 6 cifre la <b>{email.trim()}</b>. Scrie codul mai jos pentru activarea contului.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {demoCode && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm">
                    <p className="flex items-center gap-1.5 font-semibold text-orange-700">
                      <ShieldCheck className="h-4 w-4" /> Mod demo — SMTP neconfigurat
                    </p>
                    <p className="mt-1 text-orange-700/80 text-xs leading-relaxed">
                      În producție codul pleacă pe e-mail. Aici îl afișăm direct:
                      <span className="ml-2 rounded-md bg-white px-2 py-0.5 font-mono text-base font-bold tracking-widest text-slate-900">{demoCode}</span>
                    </p>
                  </div>
                )}
                <div className="flex justify-center py-2">
                  <InputOTP maxLength={6} value={code} onChange={(v) => { setCode(v); if (v.length === 6) submitVerify(v) }} disabled={busy} aria-label="Cod de verificare din 6 cifre">
                    <InputOTPGroup>
                      {[0, 1, 2].map((i) => <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />)}
                    </InputOTPGroup>
                    <span className="mx-1 text-xl text-muted-foreground">–</span>
                    <InputOTPGroup>
                      {[3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="h-12 w-11 text-lg" />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={() => submitVerify()} disabled={busy || code.length < 6}>
                  <BadgeCheck className="mr-1.5 h-4 w-4" /> {busy ? 'Se confirmă…' : 'Confirmă e-mailul'}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" onClick={() => setMode('register')}>
                    <ArrowLeft className="h-3.5 w-3.5" /> Înapoi
                  </button>
                  <button className="inline-flex items-center gap-1 font-medium text-orange-600 hover:underline" onClick={resendCode} disabled={busy}>
                    <RefreshCw className="h-3.5 w-3.5" /> Re-trimite codul
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {mode === 'login' && (
            <Card className="shadow-xl shadow-slate-200/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Conectare</CardTitle>
                <CardDescription>Bine ai revenit! Proiectele tale te așteaptă.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="log-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input id="log-email" type="email" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nume@exemplu.md" autoComplete="email" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="log-pass">Parola</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      id="log-pass" type={showPass ? 'text' : 'password'} className="pl-9" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitLogin()}
                      placeholder="••••••••" autoComplete="current-password"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button className="text-sm text-orange-600 hover:underline" onClick={() => { setMode('forgot'); setEmail(email) }}>
                    Ai uitat parola?
                  </button>
                </div>
                <Button className="w-full bg-slate-900 py-6 text-base hover:bg-slate-800" onClick={submitLogin} disabled={busy}>
                  <UserRound className="mr-1.5 h-4 w-4" /> {busy ? 'Se conectează…' : 'Conectare'}
                </Button>
                <Separator />
                <p className="text-center text-sm text-muted-foreground">
                  Nu ai cont?{' '}
                  <button className="font-semibold text-orange-600 hover:underline" onClick={() => setMode('register')}>Înregistrează-te gratuit</button>
                </p>
              </CardContent>
            </Card>
          )}

          {mode === 'forgot' && (
            <Card className="shadow-xl shadow-slate-200/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl"><KeyRound className="h-5 w-5 text-orange-600" /> Recuperare parolă</CardTitle>
                <CardDescription>
                  Scrie <b>e-mailul</b> sau <b>numărul de telefon</b> cu care ți-ai făcut contul.
                  Primești un cod de verificare, apoi setezi o parolă nouă.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="fp-ident">E-mail sau telefon</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input id="fp-ident" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nume@exemplu.md sau +373 69 000 000" />
                  </div>
                </div>
                <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={submitForgot} disabled={busy}>
                  {busy ? 'Se trimite…' : 'Trimite codul de verificare'}
                </Button>
                <button className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode('login')}>
                  <ArrowLeft className="h-3.5 w-3.5" /> Înapoi la conectare
                </button>
              </CardContent>
            </Card>
          )}

          {mode === 'reset' && (
            <Card className="shadow-xl shadow-slate-200/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-xl"><KeyRound className="h-5 w-5 text-orange-600" /> Setează parola nouă</CardTitle>
                <CardDescription>
                  Cod de verificare trimis {sentTo ? <>la <b>{sentTo}</b></> : 'pe e-mail'}. Scrie codul și parola nouă.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {demoCode && (
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm">
                    <p className="font-semibold text-orange-700">Mod demo — cod:</p>
                    <p className="mt-1 font-mono text-lg font-bold tracking-widest text-slate-900">{demoCode}</p>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Cod de verificare</Label>
                  <InputOTP maxLength={6} value={code} onChange={setCode} disabled={busy} aria-label="Cod de verificare">
                    <InputOTPGroup>
                      {[0, 1, 2].map((i) => <InputOTPSlot key={i} index={i} className="h-11 w-10" />)}
                    </InputOTPGroup>
                    <span className="mx-1 text-muted-foreground">–</span>
                    <InputOTPGroup>
                      {[3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} className="h-11 w-10" />)}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rp-pass">Parola nouă</Label>
                  <Input id="rp-pass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="minim 6 caractere" autoComplete="new-password" />
                </div>
                <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={submitReset} disabled={busy || code.length < 6 || !newPassword}>
                  {busy ? 'Se salvează…' : 'Schimbă parola'}
                </Button>
                <button className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode('forgot')}>
                  <ArrowLeft className="h-3.5 w-3.5" /> Nu am primit codul — încearcă din nou
                </button>
              </CardContent>
            </Card>
          )}

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Protejat cu sesiune criptată · parolele se păstrează hash-uit (scrypt)
          </p>
        </div>
      </div>
    </div>
  )
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-600/90" aria-hidden>{icon}</span>
      <span className="text-slate-200">{text}</span>
    </li>
  )
}

/** Marca de brand — casa cu acoperiș portocaliu + card de deviz. */
export function BrandMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-600/30 ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" className="h-[62%] w-[62%]">
        <path d="M3 11.2 12 4l9 7.2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="5.5" y="11.5" width="13" height="8.5" rx="1.6" fill="#fff" />
        <rect x="7.6" y="13.6" width="5.4" height="1.7" rx="0.85" fill="#1e3a5f" />
        <rect x="7.6" y="16.3" width="8.8" height="1.5" rx="0.75" fill="#b6c2cf" />
      </svg>
    </span>
  )
}
