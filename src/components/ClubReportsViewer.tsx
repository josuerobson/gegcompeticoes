import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Printer, Calendar, Users, Filter, X, CheckCircle, ShieldAlert, Award, ArrowLeft } from 'lucide-react';
import { User, Club, TrainingSession, Registration, StageScore, Stage, Championship, Weapon, Modality } from '../types';

interface ClubReportsViewerProps {
  currentUser: User | null;
  clubs: Club[];
  users: User[];
  trainings?: TrainingSession[];
  registrations: Registration[];
  stageScores: StageScore[];
  stages: Stage[];
  championships: Championship[];
  weapons: Weapon[];
  modalities: Modality[];
}

interface HabitualityItem {
  id: string;
  rawDate: Date;
  dateFormatted: string;
  timeFormatted: string;
  eventType: 'Treinamento' | 'Competição';
  eventName: string;
  modality: string;
  stageNum?: number;
  score: number | string;
  weaponClass: string;
  model: string;
  weaponNumber: string;
  manufacturer: string;
  caliber: string;
  permissionStatus: string;
  sigma: string;
  shotsCount: number;
  weaponOwnerText: string;
  ammoOwnerText: string;
}

export default function ClubReportsViewer({
  currentUser,
  clubs,
  users,
  trainings,
  registrations,
  stageScores,
  stages,
  championships,
  weapons,
  modalities,
}: ClubReportsViewerProps) {
  const [activeTab, setActiveTab] = useState<'global_habitualidade' | 'individual'>('global_habitualidade');

  // Resolved Club
  const currentClub = useMemo(() => {
    if (currentUser?.clubId) {
      const found = clubs.find(c => c.id === currentUser.clubId);
      if (found) return found;
    }
    return clubs.find(c => c.id === 'club_aranas') || clubs[0];
  }, [clubs, currentUser?.clubId]);

  // Date filters (default: last 12 months)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Global filters
  const [onlyWithActivities, setOnlyWithActivities] = useState(false);
  const [athleteSearchQuery, setAthleteSearchQuery] = useState('');
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // Individual declaration state
  const [selectedAthleteId, setSelectedAthleteId] = useState('');
  const [declarationType, setDeclarationType] = useState<'habitualidade' | 'filiacao'>('habitualidade');

  const [loadedTrainings, setLoadedTrainings] = useState<TrainingSession[]>(trainings || []);

  useEffect(() => {
    if (trainings && trainings.length > 0) {
      setLoadedTrainings(trainings);
      return;
    }
    const loadTrainings = async () => {
      try {
        const res = await fetch('/api/trainings?all=true', {
          headers: currentUser?.id ? { 'x-user-id': currentUser.id } : undefined
        });
        if (res.ok) {
          const data = await res.json();
          setLoadedTrainings(data.trainings || []);
        }
      } catch (e) {
        console.error('Error fetching trainings for reports:', e);
      }
    };
    loadTrainings();
  }, [trainings, currentUser?.id]);

  // Athletes belonging to current club
  const clubAthletes = useMemo(() => {
    return users.filter(u => {
      const belongs = u.clubId === currentClub?.id || (!u.clubId && currentClub?.id === 'club_aranas');
      if (!belongs) return false;
      if (!athleteSearchQuery.trim()) return true;
      const q = athleteSearchQuery.toLowerCase();
      return (
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.cpf || '').includes(q) ||
        (u.crNumber || '').toLowerCase().includes(q)
      );
    });
  }, [users, currentClub?.id, athleteSearchQuery]);

  // Helper to compute athlete habitualities (STRICTLY NO LEGACY DATA)
  const computeAthleteHabitualities = (athlete: User, sDate: Date, eDate: Date): HabitualityItem[] => {
    const items: HabitualityItem[] = [];
    const userRegs = (registrations || []).filter(r => r.userId === athlete.id);
    const userRegMap = new Map<string, Registration>();
    userRegs.forEach(r => userRegMap.set(r.id, r));

    // 1. Real Trainings (comprovados com arma e tiros válidos)
    (loadedTrainings || []).forEach(t => {
      if (t.userId !== athlete.id) return;
      const rawDateStr = t.dateTime || ((t as any).date ? `${(t as any).date}T15:00:00` : '') || t.createdAt || '';
      if (!rawDateStr) return;
      const rawDate = new Date(rawDateStr);
      if (isNaN(rawDate.getTime())) return;
      if (rawDate < sDate || rawDate > eDate) return;

      const w = t.selectedWeapon || (t.weaponId ? (weapons.find(wpn => wpn.id === t.weaponId) || weapons.find(wpn => (wpn as any).legacyId === (t as any).weaponLegacyId)) : undefined);
      if (!w || !w.model || w.model.toLowerCase().includes('não identificada') || w.model.toLowerCase().includes('arma cadastrada')) {
        return;
      }

      let shotsCount: number | null = null;
      if (typeof t.totalShots === 'number' && !isNaN(t.totalShots)) {
        shotsCount = t.totalShots;
      } else if (t.totalShots != null && !isNaN(Number(t.totalShots))) {
        shotsCount = Number(t.totalShots);
      } else if (t.ownAmmoShots !== undefined || t.clubAmmoShots !== undefined) {
        shotsCount = (Number(t.ownAmmoShots) || 0) + (Number(t.clubAmmoShots) || 0);
      } else if (typeof (t as any).shots === 'number' && !isNaN((t as any).shots)) {
        shotsCount = (t as any).shots;
      }

      if (shotsCount === null || isNaN(shotsCount) || shotsCount <= 0) return;

      const isClubWeapon = w.ownerId === athlete.clubId || (w.ownerId ? w.ownerId.startsWith('club_') : false) || t.weaponOwnerType === 'clube';

      items.push({
        id: `tr_${t.id}`,
        rawDate,
        dateFormatted: rawDate.toLocaleDateString('pt-BR'),
        timeFormatted: t.dateTime ? rawDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '15:00',
        eventType: 'Treinamento',
        eventName: 'TREINAMENTO NO ESTANDE',
        modality: t.modality || 'Treinamento Livre',
        weaponClass: w.weaponClass || 'Pistola',
        model: w.model,
        weaponNumber: w.weaponNumber || w.serialNumber || 'N/A',
        manufacturer: w.manufacturer || 'Não informado',
        caliber: w.caliber || t.weaponCaliber || 'N/A',
        permissionStatus: w.permissionStatus || (w.caliber && (w.caliber.includes('45') || w.caliber.includes('9mm')) ? 'Restrita' : 'Permitida'),
        sigma: w.sigmaNumber || w.serialNumber || athlete.crNumber || 'N/A',
        shotsCount,
        score: t.score !== undefined && t.score !== null ? t.score : '-',
        weaponOwnerText: isClubWeapon ? 'Clube' : 'Própria',
        ammoOwnerText: (Number(t.clubAmmoShots) || 0) > 0 ? 'Clube' : 'Própria',
      });
    });

    // 2. Official Competitions (comprovadas com arma e tiros válidos)
    const includedRegIds = new Set<string>();

    (stageScores || []).forEach(s => {
      if (s.userId !== athlete.id) return;
      const reg = s.registrationId ? userRegMap.get(s.registrationId) : undefined;
      if (reg) includedRegIds.add(reg.id);

      const stage = stages.find(st => (reg?.stageId && st.id === reg.stageId) || (st.championshipId === s.championshipId && (s.stageNum ? st.stageNum === s.stageNum : false)));
      const champ = championships.find(c => c.id === s.championshipId || c.id === reg?.championshipId);

      const rawDateStr = reg?.dataExecucao
        ? `${reg.dataExecucao}T${reg.horaExecucao || '00:00:00'}`
        : (stage?.date ? `${stage.date}T15:00:00` : (reg?.registeredAt || ''));
      if (!rawDateStr) return;
      const rawDate = new Date(rawDateStr);
      if (isNaN(rawDate.getTime())) return;
      if (rawDate < sDate || rawDate > eDate) return;

      const w = reg?.weaponId ? (weapons.find(wpn => wpn.id === reg.weaponId) || weapons.find(wpn => (wpn as any).legacyId === (reg as any).weaponLegacyId)) : undefined;
      if (!w || !w.model || w.model.toLowerCase().includes('não identificada') || w.model.toLowerCase().includes('arma cadastrada')) return;

      let shotsCount: number | null = null;
      const scoreShotsSum = (Number(reg?.scoreX) || 0) + (Number(reg?.scoreP10) || 0) + (Number(reg?.scoreP9) || 0) +
        (Number(reg?.scoreP8) || 0) + (Number(reg?.scoreP7) || 0) + (Number(reg?.scoreP6) || 0) +
        (Number(reg?.scoreP5) || 0) + (Number(reg?.scoreP4) || 0) + (Number(reg?.scoreP3) || 0) +
        (Number(reg?.scoreP2) || 0) + (Number(reg?.scoreP1) || 0) + (Number(reg?.scoreP0) || 0);

      if (scoreShotsSum > 0) {
        shotsCount = scoreShotsSum;
      } else {
        const mod = (reg?.modalityId ? modalities.find(m => m.id === reg.modalityId) : undefined)
          || (s.modalityId ? modalities.find(m => m.id === s.modalityId) : undefined)
          || modalities.find(m => m.name === s.modality);
        if (mod && mod.seriesCount && mod.shotsPerSeries && (Number(mod.seriesCount) * Number(mod.shotsPerSeries) > 0)) {
          shotsCount = Number(mod.seriesCount) * Number(mod.shotsPerSeries);
        } else if (typeof (s as any)?.shotsCount === 'number' && (s as any).shotsCount > 0) {
          shotsCount = (s as any).shotsCount;
        } else if (typeof (reg as any)?.shotsCount === 'number' && (reg as any).shotsCount > 0) {
          shotsCount = (reg as any).shotsCount;
        }
      }

      if (shotsCount === null || isNaN(shotsCount) || shotsCount <= 0) return;

      const isClubWeapon = w.ownerId === athlete.clubId || (w.ownerId ? w.ownerId.startsWith('club_') : false);

      items.push({
        id: `cmp_${s.id}`,
        rawDate,
        dateFormatted: rawDate.toLocaleDateString('pt-BR'),
        timeFormatted: reg?.horaExecucao ? rawDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '15:54',
        eventType: 'Competição',
        eventName: champ?.title?.toUpperCase() || 'CAMPEONATO DE TIRO ESPORTIVO',
        modality: s.modality || (reg?.modalityId ? (modalities.find(m => m.id === reg.modalityId)?.name || 'Modalidade Oficial') : (stage?.title || 'Modalidade Oficial')),
        stageNum: s.stageNum || stage?.stageNum,
        score: s.score !== undefined && s.score !== null ? s.score : (reg?.totalPoints ?? '-'),
        weaponClass: w.weaponClass || 'Pistola',
        model: w.model,
        weaponNumber: w.weaponNumber || w.serialNumber || 'N/A',
        manufacturer: w.manufacturer || 'Não informado',
        caliber: w.caliber || 'N/A',
        permissionStatus: w.permissionStatus || (w.caliber?.includes('45') || w.caliber?.includes('9mm') ? 'Restrita' : 'Permitida'),
        sigma: w.sigmaNumber || w.serialNumber || athlete.crNumber || 'N/A',
        shotsCount,
        weaponOwnerText: isClubWeapon ? 'Clube' : 'Própria',
        ammoOwnerText: (Number(reg?.clubAmmoShots) || 0) > 0 ? 'Clube' : 'Própria',
      });
    });

    userRegs.forEach(reg => {
      if (includedRegIds.has(reg.id)) return;
      if (reg.completionStatus !== 'completed' && !reg.dataExecucao) return;
      if (!reg.dataExecucao) return;

      const rawDate = new Date(`${reg.dataExecucao}T${reg.horaExecucao || '00:00:00'}`);
      if (isNaN(rawDate.getTime())) return;
      if (rawDate < sDate || rawDate > eDate) return;

      const champ = championships.find(c => c.id === reg.championshipId);
      const stage = stages.find(st => st.id === reg.stageId);

      const w = reg.weaponId ? (weapons.find(wpn => wpn.id === reg.weaponId) || weapons.find(wpn => (wpn as any).legacyId === (reg as any).weaponLegacyId)) : undefined;
      if (!w || !w.model || w.model.toLowerCase().includes('não identificada') || w.model.toLowerCase().includes('arma cadastrada')) return;

      let shotsCount: number | null = null;
      const scoreShotsSum = (Number(reg.scoreX) || 0) + (Number(reg.scoreP10) || 0) + (Number(reg.scoreP9) || 0) +
        (Number(reg.scoreP8) || 0) + (Number(reg.scoreP7) || 0) + (Number(reg.scoreP6) || 0) +
        (Number(reg.scoreP5) || 0) + (Number(reg.scoreP4) || 0) + (Number(reg.scoreP3) || 0) +
        (Number(reg.scoreP2) || 0) + (Number(reg.scoreP1) || 0) + (Number(reg.scoreP0) || 0);

      if (scoreShotsSum > 0) {
        shotsCount = scoreShotsSum;
      } else {
        const mod = reg.modalityId ? modalities.find(m => m.id === reg.modalityId) : undefined;
        if (mod && mod.seriesCount && mod.shotsPerSeries && (Number(mod.seriesCount) * Number(mod.shotsPerSeries) > 0)) {
          shotsCount = Number(mod.seriesCount) * Number(mod.shotsPerSeries);
        } else if (typeof (reg as any)?.shotsCount === 'number' && (reg as any).shotsCount > 0) {
          shotsCount = (reg as any).shotsCount;
        }
      }

      if (shotsCount === null || isNaN(shotsCount) || shotsCount <= 0) return;

      const isClubWeapon = w.ownerId === athlete.clubId || (w.ownerId ? w.ownerId.startsWith('club_') : false);

      items.push({
        id: `reg_${reg.id}`,
        rawDate,
        dateFormatted: rawDate.toLocaleDateString('pt-BR'),
        timeFormatted: reg.horaExecucao ? rawDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '15:54',
        eventType: 'Competição',
        eventName: champ?.title?.toUpperCase() || 'CAMPEONATO DE TIRO ESPORTIVO',
        modality: reg.modalityId ? (modalities.find(m => m.id === reg.modalityId)?.name || 'Modalidade Oficial') : (stage?.title || 'Modalidade Oficial'),
        stageNum: stage?.stageNum,
        score: reg.totalPoints !== undefined && reg.totalPoints !== null ? reg.totalPoints : '-',
        weaponClass: w.weaponClass || 'Pistola',
        model: w.model,
        weaponNumber: w.weaponNumber || w.serialNumber || 'N/A',
        manufacturer: w.manufacturer || 'Não informado',
        caliber: w.caliber || 'N/A',
        permissionStatus: w.permissionStatus || (w.caliber?.includes('45') || w.caliber?.includes('9mm') ? 'Restrita' : 'Permitida'),
        sigma: w.sigmaNumber || w.serialNumber || athlete.crNumber || 'N/A',
        shotsCount,
        weaponOwnerText: isClubWeapon ? 'Clube' : 'Própria',
        ammoOwnerText: (Number(reg?.clubAmmoShots) || 0) > 0 ? 'Clube' : 'Própria',
      });
    });

    const trainItems = items.filter(it => it.eventType === 'Treinamento').sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    const compItems = items.filter(it => it.eventType === 'Competição').sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    return [...trainItems, ...compItems];
  };

  // Pre-calculate habitualities for all club athletes
  const startD = useMemo(() => new Date(`${startDate}T00:00:00`), [startDate]);
  const endD = useMemo(() => new Date(`${endDate}T23:59:59`), [endDate]);

  const globalData = useMemo(() => {
    return clubAthletes.map(athlete => {
      const activities = computeAthleteHabitualities(athlete, startD, endD);
      return { athlete, activities };
    }).filter(entry => {
      if (!onlyWithActivities) return true;
      return entry.activities.length > 0;
    });
  }, [clubAthletes, startD, endD, onlyWithActivities, loadedTrainings, registrations, stageScores, stages, championships, weapons, modalities]);

  // Isolate print mode via document-print-open class on body
  useEffect(() => {
    if (isPrintPreviewOpen) {
      document.body.classList.add('document-print-open');
    } else {
      document.body.classList.remove('document-print-open');
    }
    return () => {
      document.body.classList.remove('document-print-open');
    };
  }, [isPrintPreviewOpen]);

  const handlePrint = () => {
    window.print();
  };

  // Format extensive date
  const formatExtensiveDate = (dStr?: string) => {
    if (!dStr) return '01 de Setembro de 2021';
    const clean = dStr.includes('T') ? dStr.split('T')[0] : dStr;
    const parts = clean.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        return `${String(d.getDate()).padStart(2, '0')} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
      }
    }
    return dStr;
  };

  // Club details
  const clubName = currentClub?.name || 'Clube de Tiro & Caça Aranãs Ltda';
  const clubFantasy = currentClub?.fantasyName || currentClub?.name || 'G&G Competições';
  const clubCr = currentClub?.crNumber || '572103';
  const clubCnpj = currentClub?.cnpj || '37138741000143';
  const clubAddress = [
    currentClub?.address,
    currentClub?.addressNumber,
    currentClub?.neighborhood,
    currentClub?.city && currentClub?.state ? `${currentClub.city}, ${currentClub.state}` : (currentClub?.city || currentClub?.state || ''),
    currentClub?.cep ? `CEP: ${currentClub.cep}` : ''
  ].filter(Boolean).join(', ') || 'Estrada que liga Capelinha Novo Cruzeiro, 9999999999, Curral Velho, Capelinha, MG, CEP: 39680000';

  const clubCityState = currentClub?.city && currentClub?.state ? `${currentClub.city} - ${currentClub.state}` : (currentClub?.city || 'Capelinha - MG');

  // Single Athlete Declaration data
  const singleAthlete = useMemo(() => {
    return users.find(u => u.id === selectedAthleteId);
  }, [users, selectedAthleteId]);

  const singleAthleteActivities = useMemo(() => {
    if (!singleAthlete) return [];
    return computeAthleteHabitualities(singleAthlete, startD, endD);
  }, [singleAthlete, startD, endD, trainings, registrations, stageScores, stages, championships, weapons, modalities]);

  const totalClubActivities = useMemo(() => {
    return globalData.reduce((acc, curr) => acc + curr.activities.length, 0);
  }, [globalData]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs text-slate-800">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-lg">Relatórios & Declarações Regulamentares</h3>
          <p className="text-xs text-slate-400">
            Geração de relatórios oficiais para o Exército Brasileiro (SFPC) e Polícia Federal — modelo individual e pacote global consolidado do clube.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('global_habitualidade')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${activeTab === 'global_habitualidade' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Relatório Global do Clube
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('individual')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${activeTab === 'individual' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Declaração Individual
          </button>
        </div>
      </div>

      {/* Club Identity Banner */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-blue-950">{clubName}</span>
            {currentClub?.fantasyName && (
              <span className="text-xs font-medium text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                Fantasia: {currentClub.fantasyName}
              </span>
            )}
          </div>
          <p className="text-[11px] text-blue-800 font-mono">
            CR: {clubCr} • CNPJ: {clubCnpj} • Sede: {clubAddress}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-blue-900 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-2xs">
            {clubAthletes.length} Atleta(s) Vinculado(s)
          </span>
        </div>
      </div>

      {/* Date Range Selection (Universal) */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wide">
          <Calendar className="w-4 h-4 text-blue-600" />
          Período do Relatório (Entre Datas)
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Buscar Atleta</label>
            <input
              type="text"
              placeholder="Nome, CPF ou CR..."
              value={athleteSearchQuery}
              onChange={e => setAthleteSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
          {activeTab === 'global_habitualidade' && (
            <div className="flex items-center gap-2 pb-2">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={onlyWithActivities}
                  onChange={e => setOnlyWithActivities(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                Apenas com habitualidades
              </label>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: RELATÓRIO GLOBAL DO CLUBE */}
      {activeTab === 'global_habitualidade' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200 rounded-xl p-4 gap-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900">Relatório Consolidado de Habitualidades do Clube</h4>
              <p className="text-xs text-slate-500">
                Empacota as declarações de todos os <strong>{globalData.length}</strong> atletas selecionados em um único arquivo PDF oficial para envio aos órgãos de fiscalização.
              </p>
              <div className="text-[11px] text-blue-700 font-semibold mt-1">
                {totalClubActivities} registro(s) de habitualidade válido(s) encontrados no período.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsPrintPreviewOpen(true)}
              disabled={globalData.length === 0}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
            >
              <Printer className="w-4 h-4" />
              Gerar & Imprimir Relatório Global
            </button>
          </div>

          {/* Athletes List Summary Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Atleta</th>
                  <th className="py-2.5 px-3">CPF</th>
                  <th className="py-2.5 px-3">CR</th>
                  <th className="py-2.5 px-3 text-center">Habitualidades</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {globalData.map(({ athlete, activities }) => (
                  <tr key={athlete.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{athlete.fullName}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">{athlete.cpf || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">{athlete.crNumber || '—'}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-blue-700 font-mono">{activities.length}</td>
                    <td className="py-2.5 px-3">
                      {activities.length >= 8 ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                          Regular (8+ freq.)
                        </span>
                      ) : activities.length > 0 ? (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                          {activities.length} freq.
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400">Sem registros</span>
                      )}
                    </td>
                  </tr>
                ))}
                {globalData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                      Nenhum atleta encontrado com os filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DECLARAÇÃO INDIVIDUAL */}
      {activeTab === 'individual' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Selecione o Atleta</label>
              <select
                value={selectedAthleteId}
                onChange={e => setSelectedAthleteId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 outline-none p-2.5 rounded-xl text-xs text-slate-800 font-semibold focus:border-blue-500"
              >
                <option value="">Selecione um atleta vinculado ao clube...</option>
                {clubAthletes.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} {u.cpf ? `(CPF: ${u.cpf})` : ''} {u.crNumber ? `— CR: ${u.crNumber}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase block">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeclarationType('habitualidade')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${declarationType === 'habitualidade' ? 'bg-blue-50 border-blue-600 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                  Habitualidade
                </button>
                <button
                  type="button"
                  onClick={() => setDeclarationType('filiacao')}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border transition ${declarationType === 'filiacao' ? 'bg-blue-50 border-blue-600 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                  Filiação
                </button>
              </div>
            </div>
          </div>

          {selectedAthleteId && singleAthlete && (
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{singleAthlete.fullName}</h4>
                  <p className="text-xs text-slate-500">
                    CPF: {singleAthlete.cpf || 'Não informado'} • CR: {singleAthlete.crNumber || 'Não informado'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrintPreviewOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Declaração
                </button>
              </div>

              {declarationType === 'habitualidade' ? (
                <div className="text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">
                    {singleAthleteActivities.length} habitualidade(s) registrada(s) no período selecionado ({startDate.split('-').reverse().join('/')} a {endDate.split('-').reverse().join('/')}).
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    O documento gerado segue estritamente o cabeçalho oficial do Decreto nº 11.615/2023 com a tabela de comprovações.
                  </p>
                </div>
              ) : (
                <div className="text-xs text-slate-600 leading-relaxed">
                  <p>
                    Declaração de filiação ativa regular comprovando adimplência e vínculo do atleta ao clube.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL / PORTAL DE IMPRESSÃO ISOLADA */}
      {isPrintPreviewOpen && createPortal(
        <div id="print-portal-root" className="fixed inset-0 z-9999 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-start overflow-y-auto p-4 sm:p-6 print:p-0 print:m-0 print:bg-white print:static print:overflow-visible">
          {/* Print Toolbar (Hidden during print) */}
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg border border-slate-200 p-4 mb-4 flex items-center justify-between gap-4 print:hidden sticky top-4 z-50">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPrintPreviewOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  {activeTab === 'global_habitualidade'
                    ? `Relatório Global de Habitualidades — ${clubFantasy}`
                    : `Declaração Individual — ${singleAthlete?.fullName}`}
                </h4>
                <p className="text-xs text-slate-500">
                  {activeTab === 'global_habitualidade'
                    ? `${globalData.length} atleta(s) incluído(s) • ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}`
                    : `${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Imprimir / Salvar PDF
              </button>
              <button
                type="button"
                onClick={() => setIsPrintPreviewOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* DOCUMENT PAGES CONTAINER */}
          <div className="w-full max-w-4xl space-y-6 print:space-y-0 print:w-full print:max-w-none">
            {activeTab === 'global_habitualidade' ? (
              // RENDER EACH ATHLETE'S DECLARATION
              globalData.map(({ athlete, activities }, athleteIdx) => {
                const athleteAddr = [
                  athlete.address,
                  athlete.addressNumber,
                  athlete.neighborhood,
                  athlete.city && athlete.state ? `${athlete.city}, ${athlete.state}` : (athlete.city || athlete.state || ''),
                  athlete.cep ? `CEP: ${athlete.cep}` : ''
                ].filter(Boolean).join(', ') || 'Não informado';

                const athleteRegNum = athlete.bookNumber || (athlete.legacyId ? String(athlete.legacyId).padStart(4, '0') : (athlete.id ? athlete.id.replace(/\D/g, '').slice(-4).padStart(4, '0') : '0002'));
                const affiliationDateExtensive = formatExtensiveDate(athlete.clubAffiliationDate || athlete.memberSince || (athlete as any).createdAt);

                return (
                  <div
                    key={athlete.id}
                    className="bg-white p-8 rounded-2xl shadow-xl print:shadow-none print:rounded-none print:p-0 page-break-after-always print:break-after-page text-slate-900 font-sans border border-slate-200 print:border-none"
                  >
                    {/* Official Timbre Header */}
                    <div className="text-center pb-2 border-b border-slate-300 mb-3">
                      <h1 className="font-display font-extrabold text-sm uppercase tracking-wider text-slate-900 leading-snug">
                        Declaração de habitualidade COMPROVAÇÃO DE PARTICIPAÇÕES EM TREINAMENTOS E/OU COMPETIÇÕES DE TIRO
                      </h1>
                      <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                        (art. 35 do Decreto nº 11.615/2023)
                      </p>
                    </div>

                    {/* Official Declaration Text (Template Item 5) */}
                    <div className="text-justify text-xs text-slate-800 leading-relaxed mb-4">
                      <p>
                        <strong>{clubName}</strong>, Nome Fantasia: <strong>{clubFantasy}</strong>, CR: Nº <strong>{clubCr}</strong> inscrito no CNPJ sob o nº <strong>{clubCnpj}</strong>, com endereço sede, na <strong>{clubAddress}</strong>, <strong>DECLARA</strong>, para fim de comprovação junto ao Exército Brasileiro e a Polícia Federal, que, <strong>{athlete.fullName}</strong>, CPF <strong>{athlete.cpf || 'Não informado'}</strong>, CR <strong>{athlete.crNumber || '000.330.311-00'}</strong>, com endereço: <strong>{athleteAddr}</strong> está regularmente inscrito nesta entidade sob o nº <strong>{athleteRegNum}</strong>, datado de <strong>{affiliationDateExtensive}</strong> e que participou de treinamentos/competições que justificam a aquisição de munição/insumos pleiteada/pleiteados. <strong>O TREINAMENTO FOI REALIZADO CONFORME DESCRIÇÕES</strong>
                      </p>
                    </div>

                    {/* Habituality Tables */}
                    {activities.length > 0 ? (
                      <div className="space-y-3">
                        {activities.map((item, idx) => (
                          <div key={item.id} className="border border-slate-900 text-xs overflow-hidden page-break-inside-avoid">
                            <table className="w-full border-collapse text-xs text-slate-900">
                              <tbody>
                                <tr className="border-b border-slate-900 bg-slate-50">
                                  <td colSpan={6} className="px-3 py-1.5 font-bold uppercase text-left text-[10.5px]">
                                    Nome do evento: {item.eventName}
                                  </td>
                                </tr>
                                <tr className="border-b border-slate-900">
                                  <td colSpan={6} className="px-3 py-1.5 font-medium text-[10px]">
                                    Arma utilizada: {item.weaponClass} - {item.model} - N° {item.weaponNumber} - {item.manufacturer} - Calibre : {item.caliber} - {item.permissionStatus}
                                  </td>
                                </tr>
                                <tr className="bg-slate-100 font-bold text-[9.5px] text-center border-b border-slate-900 uppercase tracking-wider">
                                  <td className="border-r border-slate-900 py-1 px-2 w-12">Ordem</td>
                                  <td className="border-r border-slate-900 py-1 px-2 w-24">Data</td>
                                  <td className="border-r border-slate-900 py-1 px-2 w-16">Hora</td>
                                  <td className="border-r border-slate-900 py-1 px-2 w-28">Sigma</td>
                                  <td className="border-r border-slate-900 py-1 px-2 w-24">Qtd Munições</td>
                                  <td className="py-1 px-2">Tipo de Evento</td>
                                </tr>
                                <tr className="text-center font-mono text-[10.5px] border-b border-slate-900">
                                  <td className="border-r border-slate-900 py-1.5 px-2 font-bold">{String(idx + 1).padStart(2, '0')}</td>
                                  <td className="border-r border-slate-900 py-1.5 px-2">{item.dateFormatted}</td>
                                  <td className="border-r border-slate-900 py-1.5 px-2">{item.timeFormatted}</td>
                                  <td className="border-r border-slate-900 py-1.5 px-2">{item.sigma}</td>
                                  <td className="border-r border-slate-900 py-1.5 px-2 font-bold">{item.shotsCount}</td>
                                  <td className="py-1.5 px-2 font-sans font-semibold text-slate-800">{item.eventType}</td>
                                </tr>
                                <tr className="border-b border-slate-900 text-[10px]">
                                  <td colSpan={3} className="border-r border-slate-900 px-3 py-1 font-medium">
                                    Arma: {item.weaponOwnerText}
                                  </td>
                                  <td colSpan={3} className="px-3 py-1 font-medium">
                                    Munições: {item.ammoOwnerText}
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan={6} className="px-3 py-1 font-medium uppercase text-[10px]">
                                    Evento: {item.eventName}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 border border-slate-300 rounded-lg text-center text-xs text-slate-500 bg-slate-50">
                        Nenhum treinamento ou participação em competição registrado no período de {startDate.split('-').reverse().join('/')} a {endDate.split('-').reverse().join('/')}.
                      </div>
                    )}

                    {/* Signatures & Footer */}
                    <div className="mt-6 pt-4 border-t border-slate-200 page-break-inside-avoid space-y-6">
                      <div className="text-center text-slate-800 text-[11px]">
                        <p>Atestamos a veracidade e exatidão dos registros de habitualidade acima especificados.</p>
                        <p className="mt-1">{clubCityState}, {new Date().toLocaleDateString('pt-BR')}.</p>
                      </div>

                      <div className="text-center text-[10px] space-y-1">
                        <div className="h-0.5 bg-slate-400 w-56 mx-auto"></div>
                        <span className="font-bold text-slate-900 block mt-1">Oficial de Segurança de Estande / Controle de Frequência</span>
                        <span className="text-slate-500 block">Homologação de Frequência {clubFantasy}</span>
                        <span className="text-slate-400 font-mono text-[8px] block">
                          Registro de Autenticidade: REG-GG-HAB-{currentClub?.id?.replace(/\D/g, '') || '01'}-{athlete.id.slice(0, 6).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              // RENDER SINGLE ATHLETE DECLARATION
              singleAthlete && (() => {
                const athleteAddr = [
                  singleAthlete.address,
                  singleAthlete.addressNumber,
                  singleAthlete.neighborhood,
                  singleAthlete.city && singleAthlete.state ? `${singleAthlete.city}, ${singleAthlete.state}` : (singleAthlete.city || singleAthlete.state || ''),
                  singleAthlete.cep ? `CEP: ${singleAthlete.cep}` : ''
                ].filter(Boolean).join(', ') || 'Não informado';

                const athleteRegNum = singleAthlete.bookNumber || (singleAthlete.legacyId ? String(singleAthlete.legacyId).padStart(4, '0') : (singleAthlete.id ? singleAthlete.id.replace(/\D/g, '').slice(-4).padStart(4, '0') : '0002'));
                const affiliationDateExtensive = formatExtensiveDate(singleAthlete.clubAffiliationDate || singleAthlete.memberSince || (singleAthlete as any).createdAt);

                return (
                  <div className="bg-white p-8 rounded-2xl shadow-xl print:shadow-none print:rounded-none print:p-0 text-slate-900 font-sans border border-slate-200 print:border-none">
                    {/* Header */}
                    <div className="text-center pb-2 border-b border-slate-300 mb-3">
                      <h1 className="font-display font-extrabold text-sm uppercase tracking-wider text-slate-900 leading-snug">
                        {declarationType === 'habitualidade'
                          ? 'Declaração de habitualidade COMPROVAÇÃO DE PARTICIPAÇÕES EM TREINAMENTOS E/OU COMPETIÇÕES DE TIRO'
                          : 'DECLARAÇÃO DE FILIAÇÃO AO CLUBE DE TIRO'}
                      </h1>
                      <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                        {declarationType === 'habitualidade' ? '(art. 35 do Decreto nº 11.615/2023)' : 'Comprovação de Associação Ativa Regular'}
                      </p>
                    </div>

                    {/* Declaration Body */}
                    {declarationType === 'habitualidade' ? (
                      <>
                        <div className="text-justify text-xs text-slate-800 leading-relaxed mb-4">
                          <p>
                            <strong>{clubName}</strong>, Nome Fantasia: <strong>{clubFantasy}</strong>, CR: Nº <strong>{clubCr}</strong> inscrito no CNPJ sob o nº <strong>{clubCnpj}</strong>, com endereço sede, na <strong>{clubAddress}</strong>, <strong>DECLARA</strong>, para fim de comprovação junto ao Exército Brasileiro e a Polícia Federal, que, <strong>{singleAthlete.fullName}</strong>, CPF <strong>{singleAthlete.cpf || 'Não informado'}</strong>, CR <strong>{singleAthlete.crNumber || '000.330.311-00'}</strong>, com endereço: <strong>{athleteAddr}</strong> está regularmente inscrito nesta entidade sob o nº <strong>{athleteRegNum}</strong>, datado de <strong>{affiliationDateExtensive}</strong> e que participou de treinamentos/competições que justificam a aquisição de munição/insumos pleiteada/pleiteados. <strong>O TREINAMENTO FOI REALIZADO CONFORME DESCRIÇÕES</strong>
                          </p>
                        </div>

                        {singleAthleteActivities.length > 0 ? (
                          <div className="space-y-3">
                            {singleAthleteActivities.map((item, idx) => (
                              <div key={item.id} className="border border-slate-900 text-xs overflow-hidden page-break-inside-avoid">
                                <table className="w-full border-collapse text-xs text-slate-900">
                                  <tbody>
                                    <tr className="border-b border-slate-900 bg-slate-50">
                                      <td colSpan={6} className="px-3 py-1.5 font-bold uppercase text-left text-[10.5px]">
                                        Nome do evento: {item.eventName}
                                      </td>
                                    </tr>
                                    <tr className="border-b border-slate-900">
                                      <td colSpan={6} className="px-3 py-1.5 font-medium text-[10px]">
                                        Arma utilizada: {item.weaponClass} - {item.model} - N° {item.weaponNumber} - {item.manufacturer} - Calibre : {item.caliber} - {item.permissionStatus}
                                      </td>
                                    </tr>
                                    <tr className="bg-slate-100 font-bold text-[9.5px] text-center border-b border-slate-900 uppercase tracking-wider">
                                      <td className="border-r border-slate-900 py-1 px-2 w-12">Ordem</td>
                                      <td className="border-r border-slate-900 py-1 px-2 w-24">Data</td>
                                      <td className="border-r border-slate-900 py-1 px-2 w-16">Hora</td>
                                      <td className="border-r border-slate-900 py-1 px-2 w-28">Sigma</td>
                                      <td className="border-r border-slate-900 py-1 px-2 w-24">Qtd Munições</td>
                                      <td className="py-1 px-2">Tipo de Evento</td>
                                    </tr>
                                    <tr className="text-center font-mono text-[10.5px] border-b border-slate-900">
                                      <td className="border-r border-slate-900 py-1.5 px-2 font-bold">{String(idx + 1).padStart(2, '0')}</td>
                                      <td className="border-r border-slate-900 py-1.5 px-2">{item.dateFormatted}</td>
                                      <td className="border-r border-slate-900 py-1.5 px-2">{item.timeFormatted}</td>
                                      <td className="border-r border-slate-900 py-1.5 px-2">{item.sigma}</td>
                                      <td className="border-r border-slate-900 py-1.5 px-2 font-bold">{item.shotsCount}</td>
                                      <td className="py-1.5 px-2 font-sans font-semibold text-slate-800">{item.eventType}</td>
                                    </tr>
                                    <tr className="border-b border-slate-900 text-[10px]">
                                      <td colSpan={3} className="border-r border-slate-900 px-3 py-1 font-medium">
                                        Arma: {item.weaponOwnerText}
                                      </td>
                                      <td colSpan={3} className="px-3 py-1 font-medium">
                                        Munições: {item.ammoOwnerText}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td colSpan={6} className="px-3 py-1 font-medium uppercase text-[10px]">
                                        Evento: {item.eventName}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 border border-slate-300 rounded-lg text-center text-xs text-slate-500 bg-slate-50">
                            Nenhum treinamento ou participação em competição registrado no período de {startDate.split('-').reverse().join('/')} a {endDate.split('-').reverse().join('/')}.
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-justify text-xs text-slate-850 leading-relaxed space-y-4 my-6">
                        <p>
                          Declaramos, para os devidos fins de direito junto ao Sistema de Fiscalização de Produtos Controlados (SFPC) do Exército Brasileiro e à Polícia Federal, que <strong>{singleAthlete.fullName}</strong>, inscrito no CPF sob o nº <strong>{singleAthlete.cpf || 'Não informado'}</strong> e portador do Certificado de Registro (CR) nº <strong>{singleAthlete.crNumber || 'Emissão pendente'}</strong>, é filiado ativo regular sob o registro nº <strong>{athleteRegNum}</strong> nesta entidade de tiro desportivo <strong>{clubName}</strong> (Nome Fantasia: <strong>{clubFantasy}</strong>), CNPJ: <strong>{clubCnpj}</strong>, CR nº <strong>{clubCr}</strong>.
                        </p>
                        <p>
                          O referido atleta encontra-se em dia com suas obrigações estatutárias, anuidade e normas de segurança estabelecidas pela legislação vigente.
                        </p>
                      </div>
                    )}

                    {/* Signatures & Footer */}
                    <div className="mt-8 pt-4 border-t border-slate-200 page-break-inside-avoid space-y-6">
                      <div className="text-center text-slate-800 text-[11px]">
                        <p>Atestamos a veracidade e exatidão das informações acima especificadas.</p>
                        <p className="mt-1">{clubCityState}, {new Date().toLocaleDateString('pt-BR')}.</p>
                      </div>

                      <div className="text-center text-[10px] space-y-1">
                        <div className="h-0.5 bg-slate-400 w-56 mx-auto"></div>
                        <span className="font-bold text-slate-900 block mt-1">Diretoria / Oficial de Segurança do Clube</span>
                        <span className="text-slate-500 block">Homologação Oficial {clubFantasy}</span>
                        <span className="text-slate-400 font-mono text-[8px] block">
                          Registro de Autenticidade: REG-GG-DEC-{currentClub?.id?.replace(/\D/g, '') || '01'}-{singleAthlete.id.slice(0, 6).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
