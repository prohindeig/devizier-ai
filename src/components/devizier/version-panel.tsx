"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { APP_VERSION, APP_CHANGELOG } from "@/lib/version";
import { checkForUpdate } from "@/components/devizier/sw-register";
import { disablePush, enablePush, getPushState, type PushState } from "@/lib/push-client";
import { toast } from "sonner";
import {
  BellOff,
  BellRing,
  CheckCircle2,
  DownloadCloud,
  Info,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

const LAST_CHECK_KEY = "devizier-last-check";

/**
 * Tab-ul „Verifică versiune”: arată versiunea curentă, verifică manual sau
 * automat dacă există o versiune nouă (se instalează singură) și permite
 * activarea notificărilor push pe telefon (și cu aplicația închisă).
 */
export function VersionPanel() {
  const [checking, setChecking] = useState(false);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<number | null>(null);
  const [push, setPush] = useState<PushState>({ supported: true, permission: "default", subscribed: false });
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      const ts = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
      const st = await getPushState();
      if (cancelled) return;
      setLastCheck(ts);
      setPush(st);
    };
    init();
    const onNewVersion = (e: Event) => setNewVersion((e as CustomEvent<string>).detail ?? "?");
    window.addEventListener("devizier-new-version", onNewVersion);
    return () => {
      cancelled = true;
      window.removeEventListener("devizier-new-version", onNewVersion);
    };
  }, []);

  const verify = useCallback(async () => {
    setChecking(true);
    const r = await checkForUpdate(true);
    setNewVersion(r.newVersion);
    setLastCheck(Number(localStorage.getItem(LAST_CHECK_KEY) || 0));
    setChecking(false);
  }, []);

  const togglePush = useCallback(async (on: boolean) => {
    setPushBusy(true);
    if (on) {
      const r = await enablePush();
      if (r.ok) {
        toast.success("Notificările au fost activate", {
          description: "Vei primi un mesaj pe telefon când apare o versiune nouă.",
        });
      } else if (r.error) {
        toast.error(r.error);
      }
    } else {
      await disablePush();
      toast.info("Notificările au fost dezactivate pe acest dispozitiv");
    }
    setPush(await getPushState());
    setPushBusy(false);
  }, []);

  const fmtTime = (ts: number | null) =>
    ts
      ? new Date(ts).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
      : "niciodată";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* ── Versiunea curentă + verificare ─────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <DownloadCloud className="h-4 w-4 text-orange-600" /> Versiunea aplicației
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold tabular-nums text-slate-900">v{APP_VERSION}</span>
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Instalată pe acest dispozitiv</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{APP_CHANGELOG}</p>

          {newVersion ? (
            <div className="flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-sm font-medium text-orange-800">
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Versiune nouă găsită: <b>v{newVersion}</b>&nbsp;— se instalează automat în câteva secunde, apoi
              aplicația se reîncarcă singură.
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              Aveți cea mai nouă versiune instalată.
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="w-full bg-orange-600 py-6 text-base hover:bg-orange-700 sm:w-auto sm:px-8"
              onClick={verify}
              disabled={checking}
              aria-label="Verifică acum dacă există o versiune nouă"
            >
              <RefreshCw className={`mr-2 h-5 w-5 ${checking ? "animate-spin" : ""}`} aria-hidden />
              {checking ? "Se verifică…" : "Verifică acum"}
            </Button>
            <span className="text-xs text-muted-foreground sm:ml-2">
              Ultima verificare: {fmtTime(lastCheck)} · automat la fiecare deschidere (max. 1 dată la 30 min)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Notificări push pe telefon ─────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-4 w-4 text-slate-700" /> Notificare pe telefon la versiune nouă
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {push.subscribed ? (
                  <>
                    <BellRing className="h-4 w-4 text-emerald-600" aria-hidden /> Notificările sunt active
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 text-slate-500" aria-hidden /> Notificările sunt dezactivate
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {push.supported
                  ? push.subscribed
                    ? "Vei primi notificare în fereastra telefonului chiar și cu aplicația închisă."
                    : "Activează pentru a primi notificare pe telefon când apare o versiune nouă."
                  : push.permission === "denied"
                    ? "Notificările sunt blocate din setările browserului. Activează-le din setări și revino aici."
                    : "Acest browser nu suportă notificări push. Pe iPhone funcționează doar pentru aplicația instalată din Safari (iOS 16.4+); pe Android — din aplicația instalată sau din Chrome."}
              </p>
            </div>
            <Switch
              checked={push.subscribed}
              disabled={pushBusy || !push.supported || push.permission === "denied"}
              onCheckedChange={togglePush}
              aria-label="Comutator notificări push pe telefon"
            />
          </div>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            La activare browserul întreabă „Permiteți notificările?” — apasă Permite. Poți dezactiva oricând
            de aici.
          </p>
        </CardContent>
      </Card>

      {/* ── Cum funcționează ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cum funcționează actualizarea</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>
              La fiecare deschidere a aplicației (și la revenirea în prim-plan) se verifică automat dacă a apărut o
              versiune nouă.
            </li>
            <li>
              Dacă există, se <b className="text-slate-700">instalează automat</b> în câteva secunde — fără butoane,
              fără App Store / Play Store — și apare o notificare în aplicație.
            </li>
            <li>
              Cu aplicația <b className="text-slate-700">închisă</b>, primești notificare push în fereastra
              telefonului (Android; pe iPhone din aplicația instalată, iOS 16.4+).
            </li>
          </ol>
          <Separator className="my-3" />
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
            Datele, proiectele și devizele tale sunt salvate pe server și rămân intacte la fiecare actualizare.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
