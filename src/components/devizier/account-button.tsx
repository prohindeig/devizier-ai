'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useApp } from '@/lib/store'
import { CircleUserRound, LogOut, LogIn, UserPlus, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  name: string
}

type Mode = 'login' | 'register'

/** Buton de cont în header: sesiune locală (e-mail + parolă), proiecte protejate per utilizator. */
export function AccountButton() {
  const store = useApp()
  const [user, setUser] = useState<User | null>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user ?? null))
      .catch(() => setUser(null))
  }, [])

  const afterAuth = async (u: User) => {
    setUser(u)
    setOpen(false)
    setPassword('')
    await store.loadAll()
  }

  const submit = async () => {
    if (!email.trim() || !password) {
      toast.error('Completează e-mailul și parola')
      return
    }
    if (mode === 'register' && password.length < 6) {
      toast.error('Parola trebuie să aibă minim 6 caractere')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Autentificarea a eșuat')
      toast.success(mode === 'login' ? 'Bine ai revenit!' : 'Cont creat — proiectele actuale ți-au fost asociate')
      await afterAuth(data.user)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Autentificarea a eșuat')
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    setBusy(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      toast.success('Te-ai deconectat')
      await store.loadAll()
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className="hidden max-w-40 items-center gap-1.5 truncate rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 sm:inline-flex"
          title={`${user.name || user.email} — proiectele tale sunt protejate`}
        >
          <CircleUserRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {user.name || user.email}
        </span>
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 border-slate-700 bg-slate-800 hover:bg-slate-700"
          onClick={logout}
          disabled={busy}
          aria-label="Deconectare"
        >
          <LogOut className="h-4 w-4 text-white" aria-hidden />
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
        onClick={() => {
          setMode('login')
          setOpen(true)
        }}
        aria-label="Conectare cont"
      >
        <LogIn className="mr-1 h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Cont</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === 'login' ? 'Conectare' : 'Creează cont'}</DialogTitle>
            <DialogDescription className="flex items-start gap-1.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              Contul îți protejează proiectele între utilizatorii aplicației. Toate dispozitivele conectate la
              această instalație văd aceleași date sincronizate; fără cont, proiectele rămân „de dispozitiv" (comune).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Conectare sau înregistrare">
              <Button variant={mode === 'login' ? 'default' : 'outline'} size="sm" className="bg-slate-900 hover:bg-slate-800" onClick={() => setMode('login')} aria-pressed={mode === 'login'}>
                <LogIn className="mr-1.5 h-4 w-4" aria-hidden /> Conectare
              </Button>
              <Button variant={mode === 'register' ? 'default' : 'outline'} size="sm" className={mode === 'register' ? 'bg-slate-900 hover:bg-slate-800' : ''} onClick={() => setMode('register')} aria-pressed={mode === 'register'}>
                <UserPlus className="mr-1.5 h-4 w-4" aria-hidden /> Cont nou
              </Button>
            </div>

            {mode === 'register' && (
              <div className="space-y-1.5">
                <Label htmlFor="acc-name">Numele tău (opțional)</Label>
                <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Ion Păduraru" autoComplete="name" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="acc-email">E-mail</Label>
              <Input id="acc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nume@exemplu.md" autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-pass">Parola</Label>
              <Input
                id="acc-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder={mode === 'register' ? 'minim 6 caractere' : '••••••••'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>
            {mode === 'register' && (
              <p className="rounded-lg bg-slate-50 p-2.5 text-xs text-muted-foreground">
                La creare, proiectele existente „fără cont" îți sunt asociate automat.
              </p>
            )}
            <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={submit} disabled={busy}>
              {busy ? 'Se procesează…' : mode === 'login' ? 'Conectare' : 'Creează contul'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
