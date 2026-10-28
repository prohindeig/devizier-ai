"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Share2, XCircle, SquarePlus } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "none" | "installable" | "ios" | "installed";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "none";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";

  const ua = window.navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Macintosh") && "ontouchend" in document); // iPadOS 13+ se identifică ca Mac
  if (isIOS) return "ios";

  return "none"; // „installable" devine true doar la beforeinstallprompt
}

/** Buton de instalare PWA: dialog nativ pe Android/Windows, ghid „Adaugă la ecran" pe iOS. */
export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>("none");
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setPlatform(detectPlatform());
    });

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setPlatform((p) => (p === "installed" ? p : "installable"));
    };
    const onInstalled = () => {
      setPlatform("installed");
      setAccepted(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (platform === "installed") return null;

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") {
        setAccepted(true);
        setPlatform("installed");
      }
      setDeferred(null);
    } else {
      setOpen(true); // iOS sau browser fără suport: arată ghidul
    }
  };

  if (accepted && platform === "installed") return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
        onClick={install}
        aria-label="Instalează aplicația Devizier AI"
      >
        <Download className="mr-1 h-4 w-4" />
        <span className="hidden sm:inline">Instalează aplicația</span>
        <span className="sm:hidden">Instalează</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SquarePlus className="h-5 w-5 text-orange-600" />
              Instalează Devizier AI pe ecranul principal
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-1 text-sm text-foreground">
                <p>
                  Aplicația funcționează pe <b>iPhone, iPad, Android și Windows</b> — se instalează
                  direct din browser, fără App Store sau Play Store.
                </p>
                {platform === "ios" ? (
                  <ol className="list-inside list-decimal space-y-2 rounded-lg bg-slate-50 p-3">
                    <li>
                      Apasă butonul <b>Partajare</b> <Share2 className="inline h-4 w-4 text-slate-600" /> din
                      bara Safari.
                    </li>
                    <li>
                      Alege <b>„Adaugă la ecranul principal"</b>{" "}
                      <SquarePlus className="inline h-4 w-4 text-slate-600" />.
                    </li>
                    <li>
                      Confirmă cu <b>„Adaugă"</b> — Devizier AI apare ca aplicație proprie.
                    </li>
                  </ol>
                ) : (
                  <ol className="list-inside list-decimal space-y-2 rounded-lg bg-slate-50 p-3">
                    <li>
                      Deschide meniul browserului (⋮ sau ⋯).
                    </li>
                    <li>
                      Alege <b>„Instalează aplicația"</b> sau <b>„Adaugă la ecranul principal"</b>.
                    </li>
                  </ol>
                )}
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-600" />
                  Instalată, rulează în fereastră proprie, fără bara de adrese, cu acces rapid din
                  ecranul principal sau din meniul Start.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
