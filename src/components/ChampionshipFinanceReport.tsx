import React, { useMemo, useState } from 'react';
import { ArrowLeft, Search, Trophy } from 'lucide-react';
import { Championship, Modality, Registration, Stage } from '../types';
import { brl, csvNum, downloadCsv } from '../utils/financeReports';
import { computeRevenueBreakdown } from '../utils/championshipFinance';
import { Card, ExportButton, th, td } from './FranchiseReports';

interface ChampionshipFinanceReportProps {
  championships: Championship[];
  stages: Stage[];
  modalities: Modality[];
  registrations: Registration[];
}

const STATUS_LABEL: Record<Championship['status'], string> = {
  draft: 'Rascunho',
  open: 'Aberto',
  completed: 'Encerrado',
};

const statusBadgeClass = (status: Championship['status']) => {
  if (status === 'open') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'completed') return 'bg-slate-100 text-slate-600 border-slate-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
};

// IDs de modalidade na ordem configurada no campeonato (Novo Campeonato),
// com qualquer modalidade extra encontrada nas inscrições anexada ao final
// (nunca deve acontecer, mas não derruba o relatório se acontecer).
function orderedModalityIds(champ: Championship, regs: Registration[]): string[] {
  const ids = [...(champ.modalities || [])];
  for (const r of regs) {
    if (!ids.includes(r.modalityId)) ids.push(r.modalityId);
  }
  return ids;
}

