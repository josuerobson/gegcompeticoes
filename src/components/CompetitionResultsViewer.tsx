import React, { useState, useEffect } from 'react';
import { Championship, Stage, Modality, Registration, StageScore, Club, User } from '../types';
import { Trophy, Calendar, Activity, ArrowLeft } from 'lucide-react';

export interface CompetitionResultsViewerProps {
  championships: Championship[];
  stages: Stage[];
  modalities: Modality[];
  registrations: Registration[];
  stageScores: StageScore[];
  clubs: Club[];
  users?: User[];
  currentUser?: User | null;
  initialChampId?: string | null;
  initialStageId?: string | null;
  initialModalityId?: string | null;
}

export function CompetitionResultsViewer({
  championships,
  stages,
  modalities,
  registrations,
  stageScores,
  clubs,
  users = [],
  currentUser,
  initialChampId = null,
  initialStageId = null,
  initialModalityId = null,
}: CompetitionResultsViewerProps) {
  const [selectedResultChampId, setSelectedResultChampId] = useState<string | null>(initialChampId);
  const [selectedResultStageId, setSelectedResultStageId] = useState<string | null>(initialStageId);
  const [selectedResultModalityId, setSelectedResultModalityId] = useState<string | null>(initialModalityId);
  const [selectedMedalFilter, setSelectedMedalFilter] = useState<'geral' | 'ouro' | 'prata' | 'bronze'>('geral');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>(() => String(new Date().getFullYear()));

  // Reset medal filter when selection changes
  useEffect(() => {
    setSelectedMedalFilter('geral');
  }, [selectedResultChampId, selectedResultStageId, selectedResultModalityId]);

  const currentChamp = championships.find(c => c.id === selectedResultChampId);
  const currentStage = stages.find(s => s.id === selectedResultStageId);
  const currentMod = modalities.find(m => m.id === selectedResultModalityId);

  // 1. Sem campeonato selecionado: exibe a lista de campeonatos em cards
  if (!selectedResultChampId) {
    const clubChamps = championships.filter(c => !c.clubId || !currentUser?.clubId || c.clubId === currentUser?.clubId);
    const allDisplayChamps = clubChamps.length > 0 ? clubChamps : championships;

    const availableYears = Array.from(
      new Set(allDisplayChamps.map(c => new Date(c.startDate).getFullYear()).filter(y => !isNaN(y)))
    ).sort((a, b) => b - a);
    const displayChamps = selectedYearFilter === 'todos'
      ? allDisplayChamps
      : allDisplayChamps.filter(c => new Date(c.startDate).getFullYear().toString() === selectedYearFilter);

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base">Resultados de Campeonatos</h3>
            <p className="text-xs text-slate-400">Selecione um campeonato para visualizar notas, passagens de pista e rankings.</p>
          </div>
          <Trophy className="w-5 h-5 text-blue-600" />
        </div>

        {/* Filtro por ano */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedYearFilter('todos')}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${selectedYearFilter === 'todos' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Todos
          </button>
          {availableYears.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYearFilter(year.toString())}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${selectedYearFilter === year.toString() ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {year}
            </button>
          ))}
        </div>

        {displayChamps.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Nenhum campeonato encontrado {selectedYearFilter !== 'todos' ? `em ${selectedYearFilter}` : 'no sistema ainda'}.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {displayChamps.map((champ) => {
              const totalInscritos = registrations.filter(r => r.championshipId === champ.id).length;
              return (
                <div
                  key={champ.id}
                  onClick={() => setSelectedResultChampId(champ.id)}
                  className="group border border-slate-200 rounded-xl p-3 bg-slate-50/30 hover:bg-white hover:border-blue-400 hover:shadow-md transition duration-200 cursor-pointer flex flex-col justify-between space-y-2.5"
                >
                  <div className="space-y-1">
                    <div className="flex justify-between items-center gap-1">
                      <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase ${champ.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                        {champ.status === 'open' ? 'Aberto' : champ.status === 'completed' ? 'Finalizado' : 'Rascunho'}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-xs group-hover:text-blue-600 transition line-clamp-2 mt-1 leading-snug">
                      {champ.title}
                    </h4>
                  </div>

                  <div className="flex justify-between items-center text-[9.5px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                    <span>Etapas: <strong className="text-slate-700">{champ.stagesCount}</strong></span>
                    <span>Inscritos: <strong className="text-slate-700">{totalInscritos}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 2. Com campeonato selecionado, mas sem etapa selecionada: exibe a lista de etapas
  if (!selectedResultStageId) {
    const champStages = stages.filter(s => s.championshipId === selectedResultChampId);
    const hasMasculino = champStages.some(s => (s.sexo || 'misto') === 'masculino');
    const hasFeminino = champStages.some(s => (s.sexo || 'misto') === 'feminino');
    const hasMisto = champStages.some(s => (s.sexo || 'misto') === 'misto');

    const allOptions = [
      hasMasculino && { id: 'all_masculino', title: 'Todas as etapas Masculinas', badge: 'Masculino', color: 'bg-blue-600', hoverBg: 'hover:bg-blue-50/50 hover:border-blue-400' },
      hasFeminino && { id: 'all_feminino', title: 'Todas as etapas Femininas', badge: 'Feminino', color: 'bg-pink-600', hoverBg: 'hover:bg-pink-50/50 hover:border-pink-400' },
      hasMisto && { id: 'all_misto', title: 'Todas as etapas Mistas', badge: 'Misto', color: 'bg-purple-600', hoverBg: 'hover:bg-purple-50/50 hover:border-purple-400' },
      (!hasMasculino && !hasFeminino && !hasMisto) && { id: 'all', title: 'Todas as etapas', badge: 'Geral', color: 'bg-slate-700', hoverBg: 'hover:bg-slate-50 hover:border-slate-400' }
    ].filter(Boolean) as Array<{ id: string; title: string; badge: string; color: string; hoverBg: string }>;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedResultChampId(null)}
              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 border border-blue-200 transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-base">Selecione a Etapa</h3>
              <p className="text-xs text-slate-400">Campeonato: <strong className="text-slate-700">{currentChamp?.title}</strong></p>
            </div>
          </div>
          <Calendar className="w-5 h-5 text-blue-600" />
        </div>

        {champStages.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs space-y-3">
            <p>Nenhuma etapa cadastrada para este campeonato ainda.</p>
            <button
              onClick={() => setSelectedResultChampId(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
            >
              Voltar aos Campeonatos
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {allOptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider text-[10px]">Resultados Acumulados (Todas as Etapas):</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {allOptions.map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setSelectedResultStageId(opt.id)}
                      className={`border border-slate-200 ${opt.hoverBg} rounded-xl p-4 transition duration-150 cursor-pointer space-y-2 flex flex-col justify-between shadow-2xs group bg-slate-50/40`}
                    >
                      <div>
                        <span className={`${opt.color} text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider`}>
                          {opt.badge}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs mt-2 group-hover:text-blue-600 transition">{opt.title}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">Consolidado de todas as etapas</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider text-[10px]">Ou selecione uma etapa individual:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {champStages.map((stage) => (
                  <div
                    key={stage.id}
                    onClick={() => setSelectedResultStageId(stage.id)}
                    className="border border-slate-200 hover:border-blue-400 hover:bg-blue-50/5 rounded-xl p-4 transition duration-150 cursor-pointer space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {stage.title || `${stage.stageNum}ª ETAPA`}
                      </span>
                      {stage.title && stage.title !== (stage.title || `${stage.stageNum}ª ETAPA`) && (
                        <h4 className="font-bold text-slate-800 text-xs mt-2">{stage.title}</h4>
                      )}
                      {stage.description && (
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{stage.description}</p>
                      )}
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 pt-2 border-t border-slate-100 flex justify-between">
                      <span>Realização:</span>
                      <strong className="text-slate-700">{new Date(stage.date).toLocaleDateString()}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Com campeonato e etapa selecionados, mas sem modalidade: exibe a lista de modalidades
  const isAllOption = selectedResultStageId?.startsWith('all');
  const stageTitle = selectedResultStageId === 'all_masculino'
    ? 'Todas as etapas Masculinas'
    : selectedResultStageId === 'all_feminino'
    ? 'Todas as etapas Femininas'
    : selectedResultStageId === 'all_misto'
    ? 'Todas as etapas Mistas'
    : selectedResultStageId === 'all'
    ? 'Todas as etapas'
    : currentStage?.title || `Etapa ${currentStage?.stageNum}`;

  if (!selectedResultModalityId) {
    let champModIds: string[] = [];
    if (currentChamp?.modalities) {
      if (Array.isArray(currentChamp.modalities)) {
        champModIds = currentChamp.modalities;
      } else if (typeof currentChamp.modalities === 'string') {
        try {
          champModIds = JSON.parse(currentChamp.modalities);
        } catch (_) {}
      }
    }
    const champModalities = modalities.filter(m => champModIds.includes(m.id));

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedResultStageId(null)}
              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 border border-blue-200 transition cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-base">Selecione a Modalidade</h3>
              <p className="text-xs text-slate-400">
                Campeonato: <strong className="text-slate-700">{currentChamp?.title}</strong> • {stageTitle}
              </p>
            </div>
          </div>
          <Activity className="w-5 h-5 text-blue-600" />
        </div>

        {champModalities.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs space-y-3">
            <p>Nenhuma modalidade vinculada a este campeonato ainda.</p>
            <button
              onClick={() => setSelectedResultStageId(null)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer"
            >
              Voltar às Etapas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {champModalities.map((mod) => (
              <div
                key={mod.id}
                onClick={() => setSelectedResultModalityId(mod.id)}
                className="border border-slate-200 hover:border-blue-400 hover:bg-blue-50/5 rounded-xl p-4 transition duration-150 cursor-pointer space-y-2 flex flex-col justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">{mod.name}</h4>
                  {mod.discipline && (
                    <p className="text-[10px] text-slate-400 mt-1">{mod.discipline}</p>
                  )}
                </div>
                <div className="text-[9px] font-mono text-slate-500 pt-2 border-t border-slate-100 space-y-1">
                  <div className="flex justify-between">
                    <span>Avaliação:</span>
                    <span className="font-bold text-slate-700 capitalize">
                      {mod.evaluationType === 'pontuacao' ? 'Pontos' : mod.evaluationType === 'tempo' ? 'Tempo' : 'Fator (Pontos/Tempo)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Séries / Tiros:</span>
                    <span className="font-bold text-slate-700">
                      {mod.seriesCount} séries × {mod.shotsPerSeries} tiros
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 4. Com tudo selecionado: exibe a tabela de resultados (Individual ou Acumulada "Todas as Etapas")
  const champStages = stages.filter(s => s.championshipId === selectedResultChampId);
  let targetStages: Stage[] = [];
  if (selectedResultStageId === 'all_masculino') {
    targetStages = champStages.filter(s => (s.sexo || 'misto') === 'masculino');
  } else if (selectedResultStageId === 'all_feminino') {
    targetStages = champStages.filter(s => (s.sexo || 'misto') === 'feminino');
  } else if (selectedResultStageId === 'all_misto') {
    targetStages = champStages.filter(s => (s.sexo || 'misto') === 'misto');
  } else if (selectedResultStageId === 'all') {
    targetStages = champStages;
  } else if (currentStage) {
    targetStages = [currentStage];
  }

  const targetStageNums = new Set(targetStages.map(s => s.stageNum));

  // Helper to compare two scores for ranking/tie-breakers
  const compareScorePerformance = (a: StageScore, b: StageScore): number => {
    if (currentMod?.evaluationType === 'tempo') {
      return (a.timeSeconds || 0) - (b.timeSeconds || 0);
    } else if (currentMod?.evaluationType === 'pontuacao_tempo') {
      return (b.hitFactor || 0) - (a.hitFactor || 0);
    } else {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const regA = registrations.find(r => r.id === a.registrationId);
      const regB = registrations.find(r => r.id === b.registrationId);
      if (regA && regB) {
        if ((regB.scoreX || 0) !== (regA.scoreX || 0)) {
          return (regB.scoreX || 0) - (regA.scoreX || 0);
        }
        if ((regB.scoreP10 || 0) !== (regA.scoreP10 || 0)) {
          return (regB.scoreP10 || 0) - (regA.scoreP10 || 0);
        }
        if ((regB.scoreP9 || 0) !== (regA.scoreP9 || 0)) {
          return (regB.scoreP9 || 0) - (regA.scoreP9 || 0);
        }
      }
      return 0;
    }
  };

  // --- Lógica para opção Acumulada "Todas as Etapas" ---
  if (isAllOption) {
    type ConsolidatedScore = {
      userId: string;
      shooterName: string;
      clubName: string;
      totalScore: number;
      totalTime: number;
      hitFactor: number;
      scoreX: number;
      scoreP10: number;
      scoreP9: number;
      stageScores: Record<number, number>;
    };

    const scoresForMod = stageScores.filter(score =>
      score.championshipId === selectedResultChampId &&
      score.modality === currentMod?.name &&
      targetStageNums.has(score.stageNum)
    );

    // Group by athlete and stage to pick only the best score per stage for each athlete (reinscrições)
    const athleteStageBestMap: Record<string, Record<number, StageScore>> = {};
    for (const score of scoresForMod) {
      const uId = score.userId || (score.shooterName ? score.shooterName.trim().toLowerCase() : 'unknown');
      if (!athleteStageBestMap[uId]) {
        athleteStageBestMap[uId] = {};
      }
      const existing = athleteStageBestMap[uId][score.stageNum];
      if (!existing) {
        athleteStageBestMap[uId][score.stageNum] = score;
      } else {
        if (compareScorePerformance(score, existing) < 0) {
          athleteStageBestMap[uId][score.stageNum] = score;
        }
      }
    }

    const userMap: Record<string, ConsolidatedScore> = {};

    for (const [uId, stageMap] of Object.entries(athleteStageBestMap)) {
      const bestStageList = Object.values(stageMap);
      if (bestStageList.length === 0) continue;

      const firstScore = bestStageList[0];
      const u = users.find(usr => usr.id === firstScore.userId);
      const cName = clubs.find(c => c.id === u?.clubId)?.name || '-';

      userMap[uId] = {
        userId: firstScore.userId,
        shooterName: firstScore.shooterName,
        clubName: cName,
        totalScore: 0,
        totalTime: 0,
        hitFactor: 0,
        scoreX: 0,
        scoreP10: 0,
        scoreP9: 0,
        stageScores: {},
      };

      for (const score of bestStageList) {
        userMap[uId].stageScores[score.stageNum] = score.score;
        userMap[uId].totalScore += (score.score || 0);
        userMap[uId].totalTime += (score.timeSeconds || 0);
        if (score.hitFactor) {
          userMap[uId].hitFactor = Math.max(userMap[uId].hitFactor, score.hitFactor);
        }

        const reg = registrations.find(r => r.id === score.registrationId);
        if (reg) {
          userMap[uId].scoreX += (reg.scoreX || 0);
          userMap[uId].scoreP10 += (reg.scoreP10 || 0);
          userMap[uId].scoreP9 += (reg.scoreP9 || 0);
        }
      }
    }

    const consolidatedList = Object.values(userMap).sort((a, b) => {
      if (currentMod?.evaluationType === 'tempo') {
        return a.totalTime - b.totalTime;
      } else if (currentMod?.evaluationType === 'pontuacao_tempo') {
        return b.hitFactor - a.hitFactor;
      } else {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        if (b.scoreX !== a.scoreX) return b.scoreX - a.scoreX;
        if (b.scoreP10 !== a.scoreP10) return b.scoreP10 - a.scoreP10;
        if (b.scoreP9 !== a.scoreP9) return b.scoreP9 - a.scoreP9;
        return 0;
      }
    });

    // Premiação por colocação no acumulado "Todas as Etapas" — mesma fórmula
    // usada no modal de Premiação em ChampionshipsView.tsx (mantém alinhado
    // para não haver dois cálculos de prêmio divergentes no sistema).
    const targetStageIds = targetStages.map(s => s.id);
    const stageModRegs = registrations.filter(
      r => r.championshipId === selectedResultChampId && r.modalityId === currentMod?.id && targetStageIds.includes(r.stageId)
    );
    const totalArrecadado = stageModRegs.reduce((acc, r) => {
      if (r.valorPago && r.valorPago > 0 && r.valorPago !== 120) return acc + r.valorPago;
      if (r.registrationType === 'reinscrição') {
        return acc + (currentChamp?.valorReinscricao ?? currentChamp?.registrationFee ?? 0);
      }
      const isClub = Boolean(r.registeredByUserId && r.registeredByUserId !== r.userId);
      if (isClub) {
        return acc + (currentChamp?.valorInscricaoClube ?? currentChamp?.registrationFee ?? 0);
      }
      return acc + (currentChamp?.valorInscricaoIndividual ?? currentChamp?.registrationFee ?? 0);
    }, 0);
    const pPremiacaoAtleta = currentChamp?.percentualPremiacaoAtleta ?? 30;
    const vPremiacaoAtleta = totalArrecadado * (pPremiacaoAtleta / 100);
    const vAdicionalTodasEtapas = currentChamp?.premiacaoAdicionalTodasEtapas ?? 0;
    const pTodasEtapasSlice = currentChamp?.percentualPremiacaoTodasEtapas ?? 30;
    const vPoolTodasEtapas = (vPremiacaoAtleta * (pTodasEtapasSlice / 100)) + vAdicionalTodasEtapas;
    const pPosTodas = [
      currentChamp?.percentualPos1TodasEtapas ?? 40,
      currentChamp?.percentualPos2TodasEtapas ?? 25,
      currentChamp?.percentualPos3TodasEtapas ?? 15,
      currentChamp?.percentualPos4TodasEtapas ?? 12,
      currentChamp?.percentualPos5TodasEtapas ?? 8
    ];
    const prizeForPosition = (index: number) => index >= 0 && index <= 4 ? vPoolTodasEtapas * (pPosTodas[index] / 100) : 0;
    const fmtBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
        {/* Header / Breadcrumb navigation */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedResultModalityId(null)}
              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 border border-blue-200 transition cursor-pointer"
              title="Voltar para modalidades"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-base">Resultado Geral Acumulado</h3>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-450 mt-0.5">
                <span className="hover:underline cursor-pointer" onClick={() => { setSelectedResultChampId(null); setSelectedResultStageId(null); setSelectedResultModalityId(null); }}>{currentChamp?.title}</span>
                <span>/</span>
                <span className="hover:underline cursor-pointer font-bold text-blue-600" onClick={() => { setSelectedResultStageId(null); setSelectedResultModalityId(null); }}>{stageTitle}</span>
                <span>/</span>
                <span className="font-semibold text-slate-700">{currentMod?.name}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedResultChampId(null);
                setSelectedResultStageId(null);
                setSelectedResultModalityId(null);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] px-3 py-1.5 rounded-xl font-bold transition cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Results Table for All Stages */}
        {consolidatedList.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Nenhum resultado homologado para {stageTitle.toLowerCase()} nesta modalidade ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="py-3 px-2 text-center w-12">Pos</th>
                  <th className="py-3 px-2">Atleta</th>
                  <th className="py-3 px-2 text-center">Clube</th>
                  {targetStages.map(stg => (
                    <th key={stg.id} className="py-3 px-2 text-center font-mono">{stg.title || `${stg.stageNum}ª ET`}</th>
                  ))}
                  <th className="py-3 px-2 text-right font-bold text-slate-800">Resultado Acumulado</th>
                  <th className="py-3 px-2 text-center w-24">Desempates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {consolidatedList.map((item, index) => {
                  return (
                    <tr key={item.userId || index} className="hover:bg-slate-50/50">
                      <td className="py-3 px-2 text-center font-bold font-mono">
                        {index === 0 ? (
                          <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold w-5 h-5 rounded-full leading-5 text-center">1º</span>
                        ) : index === 1 ? (
                          <span className="inline-block bg-slate-100 text-slate-800 text-[10px] font-bold w-5 h-5 rounded-full leading-5 text-center">2º</span>
                        ) : index === 2 ? (
                          <span className="inline-block bg-amber-50 text-amber-700 text-[10px] font-bold w-5 h-5 rounded-full leading-5 text-center">3º</span>
                        ) : (
                          `${index + 1}º`
                        )}
                      </td>
                      <td className="py-3 px-2 font-bold text-slate-800">
                        {item.shooterName}
                        {prizeForPosition(index) > 0 && (
                          <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
                            Prêmio: {fmtBRL(prizeForPosition(index))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-500 font-mono text-[10px]">
                        {item.clubName}
                      </td>
                      {targetStages.map(stg => (
                        <td key={stg.id} className="py-3 px-2 text-center font-mono font-semibold text-slate-600">
                          {item.stageScores[stg.stageNum] !== undefined ? item.stageScores[stg.stageNum] : '-'}
                        </td>
                      ))}
                      <td className="py-3 px-2 text-right font-bold font-mono text-blue-700">
                        {currentMod?.evaluationType === 'tempo'
                          ? `${item.totalTime}s`
                          : currentMod?.evaluationType === 'pontuacao_tempo'
                          ? `Fator ${item.hitFactor.toFixed(4)}`
                          : `${item.totalScore} pts`}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-400 font-mono text-[10px]">
                        X:{item.scoreX} • 10:{item.scoreP10} • 9:{item.scoreP9}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // --- Lógica para Etapa Individual ---
  const filteredScores = stageScores.filter(score => 
    score.championshipId === selectedResultChampId &&
    score.stageNum === currentStage?.stageNum &&
    score.modality === currentMod?.name
  );

  // Agrupamento por atleta único: Mantém apenas a melhor participação do atleta na etapa (Regra de Reinscrições)
  const bestScoresByAthlete: Record<string, StageScore> = {};
  for (const score of filteredScores) {
    const athleteKey = score.userId || (score.shooterName ? score.shooterName.trim().toLowerCase() : 'unknown');
    const currentBest = bestScoresByAthlete[athleteKey];
    if (!currentBest) {
      bestScoresByAthlete[athleteKey] = score;
    } else {
      if (compareScorePerformance(score, currentBest) < 0) {
        bestScoresByAthlete[athleteKey] = score;
      }
    }
  }

  const sortedScores = Object.values(bestScoresByAthlete).sort(compareScorePerformance);

  const goldMin = currentChamp?.pontuacaoMinimaAtletaOuro || 0;
  const silverMin = currentChamp?.pontuacaoMinimaAtletaPrata || 0;
  const bronzeMin = currentChamp?.pontuacaoMinimaAtletaBronze || 0;

  const getAthleteMedal = (scoreValue: number): 'ouro' | 'prata' | 'bronze' | null => {
    if (goldMin > 0 && scoreValue >= goldMin) return 'ouro';
    if (silverMin > 0 && (goldMin > 0 ? scoreValue < goldMin : true) && scoreValue >= silverMin) return 'prata';
    if (
      bronzeMin > 0 &&
      (silverMin > 0 ? scoreValue < silverMin : goldMin > 0 ? scoreValue < goldMin : true) &&
      scoreValue >= bronzeMin
    ) return 'bronze';
    return null;
  };

  let finalScores = [...sortedScores];
  if (selectedMedalFilter === 'ouro' && goldMin > 0) {
    finalScores = finalScores.filter(s => getAthleteMedal(s.score) === 'ouro');
  } else if (selectedMedalFilter === 'prata' && silverMin > 0) {
    finalScores = finalScores.filter(s => getAthleteMedal(s.score) === 'prata');
  } else if (selectedMedalFilter === 'bronze' && bronzeMin > 0) {
    finalScores = finalScores.filter(s => getAthleteMedal(s.score) === 'bronze');
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
      {/* Header / Breadcrumb navigation */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedResultModalityId(null)}
            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 border border-blue-200 transition cursor-pointer"
            title="Voltar para modalidades"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base">Resultados da Competição</h3>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-450 mt-0.5">
              <span className="hover:underline cursor-pointer" onClick={() => { setSelectedResultChampId(null); setSelectedResultStageId(null); setSelectedResultModalityId(null); }}>{currentChamp?.title}</span>
              <span>/</span>
              <span className="hover:underline cursor-pointer" onClick={() => { setSelectedResultStageId(null); setSelectedResultModalityId(null); }}>{currentStage?.title || `Etapa ${currentStage?.stageNum}`}</span>
              <span>/</span>
              <span className="font-semibold text-slate-700">{currentMod?.name}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedResultChampId(null);
              setSelectedResultStageId(null);
              setSelectedResultModalityId(null);
            }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] px-3 py-1.5 rounded-xl font-bold transition cursor-pointer"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Filtros de Medalhas / Índices de Pontuação */}
      {(goldMin > 0 || silverMin > 0 || bronzeMin > 0) && (
        <div className="flex flex-wrap gap-2 items-center bg-slate-50/60 p-3 rounded-xl border border-slate-150">
          <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider mr-1">Filtrar por Medalha:</span>
          <button
            onClick={() => setSelectedMedalFilter('geral')}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition border cursor-pointer ${
              selectedMedalFilter === 'geral'
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
            }`}
          >
            Classificação Geral
          </button>
          {goldMin > 0 && (
            <button
              onClick={() => setSelectedMedalFilter('ouro')}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition border cursor-pointer flex items-center gap-1 ${
                selectedMedalFilter === 'ouro'
                  ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
              }`}
            >
              🥇 Ouro (≥ {goldMin} pts)
            </button>
          )}
          {silverMin > 0 && (
            <button
              onClick={() => setSelectedMedalFilter('prata')}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition border cursor-pointer flex items-center gap-1 ${
                selectedMedalFilter === 'prata'
                  ? 'bg-slate-400 border-slate-400 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
              }`}
            >
              🥈 Prata (≥ {silverMin} pts)
            </button>
          )}
          {bronzeMin > 0 && (
            <button
              onClick={() => setSelectedMedalFilter('bronze')}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition border cursor-pointer flex items-center gap-1 ${
                selectedMedalFilter === 'bronze'
                  ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
              }`}
            >
              🥉 Bronze (≥ {bronzeMin} pts)
            </button>
          )}
        </div>
      )}

      {/* Results Table */}
      {finalScores.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          {selectedMedalFilter !== 'geral'
            ? `Nenhum atleta atingiu a pontuação mínima para a categoria ${
                selectedMedalFilter === 'ouro' ? 'Ouro' : selectedMedalFilter === 'prata' ? 'Prata' : 'Bronze'
              } nesta etapa.`
            : 'Nenhum resultado homologado para este campeonato, etapa e modalidade ainda.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                <th className="py-3 px-2 text-center w-12">Pos</th>
                <th className="py-3 px-2">Atleta</th>
                <th className="py-3 px-2 text-center">Clube</th>
                {currentMod?.evaluationType !== 'pontuacao' && (
                  <th className="py-3 px-2 text-right">Tempo</th>
                )}
                <th className="py-3 px-2 text-right">Pontos</th>
                {currentMod?.evaluationType === 'pontuacao_tempo' && (
                  <th className="py-3 px-2 text-right">Fator</th>
                )}
                <th className="py-3 px-2 text-center w-24">Desempates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {finalScores.map((score, index) => {
                const reg = registrations.find(r => r.id === score.registrationId);
                const overallIndex = sortedScores.findIndex(s => s.id === score.id);
                const displayPosIndex = selectedMedalFilter === 'geral' ? overallIndex : index;
                const athleteMedal = getAthleteMedal(score.score);
                return (
                  <tr key={score.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-2 text-center font-bold font-mono">
                      {displayPosIndex === 0 ? (
                        <span className="inline-block bg-amber-100 text-amber-800 text-[10px] font-bold w-5 h-5 rounded-full leading-5 text-center">1º</span>
                      ) : displayPosIndex === 1 ? (
                        <span className="inline-block bg-slate-100 text-slate-800 text-[10px] font-bold w-5 h-5 rounded-full leading-5 text-center">2º</span>
                      ) : displayPosIndex === 2 ? (
                        <span className="inline-block bg-amber-50 text-amber-700 text-[10px] font-bold w-5 h-5 rounded-full leading-5 text-center">3º</span>
                      ) : (
                        `${displayPosIndex + 1}º`
                      )}
                    </td>
                    <td className="py-3 px-2 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{score.shooterName}</span>
                        {athleteMedal === 'ouro' && (
                          <span className="inline-flex items-center bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full select-none" title="Índice Ouro">
                            🥇 Ouro
                          </span>
                        )}
                        {athleteMedal === 'prata' && (
                          <span className="inline-flex items-center bg-slate-50 text-slate-800 border border-slate-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full select-none" title="Índice Prata">
                            🥈 Prata
                          </span>
                        )}
                        {athleteMedal === 'bronze' && (
                          <span className="inline-flex items-center bg-amber-50/50 text-amber-950 border border-amber-250 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full select-none" title="Índice Bronze">
                            🥉 Bronze
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center text-slate-500 font-mono text-[10px]">
                      {clubs.find(c => c.id === (users.find(u => u.id === score.userId)?.clubId))?.name || '-'}
                    </td>
                    {currentMod?.evaluationType !== 'pontuacao' && (
                      <td className="py-3 px-2 text-right font-mono">{score.timeSeconds ? `${score.timeSeconds}s` : '-'}</td>
                    )}
                    <td className="py-3 px-2 text-right font-bold font-mono text-slate-850">
                      <span>{score.score}</span>
                      {reg && (reg.penalty || 0) > 0 && (
                        <span className="block text-[8.5px] font-normal text-red-500 font-sans" title={`Penalidade de ${reg.penalty} pts deduzida`}>
                          (-{reg.penalty} pen)
                        </span>
                      )}
                    </td>
                    {currentMod?.evaluationType === 'pontuacao_tempo' && (
                      <td className="py-3 px-2 text-right font-bold font-mono text-emerald-600">{score.hitFactor ? score.hitFactor.toFixed(4) : '-'}</td>
                    )}
                    <td className="py-3 px-2 text-center text-slate-400 font-mono text-[10px]">
                      {reg ? `X:${reg.scoreX || 0} • 10:${reg.scoreP10 || 0} • 9:${reg.scoreP9 || 0}` : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
