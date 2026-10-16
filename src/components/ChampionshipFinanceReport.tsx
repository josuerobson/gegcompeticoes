import React, { useMemo, useState } from 'react';
import { ArrowLeft, Award, Search, Trophy } from 'lucide-react';
import { Championship, Modality, Registration, Stage } from '../types';
import { brl, csvNum, downloadCsv } from '../utils/financeReports';
import { computeRevenueBreakdown, computeTodasEtapasPrize } from '../utils/championshipFinance';
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

function SelectedChampView({
  selectedChamp,
  registrations,
  modalities,
  stages,
  onBack,
}: {
  selectedChamp: Championship;
  registrations: Registration[];
  modalities: Modality[];
  stages: Stage[];
  onBack: () => void;
}) {
  const totalBreakdown = useMemo(
    () =>
      computeRevenueBreakdown(
        selectedChamp,
        registrations.filter(r => r.championshipId === selectedChamp.id)
      ),
    [selectedChamp, registrations]
  );

  const champPrize = useMemo(
    () => computeTodasEtapasPrize(selectedChamp, totalBreakdown.vPremiacaoAtleta),
    [selectedChamp, totalBreakdown.vPremiacaoAtleta]
  );

  const usedModalities = useMemo(() => {
    const champRegs = registrations.filter(r => r.championshipId === selectedChamp.id);
    const modMap = new Map(modalities.map(m => [m.id, m]));
    const allIds = orderedModalityIds(selectedChamp, champRegs);
    const vAdicional = selectedChamp.premiacaoAdicionalTodasEtapas ?? 0;
    const totalArrecadadoChamp = totalBreakdown.totalArrecadado;

    return allIds
      .filter(id => champRegs.some(r => r.modalityId === id))
      .map((id, idx) => {
        const mod = modMap.get(id);
        const modRegs = champRegs.filter(r => r.modalityId === id);
        const breakdown = computeRevenueBreakdown(selectedChamp, modRegs);
        const additionalForMod =
          totalArrecadadoChamp > 0 && vAdicional > 0
            ? vAdicional * (breakdown.totalArrecadado / totalArrecadadoChamp)
            : 0;
        const prize = computeTodasEtapasPrize(selectedChamp, breakdown.vPremiacaoAtleta, additionalForMod);
        return {
          id,
          badge: `M${idx + 1}`,
          name: mod?.name || id,
          regsCount: modRegs.length,
          arrecadado: breakdown.totalArrecadado,
          pool: prize.vPoolTodasEtapas,
          prize,
        };
      });
  }, [selectedChamp, registrations, modalities, totalBreakdown]);

  const stageRows = useMemo(() => {
    return stages
      .filter(s => s.championshipId === selectedChamp.id)
      .sort((a, b) => a.stageNum - b.stageNum)
      .map(stage => {
        const regs = registrations.filter(r => r.championshipId === selectedChamp.id && r.stageId === stage.id);
        const breakdown = computeRevenueBreakdown(selectedChamp, regs);
        return { stage, regs, breakdown };
      });
  }, [selectedChamp, stages, registrations]);

  const exportStageList = () => {
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

  const exportTodasEtapasPrizes = () => {
    const headers = ['Colocação', '% Premiação', 'Total Geral', ...usedModalities.map(m => `${m.badge} - ${m.name}`)];
    const rows = champPrize.prizes.map((p, idx) => [
      `${p.position}º Lugar`,
      `${p.percent}%`,
      csvNum(p.value),
      ...usedModalities.map(m => csvNum(m.prize.prizes[idx]?.value || 0)),
    ]);
    rows.push([
      'Total',
      `${champPrize.prizes.reduce((acc, p) => acc + p.percent, 0)}%`,
      csvNum(champPrize.vPoolTodasEtapas),
      ...usedModalities.map(m => csvNum(m.pool)),
    ]);
    downloadCsv(
      `premiacao_todas_etapas_${selectedChamp.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 35)}.csv`,
      headers,
      rows
    );
  };

  return (
    <div className="space-y-6 text-left">
      {/* Resumo Financeiro do Campeonato */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 border border-blue-200 transition cursor-pointer"
              title="Voltar para campeonatos"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-base">{selectedChamp.title}</h3>
              <p className="text-xs text-slate-400">Divisão financeira por etapa e premiações acumuladas.</p>
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

      {/* BLOCO: PREMIAÇÕES REFERENTE A TODAS AS ETAPAS CONFORME REGRAS DE PREMIAÇÃO DE ATLETAS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/60 mt-0.5 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-display font-bold text-slate-900 text-base">Premiações — Todas as Etapas</h4>
                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded px-2 py-0.5">
                  Ranking Acumulado
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Premiação dos atletas no ranking acumulado de todas as etapas conforme regras e percentuais configurados.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5">
              <span className="text-slate-400">Fatia Atletas:</span>
              <span className="font-bold text-slate-800 font-mono">{champPrize.pTodasEtapasSlice}%</span>
            </div>
            {champPrize.vAdicionalTodasEtapas > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5">
                <span className="text-emerald-600">Adicional:</span>
                <span className="font-bold text-emerald-700 font-mono">+{brl(champPrize.vAdicionalTodasEtapas)}</span>
              </div>
            )}
            {Boolean(selectedChamp.qtdEtapasConsideradas) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5">
                <span className="text-blue-600">Etapas:</span>
                <span className="font-bold text-blue-800 font-mono">{selectedChamp.qtdEtapasConsideradas}</span>
                {Boolean(selectedChamp.qtdPioresDescartar || selectedChamp.qtdMelhoresDescartar) && (
                  <span className="text-[10px] text-blue-500 font-normal">
                    (desc. {selectedChamp.qtdPioresDescartar ? `${selectedChamp.qtdPioresDescartar} pior` : ''}
                    {selectedChamp.qtdPioresDescartar && selectedChamp.qtdMelhoresDescartar ? ', ' : ''}
                    {selectedChamp.qtdMelhoresDescartar ? `${selectedChamp.qtdMelhoresDescartar} melhor` : ''})
                  </span>
                )}
              </div>
            )}
            <div className="bg-amber-500 text-white rounded-xl px-3.5 py-1.5 text-xs font-bold font-mono shadow-xs">
              Pool Geral: {brl(champPrize.vPoolTodasEtapas)}
            </div>
            <ExportButton onClick={exportTodasEtapasPrizes} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-slate-700">
                <th className={`${th} w-32`}>Colocação</th>
                <th className={`${th} text-center w-24`}>% Premiação</th>
                <th className={`${th} text-right font-bold text-slate-900 bg-emerald-50/60`}>Total Geral</th>
                {usedModalities.map((m) => (
                  <th key={m.id} className={`${th} text-right`}>
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 border border-blue-300 rounded px-1.5 py-0.5 font-mono font-bold text-[10px]">
                        {m.badge}
                      </span>
                      <span className="truncate max-w-[140px] font-semibold" title={m.name}>
                        {m.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono font-normal">
                      Pool: {brl(m.pool)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {champPrize.prizes.map((p, idx) => (
                <tr key={p.position} className="hover:bg-slate-50/50">
                  <td className={`${td} font-bold text-slate-800`}>
                    <div className="flex items-center gap-2">
                      {idx === 0 ? (
                        <span className="inline-flex items-center justify-center bg-amber-100 text-amber-800 border border-amber-300 w-5 h-5 rounded-full font-bold text-[10px]">
                          1º
                        </span>
                      ) : idx === 1 ? (
                        <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 border border-slate-300 w-5 h-5 rounded-full font-bold text-[10px]">
                          2º
                        </span>
                      ) : idx === 2 ? (
                        <span className="inline-flex items-center justify-center bg-amber-50 text-amber-900 border border-amber-200 w-5 h-5 rounded-full font-bold text-[10px]">
                          3º
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center bg-slate-50 text-slate-600 border border-slate-200 w-5 h-5 rounded-full font-bold text-[10px]">
                          {idx + 1}º
                        </span>
                      )}
                      <span>{p.position}º Lugar</span>
                    </div>
                  </td>
                  <td className={`${td} text-center font-mono font-semibold text-slate-600`}>
                    {p.percent}%
                  </td>
                  <td className={`${td} text-right font-mono font-bold text-emerald-600 bg-emerald-50/30`}>
                    {brl(p.value)}
                  </td>
                  {usedModalities.map((m) => {
                    const modVal = m.prize.prizes[idx]?.value || 0;
                    return (
                      <td key={m.id} className={`${td} text-right font-mono font-medium text-slate-800`}>
                        {brl(modVal)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-bold text-slate-900">
                <td className={td}>Total</td>
                <td className={`${td} text-center font-mono`}>
                  {champPrize.prizes.reduce((acc, p) => acc + p.percent, 0)}%
                </td>
                <td className={`${td} text-right font-mono text-emerald-700 bg-emerald-50/50`}>
                  {brl(champPrize.vPoolTodasEtapas)}
                </td>
                {usedModalities.map((m) => (
                  <td key={m.id} className={`${td} text-right font-mono text-slate-900`}>
                    {brl(m.pool)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tabela de Etapas */}
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

  if (selectedChamp) {
    return (
      <SelectedChampView
        selectedChamp={selectedChamp}
        registrations={registrations}
        modalities={modalities}
        stages={stages}
        onBack={() => setSelectedChampId(null)}
      />
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
