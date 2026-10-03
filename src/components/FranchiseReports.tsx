import React, { useMemo, useState } from 'react';
import { Download, Trophy, Users, X } from 'lucide-react';
import { Registration, Championship, Club, User, AnnuityPlan, AnnuityPayment } from '../types';
import { normalizeSearchText } from '../utils/textSearch';
import {
  Bucket, PeriodPreset, PERIOD_LABELS, ANNUITY_STATUS_LABELS, AnnuityStatus,
  addToBucket, annuityPriceFor, annuityStatus, brl, csvNum, downloadCsv, effectiveDate,
  emptyBucket, franchiseChampionshipIds, inRange, isPaid, isViaClub, netValue, parseExpiry, periodRange,
} from '../utils/financeReports';

export const th = 'py-2.5 px-3 text-[10px] font-mono uppercase text-slate-400';
export const td = 'py-2.5 px-3';

export function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
    >
      <Download className="w-3 h-3" /> Exportar CSV
    </button>
  );
}

export function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: 'emerald' | 'amber' | 'blue' | 'slate' }) {
  const tones = {
    emerald: 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950',
    amber: 'bg-amber-50/70 border-amber-200/80 text-amber-950',
    blue: 'bg-blue-50/70 border-blue-200/80 text-blue-950',
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
  };
  return (
    <div className={`${tones[tone]} border rounded-2xl p-4 space-y-1`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-base sm:text-lg font-display font-bold font-mono whitespace-nowrap">{value}</p>
      {sub && <p className="text-[10px] opacity-70">{sub}</p>}
    </div>
  );
}

// =============================================================================
// Receita de inscrições (Relatório Financeiro): período, origem, campeonato,
// clube e evolução mensal. Valores sempre líquidos para a franquia.
// =============================================================================
interface RevenueReportProps {
  registrations: Registration[];
  championships: Championship[];
  clubs: Club[];
  franchiseClubId?: string | null;
  annuityPayments?: AnnuityPayment[];
}

export function RevenueReport({ registrations, championships, clubs, franchiseClubId, annuityPayments = [] }: RevenueReportProps) {
  const [preset, setPreset] = useState<PeriodPreset>('ano');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [drillChampId, setDrillChampId] = useState<string | null>(null);

  const { from, to } = periodRange(preset, customFrom, customTo);

  const data = useMemo(() => {
    const champIds = franchiseChampionshipIds(championships, franchiseClubId);
    const champTitle = new Map(championships.map(c => [c.id, c.title]));
    const clubName = new Map(clubs.map(c => [c.id, c.name]));
    const nameOfClub = (id?: string) => (id ? clubName.get(id) || id : 'Sem clube');

    const total = emptyBucket();
    const direct = emptyBucket();
    const viaClub = emptyBucket();
    const byChamp = new Map<string, Bucket>();
    const byClub = new Map<string, Bucket>();
    const byChampClub = new Map<string, Map<string, Bucket>>();
    const monthly = new Map<string, number>();
    let openAll = 0;

    const bucketOf = <K,>(map: Map<K, Bucket>, key: K) => {
      let b = map.get(key);
      if (!b) { b = emptyBucket(); map.set(key, b); }
      return b;
    };

    for (const r of registrations) {
      if (!champIds.has(r.championshipId)) continue;
      const paid = isPaid(r);
      if (!paid) openAll += netValue(r);
      const d = effectiveDate(r);
      if (paid && d) {
        const k = d.slice(0, 7);
        monthly.set(k, (monthly.get(k) || 0) + netValue(r));
      }
      if (!inRange(d, from, to)) continue;

      addToBucket(total, r);
      addToBucket(isViaClub(r) ? viaClub : direct, r);
      addToBucket(bucketOf(byChamp, r.championshipId), r);
      const clubKey = r.clubId || '__sem_clube__';
      addToBucket(bucketOf(byClub, clubKey), r);
      let inner = byChampClub.get(r.championshipId);
      if (!inner) { inner = new Map(); byChampClub.set(r.championshipId, inner); }
      addToBucket(bucketOf(inner, clubKey), r);
    }

    const champRows = Array.from(byChamp.entries())
      .map(([id, b]) => ({ id, title: champTitle.get(id) || id, ...b }))
      .sort((a, b) => b.received - a.received || b.open - a.open);
    const clubRows = Array.from(byClub.entries())
      .map(([id, b]) => ({ id, name: id === '__sem_clube__' ? 'Sem clube' : nameOfClub(id), ...b }))
      .sort((a, b) => b.received - a.received || b.open - a.open);
    const drillRows = (id: string) =>
      Array.from(byChampClub.get(id)?.entries() || [])
        .map(([cid, b]) => ({ id: cid, name: cid === '__sem_clube__' ? 'Sem clube' : nameOfClub(cid), ...b }))
        .sort((a, b) => b.received - a.received || b.open - a.open);

    const now = new Date();
    const months: Array<{ key: string; label: string; value: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(2)}`, value: monthly.get(key) || 0 });
    }

    return { total, direct, viaClub, champRows, clubRows, drillRows, months, openAll };
  }, [registrations, championships, clubs, franchiseClubId, from, to]);

  const { total, direct, viaClub, champRows, clubRows, months, openAll } = data;
  const annuityInPeriod = useMemo(() => {
    const inPeriod = annuityPayments.filter(p => inRange(p.paidAt.slice(0, 10), from, to));
    return { total: inPeriod.reduce((s, p) => s + p.amount, 0), count: inPeriod.length };
  }, [annuityPayments, from, to]);
  const ticket = total.paidCount > 0 ? total.received / total.paidCount : 0;
  const maxMonth = Math.max(...months.map(m => m.value), 1);
  const periodLabel = preset === 'tudo' ? 'todo o período' : `${from || '…'} a ${to || '…'}`;
  const drillChamp = drillChampId ? champRows.find(c => c.id === drillChampId) : null;

  const exportChamps = () => downloadCsv(
    `receita-por-campeonato-${from || 'inicio'}_${to || 'hoje'}.csv`,
    ['Campeonato', 'Inscrições pagas', 'Reinscrições', 'Recebido (líquido)', 'Pendentes', 'A receber (líquido)', 'Ticket médio'],
    champRows.map(c => [c.title, c.paidCount, c.reinscCount, csvNum(c.received), c.pendingCount, csvNum(c.open), csvNum(c.paidCount ? c.received / c.paidCount : 0)])
  );
  const exportClubs = () => downloadCsv(
    `receita-por-clube-${from || 'inicio'}_${to || 'hoje'}.csv`,
    ['Clube', 'Inscrições pagas', 'Pendentes', 'Valor bruto', 'Retido pelo clube', 'Recebido (líquido)', 'A receber (líquido)'],
    clubRows.map(c => [c.name, c.paidCount, c.pendingCount, csvNum(c.gross), csvNum(c.retained), csvNum(c.received), csvNum(c.open)])
  );

  return (
    <div className="space-y-6">
      {/* Período */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base">Receita de Inscrições</h3>
            <p className="text-xs text-slate-400">Valores líquidos para a franquia: inscrições de clube filiado já com o Percentual Clube descontado. Período por data de pagamento (em aberto: data da inscrição).</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPreset(p)}
                className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${preset === p ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-2 text-slate-500 font-semibold">De
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700" />
            </label>
            <label className="flex items-center gap-2 text-slate-500 font-semibold">Até
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700" />
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card tone="emerald" label="Recebido no período" value={brl(total.received)} sub={`${total.paidCount} inscrições pagas`} />
          <Card tone="amber" label="Em aberto no período" value={brl(total.open)} sub={`${total.pendingCount} pendentes`} />
          <Card tone="blue" label="Reinscrições pagas" value={String(total.reinscCount)} sub={periodLabel} />
          <Card tone="slate" label="Ticket médio" value={brl(ticket)} sub="recebido ÷ inscrições pagas" />
        </div>
        <p className="text-[11px] text-slate-500">
          Em aberto total (todos os períodos): <strong className="font-mono text-amber-700">{brl(openAll)}</strong>. Inscrições importadas do sistema legado entram pelo valor cheio e pela data de pagamento do sistema antigo.
        </p>
      </div>

      {/* Origem */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <h4 className="font-display font-bold text-slate-900 text-sm pb-3 border-b border-slate-100">Receita por Origem</h4>
        <div className="overflow-x-auto text-xs text-slate-700">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className={th}>Origem</th>
                <th className={`${th} text-center`}>Pagas</th>
                <th className={`${th} text-right`}>Valor bruto</th>
                <th className={`${th} text-right`}>Retido pelo clube</th>
                <th className={`${th} text-right`}>Recebido (líquido)</th>
                <th className={`${th} text-right`}>A receber (líquido)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {[{ label: 'Inscrições diretas (atleta → franquia)', b: direct }, { label: 'Inscrições via clube filiado', b: viaClub }].map(row => (
                <tr key={row.label}>
                  <td className={`${td} font-sans font-semibold text-slate-800`}>{row.label}</td>
                  <td className={`${td} text-center`}>{row.b.paidCount}</td>
                  <td className={`${td} text-right`}>{brl(row.b.gross)}</td>
                  <td className={`${td} text-right text-slate-500`}>{brl(row.b.retained)}</td>
                  <td className={`${td} text-right font-bold text-emerald-700`}>{brl(row.b.received)}</td>
                  <td className={`${td} text-right text-amber-700`}>{brl(row.b.open)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-300 font-mono font-bold bg-slate-50">
                <td className={`${td} font-sans text-slate-900`}>Total</td>
                <td className={`${td} text-center`}>{total.paidCount}</td>
                <td className={`${td} text-right`}>{brl(total.gross)}</td>
                <td className={`${td} text-right text-slate-500`}>{brl(total.retained)}</td>
                <td className={`${td} text-right text-emerald-700`}>{brl(total.received)}</td>
                <td className={`${td} text-right text-amber-700`}>{brl(total.open)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-[11px] text-slate-500">
          Anuidades recebidas via PIX no período (fora dos totais acima): <strong className="font-mono text-emerald-700">{brl(annuityInPeriod.total)}</strong> em {annuityInPeriod.count} pagamento(s). O histórico de anuidades começa a partir da cobrança PIX integrada; pagamentos lançados manualmente não entram.
        </p>
      </div>

      {/* Por campeonato */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-display font-bold text-slate-900 text-sm">Resultado por Campeonato</h4>
            <p className="text-xs text-slate-400">Clique em um campeonato para ver a abertura por clube.</p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton onClick={exportChamps} />
            <Trophy className="w-4 h-4 text-blue-600" />
          </div>
        </div>
        <div className="overflow-x-auto text-xs text-slate-700">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className={th}>Campeonato</th>
                <th className={`${th} text-center`}>Pagas</th>
                <th className={`${th} text-center`}>Reinsc.</th>
                <th className={`${th} text-right`}>Recebido (líq.)</th>
                <th className={`${th} text-center`}>Pendentes</th>
                <th className={`${th} text-right`}>A receber (líq.)</th>
                <th className={`${th} text-right`}>Ticket médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {champRows.length === 0 ? (
                <tr><td colSpan={7} className="py-4 px-3 text-center text-slate-400 font-sans">Nenhuma inscrição no período.</td></tr>
              ) : champRows.map(c => (
                <tr key={c.id} onClick={() => setDrillChampId(c.id)} className="hover:bg-blue-50/40 cursor-pointer transition">
                  <td className={`${td} font-sans font-bold text-slate-800`}>{c.title}</td>
                  <td className={`${td} text-center text-emerald-700 font-bold`}>{c.paidCount}</td>
                  <td className={`${td} text-center`}>{c.reinscCount}</td>
                  <td className={`${td} text-right font-bold text-slate-900`}>{brl(c.received)}</td>
                  <td className={`${td} text-center text-amber-700 font-bold`}>{c.pendingCount}</td>
                  <td className={`${td} text-right text-amber-700`}>{brl(c.open)}</td>
                  <td className={`${td} text-right text-slate-500`}>{brl(c.paidCount ? c.received / c.paidCount : 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Por clube */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-display font-bold text-slate-900 text-sm">Receita por Clube</h4>
            <p className="text-xs text-slate-400">Clube de origem do atleta: quanto cada um gerou, quanto reteve e quanto ficou para a franquia.</p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton onClick={exportClubs} />
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
        </div>
        <div className="overflow-x-auto text-xs text-slate-700">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className={th}>Clube</th>
                <th className={`${th} text-center`}>Pagas</th>
                <th className={`${th} text-center`}>Pend.</th>
                <th className={`${th} text-right`}>Bruto</th>
                <th className={`${th} text-right`}>Retido</th>
                <th className={`${th} text-right`}>Recebido (líq.)</th>
                <th className={`${th} text-right`}>A receber (líq.)</th>
                <th className={`${th} text-right`}>% do total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {clubRows.length === 0 ? (
                <tr><td colSpan={8} className="py-4 px-3 text-center text-slate-400 font-sans">Nenhuma inscrição no período.</td></tr>
              ) : clubRows.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/80">
                  <td className={`${td} font-sans font-bold text-slate-800`}>{c.name}</td>
                  <td className={`${td} text-center text-emerald-700 font-bold`}>{c.paidCount}</td>
                  <td className={`${td} text-center text-amber-700`}>{c.pendingCount}</td>
                  <td className={`${td} text-right`}>{brl(c.gross)}</td>
                  <td className={`${td} text-right text-slate-500`}>{brl(c.retained)}</td>
                  <td className={`${td} text-right font-bold text-slate-900`}>{brl(c.received)}</td>
                  <td className={`${td} text-right text-amber-700`}>{brl(c.open)}</td>
                  <td className={`${td} text-right text-slate-500`}>{total.received > 0 ? `${((c.received / total.received) * 100).toFixed(1)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evolução mensal */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <h4 className="font-display font-bold text-slate-900 text-sm pb-3 border-b border-slate-100">Evolução Mensal — Recebido (últimos 12 meses)</h4>
        <div className="space-y-1.5">
          {months.map(m => (
            <div key={m.key} className="flex items-center gap-3 text-[11px]">
              <span className="w-12 font-mono text-slate-500">{m.label}</span>
              <div className="flex-1 bg-slate-100 rounded h-4 overflow-hidden">
                <div className="bg-emerald-500 h-4" style={{ width: `${(m.value / maxMonth) * 100}%` }} />
              </div>
              <span className="w-28 text-right font-mono font-bold text-slate-700">{brl(m.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {drillChamp && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setDrillChampId(null)}>
          <div className="bg-white max-w-3xl w-full rounded-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 bg-blue-700 text-white flex justify-between items-center">
              <div>
                <span className="font-display font-semibold text-sm block">Abertura por clube</span>
                <span className="text-[11px] text-white/80">{drillChamp.title} — {periodLabel}</span>
              </div>
              <button onClick={() => setDrillChampId(null)} className="text-white/70 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 overflow-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className={th}>Clube</th>
                    <th className={`${th} text-center`}>Pagas</th>
                    <th className={`${th} text-center`}>Pend.</th>
                    <th className={`${th} text-right`}>Bruto</th>
                    <th className={`${th} text-right`}>Retido</th>
                    <th className={`${th} text-right`}>Recebido (líq.)</th>
                    <th className={`${th} text-right`}>A receber (líq.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {data.drillRows(drillChamp.id).map(c => (
                    <tr key={c.id}>
                      <td className={`${td} font-sans font-bold text-slate-800`}>{c.name}</td>
                      <td className={`${td} text-center text-emerald-700 font-bold`}>{c.paidCount}</td>
                      <td className={`${td} text-center text-amber-700`}>{c.pendingCount}</td>
                      <td className={`${td} text-right`}>{brl(c.gross)}</td>
                      <td className={`${td} text-right text-slate-500`}>{brl(c.retained)}</td>
                      <td className={`${td} text-right font-bold text-slate-900`}>{brl(c.received)}</td>
                      <td className={`${td} text-right text-amber-700`}>{brl(c.open)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Relação nominal de anuidades de atletas (Financeiro da Franquia): situação
// atual por atleta, com filtros e exportação. Posição atual — não é histórico
// de pagamento (o sistema guarda só o último vencimento).
// =============================================================================
interface AnnuityRosterProps {
  users: User[];
  clubs: Club[];
  annuityPlans: AnnuityPlan[];
}

const STATUS_ORDER: Record<AnnuityStatus, number> = { vencida: 0, a_vencer: 1, sem_anuidade: 2, regular: 3 };
const STATUS_STYLE: Record<AnnuityStatus, string> = {
  regular: 'bg-emerald-100 text-emerald-800',
  a_vencer: 'bg-sky-100 text-sky-800',
  vencida: 'bg-rose-100 text-rose-800',
  sem_anuidade: 'bg-amber-100 text-amber-800',
};
const PAGE = 50;

export function AnnuityRoster({ users, clubs, annuityPlans }: AnnuityRosterProps) {
  const [statusFilter, setStatusFilter] = useState<'todos' | AnnuityStatus>('todos');
  const [clubFilter, setClubFilter] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const rows = useMemo(() => {
    const clubName = new Map(clubs.map(c => [c.id, c.name]));
    return users
      .filter(u => u.role === 'member')
      .map(u => {
        const status = annuityStatus(u.hasPaidSignature, u.signatureExpiry);
        const plan = u.annuityPlanId ? annuityPlans.find(p => p.id === u.annuityPlanId) : undefined;
        return {
          id: u.id,
          name: u.fullName,
          cpf: u.cpf || '',
          clubId: u.clubId || '',
          club: u.clubId ? clubName.get(u.clubId) || u.clubId : 'Sem clube',
          plan: plan ? plan.name : 'Padrão',
          price: annuityPriceFor(u, annuityPlans),
          expiry: parseExpiry(u.signatureExpiry),
          status,
        };
      })
      .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (a.expiry || '9999').localeCompare(b.expiry || '9999') || a.name.localeCompare(b.name, 'pt-BR'));
  }, [users, clubs, annuityPlans]);

  const counts = useMemo(() => {
    const c: Record<AnnuityStatus, { n: number; value: number }> = {
      regular: { n: 0, value: 0 }, a_vencer: { n: 0, value: 0 }, vencida: { n: 0, value: 0 }, sem_anuidade: { n: 0, value: 0 },
    };
    rows.forEach(r => { c[r.status].n += 1; c[r.status].value += r.price; });
    return c;
  }, [rows]);

  const q = normalizeSearchText(search.trim());
  const qDigits = q.replace(/\D/g, '');
  const filtered = rows.filter(r =>
    (statusFilter === 'todos' || r.status === statusFilter) &&
    (!clubFilter || r.clubId === clubFilter) &&
    (!q || normalizeSearchText(r.name).includes(q) || (qDigits && r.cpf.replace(/\D/g, '').includes(qDigits)))
  );
  const toCollect = counts.vencida.value + counts.sem_anuidade.value;
  const clubOptions = [...clubs].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const exportCsv = () => downloadCsv(
    'anuidades-atletas.csv',
    ['Atleta', 'CPF', 'Clube', 'Plano', 'Valor', 'Vencimento', 'Situação'],
    filtered.map(r => [r.name, r.cpf, r.club, r.plan, csvNum(r.price), r.expiry ? r.expiry.split('-').reverse().join('/') : '', ANNUITY_STATUS_LABELS[r.status]])
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
      <div className="flex justify-between items-center pb-3 border-b border-slate-100">
        <div>
          <h4 className="font-display font-bold text-slate-900 text-sm">Anuidades de Atletas</h4>
          <p className="text-xs text-slate-400">Situação atual de cada atleta do tenant (posição de hoje; o sistema guarda apenas o último vencimento, não o histórico de pagamentos).</p>
        </div>
        <ExportButton onClick={exportCsv} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card tone="emerald" label="Regulares" value={String(counts.regular.n)} />
        <Card tone="blue" label="A vencer em 30 dias" value={String(counts.a_vencer.n)} sub={brl(counts.a_vencer.value)} />
        <Card tone="amber" label="Vencidas" value={String(counts.vencida.n)} sub={brl(counts.vencida.value)} />
        <Card tone="amber" label="Sem anuidade" value={String(counts.sem_anuidade.n)} sub={brl(counts.sem_anuidade.value)} />
        <Card tone="slate" label="Potencial a receber" value={brl(toCollect)} sub="vencidas + sem anuidade" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setLimit(PAGE); }}
          placeholder="Buscar por nome ou CPF..."
          className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500"
        />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as 'todos' | AnnuityStatus); setLimit(PAGE); }} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700">
          <option value="todos">Todas as situações</option>
          {(Object.keys(ANNUITY_STATUS_LABELS) as AnnuityStatus[]).map(s => <option key={s} value={s}>{ANNUITY_STATUS_LABELS[s]}</option>)}
        </select>
        <select value={clubFilter} onChange={e => { setClubFilter(e.target.value); setLimit(PAGE); }} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700">
          <option value="">Todos os clubes</option>
          {clubOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto text-xs text-slate-700">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200">
              <th className={th}>Atleta</th>
              <th className={th}>Clube</th>
              <th className={th}>Plano</th>
              <th className={`${th} text-right`}>Valor</th>
              <th className={th}>Vencimento</th>
              <th className={`${th} text-center`}>Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-4 px-3 text-center text-slate-400">Nenhum atleta encontrado.</td></tr>
            ) : filtered.slice(0, limit).map(r => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className={`${td} font-bold text-slate-800`}>{r.name}</td>
                <td className={`${td} text-slate-500`}>{r.club}</td>
                <td className={`${td} text-slate-500`}>{r.plan}</td>
                <td className={`${td} text-right font-mono`}>{brl(r.price)}</td>
                <td className={`${td} font-mono text-slate-500`}>{r.expiry ? r.expiry.split('-').reverse().join('/') : '—'}</td>
                <td className={`${td} text-center`}>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${STATUS_STYLE[r.status]}`}>{ANNUITY_STATUS_LABELS[r.status]}</span>
                </td>
              </tr>
            ))}
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

// =============================================================================
// Extrato de recebimentos: lista cronológica do que efetivamente entrou
// (inscrições pagas + anuidades PIX), filtrável por período, origem e clube.
// =============================================================================
interface ReceiptsStatementProps {
  registrations: Registration[];
  championships: Championship[];
  clubs: Club[];
  users: User[];
  franchiseClubId?: string | null;
  annuityPayments: AnnuityPayment[];
}

type ReceiptOrigin = 'inscricao_direta' | 'inscricao_clube' | 'anuidade_atleta' | 'anuidade_clube';

const ORIGIN_LABELS: Record<ReceiptOrigin, string> = {
  inscricao_direta: 'Inscrição direta',
  inscricao_clube: 'Inscrição via clube',
  anuidade_atleta: 'Anuidade de atleta',
  anuidade_clube: 'Anuidade de clube',
};

export function ReceiptsStatement({ registrations, championships, clubs, users, franchiseClubId, annuityPayments }: ReceiptsStatementProps) {
  const [preset, setPreset] = useState<PeriodPreset>('mes_atual');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [origin, setOrigin] = useState<'' | ReceiptOrigin>('');
  const [clubFilter, setClubFilter] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const { from, to } = periodRange(preset, customFrom, customTo);

  const rows = useMemo(() => {
    const champIds = franchiseChampionshipIds(championships, franchiseClubId);
    const champTitle = new Map(championships.map(c => [c.id, c.title]));
    const clubName = new Map(clubs.map(c => [c.id, c.name]));
    const userName = new Map(users.map(u => [u.id, u.fullName]));
    const out: Array<{ key: string; date: string; origin: ReceiptOrigin; description: string; subject: string; clubId: string; clubLabel: string; value: number }> = [];

    for (const r of registrations) {
      if (!champIds.has(r.championshipId) || !isPaid(r)) continue;
      out.push({
        key: `r_${r.id}`,
        date: effectiveDate(r),
        origin: isViaClub(r) ? 'inscricao_clube' : 'inscricao_direta',
        description: champTitle.get(r.championshipId) || r.championshipId,
        subject: userName.get(r.userId) || r.userId,
        clubId: r.clubId || '',
        clubLabel: r.clubId ? clubName.get(r.clubId) || r.clubId : 'Sem clube',
        value: netValue(r),
      });
    }
    for (const p of annuityPayments) {
      out.push({
        key: `a_${p.id}`,
        date: p.paidAt.slice(0, 10),
        origin: p.kind === 'club' ? 'anuidade_clube' : 'anuidade_atleta',
        description: p.kind === 'club' ? 'Anuidade de clube filiado' : 'Anuidade de atleta',
        subject: p.subjectName,
        clubId: p.clubId || '',
        clubLabel: p.clubId ? clubName.get(p.clubId) || p.clubId : 'Sem clube',
        value: p.amount,
      });
    }
    return out.sort((a, b) => b.date.localeCompare(a.date));
  }, [registrations, championships, clubs, users, franchiseClubId, annuityPayments]);

  const filtered = useMemo(
    () => rows.filter(r => inRange(r.date, from, to) && (!origin || r.origin === origin) && (!clubFilter || r.clubId === clubFilter)),
    [rows, from, to, origin, clubFilter]
  );
  const total = filtered.reduce((s, r) => s + r.value, 0);
  const clubOptions = useMemo(
    () => {
      const m = new Map<string, string>();
      for (const r of rows) if (r.clubId) m.set(r.clubId, r.clubLabel);
      return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    },
    [rows]
  );

  const exportCsv = () => downloadCsv(
    `extrato-recebimentos-${from || 'inicio'}_${to || 'hoje'}.csv`,
    ['Data', 'Origem', 'Descrição', 'Atleta/Clube', 'Clube', 'Valor (líquido)'],
    filtered.map(r => [r.date.split('-').reverse().join('/'), ORIGIN_LABELS[r.origin], r.description, r.subject, r.clubLabel, csvNum(r.value)])
  );

  const field = 'bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-700';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h4 className="font-display font-bold text-slate-900 text-sm">Extrato de Recebimentos</h4>
          <p className="text-xs text-slate-400">Tudo que efetivamente entrou, em ordem cronológica: inscrições pagas (valor líquido) e anuidades pagas via PIX.</p>
        </div>
        <ExportButton onClick={exportCsv} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => { setPreset(p); setLimit(PAGE); }}
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${preset === p ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
        {preset === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className={field} />
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className={field} />
          </>
        )}
        <select value={origin} onChange={e => { setOrigin(e.target.value as '' | ReceiptOrigin); setLimit(PAGE); }} className={field}>
          <option value="">Todas as origens</option>
          {(Object.keys(ORIGIN_LABELS) as ReceiptOrigin[]).map(o => <option key={o} value={o}>{ORIGIN_LABELS[o]}</option>)}
        </select>
        <select value={clubFilter} onChange={e => { setClubFilter(e.target.value); setLimit(PAGE); }} className={field}>
          <option value="">Todos os clubes</option>
          {clubOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto text-xs text-slate-700">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200">
              <th className={th}>Data</th>
              <th className={th}>Origem</th>
              <th className={th}>Descrição</th>
              <th className={th}>Atleta / Clube</th>
              <th className={th}>Clube</th>
              <th className={`${th} text-right`}>Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className={`${td} text-center text-slate-400`}>Nenhum recebimento no filtro selecionado.</td></tr>
            )}
            {filtered.slice(0, limit).map(r => (
              <tr key={r.key} className="hover:bg-slate-50/30 transition">
                <td className={`${td} font-mono text-slate-500`}>{r.date ? r.date.split('-').reverse().join('/') : '—'}</td>
                <td className={td}>{ORIGIN_LABELS[r.origin]}</td>
                <td className={`${td} text-slate-500`}>{r.description}</td>
                <td className={`${td} font-semibold text-slate-800`}>{r.subject}</td>
                <td className={`${td} text-slate-500`}>{r.clubLabel}</td>
                <td className={`${td} text-right font-mono font-bold text-emerald-700`}>{brl(r.value)}</td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-slate-300 font-mono font-bold bg-slate-50">
                <td className={`${td} font-sans text-slate-900`} colSpan={5}>Total do filtro ({filtered.length} lançamentos)</td>
                <td className={`${td} text-right text-emerald-700`}>{brl(total)}</td>
              </tr>
            </tfoot>
          )}
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
