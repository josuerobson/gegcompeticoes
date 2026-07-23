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
    const displayChamps = clubChamps.length > 0 ? clubChamps : championships;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-base">Resultados de Campeonatos</h3>
            <p className="text-xs text-slate-400">Selecione um campeonato para visualizar notas, passagens de pista e rankings.</p>
          </div>
          <Trophy className="w-5 h-5 text-blue-600" />
        </div>

        {displayChamps.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Nenhum campeonato cadastrado no sistema ainda.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {displayChamps.map((champ) => {
              const totalInscritos = registrations.filter(r => r.championshipId === champ.id).length;
              return (
                <div
                  key={champ.id}
                  onClick={() => setSelectedResultChampId(champ.id)}
                  className="group border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30 hover:bg-white hover:border-blue-400 hover:shadow-md transition duration-200 cursor-pointer flex flex-col"
                >
                  <div className="h-28 overflow-hidden relative">
                    <img
                      src={champ.bannerUrl}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {champ.status === 'open' ? 'Aberto' : champ.status === 'completed' ? 'Finalizado' : 'Rascunho'}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs group-hover:text-blue-600 transition truncate">{champ.title}</h4>
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-1">{champ.description}</p>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                      <span>Etapas: <strong className="text-slate-700">{champ.stagesCount}</strong></span>
                      <span>Inscritos: <strong className="text-slate-700">{totalInscritos}</strong></span>
                    </div>
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
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedResultChampId(null)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {champStages.map((stage) => (
              <div
                key={stage.id}
                onClick={() => setSelectedResultStageId(stage.id)}
                className="border border-slate-200 hover:border-blue-400 hover:bg-blue-50/5 rounded-xl p-4 transition duration-150 cursor-pointer space-y-2 flex flex-col justify-between"
              >
                <div>
                  <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Etapa {stage.stageNum}
                  </span>
                  <h4 className="font-bold text-slate-800 text-xs mt-2">{stage.title}</h4>
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
        )}
      </div>
    );
  }

  // 3. Com campeonato e etapa selecionados, mas sem modalidade: exibe a lista de modalidades
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
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-base">Selecione a Modalidade</h3>
              <p className="text-xs text-slate-400">
                Campeonato: <strong className="text-slate-700">{currentChamp?.title}</strong> • {currentStage?.title || `Etapa ${currentStage?.stageNum}`}
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

  // 4. Com tudo selecionado: exibe a tabela de resultados com filtros de medalha e ordenação
  const filteredScores = stageScores.filter(score => 
    score.championshipId === selectedResultChampId &&
    score.stageNum === currentStage?.stageNum &&
    score.modality === currentMod?.name
  );

  const sortedScores = [...filteredScores].sort((a, b) => {
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
  });

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
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="Voltar para modalidades"
          >
            <ArrowLeft className="w-4 h-4" />
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
                    <td className="py-3 px-2 text-right font-bold font-mono text-slate-850">{score.score}</td>
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