function ModalityBadges({
  champ,
  modalities,
  regs,
}: {
  champ: Championship;
  modalities: Modality[];
  regs: Registration[];
}) {
  const modMap = useMemo(() => new Map(modalities.map(m => [m.id, m])), [modalities]);
  const allIds = useMemo(() => orderedModalityIds(champ, regs), [champ, regs]);
  const usedIds = allIds.filter(id => regs.some(r => r.modalityId === id));

  if (usedIds.length === 0) {
    return <span className="text-slate-300 text-[10px]">—</span>;
  }

  return (
    <div className="flex flex-col gap-1 min-w-[140px]">
      {usedIds.map((id, idx) => {
        const modRegs = regs.filter(r => r.modalityId === id);
        const { totalCount, totalArrecadado } = computeRevenueBreakdown(champ, modRegs);
        const modName = modMap.get(id)?.name || id;
        return (
          <div key={id} className="flex items-center gap-1.5 text-[10px]">
            <span
              title={modName}
              className="inline-flex items-center justify-center bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 font-bold font-mono cursor-help shrink-0"
            >
              M{idx + 1}
            </span>
            <span className="text-slate-500 font-mono whitespace-nowrap">
              {totalCount} insc. | {brl(totalArrecadado)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function ChampionshipFinanceReport({
  championships,
  stages,
  modalities,
  registrations,
}: ChampionshipFinanceReportProps) {
  const [query, setQuery] = useState('');
  const [selectedChampId, setSelectedChampId] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const champRows = useMemo(() => {
    return championships
      .map(champ => {
        const regs = registrations.filter(r => r.championshipId === champ.id);
        const breakdown = computeRevenueBreakdown(champ, regs);
        return { champ, regs, breakdown };
      })
      .filter(row => !normalizedQuery || row.champ.title.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => (b.champ.startDate || '').localeCompare(a.champ.startDate || ''));
  }, [championships, registrations, normalizedQuery]);

  const totals = useMemo(() => {
    return champRows.reduce(
      (acc, row) => {
        acc.totalCount += row.breakdown.totalCount;
        acc.totalArrecadado += row.breakdown.totalArrecadado;
        acc.vTributos += row.breakdown.vTributos;
        acc.vOrganizacao += row.breakdown.vOrganizacao;
        acc.vClubes += row.breakdown.vClubes;
        acc.vPremiacaoAtleta += row.breakdown.vPremiacaoAtleta;
        return acc;
      },
      { totalCount: 0, totalArrecadado: 0, vTributos: 0, vOrganizacao: 0, vClubes: 0, vPremiacaoAtleta: 0 }
    );
  }, [champRows]);

  const selectedChamp = selectedChampId ? championships.find(c => c.id === selectedChampId) || null : null;

  const stageRows = useMemo(() => {
    if (!selectedChamp) return [];
    return stages
      .filter(s => s.championshipId === selectedChamp.id)
      .sort((a, b) => a.stageNum - b.stageNum)
      .map(stage => {
        const regs = registrations.filter(r => r.championshipId === selectedChamp.id && r.stageId === stage.id);
        const breakdown = computeRevenueBreakdown(selectedChamp, regs);
        return { stage, regs, breakdown };
      });
  }, [selectedChamp, stages, registrations]);

  const exportChampList = () => {
    downloadCsv(
      'premiacao_campeonatos.csv',
      ['Campeonato', 'Status', 'Total Inscrições', 'Total Arrecadado', 'Tributos', 'Organização', 'Clubes', 'Atletas'],
      champRows.map(row => [
        row.champ.title,
        STATUS_LABEL[row.champ.status],
        row.breakdown.totalCount,
        csvNum(row.breakdown.totalArrecadado),
        csvNum(row.breakdown.vTributos),
        csvNum(row.breakdown.vOrganizacao),
        csvNum(row.breakdown.vClubes),
        csvNum(row.breakdown.vPremiacaoAtleta),
      ])
    );
  };

  const exportStageList = () => {
    if (!selectedChamp) return;
    downloadCsv(
      `premiacao_${selectedChamp.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40)}.csv`,
      ['Etapa', 'Total Inscrições', 'Total Arrecadado', 'Tributos', 'Organização', 'Clubes', 'Atletas'],
      stageRows.map(row => [
        row.stage.title,
        row.breakdown.totalCount,
        csvNum(row.breakdown.totalArrecadado),
        csvNum(row.breakdown.vTributos),
        csvNum(row.breakdown.vOrganizacao),
        csvNum(row.breakdown.vClubes),
        csvNum(row.breakdown.vPremiacaoAtleta),
      ])
    );
  };

  if (selectedChamp) {
    const totalBreakdown = computeRevenueBreakdown(
      selectedChamp,
      registrations.filter(r => r.championshipId === selectedChamp.id)
    );
    return (
      <div className="space-y-6 text-left">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSelectedChampId(null)}
                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 border border-blue-200 transition cursor-pointer"
                title="Voltar para campeonatos"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">{selectedChamp.title}</h3>
                <p className="text-xs text-slate-400">Divisão financeira por etapa.</p>
              </div>
            </div>
            <ExportButton onClick={exportStageList} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card label="Total Arrecadado" value={brl(totalBreakdown.totalArrecadado)} sub={`${totalBreakdown.totalCount} inscrições`} tone="emerald" />
            <Card label="Tributos" value={brl(totalBreakdown.vTributos)} sub={`${totalBreakdown.percentualTributos}%`} tone="slate" />
            <Card label="Organização" value={brl(totalBreakdown.vOrganizacao)} sub={`${totalBreakdown.percentualOrganizacao}%`} tone="slate" />
            <Card label="Clubes" value={brl(totalBreakdown.vClubes)} sub={`${totalBreakdown.percentualClubes}%`} tone="blue" />
            <Card label="Atletas" value={brl(totalBreakdown.vPremiacaoAtleta)} sub={`${totalBreakdown.percentualPremiacaoAtleta}%`} tone="amber" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className={th}>Etapa</th>
                  <th className={`${th} text-center`}>Inscrições</th>
                  <th className={`${th} text-right`}>Arrecadado</th>
                  <th className={`${th} text-right`}>Tributos</th>
                  <th className={`${th} text-right`}>Organização</th>
                  <th className={`${th} text-right`}>Clubes</th>
                  <th className={`${th} text-right`}>Atletas</th>
                  <th className={th}>Modalidades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      Nenhuma etapa cadastrada para este campeonato.
                    </td>
                  </tr>
                ) : (
                  stageRows.map(({ stage, regs, breakdown }) => (
                    <tr key={stage.id} className="hover:bg-slate-50/50 align-top">
                      <td className={`${td} font-bold text-slate-800`}>{stage.title}</td>
                      <td className={`${td} text-center font-mono`}>{breakdown.totalCount}</td>
                      <td className={`${td} text-right font-mono font-bold text-emerald-600`}>{brl(breakdown.totalArrecadado)}</td>
                      <td className={`${td} text-right font-mono`}>{brl(breakdown.vTributos)}</td>
                      <td className={`${td} text-right font-mono`}>{brl(breakdown.vOrganizacao)}</td>
                      <td className={`${td} text-right font-mono`}>{brl(breakdown.vClubes)}</td>
                      <td className={`${td} text-right font-mono`}>{brl(breakdown.vPremiacaoAtleta)}</td>
                      <td className={td}>
                        <ModalityBadges champ={selectedChamp} modalities={modalities} regs={regs} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base">Premiação Campeonatos</h3>
            <p className="text-xs text-slate-400">Relatório financeiro visual: arrecadação e divisão de valores de cada campeonato.</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card label="Total Arrecadado" value={brl(totals.totalArrecadado)} sub={`${champRows.length} campeonatos`} tone="emerald" />
          <Card label="Tributos" value={brl(totals.vTributos)} tone="slate" />
          <Card label="Organização" value={brl(totals.vOrganizacao)} tone="slate" />
          <Card label="Clubes" value={brl(totals.vClubes)} tone="blue" />
          <Card label="Atletas" value={brl(totals.vPremiacaoAtleta)} tone="amber" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-100">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar campeonato..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
          <ExportButton onClick={exportChampList} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className={th}>Campeonato</th>
                <th className={`${th} text-center`}>Inscrições</th>
                <th className={`${th} text-right`}>Arrecadado</th>
                <th className={`${th} text-right`}>Tributos</th>
                <th className={`${th} text-right`}>Organização</th>
                <th className={`${th} text-right`}>Clubes</th>
                <th className={`${th} text-right`}>Atletas</th>
                <th className={th}>Modalidades</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {champRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    Nenhum campeonato encontrado.
                  </td>
                </tr>
              ) : (
                champRows.map(({ champ, regs, breakdown }) => (
                  <tr key={champ.id} className="hover:bg-slate-50/50 align-top">
                    <td className={td}>
                      <button
                        onClick={() => setSelectedChampId(champ.id)}
                        className="font-bold text-blue-700 hover:underline cursor-pointer text-left"
                      >
                        {champ.title}
                      </button>
                      <div className="mt-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${statusBadgeClass(champ.status)}`}>
                          {STATUS_LABEL[champ.status]}
                        </span>
                      </div>
                    </td>
                    <td className={`${td} text-center font-mono`}>{breakdown.totalCount}</td>
                    <td className={`${td} text-right font-mono font-bold text-emerald-600`}>{brl(breakdown.totalArrecadado)}</td>
                    <td className={`${td} text-right font-mono`}>{brl(breakdown.vTributos)}</td>
                    <td className={`${td} text-right font-mono`}>{brl(breakdown.vOrganizacao)}</td>
                    <td className={`${td} text-right font-mono`}>{brl(breakdown.vClubes)}</td>
                    <td className={`${td} text-right font-mono`}>{brl(breakdown.vPremiacaoAtleta)}</td>
                    <td className={td}>
                      <ModalityBadges champ={champ} modalities={modalities} regs={regs} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
