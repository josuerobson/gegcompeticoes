import React, { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

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

export default function InstallPwaPrompt({ theme }: { theme: 'light' | 'dark' }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

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
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
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
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible) return null;

  const dark = theme === 'dark';

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 no-print animate-fade-in">
      <div
        className={`rounded-2xl shadow-2xl p-4 flex items-start gap-3 border ${dark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
      >
        <img src="/icons/icon-192.png" alt="G&G Competições" className="w-11 h-11 rounded-xl shrink-0 shadow-sm" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Instalar G&G Competições</p>
          {iosHint ? (
            <p className={`text-[11px] mt-0.5 leading-snug ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Toque em <Share className="w-3 h-3 inline -mt-0.5" /> Compartilhar e depois em "Adicionar à Tela de Início".
            </p>
          ) : (
            <p className={`text-[11px] mt-0.5 leading-snug ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
              Acesse mais rápido direto da tela inicial do seu celular ou computador.
            </p>
          )}

          {!iosHint && (
            <button
              type="button"
              onClick={install}
              className="mt-2.5 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-full transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Instalar app
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          className={`shrink-0 transition cursor-pointer ${dark ? 'text-slate-500 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700'}`}
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
