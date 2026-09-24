import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, ArrowLeft, Clock } from 'lucide-react';
import logoGgCompeticoes from '@/assets/logo_gg_competicoes.png';

interface PaymentReturnViewProps {
  txId: string;
  onGoHome?: () => void;
}

type PollStatus = 'checking' | 'pending' | 'approved' | 'rejected' | 'not_found' | 'timeout';

// Tela de retorno do Checkout Pro do Mercado Pago. O redirecionamento do
// navegador nunca é a confirmação real do pagamento — só o webhook é. Esta
// tela consulta o status da inscrição por tx_id até o webhook confirmar
// (ou até dar timeout), então nunca afirma "pago" sem checar de verdade.
export default function PaymentReturnView({ txId, onGoHome }: PaymentReturnViewProps) {
  const [status, setStatus] = useState<PollStatus>('checking');
  const attemptsRef = useRef(0);
  const MAX_ATTEMPTS = 20; // ~60s de polling (3s de intervalo)

  useEffect(() => {
    let cancelled = false;
    const endpoint = txId.startsWith('tx_idsc_')
      ? `/api/idsc/registrations/by-tx/${txId}`
      : `/api/registrations/by-tx/${txId}`;

    const poll = async () => {
      try {
        const res = await fetch(endpoint);
        if (res.status === 404) {
          if (!cancelled) setStatus('not_found');
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        if (data.status === 'approved') {
          setStatus('approved');
          return;
        }
        if (data.status === 'rejected') {
          setStatus('rejected');
          return;
        }

        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setStatus('timeout');
          return;
        }
        setStatus('pending');
        setTimeout(poll, 3000);
      } catch {
        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          if (!cancelled) setStatus('timeout');
          return;
        }
        setTimeout(poll, 3000);
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [txId]);

  const content = (() => {
    switch (status) {
      case 'checking':
      case 'pending':
        return {
          icon: <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mx-auto" />,
          title: 'Confirmando seu pagamento...',
          message: 'Isso costuma levar só alguns segundos. Não feche esta página.',
          tone: 'bg-slate-900/80 border-slate-800',
        };
      case 'approved':
        return {
          icon: <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />,
          title: 'Pagamento confirmado!',
          message: 'Sua inscrição foi aprovada com sucesso.',
          tone: 'bg-emerald-950/40 border-emerald-500/50',
        };
      case 'rejected':
        return {
          icon: <XCircle className="w-14 h-14 text-red-400 mx-auto" />,
          title: 'Pagamento não aprovado',
          message: 'O Mercado Pago recusou ou cancelou este pagamento. Você pode tentar novamente pela tela de inscrição.',
          tone: 'bg-red-950/40 border-red-500/50',
        };
      case 'timeout':
        return {
          icon: <Clock className="w-14 h-14 text-amber-400 mx-auto" />,
          title: 'Ainda processando',
          message: 'A confirmação está demorando mais que o normal. Verifique novamente em alguns minutos em "Minhas Inscrições".',
          tone: 'bg-amber-950/40 border-amber-500/50',
        };
      case 'not_found':
      default:
        return {
          icon: <XCircle className="w-14 h-14 text-red-400 mx-auto" />,
          title: 'Inscrição não encontrada',
          message: 'Não localizamos esta inscrição. Se o pagamento foi concluído, confira em "Minhas Inscrições".',
          tone: 'bg-red-950/40 border-red-500/50',
        };
    }
  })();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 font-sans">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(6,182,212,0.15),transparent_60%)] pointer-events-none" />

      <header className="max-w-lg w-full mx-auto flex justify-between items-center pb-6 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-3">
          <img src={logoGgCompeticoes} alt="G&G Competições" className="h-10 w-auto object-contain" />
          <h1 className="font-display font-black text-lg text-white tracking-wider leading-none">
            G<span className="text-cyan-400">&</span>G COMPETIÇÕES
          </h1>
        </div>
      </header>

      <main className="max-w-lg w-full mx-auto my-auto py-8 relative z-10">
        <div className={`rounded-3xl p-8 sm:p-10 border shadow-2xl backdrop-blur-md text-center space-y-5 ${content.tone}`}>
          {content.icon}
          <div className="space-y-1.5">
            <h2 className="text-lg font-display font-bold text-white">{content.title}</h2>
            <p className="text-xs text-slate-300">{content.message}</p>
          </div>
          <p className="text-[10px] font-mono text-slate-500">Referência: {txId}</p>
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 font-bold cursor-pointer mx-auto"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              Ir para o site
            </button>
          )}
        </div>
      </main>

      <footer className="max-w-lg w-full mx-auto text-center pt-6 border-t border-slate-800 text-[10px] text-slate-500 font-mono relative z-10">
        Plataforma G&G Competições &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
