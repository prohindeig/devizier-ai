'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Bot, Send, Sparkles, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Ce materiale din deviz pot înlocui cu alternative mai economice?',
  'Ce informații mi-au lipsit și ce trebuie să clarific cu proiectantul?',
  'Explică diferența dintre varianta economică și cea premium la fațadă.',
  'Generează un rezumat al proiectului.',
  'Unde pot optimiza bugetul fără a compromite calitatea?',
]

export function AiAssistant({ projectId }: { projectId: string | null }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    // Reset conversația la schimbarea proiectului
    setMessages([])
  }, [projectId])

  const send = async (text: string) => {
    const msg = text.trim()
    if (!msg || busy) return
    const history = [...messages, { role: 'user' as const, content: msg }]
    setMessages(history)
    setInput('')
    setBusy(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, projectId, history: history.slice(-8) }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Eroare la comunicarea cu asistentul')
        setMessages((m) => [...m, { role: 'assistant', content: '⚠ ' + (data.error ?? 'Asistentul nu este disponibil.') }])
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
      }
    } catch {
      toast.error('Eroare de rețea')
      setMessages((m) => [...m, { role: 'assistant', content: '⚠ Eroare de rețea. Încearcă din nou.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-5 right-5 z-40 h-14 rounded-full bg-orange-600 px-5 text-base shadow-lg shadow-orange-600/30 hover:bg-orange-700"
          aria-label="Deschide asistentul AI"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          <span className="hidden sm:inline">Asistent AI</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-orange-600" /> Asistent Devizier AI</SheetTitle>
          <SheetDescription>
            Explică materialele, sugerează alternative, identifică informațiile lipsă.
            Nu inventează prețuri sau calcule — folosește datele reale ale devizului.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-slate-700">Poți întreba, de exemplu:</p>
              {SUGGESTIONS.map((s) => (
                <button key={s}
                  className="w-full rounded-lg border bg-white p-2.5 text-left text-sm hover:border-slate-400 hover:bg-slate-50"
                  onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Asistentul analizează devizul...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t p-3">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input) }}>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Întreabă despre materiale, buget, alternative..."
              disabled={busy}
            />
            <Button type="submit" size="icon" className="shrink-0 bg-orange-600 hover:bg-orange-700" disabled={busy || !input.trim()} aria-label="Trimite mesajul">
              <Send className="h-4 w-4" />
            </Button>
            {messages.length > 0 && (
              <Button type="button" size="icon" variant="outline" className="shrink-0"
                onClick={() => setMessages([])} aria-label="Șterge conversația">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </form>
          <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="px-1 py-0 text-[10px]">AI</Badge>
            Calculele sunt realizate de motorul determinist al aplicației; AI-ul doar interpretează și explică.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
