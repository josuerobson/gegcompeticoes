import React, { useState, useMemo } from 'react';
import {
  DollarSign, CreditCard, Calendar, ChevronLeft, ChevronRight,
  Filter, Search, FileText, Download, X, CheckCircle, Clock,
  AlertTriangle, RotateCcw, Building2, CheckSquare, Square
} from 'lucide-react';
import { Championship, Club, Stage, User } from '../types';
import { normalizeSearchText } from '../utils/textSearch';
import { downloadPdfFromHtml, sanitizePdfFilename } from '../utils/pdfDownloader';

export interface UnbilledRegistration {
  id: string;
  source: 'championship' | 'idsc';
  championshipId?: string;
  championshipTitle: string;
  stageId?: string;
  stageTitle?: string;
  stageNum?: number;
  modalityName?: string;
  athleteName: string;
  valorPago: number;
  clubOwedAmount: number;
  registeredAt: string;
}

export interface FranchiseInvoiceEntry {
  clubId: string;
  clubName: string;
  creditorClubId: string;
  creditorClubName: string;
  totalOwed: number;
  count: number;
  registrations: UnbilledRegistration[];
}

export interface FranchiseInvoiceHistoryItem {
  id: string;
  clubId: string;
  clubName: string;
  creditorClubId: string;
  creditorClubName: string;
  totalAmount: number;
  status: string;
  pixCopiaECola?: string;
  txId?: string;
  createdAt: string;
  approvedAt?: string;
}

interface FranchiseFinancialReportProps {
  currentUser: User;
  clubs: Club[];
  championships: Championship[];
  stages: Stage[];
  entries: FranchiseInvoiceEntry[];
  history: FranchiseInvoiceHistoryItem[];
  onRefresh?: () => void;
  billingSuccessMsg?: string;
}

