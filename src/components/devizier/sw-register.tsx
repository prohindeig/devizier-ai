"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_VERSION } from "@/lib/version";
import { RefreshCw, Rocket } from "lucide-react";

/** Înregistrează service worker-ul și detectează versiuni noi pentru update din aplicație. */
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

/** Banner de update: apare când un service worker nou e gata; un click → activare + reload. */
export function PwaUpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const onUpdate = (e: Event) => setWaiting((e as CustomEvent<ServiceWorker>).detail ?? null);
    window.addEventListener("devizier-sw-update", onUpdate);
    return () => window.removeEventListener("devizier-sw-update", onUpdate);
  }, []);

  if (!waiting) return null;

  const applyUpdate = () => {
    waiting.postMessage("SKIP_WAITING");
    // controllerchange din sw-register declanșează reload-ul
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-md sm:right-6 sm:left-auto sm:bottom-6" role="alert" aria-live="polite">
      <Card className="border-orange-300 bg-white shadow-lg">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100">
            <Rocket className="h-5 w-5 text-orange-600" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Versiune nouă disponibilă</p>
            <p className="text-xs text-muted-foreground">
              Aplicația instalată se poate actualiza la versiunea {APP_VERSION} — datele tale rămân intacte.
            </p>
          </div>
          <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={applyUpdate}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Actualizează
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
