import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'gg_pwa_install_dismissed_at';
const DISMISS_DAYS = 7;

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function recentlyDismissed() {
  const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

declare global {
  interface Window {
    __pwaInstallEvent: BeforeInstallPromptEvent | null;
  }
}

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // index.html captures beforeinstallprompt the moment it fires (often before
    // this component ever mounts) and stashes it on window.__pwaInstallEvent —
    // pick it up here instead of listening for the native event directly.
    if (window.__pwaInstallEvent) {
      setDeferredPrompt(window.__pwaInstallEvent);
      setVisible(true);
    }

    const onReady = () => {
      if (window.__pwaInstallEvent) {
        setDeferredPrompt(window.__pwaInstallEvent);
        setVisible(true);
      }
    };
    window.addEventListener('pwa-install-ready', onReady);

    // iOS Safari never fires beforeinstallprompt — show manual "Add to Home Screen" instructions instead.
    if (isIos()) {
      setIosHint(true);
      setVisible(true);
    }

    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('pwa-install-ready', onReady);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome !== 'accepted') {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    window.__pwaInstallEvent = null;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:right-auto sm:w-[360px] z-50 no-print animate-fade-in">
      <div className="relative bg-slate-900 border border-slate-700/80 text-white rounded-2xl shadow-2xl p-4">
        <button
          type="button"
          onClick={dismiss}
          className="absolute top-3 right-3 text-slate-500 hover:text-slate-200 transition cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 pr-5">
          <img src="/icons/icon-192.png" alt="G&G Competições" className="w-10 h-10 rounded-xl shrink-0 shadow-sm" />
          <div className="min-w-0">
            <p className="text-sm font-bold">Instalar G&G Competições</p>
            <p className="text-xs text-slate-400 mt-1 leading-snug">
              {iosHint
                ? 'Toque em Compartilhar e depois em "Adicionar à Tela de Início".'
                : 'Acesse o sistema diretamente pela tela inicial do seu celular ou computador.'}
            </p>
          </div>
        </div>

        {iosHint ? (
          <button
            type="button"
            onClick={dismiss}
            className="mt-4 w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-lg transition cursor-pointer"
          >
            Entendi
          </button>
        ) : (
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={dismiss}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-lg transition cursor-pointer"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={install}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-lg transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Instalar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