export default function FranchiseFinancialReport({
  currentUser,
  clubs,
  championships,
  stages,
  entries,
  history,
  onRefresh,
  billingSuccessMsg,
}: FranchiseFinancialReportProps) {
  // Helper to format Date to YYYY-MM-DD
  const formatDateToIso = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Default: last 6 months prefilled
  const defaultDates = useMemo(() => {
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
    return {
      start: formatDateToIso(sixMonthsAgo),
      end: formatDateToIso(today),
      year: today.getFullYear(),
    };
  }, []);

  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);
  const [currentYear, setCurrentYear] = useState(defaultDates.year);

  // Filters
  const [selectedChampionshipIds, setSelectedChampionshipIds] = useState<string[]>([]);
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);
  const [clubSearch, setClubSearch] = useState('');

  // Dropdown popover open states
  const [champFilterOpen, setChampFilterOpen] = useState(false);
  const [stageFilterOpen, setStageFilterOpen] = useState(false);

  // Detail Modal State
  const [detailModal, setDetailModal] = useState<{
    clubName: string;
    clubId: string;
    filterLabel: string;
    registrations: UnbilledRegistration[];
    totalOwed: number;
  } | null>(null);

  // Generating PDF state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Calculate days difference
  const getDaysSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(diff / 86400000));
  };

  // Annual navigation handlers
  const handlePrevYear = () => {
    const newYear = currentYear - 1;
    setCurrentYear(newYear);
    setStartDate(`${newYear}-01-01`);
    setEndDate(`${newYear}-12-31`);
  };

  const handleNextYear = () => {
    const newYear = currentYear + 1;
    setCurrentYear(newYear);
    setStartDate(`${newYear}-01-01`);
    setEndDate(`${newYear}-12-31`);
  };

  const handleResetToSixMonths = () => {
    setStartDate(defaultDates.start);
    setEndDate(defaultDates.end);
    setCurrentYear(defaultDates.year);
    setSelectedChampionshipIds([]);
    setSelectedStageIds([]);
    setClubSearch('');
  };

  // Available championships for filtering: championships owned by the creditor or appearing in entries
  const availableChampionships = useMemo(() => {
    const list: Array<{ id: string; title: string }> = [];
    const seen = new Set<string>();

    championships.forEach(c => {
      if (c && c.id && !seen.has(c.id)) {
        seen.add(c.id);
        list.push({ id: c.id, title: c.title });
      }
    });

    entries.forEach(e => {
      e.registrations.forEach(r => {
        if (r.championshipId && !seen.has(r.championshipId)) {
          seen.add(r.championshipId);
          list.push({ id: r.championshipId, title: r.championshipTitle || r.championshipId });
        }
      });
    });

    return list.sort((a, b) => a.title.localeCompare(b.title));
  }, [championships, entries]);

  // Available stages based on selected championships
  const availableStages = useMemo(() => {
    const list: Array<{ id: string; title: string; championshipId?: string }> = [];
    const seen = new Set<string>();

    stages.forEach(s => {
      if (s && s.id && !seen.has(s.id)) {
        if (selectedChampionshipIds.length === 0 || selectedChampionshipIds.includes(s.championshipId)) {
          seen.add(s.id);
          const stageDisplay = s.stageNum ? `Etapa ${s.stageNum} - ${s.title}` : s.title;
          list.push({ id: s.id, title: stageDisplay, championshipId: s.championshipId });
        }
      }
    });

    entries.forEach(e => {
      e.registrations.forEach(r => {
        if (r.stageId && !seen.has(r.stageId)) {
          if (selectedChampionshipIds.length === 0 || (r.championshipId && selectedChampionshipIds.includes(r.championshipId))) {
            seen.add(r.stageId);
            const stageDisplay = r.stageNum ? `Etapa ${r.stageNum} - ${r.stageTitle || r.stageId}` : (r.stageTitle || r.stageId);
            list.push({ id: r.stageId, title: stageDisplay, championshipId: r.championshipId });
          }
        }
      });
    });

    return list.sort((a, b) => a.title.localeCompare(b.title));
  }, [stages, entries, selectedChampionshipIds]);

  // Championship selection helpers
  const toggleChampionship = (champId: string) => {
    setSelectedChampionshipIds(prev => {
      if (prev.includes(champId)) {
        const next = prev.filter(id => id !== champId);
        return next;
      } else {
        return [...prev, champId];
      }
    });
    // Reset selected stages that don't belong anymore
    setSelectedStageIds([]);
  };

  const toggleAllChampionships = () => {
    if (selectedChampionshipIds.length === availableChampionships.length) {
      setSelectedChampionshipIds([]);
    } else {
      setSelectedChampionshipIds(availableChampionships.map(c => c.id));
    }
    setSelectedStageIds([]);
  };

  // Stage selection helpers
  const toggleStage = (stageId: string) => {
    setSelectedStageIds(prev =>
      prev.includes(stageId) ? prev.filter(id => id !== stageId) : [...prev, stageId]
    );
  };

  const toggleAllStages = () => {
    if (selectedStageIds.length === availableStages.length) {
      setSelectedStageIds([]);
    } else {
      setSelectedStageIds(availableStages.map(s => s.id));
    }
  };

  // Filter entries based on active filters
  const filteredEntries = useMemo(() => {
    return entries
      .map(entry => {
        // Filter this club's registrations
        const matchingRegs = entry.registrations.filter(reg => {
          // Date filter
          const regDate = reg.registeredAt ? reg.registeredAt.slice(0, 10) : '';
          if (startDate && regDate && regDate < startDate) return false;
          if (endDate && regDate && regDate > endDate) return false;

          // Championship filter
          if (selectedChampionshipIds.length > 0) {
            if (!reg.championshipId || !selectedChampionshipIds.includes(reg.championshipId)) {
              return false;
            }
          }

          // Stage filter
          if (selectedStageIds.length > 0) {
            if (!reg.stageId || !selectedStageIds.includes(reg.stageId)) {
              return false;
            }
          }

          return true;
        });

        // Compute aging for matching registrations
        const aging = [0, 0, 0];
        const agingRegs: [UnbilledRegistration[], UnbilledRegistration[], UnbilledRegistration[]] = [[], [], []];
        for (const reg of matchingRegs) {
          const days = getDaysSince(reg.registeredAt);
          const idx = days <= 30 ? 0 : days <= 60 ? 1 : 2;
          aging[idx] += Number(reg.clubOwedAmount) || 0;
          agingRegs[idx].push(reg);
        }

        const totalOwed = matchingRegs.reduce((sum, r) => sum + (Number(r.clubOwedAmount) || 0), 0);

        return {
          ...entry,
          filteredCount: matchingRegs.length,
          filteredTotal: totalOwed,
          filteredRegistrations: matchingRegs,
          aging,
          agingRegs,
        };
      })
      .filter(entry => {
        // Club name search
        if (clubSearch.trim()) {
          const search = normalizeSearchText(clubSearch);
          if (!normalizeSearchText(entry.clubName).includes(search)) {
            return false;
          }
        }
        // Show entries with filtered registrations or keep visible if search matches
        return entry.filteredCount > 0;
      });
  }, [entries, startDate, endDate, selectedChampionshipIds, selectedStageIds, clubSearch]);

  // Filter invoice history based on date and club search
  const filteredHistory = useMemo(() => {
    return history.filter(inv => {
      const invDate = inv.createdAt ? inv.createdAt.slice(0, 10) : '';
      if (startDate && invDate && invDate < startDate) return false;
      if (endDate && invDate && invDate > endDate) return false;
      if (clubSearch.trim()) {
        const search = normalizeSearchText(clubSearch);
        if (!normalizeSearchText(inv.clubName).includes(search)) return false;
      }
      return true;
    });
  }, [history, startDate, endDate, clubSearch]);

  // Card totals computed from filtered data
  const totalUnbilled = useMemo(() => {
    return filteredEntries.reduce((sum, e) => sum + e.filteredTotal, 0);
  }, [filteredEntries]);

  const totalPendingInvoices = useMemo(() => {
    return filteredHistory.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.totalAmount, 0);
  }, [filteredHistory]);

  const totalPaidInvoices = useMemo(() => {
    return filteredHistory.filter(i => i.status === 'approved').reduce((sum, i) => sum + i.totalAmount, 0);
  }, [filteredHistory]);

  // Format currency
  const fmtBrl = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Format date BR
  const fmtDateBr = (dateStr?: string) => {
    if (!dateStr) return '—';
    const parts = dateStr.slice(0, 10).split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
  };

  // Open detail modal when clicking numbers in the table
  const handleOpenDetailModal = (
    entry: typeof filteredEntries[0],
    type: 'all' | 'aging0_30' | 'aging31_60' | 'aging61_plus'
  ) => {
    let regs: UnbilledRegistration[] = [];
    let label = '';
    let total = 0;

    if (type === 'all') {
      regs = entry.filteredRegistrations;
      label = `Todas as inscrições pendentes (${regs.length})`;
      total = entry.filteredTotal;
    } else if (type === 'aging0_30') {
      regs = entry.agingRegs[0];
      label = `Inscrições de 0 a 30 dias (${regs.length})`;
      total = entry.aging[0];
    } else if (type === 'aging31_60') {
      regs = entry.agingRegs[1];
      label = `Inscrições de 31 a 60 dias (${regs.length})`;
      total = entry.aging[1];
    } else {
      regs = entry.agingRegs[2];
      label = `Inscrições de 61+ dias (${regs.length})`;
      total = entry.aging[2];
    }

    setDetailModal({
      clubName: entry.clubName,
      clubId: entry.clubId,
      filterLabel: label,
      registrations: regs,
      totalOwed: total,
    });
  };

  // Generate PDF for detail modal
  const handleDownloadDetailPdf = async () => {
    if (!detailModal || detailModal.registrations.length === 0) return;
    setIsGeneratingPdf(true);
    try {
      const creditorClub = clubs.find(c => c.id === currentUser?.clubId);
      const creditorName = creditorClub?.name || 'G&G Competições';
      const creditorFantasy = creditorClub?.fantasyName || creditorName;
      const creditorCnpj = creditorClub?.cnpj || '';
      const generationDate = new Date().toLocaleString('pt-BR');

      const rowsHtml = detailModal.registrations.map((r, idx) => {
        const days = getDaysSince(r.registeredAt);
        const stageStr = r.stageTitle ? (r.stageNum ? `Etapa ${r.stageNum} - ${r.stageTitle}` : r.stageTitle) : '—';
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 6px 8px; text-align: center; color: #64748b; font-mono;">${idx + 1}</td>
            <td style="padding: 6px 8px; font-weight: bold; color: #0f172a;">${r.athleteName || 'Atleta não identificado'}</td>
            <td style="padding: 6px 8px; color: #334155;">${r.championshipTitle || '—'}</td>
            <td style="padding: 6px 8px; color: #334155;">${stageStr}</td>
            <td style="padding: 6px 8px; color: #475569;">${r.modalityName || '—'}</td>
            <td style="padding: 6px 8px; text-align: center; color: #475569; font-mono;">${fmtDateBr(r.registeredAt)}</td>
            <td style="padding: 6px 8px; text-align: center; font-mono; font-weight: bold; color: ${days > 60 ? '#b91c1c' : days > 30 ? '#b45309' : '#047857'};">${days} d</td>
            <td style="padding: 6px 8px; text-align: right; font-mono; font-weight: bold; color: #0f172a;">${fmtBrl(r.clubOwedAmount)}</td>
          </tr>
        `;
      }).join('');

      const html = `
        <div style="padding: 24px 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #ffffff; box-sizing: border-box;">
          <!-- Header -->
          <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 style="font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 0 0 4px 0;">
                ${creditorFantasy}
              </h1>
              <p style="font-size: 11px; color: #475569; margin: 0;">
                Relatório Financeiro da Franquia • Detalhamento de Faturas
              </p>
              ${creditorCnpj ? `<p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">CNPJ: ${creditorCnpj}</p>` : ''}
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; background-color: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: bold;">
                Emissão: ${generationDate}
              </span>
            </div>
          </div>

          <!-- Info Box -->
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <p style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; margin: 0 0 2px 0;">Clube Filiado (Devedor)</p>
              <h2 style="font-size: 14px; font-weight: bold; color: #0f172a; margin: 0;">${detailModal.clubName}</h2>
              <p style="font-size: 10.5px; color: #0284c7; font-weight: 600; margin: 4px 0 0 0;">${detailModal.filterLabel}</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; margin: 0 0 2px 0;">Total Deste Extrato</p>
              <span style="font-size: 18px; font-weight: 800; font-family: monospace; color: #b45309;">${fmtBrl(detailModal.totalOwed)}</span>
              <p style="font-size: 10px; color: #475569; margin: 2px 0 0 0;">Período: ${fmtDateBr(startDate)} a ${fmtDateBr(endDate)}</p>
            </div>
          </div>

          <!-- Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #0f172a; color: #ffffff; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px;">
                <th style="padding: 7px 8px; text-align: center; width: 30px;">#</th>
                <th style="padding: 7px 8px; text-align: left;">Atleta</th>
                <th style="padding: 7px 8px; text-align: left;">Campeonato</th>
                <th style="padding: 7px 8px; text-align: left;">Etapa</th>
                <th style="padding: 7px 8px; text-align: left;">Modalidade / Prova</th>
                <th style="padding: 7px 8px; text-align: center; width: 75px;">Data Inscr.</th>
                <th style="padding: 7px 8px; text-align: center; width: 55px;">Idade</th>
                <th style="padding: 7px 8px; text-align: right; width: 85px;">Valor Devido</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #f1f5f9; border-top: 2px solid #cbd5e1; font-size: 11px; font-weight: bold;">
                <td colspan="7" style="padding: 8px; text-align: right; text-transform: uppercase; color: #334155;">Total Geral Devido:</td>
                <td style="padding: 8px; text-align: right; font-family: monospace; font-size: 12px; color: #b45309;">${fmtBrl(detailModal.totalOwed)}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Footer -->
          <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; color: #94a3b8; text-align: center;">
            Documento gerado automaticamente pelo sistema G&G Competições • Relatório Financeiro de Inscrições de Clubes Filiados
          </div>
        </div>
      `;

      const filename = sanitizePdfFilename(`detalhe_financeiro_${detailModal.clubName.replace(/\s+/g, '_')}_${startDate}_a_${endDate}`);
      await downloadPdfFromHtml(html, {
        filename,
        orientation: 'landscape',
        margin: [6, 6, 6, 6]
      });
    } catch (err) {
      console.error('Erro ao gerar PDF de detalhamento:', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Generate complete report for a specific club (button "Baixar Relatório" in action column)
  const handleDownloadClubSummaryPdf = async (entry: typeof filteredEntries[0]) => {
    setIsGeneratingPdf(true);
    try {
      const creditorClub = clubs.find(c => c.id === currentUser?.clubId);
      const creditorName = creditorClub?.name || 'G&G Competições';
      const creditorFantasy = creditorClub?.fantasyName || creditorName;
      const creditorCnpj = creditorClub?.cnpj || '';
      const debtorClub = clubs.find(c => c.id === entry.clubId);
      const debtorPhone = debtorClub?.phone || debtorClub?.cellPhone || '';
      const generationDate = new Date().toLocaleString('pt-BR');

      const rowsHtml = entry.filteredRegistrations.map((r, idx) => {
        const days = getDaysSince(r.registeredAt);
        const stageStr = r.stageTitle ? (r.stageNum ? `Etapa ${r.stageNum} - ${r.stageTitle}` : r.stageTitle) : '—';
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding: 6px 8px; text-align: center; color: #64748b; font-mono;">${idx + 1}</td>
            <td style="padding: 6px 8px; font-weight: bold; color: #0f172a;">${r.athleteName || 'Atleta não identificado'}</td>
            <td style="padding: 6px 8px; color: #334155;">${r.championshipTitle || '—'}</td>
            <td style="padding: 6px 8px; color: #334155;">${stageStr}</td>
            <td style="padding: 6px 8px; color: #475569;">${r.modalityName || '—'}</td>
            <td style="padding: 6px 8px; text-align: center; color: #475569; font-mono;">${fmtDateBr(r.registeredAt)}</td>
            <td style="padding: 6px 8px; text-align: center; font-mono; font-weight: bold; color: ${days > 60 ? '#b91c1c' : days > 30 ? '#b45309' : '#047857'};">${days} d</td>
            <td style="padding: 6px 8px; text-align: right; font-mono; font-weight: bold; color: #0f172a;">${fmtBrl(r.clubOwedAmount)}</td>
          </tr>
        `;
      }).join('');

      const html = `
        <div style="padding: 24px 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #ffffff; box-sizing: border-box;">
          <!-- Header -->
          <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 style="font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 0 0 4px 0;">
                ${creditorFantasy}
              </h1>
              <p style="font-size: 11px; color: #475569; margin: 0;">
                Extrato Financeiro de Inscrições — Clube Filiado
              </p>
              ${creditorCnpj ? `<p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">CNPJ: ${creditorCnpj}</p>` : ''}
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; background-color: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: bold;">
                Emissão: ${generationDate}
              </span>
            </div>
          </div>

          <!-- Club & Summary Cards -->
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
              <div>
                <p style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; margin: 0 0 2px 0;">Clube Filiado</p>
                <h2 style="font-size: 15px; font-weight: bold; color: #0f172a; margin: 0;">${entry.clubName}</h2>
                ${debtorPhone ? `<p style="font-size: 10.5px; color: #475569; margin: 3px 0 0 0;">Telefone: ${debtorPhone}</p>` : ''}
              </div>
              <div style="text-align: right;">
                <p style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; margin: 0 0 2px 0;">Período Filtrado</p>
                <p style="font-size: 11px; font-weight: bold; color: #0284c7; margin: 0;">${fmtDateBr(startDate)} até ${fmtDateBr(endDate)}</p>
                <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">${entry.filteredCount} inscrição(ões) no período</p>
              </div>
            </div>

            <!-- Aging breakdown pills -->
            <div style="display: flex; gap: 12px;">
              <div style="flex: 1; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 8px 12px;">
                <span style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; color: #065f46; display: block;">0 a 30 dias</span>
                <span style="font-size: 13px; font-weight: bold; font-family: monospace; color: #047857;">${fmtBrl(entry.aging[0])}</span>
                <span style="font-size: 9.5px; color: #059669; display: block;">${entry.agingRegs[0].length} inscr.</span>
              </div>
              <div style="flex: 1; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px;">
                <span style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; color: #92400e; display: block;">31 a 60 dias</span>
                <span style="font-size: 13px; font-weight: bold; font-family: monospace; color: #b45309;">${fmtBrl(entry.aging[1])}</span>
                <span style="font-size: 9.5px; color: #d97706; display: block;">${entry.agingRegs[1].length} inscr.</span>
              </div>
              <div style="flex: 1; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 8px 12px;">
                <span style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; color: #9f1239; display: block;">61+ dias (Crítico)</span>
                <span style="font-size: 13px; font-weight: bold; font-family: monospace; color: #be123c;">${fmtBrl(entry.aging[2])}</span>
                <span style="font-size: 9.5px; color: #e11d48; display: block;">${entry.agingRegs[2].length} inscr.</span>
              </div>
              <div style="flex: 1.2; background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 6px; padding: 8px 12px; text-align: right;">
                <span style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; color: #475569; display: block;">Total Devido</span>
                <span style="font-size: 15px; font-weight: 800; font-family: monospace; color: #0f172a;">${fmtBrl(entry.filteredTotal)}</span>
                <span style="font-size: 9.5px; color: #64748b; display: block;">${entry.filteredCount} inscrições</span>
              </div>
            </div>
          </div>

          <!-- Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #0f172a; color: #ffffff; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.5px;">
                <th style="padding: 7px 8px; text-align: center; width: 30px;">#</th>
                <th style="padding: 7px 8px; text-align: left;">Atleta</th>
                <th style="padding: 7px 8px; text-align: left;">Campeonato</th>
                <th style="padding: 7px 8px; text-align: left;">Etapa</th>
                <th style="padding: 7px 8px; text-align: left;">Modalidade / Prova</th>
                <th style="padding: 7px 8px; text-align: center; width: 75px;">Data Inscr.</th>
                <th style="padding: 7px 8px; text-align: center; width: 55px;">Idade</th>
                <th style="padding: 7px 8px; text-align: right; width: 85px;">Valor Devido</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #f1f5f9; border-top: 2px solid #cbd5e1; font-size: 11px; font-weight: bold;">
                <td colspan="7" style="padding: 8px; text-align: right; text-transform: uppercase; color: #334155;">Total Saldo a Faturar:</td>
                <td style="padding: 8px; text-align: right; font-family: monospace; font-size: 12px; color: #b45309;">${fmtBrl(entry.filteredTotal)}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Footer -->
          <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; color: #94a3b8; text-align: center;">
            Documento de controle emitido por ${creditorFantasy} via sistema G&G Competições • Todos os direitos reservados.
          </div>
        </div>
      `;

      const filename = sanitizePdfFilename(`relatorio_financeiro_${entry.clubName.replace(/\s+/g, '_')}_${startDate}_a_${endDate}`);
      await downloadPdfFromHtml(html, {
        filename,
        orientation: 'landscape',
        margin: [6, 6, 6, 6]
      });
    } catch (err) {
      console.error('Erro ao gerar relatório do clube:', err);
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Generate Global PDF Report of all clubs
  const handleDownloadGlobalReportPdf = async () => {
    if (filteredEntries.length === 0) return;
    setIsGeneratingPdf(true);
    try {
      const creditorClub = clubs.find(c => c.id === currentUser?.clubId);
      const creditorFantasy = creditorClub?.fantasyName || creditorClub?.name || 'G&G Competições';
      const generationDate = new Date().toLocaleString('pt-BR');

      const rowsHtml = filteredEntries.map((e, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10.5px; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 8px 10px; font-weight: bold; color: #0f172a;">${e.clubName}</td>
          <td style="padding: 8px 10px; text-align: center; font-family: monospace; color: #334155;">${e.filteredCount}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; color: #047857;">${fmtBrl(e.aging[0])}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; color: #b45309;">${fmtBrl(e.aging[1])}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; color: ${e.aging[2] > 0 ? '#b91c1c; font-weight: bold;' : '#94a3b8;'}">${fmtBrl(e.aging[2])}</td>
          <td style="padding: 8px 10px; text-align: right; font-family: monospace; font-weight: bold; color: #b45309;">${fmtBrl(e.filteredTotal)}</td>
        </tr>
      `).join('');

      const totalInscriptions = filteredEntries.reduce((sum, e) => sum + e.filteredCount, 0);
      const total0_30 = filteredEntries.reduce((sum, e) => sum + e.aging[0], 0);
      const total31_60 = filteredEntries.reduce((sum, e) => sum + e.aging[1], 0);
      const total61_plus = filteredEntries.reduce((sum, e) => sum + e.aging[2], 0);

      const html = `
        <div style="padding: 24px 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #ffffff; box-sizing: border-box;">
          <div style="border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 style="font-size: 16px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 0 0 4px 0;">
                ${creditorFantasy}
              </h1>
              <p style="font-size: 11px; color: #475569; margin: 0;">
                Relatório Geral de Saldo Não Faturado — Todos os Clubes Filiados
              </p>
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; background-color: #f0f9ff; border: 1px solid #bae6fd; color: #0369a1; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: bold;">
                Emissão: ${generationDate}
              </span>
            </div>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <p style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; margin: 0;">Período</p>
              <p style="font-size: 13px; font-weight: bold; color: #0284c7; margin: 2px 0 0 0;">${fmtDateBr(startDate)} até ${fmtDateBr(endDate)}</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; margin: 0;">Saldo Total a Faturar</p>
              <p style="font-size: 18px; font-weight: 800; font-family: monospace; color: #b45309; margin: 2px 0 0 0;">${fmtBrl(totalUnbilled)}</p>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #0f172a; color: #ffffff; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                <th style="padding: 8px 10px; text-align: left;">Clube Filiado</th>
                <th style="padding: 8px 10px; text-align: center; width: 80px;">Inscrições</th>
                <th style="padding: 8px 10px; text-align: right; width: 100px;">0–30 dias</th>
                <th style="padding: 8px 10px; text-align: right; width: 100px;">31–60 dias</th>
                <th style="padding: 8px 10px; text-align: right; width: 100px;">61+ dias</th>
                <th style="padding: 8px 10px; text-align: right; width: 110px;">Valor Devido</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #f1f5f9; border-top: 2px solid #cbd5e1; font-size: 11px; font-weight: bold;">
                <td style="padding: 10px; text-transform: uppercase; color: #334155;">Total Geral:</td>
                <td style="padding: 10px; text-align: center; font-family: monospace;">${totalInscriptions}</td>
                <td style="padding: 10px; text-align: right; font-family: monospace; color: #047857;">${fmtBrl(total0_30)}</td>
                <td style="padding: 10px; text-align: right; font-family: monospace; color: #b45309;">${fmtBrl(total31_60)}</td>
                <td style="padding: 10px; text-align: right; font-family: monospace; color: #b91c1c;">${fmtBrl(total61_plus)}</td>
                <td style="padding: 10px; text-align: right; font-family: monospace; font-size: 13px; color: #b45309;">${fmtBrl(totalUnbilled)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; color: #94a3b8; text-align: center;">
            Documento consolidado de faturamento emitido por ${creditorFantasy} via sistema G&G Competições.
          </div>
        </div>
      `;

      const filename = sanitizePdfFilename(`relatorio_geral_saldo_franquia_${startDate}_a_${endDate}`);
      await downloadPdfFromHtml(html, {
        filename,
        orientation: 'landscape',
        margin: [6, 6, 6, 6]
      });
    } catch (err) {
      console.error('Erro ao gerar relatório geral:', err);
      alert('Erro ao gerar relatório geral. Tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Title Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-1 shadow-xs">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base">Financeiro da Franquia</h3>
            <p className="text-xs text-slate-400">
              Faturas de Inscrição — Clubes Filiados vinculados a esta franquia.
            </p>
          </div>
          <DollarSign className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      {billingSuccessMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl flex items-center gap-2 text-xs font-semibold border border-emerald-200">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{billingSuccessMsg}</span>
        </div>
      )}

      {/* Filter Toolbar Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">
              Filtros do Relatório
            </h4>
          </div>
          <button
            type="button"
            onClick={handleResetToSixMonths}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50/50 px-2.5 py-1 rounded-lg transition cursor-pointer"
            title="Redefinir para últimos 6 meses"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Últimos 6 meses
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Entre Datas */}
          <div className="md:col-span-5 flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="w-full">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">De:</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>
            <div className="w-full">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Até:</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* Navegação Anual (< Ano anterior 2025 Próximo ano >) */}
          <div className="md:col-span-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Visualização Anual:</label>
            <div className="inline-flex items-center w-full justify-between bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={handlePrevYear}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-white px-2 py-1 rounded-lg transition cursor-pointer"
                title="Ano anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </button>
              <span className="font-mono font-bold text-slate-800 text-xs px-2">
                {currentYear}
              </span>
              <button
                type="button"
                onClick={handleNextYear}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-blue-600 hover:bg-white px-2 py-1 rounded-lg transition cursor-pointer"
                title="Próximo ano"
              >
                Próximo
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filtro Campeonatos */}
          <div className="md:col-span-2 relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Campeonatos:</label>
            <button
              type="button"
              onClick={() => {
                setChampFilterOpen(!champFilterOpen);
                setStageFilterOpen(false);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 flex items-center justify-between text-left hover:border-slate-300 transition"
            >
              <span className="truncate">
                {selectedChampionshipIds.length === 0
                  ? 'Todos'
                  : `${selectedChampionshipIds.length} selecionado(s)`}
              </span>
              <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transform transition ${champFilterOpen ? 'rotate-90' : ''}`} />
            </button>

            {champFilterOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-2 max-h-60 overflow-y-auto space-y-1">
                <button
                  type="button"
                  onClick={toggleAllChampionships}
                  className="w-full text-left px-2 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
                >
                  {selectedChampionshipIds.length === availableChampionships.length ? (
                    <CheckSquare className="w-3.5 h-3.5" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  Todos os campeonatos
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                {availableChampionships.map(champ => {
                  const isChecked = selectedChampionshipIds.includes(champ.id);
                  return (
                    <button
                      key={champ.id}
                      type="button"
                      onClick={() => toggleChampionship(champ.id)}
                      className="w-full text-left px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      )}
                      <span className="truncate">{champ.title}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Filtro Etapas */}
          <div className="md:col-span-2 relative">
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Etapas:</label>
            <button
              type="button"
              onClick={() => {
                setStageFilterOpen(!stageFilterOpen);
                setChampFilterOpen(false);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 flex items-center justify-between text-left hover:border-slate-300 transition"
            >
              <span className="truncate">
                {selectedStageIds.length === 0
                  ? 'Todas'
                  : `${selectedStageIds.length} selecionada(s)`}
              </span>
              <ChevronRight className={`w-3.5 h-3.5 text-slate-400 transform transition ${stageFilterOpen ? 'rotate-90' : ''}`} />
            </button>

            {stageFilterOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-2 max-h-60 overflow-y-auto space-y-1">
                {availableStages.length === 0 ? (
                  <p className="text-[11px] text-slate-400 p-2">Nenhuma etapa encontrada.</p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={toggleAllStages}
                      className="w-full text-left px-2 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
                    >
                      {selectedStageIds.length === availableStages.length ? (
                        <CheckSquare className="w-3.5 h-3.5" />
                      ) : (
                        <Square className="w-3.5 h-3.5" />
                      )}
                      Todas as etapas
                    </button>
                    <div className="border-t border-slate-100 my-1"></div>
                    {availableStages.map(stage => {
                      const isChecked = selectedStageIds.includes(stage.id);
                      return (
                        <button
                          key={stage.id}
                          type="button"
                          onClick={() => toggleStage(stage.id)}
                          className="w-full text-left px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          )}
                          <span className="truncate">{stage.title}</span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Section: Faturas de Inscrição — Clubes Filiados */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-xs">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-display font-bold text-slate-900 text-sm">Faturas de Inscrição — Clubes Filiados</h4>
            <p className="text-xs text-slate-400">
              Percentual Clube: valor devido a esta franquia pelas inscrições feitas em lote pelos filiados.
            </p>
          </div>
          <CreditCard className="w-4 h-4 text-blue-600" />
        </div>

        {/* 3 Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
            <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">Saldo Não Faturado</span>
            <span className="text-lg font-bold text-amber-700 font-mono">{fmtBrl(totalUnbilled)}</span>
            <span className="block text-[10px] text-amber-600/80 mt-0.5">Valores pendentes de emissão</span>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">Faturas Pendentes de Pagamento</span>
            <span className="text-lg font-bold text-blue-700 font-mono">{fmtBrl(totalPendingInvoices)}</span>
            <span className="block text-[10px] text-blue-600/80 mt-0.5">Emitidas e aguardando PIX</span>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <span className="text-[10px] text-slate-500 block uppercase font-sans font-bold">Faturas Já Pagas</span>
            <span className="text-lg font-bold text-emerald-700 font-mono">{fmtBrl(totalPaidInvoices)}</span>
            <span className="block text-[10px] text-emerald-600/80 mt-0.5">Recebidas no período</span>
          </div>
        </div>

        {/* Table 1: Saldo Não Faturado por Filiado */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h5 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">
                Saldo Não Faturado por Filiado
              </h5>
              <p className="text-[11px] text-slate-400">
                Clique nos números para detalhar as inscrições de cada faixa ou clube.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search by club */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Localizar clube..."
                  value={clubSearch}
                  onChange={e => setClubSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white transition w-44 sm:w-52"
                />
                {clubSearch && (
                  <button
                    onClick={() => setClubSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Download Global PDF Report Button */}
              {filteredEntries.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadGlobalReportPdf}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] px-3 py-1.5 rounded-xl transition cursor-pointer"
                  title="Baixar relatório completo de todos os clubes"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  Baixar Geral (PDF)
                </button>
              )}
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Nenhum saldo pendente encontrado para os filtros selecionados.</p>
              <p className="text-[10px] text-slate-400">Tente ajustar o intervalo de datas ou remover a busca de clube.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-mono">
                    <th className="py-2.5 px-3">Clube Filiado</th>
                    <th className="py-2.5 px-3 text-center">Inscrições</th>
                    <th className="py-2.5 px-3 text-right">0–30 dias</th>
                    <th className="py-2.5 px-3 text-right">31–60 dias</th>
                    <th className="py-2.5 px-3 text-right">61+ dias</th>
                    <th className="py-2.5 px-3 text-right">Valor Devido</th>
                    <th className="py-2.5 px-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEntries.map(entry => (
                    <tr key={`${entry.clubId}::${entry.creditorClubId}`} className="hover:bg-slate-50/50 transition">
                      {/* Clube Filiado */}
                      <td className="py-3 px-3 font-bold text-slate-800">
                        {entry.clubName}
                      </td>

                      {/* Inscrições (clicável -> abre popup com todas) */}
                      <td className="py-3 px-3 text-center font-mono">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(entry, 'all')}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline decoration-dotted cursor-pointer px-1.5 py-0.5 rounded transition hover:bg-blue-50/50"
                          title="Clique para detalhar todas as inscrições"
                        >
                          {entry.filteredCount}
                        </button>
                      </td>

                      {/* 0-30 dias (clicável -> abre popup da faixa) */}
                      <td className="py-3 px-3 text-right font-mono">
                        {entry.aging[0] > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(entry, 'aging0_30')}
                            className="text-slate-700 hover:text-emerald-700 font-semibold hover:underline decoration-dotted cursor-pointer px-1 py-0.5 rounded transition hover:bg-emerald-50/50"
                            title="Clique para ver inscrições de 0 a 30 dias"
                          >
                            {fmtBrl(entry.aging[0])}
                          </button>
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>

                      {/* 31-60 dias (clicável -> abre popup da faixa) */}
                      <td className="py-3 px-3 text-right font-mono">
                        {entry.aging[1] > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(entry, 'aging31_60')}
                            className="text-amber-700 hover:text-amber-800 font-bold hover:underline decoration-dotted cursor-pointer px-1 py-0.5 rounded transition hover:bg-amber-50/50"
                            title="Clique para ver inscrições de 31 a 60 dias"
                          >
                            {fmtBrl(entry.aging[1])}
                          </button>
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>

                      {/* 61+ dias (clicável -> abre popup da faixa) */}
                      <td className="py-3 px-3 text-right font-mono">
                        {entry.aging[2] > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(entry, 'aging61_plus')}
                            className="text-rose-700 hover:text-rose-900 font-bold hover:underline decoration-dotted cursor-pointer px-1 py-0.5 rounded transition hover:bg-rose-50/50"
                            title="Clique para ver inscrições com 61+ dias de atraso"
                          >
                            {fmtBrl(entry.aging[2])}
                          </button>
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>

                      {/* Valor Devido (clicável -> abre popup com todas) */}
                      <td className="py-3 px-3 text-right font-mono">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(entry, 'all')}
                          className="font-bold text-amber-700 hover:text-amber-900 hover:underline decoration-dotted cursor-pointer px-1 py-0.5 rounded transition hover:bg-amber-50/50"
                          title="Clique para detalhar o valor total devido"
                        >
                          {fmtBrl(entry.filteredTotal)}
                        </button>
                      </td>

                      {/* Ação: Botão Baixar Relatório (removeu Whatsapp e Copiar mensagem) */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDownloadClubSummaryPdf(entry)}
                          disabled={isGeneratingPdf}
                          className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition cursor-pointer shadow-2xs"
                          title={`Baixar relatório completo em PDF de ${entry.clubName}`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Baixar relatório
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Table 2: Histórico de Faturas */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <h5 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">
            Histórico de Faturas Emitidas
          </h5>
          {filteredHistory.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhuma fatura registrada no período selecionado.</p>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-mono">
                    <th className="py-2.5 px-3">Data</th>
                    <th className="py-2.5 px-3">Filiado</th>
                    <th className="py-2.5 px-3 text-right">Valor</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/30 transition">
                      <td className="py-3 px-3 font-mono text-slate-500">{fmtDateBr(inv.createdAt)}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">{inv.clubName}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">{fmtBrl(inv.totalAmount)}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                          inv.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inv.status === 'approved' ? 'Paga' : 'Pendente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Drill-down Detail Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase">
                    Detalhamento
                  </span>
                  <span className="text-xs text-slate-400">• {detailModal.filterLabel}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {detailModal.clubName}
                </h3>
                <p className="text-xs text-slate-500">
                  Total de {detailModal.registrations.length} inscrição(ões) •{' '}
                  <span className="font-mono font-bold text-amber-700">{fmtBrl(detailModal.totalOwed)}</span> devido
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadDetailPdf}
                  disabled={isGeneratingPdf}
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isGeneratingPdf ? 'Gerando...' : 'Gerar PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {detailModal.registrations.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Nenhuma inscrição encontrada para esta faixa.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-mono">
                        <th className="py-2.5 px-3 text-center">#</th>
                        <th className="py-2.5 px-3">Atleta</th>
                        <th className="py-2.5 px-3">Campeonato</th>
                        <th className="py-2.5 px-3">Etapa / Prova</th>
                        <th className="py-2.5 px-3 text-center">Data Inscrição</th>
                        <th className="py-2.5 px-3 text-center">Idade</th>
                        <th className="py-2.5 px-3 text-right">Valor Devido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailModal.registrations.map((reg, idx) => {
                        const days = getDaysSince(reg.registeredAt);
                        const stageDisplay = reg.stageTitle
                          ? (reg.stageNum ? `Etapa ${reg.stageNum} - ${reg.stageTitle}` : reg.stageTitle)
                          : '—';
                        return (
                          <tr key={reg.id || idx} className="hover:bg-slate-50/50 transition">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-800">{reg.athleteName || 'Atleta'}</td>
                            <td className="py-2.5 px-3 text-slate-600">{reg.championshipTitle}</td>
                            <td className="py-2.5 px-3 text-slate-600">
                              <div>{stageDisplay}</div>
                              {reg.modalityName && <span className="text-[10px] text-slate-400 block">{reg.modalityName}</span>}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500">{fmtDateBr(reg.registeredAt)}</td>
                            <td className="py-2.5 px-3 text-center font-mono">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                days > 60 ? 'bg-rose-100 text-rose-800' : days > 30 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {days} dias
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                              {fmtBrl(reg.clubOwedAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-between items-center">
              <span className="text-xs text-slate-500">
                Mostrando {detailModal.registrations.length} registro(s)
              </span>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
