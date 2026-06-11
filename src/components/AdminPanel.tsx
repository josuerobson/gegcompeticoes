import React, { useState } from 'react';
import { Championship, Registration, User, StageScore } from '../types';
import { ShieldAlert, PlusCircle, Award, Target, Save, CheckCircle, Calendar, Trophy, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminPanelProps {
  currentUser: User | null;
  championships: Championship[];
  registrations: Registration[];
  stageScores: StageScore[];
  users: User[];
  onCreateChampionship: (data: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    registrationFee: number;
    modalities: string[];
    stagesCount: number;
  }) => Promise<void>;
  onRecordScore: (data: {
    championshipId: string;
    registrationId: string;
    stageNum: number;
    score: number;
    timeSeconds?: number;
  }) => Promise<void>;
  onToggleAdminDemo: () => void;
}

export default function AdminPanel({
  currentUser,
  championships,
  registrations,
  stageScores,
  users,
  onCreateChampionship,
  onRecordScore,
  onToggleAdminDemo
}: AdminPanelProps) {
  // Tabs: 'create_champ' | 'record_score'
  const [adminTab, setAdminTab] = useState<'create_champ' | 'record_score'>('record_score');

  // Create championship state
  const [champTitle, setChampTitle] = useState('');
  const [champDesc, setChampDesc] = useState('');
  const [champStart, setChampStart] = useState('2026-07-01');
  const [champEnd, setChampEnd] = useState('2026-09-15');
  const [champFee, setChampFee] = useState(120);
  const [selectedMods, setSelectedMods] = useState<string[]>(['IPSC Handgun Standard']);
  const [champStages, setChampStages] = useState(4);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Score recording state
  const [selectedChampId, setSelectedChampId] = useState(championships[0]?.id || '');
  const [selectedRegId, setSelectedRegId] = useState('');
  const [selectedStageNum, setSelectedStageNum] = useState(1);
  const [scoreInput, setScoreInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [scoreSuccess, setScoreSuccess] = useState(false);

  // Filter registrations for score inputs
  const filteredRegs = registrations.filter(
    (r) => r.championshipId === selectedChampId && r.paymentStatus === 'approved'
  );

  const handleCreateChamp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!champTitle || !champDesc || selectedMods.length === 0) return;

    await onCreateChampionship({
      title: champTitle,
      description: champDesc,
      startDate: champStart,
      endDate: champEnd,
      registrationFee: Number(champFee),
      modalities: selectedMods,
      stagesCount: Number(champStages)
    });

    setCreateSuccess(true);
    setChampTitle('');
    setChampDesc('');
    setTimeout(() => setCreateSuccess(false), 3000);
  };

  const handleRecordScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChampId || !selectedRegId || !scoreInput) return;

    await onRecordScore({
      championshipId: selectedChampId,
      registrationId: selectedRegId,
      stageNum: Number(selectedStageNum),
      score: Number(scoreInput),
      timeSeconds: timeInput ? Number(timeInput) : undefined
    });

    setScoreSuccess(true);
    setScoreInput('');
    setTimeInput('');
    setTimeout(() => setScoreSuccess(false), 3000);
  };

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="py-10 max-w-xl mx-auto text-center space-y-6">
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 space-y-4">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="font-display font-bold text-lg text-slate-900">Configurações de Admin Restritas</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            O painel de gerenciamento de etapas, homologação de pontuações fiduciárias e criação de campeonatos é exclusivo para os diretores fundadores da marca G&G Competições.
          </p>
          <div className="bg-blue-50 p-4 rounded-xl space-y-3">
            <span className="text-[10px] text-blue-700 font-bold block uppercase tracking-wider">MODO TESTE DISPONÍVEL</span>
            <p className="text-[11px] text-slate-600">Deseja simular as permissões do proprietário do clube de tiro para criar e pontuar atletas?</p>
            <button
              onClick={onToggleAdminDemo}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2.5 rounded-lg font-bold transition duration-150 inline-flex items-center gap-1.5 shadow-md shadow-blue-100"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ativar Modo Diretor (Admin)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      
      {/* Admin Title info block */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-950 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-15">
          <Trophy className="w-48 h-48 text-white -mr-10 -mt-10" />
        </div>
        <div className="space-y-1 relative">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">Painel Administrativo</span>
            <span className="text-amber-400 text-xs font-semibold flex items-center gap-1 font-mono">
              ★ Guilherme & Gabriel G&G
            </span>
          </div>
          <h2 className="font-display font-bold text-xl">Diretoria Fiscal & Técnica G&G Competições</h2>
          <p className="text-[11px] text-slate-300">Criação de calendários esportivos, acompanhamento de registros eletrônicos e homologação de estágios.</p>
        </div>

        <button
          onClick={onToggleAdminDemo}
          className="bg-white/10 hover:bg-white/20 text-white text-xs px-4 py-2.5 rounded-xl font-bold transition relative self-start sm:self-center"
        >
          Desativar Admin
        </button>
      </div>

      {/* Local Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setAdminTab('record_score')}
          className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition duration-150 px-4 ${adminTab === 'record_score' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Homologar Pontuações (Etapas)
        </button>
        <button
          onClick={() => setAdminTab('create_champ')}
          className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition duration-150 px-4 ${adminTab === 'create_champ' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Criar Novo Campeonato
        </button>
      </div>

      {adminTab === 'create_champ' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Create form */}
          <div className="lg:col-span-2 bg-white rounded-2xl smooth-shadow border border-slate-100 p-6">
            <h3 className="font-display font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" />
              Configurar Campeonato
            </h3>

            {createSuccess && (
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl flex items-center gap-2 mb-4 text-xs">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Campeonato anunciado com sucesso no clube G&G Competições!
              </div>
            )}

            <form onSubmit={handleCreateChamp} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Nome do Circuito / Competição</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: II Torneio G&G de Precisão e Canos Longos"
                    value={champTitle}
                    onChange={(e) => setChampTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Regras & Descrição Oficial do Torneio</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Especifique as categorias permitidas, as premiações das etapas e os critérios de desempate técnicos..."
                    value={champDesc}
                    onChange={(e) => setChampDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Data Inicial</label>
                  <input
                    type="date"
                    required
                    value={champStart}
                    onChange={(e) => setChampStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Data Limite / Final</label>
                  <input
                    type="date"
                    required
                    value={champEnd}
                    onChange={(e) => setChampEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Taxa de Homologação (R$)</label>
                  <input
                    type="number"
                    required
                    value={champFee}
                    onChange={(e) => setChampFee(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Quantidade Estágios (Stages)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={champStages}
                    onChange={(e) => setChampStages(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Injetar Estágio / Modalidade Ativa</label>
                  <div className="flex gap-2">
                    {['IPSC Handgun Standard', 'IPSC Handgun Production', 'Carabina Mira Aberta 10m', 'Trap Americano Sênior'].map((dis, i) => {
                      const isSel = selectedMods.includes(dis);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              setSelectedMods(selectedMods.filter(m => m !== dis));
                            } else {
                              setSelectedMods([...selectedMods, dis]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition ${isSel ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                        >
                          {dis}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-blue-100"
                >
                  Publicar Campeonato
                </button>
              </div>
            </form>
          </div>

          {/* Quick instructions panel */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              Critérios de Homologação
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Campeonatos do G&G Competições seguem o regulamento do tiro prático (CBTP) ou tiro esportivo de precisão (CBTE).
            </p>
            <ul className="text-[11px] text-slate-500 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>Mantenha as datas alinhadas com as vistorias de estande.</li>
              <li>O valor da inscrição de etapas é debitado via PIX ou crédito para a cobertura dos alvos homologados.</li>
              <li>Novas modalidades cadastradas criam tabelas de ranking zeradas prontas para recepção de cartões.</li>
            </ul>
          </div>

        </div>
      )}

      {adminTab === 'record_score' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Record Scores */}
          <div className="lg:col-span-2 bg-white rounded-2xl smooth-shadow border border-slate-100 p-6">
            <h3 className="font-display font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              Lançar Notas e Homologar Tempos
            </h3>

            {scoreSuccess && (
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl flex items-center gap-2 mb-4 text-xs font-semibold">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Pontuação gravada, calculada e sincronizada no feed esportivo do clube!
              </div>
            )}

            <form onSubmit={handleRecordScoreSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Select championship */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Selecione o Campeonato</label>
                  <select
                    value={selectedChampId}
                    onChange={(e) => {
                      setSelectedChampId(e.target.value);
                      setSelectedRegId('');
                    }}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-semibold"
                  >
                    <option value="" disabled>Selecione...</option>
                    {championships.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                {/* Select Stage */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block font-sans">Etapa Correspondente</label>
                  <select
                    value={selectedStageNum}
                    onChange={(e) => setSelectedStageNum(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-semibold"
                  >
                    {[1, 2, 3, 4].map(num => (
                      <option key={num} value={num}>Etapa {num}</option>
                    ))}
                  </select>
                </div>

                {/* Select Athlete / Registration */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Atleta Inscrito / Matrícula Regulamentar</label>
                  <select
                    value={selectedRegId}
                    onChange={(e) => setSelectedRegId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700"
                    required
                  >
                    <option value="">Selecione o Atleta do Clube...</option>
                    {filteredRegs.map((reg) => {
                      const athlete = users.find(u => u.id === reg.userId);
                      return (
                        <option key={reg.id} value={reg.id}>
                          {athlete?.fullName} | CR: {reg.crNumber} ({reg.modality})
                        </option>
                      );
                    })}
                  </select>
                  {filteredRegs.length === 0 && (
                    <span className="text-[10px] text-red-500 font-semibold block pt-1">
                      Nenhum atleta homologado (pago) para este torneio no momento.
                    </span>
                  )}
                </div>

                {/* Score Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Pontos brutos do cartão</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 95.50"
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-mono"
                  />
                </div>

                {/* Time Input for dynamic factor (IPSC) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block font-sans">Tempo de Pista em Segundos (Opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 15.42 (Deixe vazio para tiro de precisão)"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 outline-none p-3 rounded-xl focus:border-blue-500 text-xs text-slate-700 font-mono"
                  />
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={filteredRegs.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs px-6 py-3 rounded-xl font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-100"
                >
                  <Save className="w-4 h-4" />
                  Salvar e Homologar Pontos
                </button>
              </div>

            </form>
          </div>

          {/* Quick overview of latest recorded steps */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-amber-500" />
              Histórico de Lançamentos Recentes
            </h4>
            
            <div className="space-y-2.5 max-h-[250px] overflow-y-auto no-scrollbar text-[11px]">
              {stageScores.slice(-5).reverse().map((score) => {
                return (
                  <div key={score.id} className="bg-white p-3 rounded-xl border border-slate-100 leading-normal space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-800 font-display">{score.shooterName}</span>
                      <span className="text-blue-600 font-mono">{score.score} pts</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>{score.modality}</span>
                      <span className="font-semibold text-orange-600 uppercase font-sans">Etapa {score.stageNum}</span>
                    </div>
                    {score.hitFactor && (
                      <div className="text-[9px] text-slate-400 block pt-0.5">
                        Fator de Impacto (Hit Factor): {score.hitFactor}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
