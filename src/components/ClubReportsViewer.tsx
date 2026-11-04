import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Users, Filter, Download, Loader2, CheckCircle, ShieldAlert, FileSpreadsheet } from 'lucide-react';
import { downloadPdfFromHtml, downloadMultiSectionPdfFromHtml, sanitizePdfFilename } from '../utils/pdfDownloader';
import { exportClubHabitualitiesSummaryToExcel, exportClubHabitualitiesCompleteToExcel, exportIndividualHabitualityToExcel } from '../utils/habitualitiesExport';
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
  const [onlyWithoutActivities, setOnlyWithoutActivities] = useState(false);
  const [athleteSearchQuery, setAthleteSearchQuery] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');

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
    }).sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }, [users, currentClub?.id, athleteSearchQuery]);

  // Helper to compute athlete habitualities (STRICTLY NO LEGACY DATA)
  const computeAthleteHabitualities = (athlete: User, sDate: Date, eDate: Date): HabitualityItem[] => {
    const items: HabitualityItem[] = [];
    const userRegs = (registrations || []).filter(r => r.userId === athlete.id);
    const userRegMap = new Map<string, Registration>();
    userRegs.forEach(r => {
      userRegMap.set(r.id, r);
      if ((r as any).legacyId) {
        userRegMap.set(String((r as any).legacyId), r);
      }
    });

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

      // Origem da arma do treino: prioridade máxima para a seleção informada ('propria' | 'clube')
      const isClubWeapon = t.weaponOwnerType
        ? t.weaponOwnerType === 'clube'
        : (w.ownerId === athlete.id ? false : (w.ownerId === athlete.clubId || (w.ownerId ? w.ownerId.startsWith('club_') : false)));

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
      let reg = s.registrationId ? userRegMap.get(s.registrationId) : undefined;
      if (!reg && (s as any).legacyRegistrationId) {
        reg = userRegs.find(r => (r as any).legacyId === (s as any).legacyRegistrationId);
      }
      if (!reg && s.championshipId) {
        reg = userRegs.find(r => r.championshipId === s.championshipId && (s.stageNum ? (r as any).stageNum === s.stageNum : true));
      }
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

      // Origem da arma da competição: se definida na inscrição do atleta ('propria' | 'clube'), tem prioridade absoluta
      const isClubWeapon = reg?.weaponSource
        ? reg.weaponSource === 'clube'
        : (w.ownerId === athlete.id ? false : (w.ownerId === athlete.clubId || (w.ownerId ? w.ownerId.startsWith('club_') : false)));

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

      // Origem da arma da competição: se definida na inscrição do atleta ('propria' | 'clube'), tem prioridade absoluta
      const isClubWeapon = reg.weaponSource
        ? reg.weaponSource === 'clube'
        : (w.ownerId === athlete.id ? false : (w.ownerId === athlete.clubId || (w.ownerId ? w.ownerId.startsWith('club_') : false)));

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

    // Ordenação estritamente cronológica crescente por data e hora de participação
    return items.sort((a, b) => {
      const timeA = a.rawDate instanceof Date ? a.rawDate.getTime() : new Date(a.rawDate).getTime();
      const timeB = b.rawDate instanceof Date ? b.rawDate.getTime() : new Date(b.rawDate).getTime();
      return timeA - timeB;
    });
  };

  // Pre-calculate habitualities for all club athletes
  const startD = useMemo(() => new Date(`${startDate}T00:00:00`), [startDate]);
  const endD = useMemo(() => new Date(`${endDate}T23:59:59`), [endDate]);

  const globalData = useMemo(() => {
    return clubAthletes.map(athlete => {
      const activities = computeAthleteHabitualities(athlete, startD, endD);
      return { athlete, activities };
    }).filter(entry => {
      if (onlyWithActivities) return entry.activities.length > 0;
      if (onlyWithoutActivities) return entry.activities.length === 0;
      return true;
    });
  }, [clubAthletes, startD, endD, onlyWithActivities, onlyWithoutActivities, loadedTrainings, registrations, stageScores, stages, championships, weapons, modalities]);

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
  }, [singleAthlete, startD, endD, loadedTrainings, registrations, stageScores, stages, championships, weapons, modalities]);

  const totalClubActivities = useMemo(() => {
    return globalData.reduce((acc, curr) => acc + curr.activities.length, 0);
  }, [globalData]);

  const getAthleteAddress = (athlete: User) => {
    return [
      athlete.address,
      athlete.addressNumber,
      athlete.neighborhood,
      athlete.city && athlete.state ? `${athlete.city}, ${athlete.state}` : (athlete.city || athlete.state || ''),
      athlete.cep ? `CEP: ${athlete.cep}` : ''
    ].filter(Boolean).join(', ') || 'Não informado';
  };

  const getAthleteRegNum = (athlete: User) => {
    return athlete.bookNumber || (athlete.legacyId ? String(athlete.legacyId).padStart(4, '0') : (athlete.id ? athlete.id.replace(/\D/g, '').slice(-4).padStart(4, '0') : '0002'));
  };

  const slug = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  // HTML Template Generators for direct PDF export
  const generateAthleteDeclarationHtml = (athlete: User, activities: HabitualityItem[]): string => {
    const athleteAddr = getAthleteAddress(athlete);
    const athleteRegNum = getAthleteRegNum(athlete);
    const affiliationDateExtensive = formatExtensiveDate(athlete.clubAffiliationDate || athlete.memberSince || (athlete as any).createdAt);

    // Garante ordenação cronológica crescente em todas as páginas do PDF
    const sortedActivities = [...activities].sort((a, b) => {
      const timeA = a.rawDate instanceof Date ? a.rawDate.getTime() : new Date(a.rawDate).getTime();
      const timeB = b.rawDate instanceof Date ? b.rawDate.getTime() : new Date(b.rawDate).getTime();
      return timeA - timeB;
    });

    const activitiesHtml = sortedActivities.length > 0
      ? sortedActivities.map((item, idx) => `
        <div style="border: 1px solid #0f172a; margin-bottom: 8px; page-break-inside: avoid; overflow: hidden; background-color: #ffffff;">
          <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; color: #0f172a;">
            <tbody>
              <tr style="border-bottom: 1px solid #0f172a; background-color: #f8fafc;">
                <td colspan="6" style="padding: 4px 8px; font-weight: bold; text-transform: uppercase; font-size: 10px; text-align: left;">
                  Nome do evento: ${item.eventName}
                </td>
              </tr>
              <tr style="border-bottom: 1px solid #0f172a;">
                <td colspan="6" style="padding: 4px 8px; font-weight: 500; font-size: 9px; text-align: left; color: #334155;">
                  Arma utilizada: ${item.weaponClass} - ${item.model} - N° ${item.weaponNumber} - ${item.manufacturer} - Calibre: ${item.caliber} - ${item.permissionStatus}
                </td>
              </tr>
              <tr style="background-color: #f1f5f9; font-weight: bold; font-size: 8.5px; text-align: center; border-bottom: 1px solid #0f172a; text-transform: uppercase;">
                <td style="border-right: 1px solid #0f172a; padding: 4px; width: 45px;">Ordem</td>
                <td style="border-right: 1px solid #0f172a; padding: 4px; width: 80px;">Data</td>
                <td style="border-right: 1px solid #0f172a; padding: 4px; width: 60px;">Hora</td>
                <td style="border-right: 1px solid #0f172a; padding: 4px; width: 100px;">Sigma</td>
                <td style="border-right: 1px solid #0f172a; padding: 4px; width: 85px;">Qtd Munições</td>
                <td style="padding: 4px;">Tipo de Evento</td>
              </tr>
              <tr style="text-align: center; font-family: monospace; font-size: 9.5px; border-bottom: 1px solid #0f172a;">
                <td style="border-right: 1px solid #0f172a; padding: 4px; font-weight: bold;">${String(idx + 1).padStart(2, '0')}</td>
                <td style="border-right: 1px solid #0f172a; padding: 4px;">${item.dateFormatted}</td>
                <td style="border-right: 1px solid #0f172a; padding: 4px;">${item.timeFormatted}</td>
                <td style="border-right: 1px solid #0f172a; padding: 4px;">${item.sigma}</td>
                <td style="border-right: 1px solid #0f172a; padding: 4px; font-weight: bold;">${item.shotsCount}</td>
                <td style="padding: 4px; font-family: Arial, sans-serif; font-weight: 600; color: #1e293b;">${item.eventType}</td>
              </tr>
              <tr style="border-bottom: 1px solid #0f172a; font-size: 9px;">
                <td colspan="3" style="border-right: 1px solid #0f172a; padding: 3px 8px; font-weight: 500; text-align: left;">
                  Arma: ${item.weaponOwnerText}
                </td>
                <td colspan="3" style="padding: 3px 8px; font-weight: 500; text-align: left;">
                  Munições: ${item.ammoOwnerText}
                </td>
              </tr>
              <tr>
                <td colspan="6" style="padding: 3px 8px; font-weight: 500; text-transform: uppercase; font-size: 9px; text-align: left;">
                  Evento: ${item.eventName}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `).join('')
      : `
        <div style="padding: 12px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; font-size: 10.5px; color: #64748b; background-color: #f8fafc; margin-bottom: 12px;">
          Nenhum treinamento ou participação em competição registrado no período de ${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}.
        </div>
      `;

    return `
      <div style="padding: 20px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; background: #ffffff; box-sizing: border-box;">
        <!-- Official Timbre Header -->
        <div style="text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 10px;">
          <h1 style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; margin: 0; line-height: 1.3;">
            Declaração de habitualidade COMPROVAÇÃO DE PARTICIPAÇÕES EM TREINAMENTOS E/OU COMPETIÇÕES DE TIRO
          </h1>
          <p style="font-size: 10.5px; font-weight: bold; color: #334155; margin: 2px 0 0 0;">
            (art. 35 do Decreto nº 11.615/2023)
          </p>
        </div>

        <!-- Official Declaration Text -->
        <div style="text-align: justify; font-size: 10.5px; line-height: 1.5; color: #1e293b; margin-bottom: 12px;">
          <p style="margin: 0;">
            <strong>${clubName}</strong>, Nome Fantasia: <strong>${clubFantasy}</strong>, CR: Nº <strong>${clubCr}</strong> inscrito no CNPJ sob o nº <strong>${clubCnpj}</strong>, com endereço sede, na <strong>${clubAddress}</strong>, <strong>DECLARA</strong>, para fim de comprovação junto ao Exército Brasileiro e a Polícia Federal, que, <strong>${athlete.fullName}</strong>, CPF <strong>${athlete.cpf || 'Não informado'}</strong>, CR <strong>${athlete.crNumber || '000.330.311-00'}</strong>, com endereço: <strong>${athleteAddr}</strong> está regularmente inscrito nesta entidade sob o nº <strong>${athleteRegNum}</strong>, datado de <strong>${affiliationDateExtensive}</strong> e que participou de treinamentos/competições que justificam a aquisição de munição/insumos pleiteada/pleiteados. <strong>O TREINAMENTO FOI REALIZADO CONFORME DESCRIÇÕES</strong>
          </p>
        </div>

        <!-- Habituality Cards -->
        ${activitiesHtml}

        <!-- Signatures & Footer -->
        <div style="margin-top: 16px; padding-top: 10px; border-top: 1px solid #cbd5e1; page-break-inside: avoid; text-align: center;">
          <p style="font-size: 10px; color: #1e293b; margin: 0 0 3px 0;">Atestamos a veracidade e exatidão dos registros de habitualidade acima especificados.</p>
          <p style="font-size: 10px; color: #334155; margin: 0 0 16px 0;">${clubCityState}, ${new Date().toLocaleDateString('pt-BR')}.</p>

          <div style="display: inline-block; text-align: center; font-size: 9.5px; margin-top: 6px;">
            <div style="height: 1px; background-color: #475569; width: 250px; margin: 0 auto 5px auto;"></div>
            <span style="font-weight: bold; color: #0f172a; display: block;">Oficial de Segurança de Estande / Controle de Frequência</span>
            <span style="color: #64748b; display: block; margin-top: 2px;">Homologação de Frequência ${clubFantasy}</span>
            <span style="color: #94a3b8; font-family: monospace; font-size: 8px; display: block; margin-top: 3px;">
              Registro de Autenticidade: REG-GG-HAB-${currentClub?.id?.replace(/\D/g, '') || '01'}-${athlete.id.slice(0, 6).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    `;
  };

  const generateFiliacaoDeclarationHtml = (athlete: User): string => {
    const athleteAddr = getAthleteAddress(athlete);
    const athleteRegNum = getAthleteRegNum(athlete);

    return `
      <div style="padding: 24px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f172a; background: #ffffff; box-sizing: border-box;">
        <!-- Header -->
        <div style="text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 10px; margin-bottom: 20px;">
          <h1 style="font-size: 13.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; margin: 0; line-height: 1.3;">
            DECLARAÇÃO DE FILIAÇÃO AO CLUBE DE TIRO
          </h1>
          <p style="font-size: 11px; font-weight: bold; color: #334155; margin: 4px 0 0 0;">
            Comprovação de Associação Ativa Regular
          </p>
        </div>

        <!-- Declaration Body -->
        <div style="text-align: justify; font-size: 11.5px; line-height: 1.8; color: #1e293b; margin: 24px 0 32px 0;">
          <p style="margin-bottom: 16px;">
            Declaramos, para os devidos fins de direito junto ao Sistema de Fiscalização de Produtos Controlados (SFPC) do Exército Brasileiro e à Polícia Federal, que <strong>${athlete.fullName}</strong>, inscrito no CPF sob o nº <strong>${athlete.cpf || 'Não informado'}</strong> e portador do Certificado de Registro (CR) nº <strong>${athlete.crNumber || 'Emissão pendente'}</strong>, é filiado ativo regular sob o registro nº <strong>${athleteRegNum}</strong> nesta entidade de tiro desportivo <strong>${clubName}</strong> (Nome Fantasia: <strong>${clubFantasy}</strong>), CNPJ: <strong>${clubCnpj}</strong>, CR nº <strong>${clubCr}</strong>.
          </p>
          <p style="margin-bottom: 16px;">
            O referido atleta encontra-se em dia com suas obrigações estatutárias, anuidade e normas de segurança estabelecidas pela legislação vigente.
          </p>
        </div>

        <!-- Signatures -->
        <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #cbd5e1; page-break-inside: avoid; text-align: center;">
          <p style="font-size: 11px; color: #1e293b; margin: 0 0 4px 0;">Atestamos a veracidade e exatidão das informações acima especificadas.</p>
          <p style="font-size: 11px; color: #334155; margin: 0 0 24px 0;">${clubCityState}, ${new Date().toLocaleDateString('pt-BR')}.</p>

          <div style="display: inline-block; text-align: center; font-size: 10px; margin-top: 10px;">
            <div style="height: 1px; background-color: #475569; width: 260px; margin: 0 auto 6px auto;"></div>
            <span style="font-weight: bold; color: #0f172a; display: block;">Diretoria / Oficial de Segurança do Clube</span>
            <span style="color: #64748b; display: block; margin-top: 2px;">Homologação Oficial ${clubFantasy}</span>
            <span style="color: #94a3b8; font-family: monospace; font-size: 8px; display: block; margin-top: 4px;">
              Registro de Autenticidade: REG-GG-DEC-${currentClub?.id?.replace(/\D/g, '') || '01'}-${athlete.id.slice(0, 6).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    `;
  };

  // Direct PDF Download Handlers (No preview modal, direct binary download to Downloads folder)
  const handleDirectDownloadGlobal = async () => {
    if (globalData.length === 0 || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    setPdfProgress('');
    try {
      const sortedGlobalData = [...globalData].sort((a, b) =>
        (a.athlete.fullName || '').localeCompare(b.athlete.fullName || '')
      );

      const sections = sortedGlobalData.map(({ athlete, activities }) =>
        generateAthleteDeclarationHtml(athlete, activities)
      );

      const filename = sanitizePdfFilename(`relatorio_global_habitualidades_${slug(clubFantasy)}_${startDate}_a_${endDate}`);

      await downloadMultiSectionPdfFromHtml(sections, {
        filename,
        orientation: 'portrait',
        margin: [6, 6, 6, 6],
        onProgress: (current, total) => {
          setPdfProgress(`Gerando PDF (${current}/${total} atletas)...`);
        }
      });
    } catch (err) {
      console.error('Erro ao gerar relatório global em PDF:', err);
      alert('Erro ao gerar o arquivo PDF. Por favor tente novamente.');
    } finally {
      setIsDownloadingPdf(false);
      setPdfProgress('');
    }
  };

  const handleDirectDownloadIndividual = async () => {
    if (!singleAthlete || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      const pageHtml = declarationType === 'habitualidade'
        ? generateAthleteDeclarationHtml(singleAthlete, singleAthleteActivities)
        : generateFiliacaoDeclarationHtml(singleAthlete);

      const filename = sanitizePdfFilename(`declaracao_${declarationType}_${slug(singleAthlete.fullName || 'atleta')}_${startDate}_a_${endDate}`);

      await downloadPdfFromHtml(pageHtml, {
        filename,
        orientation: 'portrait',
        margin: [6, 6, 6, 6]
      });
    } catch (err) {
      console.error('Erro ao gerar declaração em PDF:', err);
      alert('Erro ao gerar o arquivo PDF. Por favor tente novamente.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Direct Excel Export Handlers
  const handleExportSummaryExcel = () => {
    if (globalData.length === 0) return;
    exportClubHabitualitiesSummaryToExcel({
      club: {
        name: clubName,
        fantasyName: clubFantasy,
        crNumber: clubCr,
        cnpj: clubCnpj,
        cityState: clubCityState
      },
      startDate,
      endDate,
      globalData
    });
  };

  const handleExportCompleteExcel = () => {
    if (globalData.length === 0) return;
    exportClubHabitualitiesCompleteToExcel({
      club: {
        name: clubName,
        fantasyName: clubFantasy,
        crNumber: clubCr,
        cnpj: clubCnpj,
        cityState: clubCityState
      },
      startDate,
      endDate,
      globalData
    });
  };

  const handleExportIndividualExcel = () => {
    if (!singleAthlete || singleAthleteActivities.length === 0) return;
    exportIndividualHabitualityToExcel({
      club: {
        name: clubName,
        fantasyName: clubFantasy,
        crNumber: clubCr,
        cnpj: clubCnpj,
        cityState: clubCityState
      },
      startDate,
      endDate,
      athlete: singleAthlete,
      activities: singleAthleteActivities
    });
  };

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
            <div className="flex flex-col gap-1.5 pb-1">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={onlyWithActivities}
                  onChange={e => {
                    const checked = e.target.checked;
                    setOnlyWithActivities(checked);
                    if (checked) setOnlyWithoutActivities(false);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                Apenas com habitualidades
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer font-medium select-none">
                <input
                  type="checkbox"
                  checked={onlyWithoutActivities}
                  onChange={e => {
                    const checked = e.target.checked;
                    setOnlyWithoutActivities(checked);
                    if (checked) setOnlyWithActivities(false);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                Apenas sem habitualidade
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
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleExportSummaryExcel}
                disabled={globalData.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Exportar planilha resumo com atletas, CPF, CR, total de habitualidades e status de regularidade"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel (Resumo)
              </button>
              <button
                type="button"
                onClick={handleExportCompleteExcel}
                disabled={globalData.length === 0}
                className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Exportar planilha detalhada com todos os registros individuais de habitualidades, armas, calibres, tiros e eventos"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel (Completo)
              </button>
              <button
                type="button"
                onClick={handleDirectDownloadGlobal}
                disabled={globalData.length === 0 || isDownloadingPdf}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {pdfProgress || `Gerando PDF (${globalData.length} atletas)...`}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Baixar Relatório Global (PDF)
                  </>
                )}
              </button>
            </div>
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
                <div className="flex items-center gap-2">
                  {declarationType === 'habitualidade' && (
                    <button
                      type="button"
                      onClick={handleExportIndividualExcel}
                      disabled={singleAthleteActivities.length === 0}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Exportar comprovações de habitualidade deste atleta em planilha Excel"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Exportar Excel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDirectDownloadIndividual}
                    disabled={isDownloadingPdf}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2 px-4 rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    {isDownloadingPdf ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Baixar Declaração (PDF)
                      </>
                    )}
                  </button>
                </div>
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
    </div>
  );
}
