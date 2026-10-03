import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { brl, csvNum, downloadCsv } from '../utils/financeReports';
import { Card, ExportButton, td, th } from './FranchiseReports';

// =============================================================================
// Conciliação PIX: todas as cobranças reais do tenant (inscrições, faturas e
// anuidades) com status atual e reconsulta direta ao banco.
// =============================================================================
interface PixCharge {
  kind: 'inscricao' | 'fatura' | 'anuidade_atleta' | 'anuidade_clube';
  txId: string;
  subject: string;
  clubName: string;
  amount: number;
  status: 'pending' | 'approved';
  createdAt: string | null;
  paidAt: string | null;
}

const KIND_LABELS: Record<PixCharge['kind'], string> = {
  inscricao: 'Inscrição',
  fatura: 'Fatura de clube',
  anuidade_atleta: 'Anuidade de atleta',
  anuidade_clube: 'Anuidade de clube',
};

const PAGE = 50;
const field = 'bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700';

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

export function PixReconciliation({ authHeaders }: { authHeaders: Record<string, string> }) {
  const [charges, setCharges] = useState<PixCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<'' | PixCharge['kind']>('');
  const [status, setStatus] = useState<'' | 'pending' | 'approved'>('pending');
  const [limit, setLimit] = useState(PAGE);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/pix-charges', { headers: authHeaders });
      if (res.ok) setCharges(await res.json());
    } catch (e) {
      console.error('Error loading PIX charges:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reconcile = async () => {
    setReconciling(true);
    setMessage('');
    try {
      const res = await fetch('/api/finance/pix-reconcile', { method: 'POST', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao reconsultar o banco.');
      setMessage(
        `${data.checked} cobrança(s) reconsultada(s) no banco: ${data.confirmed} confirmada(s), ${data.stillPending} ainda pendente(s)` +
        `${data.truncated ? ' (lote limitado a 40; rode novamente para continuar)' : ''}.`
      );
      await load();
    } catch (err: any) {
      setMessage(err.message || 'Erro ao reconsultar o banco.');
    } finally {
      setReconciling(false);
    }
  };

  const daysSince = (iso: string | null) =>
    iso ? Math.max(Math.floor((Date.now() - new Date(iso).getTime()) / 86400000), 0) : null;

  const pending = charges.filter(c => c.status === 'pending');
  const approved = charges.filter(c => c.status === 'approved');
  const pendingValue = pending.reduce((s, c) => s + c.amount, 0);
  const approvedValue = approved.reduce((s, c) => s + c.amount, 0);

  const filtered = useMemo(
    () => charges
      .filter(c => (!kind || c.kind === kind) && (!status || c.status === status))
      .sort((a, b) => (b.paidAt || b.createdAt || '').localeCompare(a.paidAt || a.createdAt || '')),
    [charges, kind, status]
  );

  const exportCsv = () => downloadCsv(
    'conciliacao-pix.csv',
    ['Tipo', 'Referência', 'Clube', 'Valor', 'Situação', 'Gerada em', 'Paga em', 'TxID'],
    filtered.map(c => [
      KIND_LABELS[c.kind], c.subject, c.clubName, csvNum(c.amount),
      c.status === 'approved' ? 'Confirmada' : 'Aguardando',
      (c.createdAt || '').slice(0, 10), (c.paidAt || '').slice(0, 10), c.txId,
    ])
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h4 className="font-display font-bold text-slate-900 text-sm">Conciliação PIX</h4>
          <p className="text-xs text-slate-400">
            Cobranças geradas pelo Sicoob (inscrições, faturas e anuidades) e a situação de cada uma. "Reconsultar" confere as pendentes direto no banco e aprova as que já foram pagas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton onClick={exportCsv} />
          <button
            type="button"
            onClick={reconcile}
            disabled={reconciling || pending.length === 0}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${reconciling ? 'animate-spin' : ''}`} /> {reconciling ? 'Reconsultando...' : 'Reconsultar no banco'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card tone="slate" label="Cobranças geradas" value={String(charges.length)} sub="inscrições, faturas e anuidades" />
        <Card tone="emerald" label="Confirmadas" value={String(approved.length)} sub={brl(approvedValue)} />
        <Card tone="amber" label="Aguardando pagamento" value={String(pending.length)} sub={pendingValue > 0 ? brl(pendingValue) : 'valor de anuidades não listado'} />
        <Card tone="blue" label="Taxa de confirmação" value={charges.length ? `${Math.round((approved.length / charges.length) * 100)}%` : '—'} sub="confirmadas ÷ geradas" />
      </div>

      {message && (
        <div className="bg-blue-50 text-blue-800 border border-blue-200 rounded-xl p-3 text-xs font-semibold">{message}</div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select value={status} onChange={e => { setStatus(e.target.value as '' | 'pending' | 'approved'); setLimit(PAGE); }} className={field}>
          <option value="">Todas as situações</option>
          <option value="pending">Aguardando</option>
          <option value="approved">Confirmadas</option>
        </select>
        <select value={kind} onChange={e => { setKind(e.target.value as '' | PixCharge['kind']); setLimit(PAGE); }} className={field}>
          <option value="">Todos os tipos</option>
          {(Object.keys(KIND_LABELS) as PixCharge['kind'][]).map(k => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto text-xs text-slate-700">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200">
              <th className={th}>Tipo</th>
              <th className={th}>Referência</th>
              <th className={th}>Clube</th>
              <th className={`${th} text-right`}>Valor</th>
              <th className={`${th} text-center`}>Situação</th>
              <th className={th}>Paga em / idade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className={`${td} text-center text-slate-400`}>Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className={`${td} text-center text-slate-400`}>Nenhuma cobrança no filtro selecionado.</td></tr>
            ) : filtered.slice(0, limit).map(c => {
              const age = daysSince(c.createdAt);
              return (
                <tr key={`${c.kind}_${c.txId}`} className="hover:bg-slate-50/30 transition">
                  <td className={td}>{KIND_LABELS[c.kind]}</td>
                  <td className={`${td} font-semibold text-slate-800`}>{c.subject}</td>
                  <td className={`${td} text-slate-500`}>{c.clubName}</td>
                  <td className={`${td} text-right font-mono`}>{c.amount > 0 ? brl(c.amount) : '—'}</td>
                  <td className={`${td} text-center`}>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${c.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {c.status === 'approved' ? 'Confirmada' : 'Aguardando'}
                    </span>
                  </td>
                  <td className={`${td} font-mono text-slate-500`}>
                    {c.status === 'approved' ? fmtDate(c.paidAt) : age != null ? `há ${age} dia(s)` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-center text-[11px] text-slate-500">
        <span>Mostrando {Math.min(limit, filtered.length)} de {filtered.length}</span>
        {filtered.length > limit && (
          <button type="button" onClick={() => setLimit(l => l + PAGE)} className="font-bold text-blue-600 hover:underline cursor-pointer">Mostrar mais</button>
        )}
      </div>
    </div>
  );
}
