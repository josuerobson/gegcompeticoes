import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Força checagem imediata por nova versão
        reg.update().catch(() => {});

        // Checa por atualizações ao voltar para o app (troca de abas/reabertura)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            reg.update().catch(() => {});
          }
        });

        // Checagem periódica a cada 10 minutos
        setInterval(() => {
          reg.update().catch(() => {});
        }, 10 * 60 * 1000);
      })
      .catch(() => {});
  });
}
