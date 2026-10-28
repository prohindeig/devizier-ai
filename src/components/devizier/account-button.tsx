'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useApp } from '@/lib/store'
import { BadgeCheck, CircleUserRound, KeyRound, LogOut } from 'lucide-react'
import { toast } from 'sonner'

export interface SessionUserLite {
  id: string
  email: string
  name: string
  firstName: string
  lastName: string
  phone: string
  emailVerified: boolean
}

/**
 * Meniul de cont din header (utilizator deja conectat):
 * profil, schimbarea parolei și deconectarea.
 * Înregistrarea/conectarea se face pe ecranul de start (AuthScreen).
 */
export function AccountButton({ user, onUserChanged }: { user: SessionUserLite; onUserChanged: (u: SessionUserLite | null) => void }) {
  const store = useApp()
  const [passOpen, setPassOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const [busy, setBusy] = useState(false)

  const displayName = user.firstName
    ? `${user.firstName} ${user.lastName}`.trim()
    : user.name || user.email

  const changePassword = async () => {
    if (!currentPassword || !newPassword) return toast.error('Completează ambele câmpuri')
    if (newPassword.length < 6) return toast.error('Parola nouă trebuie să aibă minim 6 caractere')
    if (newPassword !== newPassword2) return toast.error('Parolele noi nu coincid')
    setBusy(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Schimbarea a eșuat')
      toast.success('Parola a fost schimbată!')
      setPassOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setNewPassword2('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Schimbarea a eșuat')
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    setBusy(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('Te-ai deconectat')
      onUserChanged(null)
      await store.loadAll()
      // la ieșire, revenim pe ecranul de conectare — pagina se re-randează prin user=null
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
            aria-label="Meniul contului"
          >
            <CircleUserRound className="mr-1 h-4 w-4" aria-hidden />
            <span className="hidden max-w-40 truncate sm:inline">{displayName}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <p className="truncate font-semibold">{displayName}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {user.emailVerified && (
                <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-700">
                  <BadgeCheck className="h-3 w-3" /> E-mail verificat
                </Badge>
              )}
              {user.phone && <Badge variant="outline" className="text-[10px]">{user.phone}</Badge>}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setPassOpen(true)}>
            <KeyRound className="mr-2 h-4 w-4" /> Schimbă parola
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-700" disabled={busy}>
            <LogOut className="mr-2 h-4 w-4" /> Ieși din cont
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={passOpen} onOpenChange={setPassOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-orange-600" /> Schimbă parola</DialogTitle>
            <DialogDescription>Introdu parola actuală și de două ori parola nouă.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cp-current">Parola actuală</Label>
              <Input id="cp-current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-new">Parola nouă</Label>
              <Input id="cp-new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="minim 6 caractere" autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-new2">Repetă parola nouă</Label>
              <Input id="cp-new2" type="password" value={newPassword2} onChange={(e) => setNewPassword2(e.target.value)} autoComplete="new-password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPassOpen(false)}>Anulează</Button>
            <Button className="bg-slate-900 hover:bg-slate-800" onClick={changePassword} disabled={busy}>
              {busy ? 'Se salvează…' : 'Salvează parola nouă'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
