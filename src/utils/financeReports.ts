import { Registration, Championship, User, AnnuityPlan } from '../types';

// Valor padrão de anuidade de atleta sem plano vinculado (mesmo valor já
// usado como projeção em Relatório Financeiro e na cobrança PIX).
export const DEFAULT_ANNUITY_PRICE = 360;

export const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ymd = (d: Date) => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export type PeriodPreset = 'mes_atual' | 'mes_anterior' | 'trimestre' | 'ano' | 'tudo' | 'custom';

export const PERIOD_LABELS: Record<PeriodPreset, string> = {
  mes_atual: 'Mês atual',
  mes_anterior: 'Mês anterior',
  trimestre: 'Trimestre atual',
  ano: 'Ano atual',
  tudo: 'Todo o período',
  custom: 'Personalizado',
};

// Intervalo [from, to] em 'YYYY-MM-DD' (strings vazias = sem limite).
export function periodRange(preset: PeriodPreset, customFrom = '', customTo = '', now = new Date()): { from: string; to: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case 'mes_atual':
      return { from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)) };
    case 'mes_anterior':
      return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
    case 'trimestre': {
      const qStart = Math.floor(m / 3) * 3;
      return { from: ymd(new Date(y, qStart, 1)), to: ymd(new Date(y, qStart + 3, 0)) };
    }
    case 'ano':
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case 'custom':
      return { from: customFrom, to: customTo };
    default:
      return { from: '', to: '' };
  }
}

export const inRange = (date: string, from: string, to: string) =>
  (!from || date >= from) && (!to || date <= to);

// Valor líquido para a franquia: club_owed_amount quando a inscrição é de
// atleta de clube filiado (já descontado o Percentual Clube); senão o
// valorPago cheio (inscrição direta no campeonato do próprio organizador).
export const netValue = (r: Registration) => (r.clubOwedAmount != null ? r.clubOwedAmount : (r.valorPago || 0));
export const grossValue = (r: Registration) => r.valorPago || 0;
export const retainedByClub = (r: Registration) => (r.clubOwedAmount != null ? Math.max(grossValue(r) - r.clubOwedAmount, 0) : 0);
export const isViaClub = (r: Registration) => r.paymentGateway === 'club_invoice' || r.clubOwedAmount != null;
export const isPaid = (r: Registration) => r.paymentStatus === 'approved';

// Data efetiva de recebimento. Para cobranças reais (PIX) vale a data de
// confirmação (approvedAt); para o legado (gateway 'manual'), registeredAt é
// a data da importação, então vale dataPagamento do sistema antigo.
export function paidDate(r: Registration): string {
  if (r.paymentGateway !== 'manual' && r.approvedAt) return r.approvedAt.slice(0, 10);
  if (r.dataPagamento) return r.dataPagamento.slice(0, 10);
  return (r.approvedAt || r.registeredAt || '').slice(0, 10);
}

// Data de competência de uma inscrição ainda em aberto.
export function pendingDate(r: Registration): string {
  return (r.dataPagamento || r.registeredAt || '').slice(0, 10);
}

export const effectiveDate = (r: Registration) => (isPaid(r) ? paidDate(r) : pendingDate(r));

// Apenas campeonatos organizados pela própria franquia entram na receita dela.
export function franchiseChampionshipIds(championships: Championship[], franchiseClubId?: string | null): Set<string> {
  return new Set(
    championships
      .filter(c => !c.clubId || !franchiseClubId || c.clubId === franchiseClubId)
      .map(c => c.id)
  );
}

export interface Bucket {
  paidCount: number;
  reinscCount: number;
  pendingCount: number;
  gross: number;
  retained: number;
  received: number;
  open: number;
}
export const emptyBucket = (): Bucket => ({ paidCount: 0, reinscCount: 0, pendingCount: 0, gross: 0, retained: 0, received: 0, open: 0 });

export function addToBucket(b: Bucket, r: Registration) {
  if (isPaid(r)) {
    b.paidCount += 1;
    if (r.registrationType === 'reinscrição') b.reinscCount += 1;
    b.gross += grossValue(r);
    b.retained += retainedByClub(r);
    b.received += netValue(r);
  } else {
    b.pendingCount += 1;
    b.open += netValue(r);
  }
}

// ----- Anuidade (posição atual) -----

export type AnnuityStatus = 'regular' | 'a_vencer' | 'vencida' | 'sem_anuidade';

export const ANNUITY_STATUS_LABELS: Record<AnnuityStatus, string> = {
  regular: 'Regular',
  a_vencer: 'A vencer (30 dias)',
  vencida: 'Vencida',
  sem_anuidade: 'Sem anuidade',
};

export function parseExpiry(raw?: string | null): string | null {
  if (!raw) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(raw);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

export function annuityStatus(hasPaid: boolean, expiryRaw?: string | null, now = new Date()): AnnuityStatus {
  const today = ymd(now);
  const limit = ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30));
  const expiry = parseExpiry(expiryRaw);
  const valid = expiry ? expiry >= today : hasPaid;
  if (valid) return expiry && expiry <= limit ? 'a_vencer' : 'regular';
  return expiry ? 'vencida' : 'sem_anuidade';
}

export function annuityPriceFor(user: User, plans: AnnuityPlan[]): number {
  const plan = user.annuityPlanId ? plans.find(p => p.id === user.annuityPlanId) : undefined;
  return plan ? plan.price : DEFAULT_ANNUITY_PRICE;
}

// ----- CSV (pt-BR: separador ';', vírgula decimal, BOM p/ Excel) -----

export const csvNum = (v: number) => v.toFixed(2).replace('.', ',');

export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number>>) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = '﻿' + [header, ...rows].map(r => r.map(esc).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
