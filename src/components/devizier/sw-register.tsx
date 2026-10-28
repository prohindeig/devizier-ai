"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { APP_VERSION } from "@/lib/version";
import { toast } from "sonner";
import { Rocket, RefreshCw } from "lucide-react";

const CHECK_INTERVAL = 30 * 60 * 1000; // verificare automată: max. o dată la 30 de minute
const LAST_CHECK_KEY = "devizier-last-check";
const KNOWN_VERSION_KEY = "devizier-version";

/**
 * Compară versiunea publicată pe server (/api/version) cu versiunea rulată.
 * Dacă diferă: notifică interfața (eveniment „devizier-new-version”) și
 * declanșează instalarea noului service worker — fluxul automat pornește
 * din PwaUpdatePrompt (skipWaiting → reload, fără intervenția utilizatorului).
 */
export async function checkForUpdate(manual = false): Promise<{ newVersion: string | null; serverVersion: string | null }> {
  try {
    const res = await fetch(`/api/version?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("răspuns invalid");
    const data = await res.json();
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    const serverVersion: string | null = data?.version ?? null;

    if (serverVersion && serverVersion !== APP_VERSION) {
      window.dispatchEvent(new CustomEvent("devizier-new-version", { detail: serverVersion }));
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        await reg?.update().catch(() => {});
      }
      return { newVersion: serverVersion, serverVersion };
    }
    if (manual) toast.success(`Aveți cea mai nouă versiune (v${APP_VERSION})`);
    return { newVersion: null, serverVersion };
  } catch {
    if (manual) toast.error("Verificarea a eșuat — verificați conexiunea la internet.");
    return { newVersion: null, serverVersion: null };
  }
}

/** Înregistrează service worker-ul, verifică periodic versiunea și pornește update-ul automat. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // versiune nouă deja în așteptare (de la o vizită anterioară)
          if (reg.waiting && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent("devizier-sw-update", { detail: reg.waiting }));
          }
          reg.addEventListener("updatefound", () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener("statechange", () => {
              if (nw.state === "installed" && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent("devizier-sw-update", { detail: nw }));
              }
            });
          });
        })
        .catch(() => {
          // înregistrarea eșuează silențios — aplicația funcționează și fără PWA
        });

      // după activarea unui SW nou (SKIP_WAITING), reîncarcă pentru versiunea proaspătă
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}

/**
 * Update automat + notificare în aplicație:
 *  - când apare un SW nou: banner „se instalează automat” + aplicare după ~1,2 s → reload
 *  - la deschidere/revenire în aplicație (max. 1 dată la 30 min): verifică /api/version
 *  - după reîncărcare: confirmare „actualizat la versiunea X — datele rămân intacte”
 */
export function PwaUpdatePrompt() {
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let applyingRef = false;

    const apply = (worker: ServiceWorker) => {
      if (applyingRef) return;
      applyingRef = true;
      setApplying(true);
      // mică pauză ca utilizatorul să vadă notificarea, apoi instalare automată
      setTimeout(() => worker.postMessage("SKIP_WAITING"), 1200);
    };

    const onSwUpdate = (e: Event) => {
      const worker = (e as CustomEvent<ServiceWorker>).detail;
      if (worker) apply(worker);
    };
    window.addEventListener("devizier-sw-update", onSwUpdate);

    // confirmare după ce versiunea nouă a pornit efectiv
    const known = localStorage.getItem(KNOWN_VERSION_KEY);
    if (known && known !== APP_VERSION) {
      localStorage.setItem(KNOWN_VERSION_KEY, APP_VERSION);
      const t = setTimeout(() => {
        toast.success(`Aplicația a fost actualizată la versiunea ${APP_VERSION}`, {
          description: "Toate proiectele și devizele tale au fost păstrate.",
          duration: 6000,
        });
      }, 800);
      return () => {
        clearTimeout(t);
        window.removeEventListener("devizier-sw-update", onSwUpdate);
      };
    }
    localStorage.setItem(KNOWN_VERSION_KEY, APP_VERSION);

    // verificare automată: la deschidere + la revenirea în aplicație + la interval
    const maybeCheck = (force = false) => {
      const last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
      if (force || Date.now() - last > CHECK_INTERVAL) checkForUpdate();
    };
    maybeCheck();
    const onVisible = () => {
      if (document.visibilityState === "visible") maybeCheck();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => maybeCheck(true), CHECK_INTERVAL);

    return () => {
      window.removeEventListener("devizier-sw-update", onSwUpdate);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, []);

  if (!applying) return null;

  // Banner de progres: versiunea nouă se instalează singură, fără butoane
  return (
    <div className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-md sm:right-6 sm:left-auto sm:bottom-6" role="alert" aria-live="polite">
      <Card className="border-orange-300 bg-white shadow-lg">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100">
            <Rocket className="h-5 w-5 text-orange-600" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Se instalează automat versiunea nouă</p>
            <p className="text-xs text-muted-foreground">
              Aplicația se va reîncărca în câteva secunde (v{APP_VERSION}) — datele tale rămân intacte.
            </p>
          </div>
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-orange-600" aria-hidden />
        </CardContent>
      </Card>
    </div>
  );
}
