import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, RefreshCw, Copy, Check, Clock, X } from 'lucide-react';
import { QRCodeView } from './QRCodeView';

interface PixPaymentModalProps {
  pixCopiaECola: string;
  pollEndpoint: string;
  authHeaders?: HeadersInit;
  valor?: number;
  title?: string;
  onApproved: () => void;
  onClose: () => void;
}

type PollStatus = 'pending' | 'approved' | 'rejected' | 'timeout' | 'not_found';

// Modal de pagamento PIX (Sicoob) exibido dentro do próprio site — sem
// redirecionar o navegador, já que PIX não tem "checkout hospedado" como o
// antigo Mercado Pago Checkout Pro. O QR/copia-e-cola vem pronto do backend
// (createOrUpdateCob) e o modal faz polling do status até o webhook aprovar
// (ou até dar timeout), nunca afirmando "pago" sem confirmar via API.
export function PixPaymentModal({ pixCopiaECola, pollEndpoint, authHeaders, valor, title, onApproved, onClose }: PixPaymentModalProps) {
  const [status, setStatus] = useState<PollStatus>('pending');
  const [copied, setCopied] = useState(false);
  const attemptsRef = useRef(0);
  const MAX_ATTEMPTS = 100; // ~5min de polling (3s de intervalo)

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await fetch(pollEndpoint, { headers: authHeaders });
        if (cancelled) return;
        if (res.status === 404) {
          setStatus('not_found');
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        if (data.status === 'approved') {
          setStatus('approved');
          onApproved();
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
        timer = setTimeout(poll, 3000);
      } catch {
        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          if (!cancelled) setStatus('timeout');
          return;
        }
        timer = setTimeout(poll, 3000);
      }
    };

    timer = setTimeout(poll, 3000);
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollEndpoint]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixCopiaECola);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 text-left">
          <div>
            <h4 className="font-display font-bold text-slate-900 text-sm">{title || 'Pagamento via PIX'}</h4>
            <p className="text-[10px] text-slate-450">Escaneie o QR Code ou copie o código PIX.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === 'approved' ? (
          <div className="py-4 space-y-3">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <p className="font-bold text-emerald-700 text-sm">Pagamento confirmado!</p>
            <p className="text-xs text-slate-500">Sua inscrição foi aprovada com sucesso.</p>
          </div>
        ) : status === 'rejected' ? (
          <div className="py-4 space-y-3">
            <XCircle className="w-14 h-14 text-rose-500 mx-auto" />
            <p className="font-bold text-rose-700 text-sm">Pagamento não aprovado</p>
            <p className="text-xs text-slate-500">Feche esta janela e tente novamente.</p>
          </div>
        ) : status === 'timeout' ? (
          <div className="py-4 space-y-3">
            <Clock className="w-14 h-14 text-amber-500 mx-auto" />
            <p className="font-bold text-amber-700 text-sm">Ainda processando</p>
            <p className="text-xs text-slate-500">A confirmação está demorando mais que o normal. O pagamento continua sendo verificado — você pode fechar e conferir depois em "Minhas Inscrições".</p>
          </div>
        ) : (
          <>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block mx-auto">
              <QRCodeView value={pixCopiaECola} size={200} />
            </div>

            {typeof valor === 'number' && (
              <p className="font-extrabold text-slate-900 text-lg">R$ {valor.toFixed(2)}</p>
            )}

            <button
              type="button"
              onClick={copyToClipboard}
              className="w-full bg-[#003641] hover:bg-[#00262e] text-white text-xs py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {copied ? <Check className="w-4 h-4 text-teal-300" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Código PIX Copiado!' : 'Copiar Código PIX Copia e Cola'}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 pt-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-500" />
              Aguardando confirmação do pagamento...
            </div>
          </>
        )}
      </div>
    </div>
  );
}
