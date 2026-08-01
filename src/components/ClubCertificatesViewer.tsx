import React, { useState, useEffect } from 'react';
import { User, Club, Registration, Championship, StageScore, Stage, Modality } from '../types';
import { Award, Search, Printer, CheckCircle2, QrCode, FileText, X, Filter } from 'lucide-react';
import { TextElement } from './ClubTemplatesManager';
import { QRCodeView } from './QRCodeView';

interface ClubCertificatesViewerProps {
  currentUser: User | null;
  clubs: Club[];
  users: User[];
  registrations: Registration[];
  championships: Championship[];
  stages: Stage[];
  stageScores: StageScore[];
  modalities: Modality[];
  restrictedToUserId?: string;
}

interface CertificatePrintModalData {
  athleteName: string;
  cpfNumber: string;
  rgNumber: string;
  crNumber: string;
  championshipTitle: string;
  modalityName: string;
  stageCount: number;
  totalScore: number;
  bestHitFactor: number;
  posicao: string;
  medalha: string;
  hash: string;
  clubId: string;
}

const DEFAULT_CERTIFICATE_ELEMENTS: TextElement[] = [
  {
    id: 'c1',
    text: 'O {NOME_CLUBE}, através da Plataforma G&G Competições, no uso das suas atribuições, confere o presente CERTIFICADO para o Atleta de Tiro Desportivo,',
    x: 10,
    y: 22,
    fontSize: 13,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#334155',
    textAlign: 'center',
    width: 80
  },
  {
    id: 'c2',
    text: '{NOME_ATLETA}',
    x: 10,
    y: 38,
    fontSize: 26,
    fontWeight: '900',
    fontStyle: 'normal',
    color: '#0f172a',
    textAlign: 'center',
    width: 80
  },
  {
    id: 'c3',
    text: '{POSICAO_GERAL} geral com {PONTOS} pontos - Classificação {MEDALHA}',
    x: 10,
    y: 48,
    fontSize: 16,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#b45309',
    textAlign: 'center',
    width: 80
  },
  {
    id: 'c4',
    text: '{ETAPA}\n{CAMPEONATO}\n{MODALIDADE}',
    x: 10,
    y: 58,
    fontSize: 13,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#1e293b',
    textAlign: 'center',
    width: 80
  },
  {
    id: 'c5',
    text: 'Data de realização: {DATA_INICIO} A {DATA_FIM}\nLocal da prova: {LOCAL_PROVA} - {CIDADE}/{UF}',
    x: 10,
    y: 70,
    fontSize: 11,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#475569',
    textAlign: 'center',
    width: 80
  },
  {
    id: 'c6',
    text: '{CIDADE}, {DATA_EMISSAO_EXTENSO}.',
    x: 10,
    y: 79,
    fontSize: 11,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#334155',
    textAlign: 'center',
    width: 80
  },
  {
    id: 'c7',
    text: '{QR_CODE}',
    x: 44,
    y: 84,
    fontSize: 12,
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#000000',
    textAlign: 'center',
    width: 12
  },
  {
    id: 'c8',
    text: 'CÓDIGO DE VALIDAÇÃO: {CODIGO_VALIDACAO}',
    x: 10,
    y: 95,
    fontSize: 10,
    fontWeight: 'bold',
    fontStyle: 'normal',
    color: '#64748b',
    textAlign: 'center',
    width: 80
  }
];

export function ClubCertificatesViewer({
  currentUser,
  clubs,
  users,
  registrations,
  championships,
  stages,
  stageScores,
  modalities,
  restrictedToUserId
}: ClubCertificatesViewerProps) {
  const [selectedClubId, setSelectedClubId] = useState<string>(currentUser?.clubId || clubs[0]?.id || 'c1');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChampFilter, setSelectedChampFilter] = useState('');

  // Selected item for modal certificate view
  const [activeCert, setActiveCert] = useState<CertificatePrintModalData | null>(null);
  const [clubTemplate, setClubTemplate] = useState<{ background_url: string; layout_config?: { elements?: TextElement[] } } | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  const isMaster = currentUser?.role === 'master_admin';
  const effectiveClubId = isMaster ? selectedClubId : (currentUser?.clubId || selectedClubId);

  // Fetch custom template when opening modal for a club with automatic fallback
  useEffect(() => {
    if (activeCert) {
      setLoadingTemplate(true);
      const targetClubId = activeCert.clubId || selectedClubId || 'c1';

      fetch(`/api/club-templates?clubId=${targetClubId}`, {
        headers: { 'x-user-id': currentUser?.id || '' }
      })
        .then(r => r.json())
        .then(async data => {
          let certTmpl = data.templates?.find((t: any) => t.template_type === 'certificate' && t.background_url);
          
          if (!certTmpl) {
            try {
              const res2 = await fetch(`/api/club-templates?clubId=c1`, {
                headers: { 'x-user-id': currentUser?.id || '' }
              }).then(r => r.json());
              certTmpl = res2.templates?.find((t: any) => t.template_type === 'certificate' && t.background_url);
            } catch (e) {}
          }

          if (!certTmpl && data.templates?.length > 0) {
            certTmpl = data.templates.find((t: any) => t.template_type === 'certificate');
          }

          if (certTmpl) {
            let parsedLayout = certTmpl.layout_config;
            if (typeof parsedLayout === 'string') {
              try { parsedLayout = JSON.parse(parsedLayout); } catch (e) {}
            }
            setClubTemplate({
              background_url: certTmpl.background_url || '',
              layout_config: parsedLayout
            });
          } else {
            setClubTemplate(null);
          }
        })
        .catch(err => {
          console.error(err);
          setClubTemplate(null);
        })
        .finally(() => setLoadingTemplate(false));
    }
  }, [activeCert]);

  const getModalityName = (mId: string) => modalities.find(m => m.id === mId)?.name || mId;
  const getChampTitle = (cId: string) => championships.find(c => c.id === cId)?.title || 'Campeonato G&G';

  // Helper function to calculate ranking, scores, and medals for a championship & modality
  const computeAthletePerformance = (
    userId: string,
    userName: string,
    championshipId: string,
    modalityId: string,
    registrationId?: string,
    stageId?: string
  ) => {
    const modObj = modalities.find(m => m.id === modalityId);
    const champObj = championships.find(c => c.id === championshipId);
    const targetStage = stages.find(s => s.id === stageId);
    const targetStageNum = targetStage?.stageNum;
    const modName = modObj?.name || '';

    // Get all scores for this championship & modality (filtered by stage if stageId is provided)
    const matchingScores = stageScores.filter(s =>
      s.championshipId === championshipId &&
      ((s as any).modalityId === modalityId || (modName && s.modality?.toLowerCase() === modName.toLowerCase())) &&
      (targetStageNum ? s.stageNum === targetStageNum : true)
    );

    // Group scores by athlete/registration
    const athleteMap: Record<string, {
      userId: string;
      registrationId: string;
      shooterName: string;
      totalScore: number;
      hitFactor: number;
      stageCount: number;
      scoreX: number;
      scoreP10: number;
      scoreP9: number;
    }> = {};

    for (const s of matchingScores) {
      const reg = registrations.find(r => r.id === s.registrationId || (r.userId === s.userId && r.championshipId === championshipId && r.modalityId === modalityId));
      const u = users.find(usr => usr.id === (reg?.userId || s.userId) || (usr.fullName && s.shooterName && usr.fullName.toLowerCase() === s.shooterName.toLowerCase()));
      
      const key = u?.id || s.userId || reg?.userId || (s.shooterName ? s.shooterName.toLowerCase() : 'unknown');

      if (!athleteMap[key]) {
        athleteMap[key] = {
          userId: u?.id || s.userId || reg?.userId || '',
          registrationId: reg?.id || s.registrationId || '',
          shooterName: u?.fullName || s.shooterName || '',
          totalScore: 0,
          hitFactor: 0,
          stageCount: 0,
          scoreX: 0,
          scoreP10: 0,
          scoreP9: 0
        };
      }

      athleteMap[key].totalScore += (s.score || 0);
      athleteMap[key].hitFactor = Math.max(athleteMap[key].hitFactor, s.hitFactor || 0);
      athleteMap[key].stageCount += 1;
      if (reg) {
        athleteMap[key].scoreX += (reg.scoreX || 0);
        athleteMap[key].scoreP10 += (reg.scoreP10 || 0);
        athleteMap[key].scoreP9 += (reg.scoreP9 || 0);
      }
    }

    // Also include any approved registrations for this stage that have totalPoints recorded on reg
    for (const r of registrations) {
      if (r.championshipId === championshipId && r.modalityId === modalityId && (stageId ? r.stageId === stageId : true) && r.paymentStatus === 'approved') {
        const u = users.find(usr => usr.id === r.userId);
        const key = u?.id || r.userId || (u?.fullName ? u.fullName.toLowerCase() : 'unknown');
        if (!athleteMap[key] && (r.totalPoints || 0) > 0) {
          athleteMap[key] = {
            userId: u?.id || r.userId || '',
            registrationId: r.id,
            shooterName: u?.fullName || '',
            totalScore: r.totalPoints || 0,
            hitFactor: r.idscTotalSeconds || 0,
            stageCount: 1,
            scoreX: r.scoreX || 0,
            scoreP10: r.scoreP10 || 0,
            scoreP9: r.scoreP9 || 0
          };
        }
      }
    }

    // Sort ranking list using exact tie-breakers as CompetitionResultsViewer
    const sortedList = Object.values(athleteMap).sort((a, b) => {
      if (modObj?.evaluationType === 'tempo') {
        return a.totalScore - b.totalScore;
      } else if (modObj?.evaluationType === 'pontuacao_tempo') {
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

    // Find target athlete position in overall ranking
    const overallRankIndex = sortedList.findIndex(item =>
      (userId && item.userId === userId) ||
      (registrationId && item.registrationId === registrationId) ||
      (userName && item.shooterName.toLowerCase() === userName.toLowerCase())
    );

    const overallPosNum = overallRankIndex >= 0 ? overallRankIndex + 1 : 1;
    const targetPerf = overallRankIndex >= 0 ? sortedList[overallRankIndex] : null;

    const totalScore = targetPerf ? targetPerf.totalScore : 0;
    const stageCount = targetPerf && targetPerf.stageCount > 0 ? targetPerf.stageCount : 1;
    const bestHitFactor = targetPerf ? targetPerf.hitFactor : 0;

    // Determine medal: check championship minimum cutoffs first
    const goldMin = champObj?.pontuacaoMinimaAtletaOuro || 0;
    const silverMin = champObj?.pontuacaoMinimaAtletaPrata || 0;
    const bronzeMin = champObj?.pontuacaoMinimaAtletaBronze || 0;

    let medalhaStr = 'HOMOLOGADO';
    if (goldMin > 0 && totalScore >= goldMin) {
      medalhaStr = 'OURO';
    } else if (silverMin > 0 && totalScore >= silverMin) {
      medalhaStr = 'PRATA';
    } else if (bronzeMin > 0 && totalScore >= bronzeMin) {
      medalhaStr = 'BRONZE';
    } else {
      // Fallback by rank if no cutoffs defined
      if (overallPosNum === 1) medalhaStr = 'OURO';
      else if (overallPosNum === 2) medalhaStr = 'PRATA';
      else if (overallPosNum === 3) medalhaStr = 'BRONZE';
    }

    // Filter sortedList for athletes in the same medal category
    const sameMedalList = sortedList.filter(item => {
      if (goldMin > 0 || silverMin > 0 || bronzeMin > 0) {
        if (medalhaStr === 'OURO' && goldMin > 0) return item.totalScore >= goldMin;
        if (medalhaStr === 'PRATA' && silverMin > 0) return item.totalScore >= silverMin && (goldMin > 0 ? item.totalScore < goldMin : true);
        if (medalhaStr === 'BRONZE' && bronzeMin > 0) return item.totalScore >= bronzeMin && (silverMin > 0 ? item.totalScore < silverMin : goldMin > 0 ? item.totalScore < goldMin : true);
      }
      return true;
    });

    const categoryRankIndex = sameMedalList.findIndex(item =>
      (userId && item.userId === userId) ||
      (registrationId && item.registrationId === registrationId) ||
      (userName && item.shooterName.toLowerCase() === userName.toLowerCase())
    );
    const categoryPosNum = categoryRankIndex >= 0 ? categoryRankIndex + 1 : overallPosNum;

    // Use category position when medal cutoffs exist so the award position matches category rank (e.g. 3º Ouro)
    const displayPosNum = (goldMin > 0 || silverMin > 0 || bronzeMin > 0) && sameMedalList.length > 0
      ? categoryPosNum
      : overallPosNum;

    const posicaoStr = `${displayPosNum}º`;

    return {
      positionNum: displayPosNum,
      posicaoStr,
      posicaoGeralStr: `${overallPosNum}º`,
      posicaoCategoriaStr: `${categoryPosNum}º`,
      totalScore,
      stageCount,
      bestHitFactor,
      medalhaStr
    };
  };

  // Filter approved registrations for the selected club (or restricted athlete)
  const eligibleRegistrations = registrations.filter(r => {
    if (r.paymentStatus !== 'approved') return false;

    if (restrictedToUserId) {
      if (r.userId !== restrictedToUserId) return false;
    } else if (effectiveClubId && r.clubId && r.clubId !== effectiveClubId) {
      const athlete = users.find(u => u.id === r.userId);
      if (athlete?.clubId !== effectiveClubId && r.registeredByUserId !== currentUser?.id) {
        return false;
      }
    }

    if (selectedChampFilter && r.championshipId !== selectedChampFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const athlete = users.find(u => u.id === r.userId);
      const nameMatch = athlete?.fullName?.toLowerCase().includes(q);
      const cpfMatch = athlete?.cpf?.toLowerCase().includes(q);
      const crMatch = r.crNumber?.toLowerCase().includes(q) || athlete?.crNumber?.toLowerCase().includes(q);
      const champMatch = getChampTitle(r.championshipId).toLowerCase().includes(q);
      const modMatch = getModalityName(r.modalityId).toLowerCase().includes(q);

      if (!nameMatch && !cpfMatch && !crMatch && !champMatch && !modMatch) {
        return false;
      }
    }

    return true;
  });

  const handlePrintCertificate = () => {
    let styleElem = document.getElementById('cert-print-style');
    if (!styleElem) {
      styleElem = document.createElement('style');
      styleElem.id = 'cert-print-style';
      styleElem.innerHTML = `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-certificate-area, #printable-certificate-area * {
            visibility: visible !important;
          }
          #printable-certificate-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-width: none !important;
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            z-index: 999999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `;
      document.head.appendChild(styleElem);
    }
    window.print();
  };

  // Dynamic token replacement for active certificate
  const renderDynamicToken = (text: string, cert: CertificatePrintModalData) => {
    const clubObj = clubs.find(c => c.id === cert.clubId);
    const champObj = championships.find(c => c.title === cert.championshipTitle);
    const startDateFormatted = champObj?.startDate ? new Date(champObj.startDate).toLocaleDateString('pt-BR') : '01/01/2023';
    const endDateFormatted = champObj?.endDate ? new Date(champObj.endDate).toLocaleDateString('pt-BR') : '31/12/2023';

    return text
      .replace(/{NOME_ATLETA}/g, cert.athleteName)
      .replace(/{CPF_ATLETA}/g, cert.cpfNumber)
      .replace(/{RG_ATLETA}/g, cert.rgNumber)
      .replace(/{CR_ATLETA}/g, cert.crNumber)
      .replace(/{NOME_CLUBE}/g, clubObj?.name || 'Clube de Tiro Aranãs')
      .replace(/{CAMPEONATO}/g, cert.championshipTitle)
      .replace(/{ETAPA}/g, `${cert.stageCount} Etapa(s) Homologada(s)`)
      .replace(/{MODALIDADE}/g, cert.modalityName)
      .replace(/{POSICAO_GERAL}/g, cert.posicao)
      .replace(/{POSICAO}/g, cert.posicao)
      .replace(/{MEDALHA}/g, cert.medalha)
      .replace(/{POSICAO_CATEGORIA}/g, cert.posicao)
      .replace(/{DATA_INICIO}/g, startDateFormatted)
      .replace(/{DATA_FIM}/g, endDateFormatted)
      .replace(/{LOCAL_PROVA}/g, clubObj?.name || 'Clube de Tiro Aranãs')
      .replace(/{CIDADE}/g, clubObj?.city || 'Capelinha')
      .replace(/{UF}/g, clubObj?.state || 'MG')
      .replace(/{CNPJ_CLUBE}/g, clubObj?.cnpj || '-')
      .replace(/{CR_CLUBE}/g, clubObj?.crNumber || '-')
      .replace(/{DATA_EMISSAO_EXTENSO}/g, new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }))
      .replace(/{CODIGO_VALIDACAO}/g, cert.hash);
  };

  const renderElements = clubTemplate?.layout_config?.elements && clubTemplate.layout_config.elements.length > 0
    ? clubTemplate.layout_config.elements
    : DEFAULT_CERTIFICATE_ELEMENTS;

  return (
    <div className="bg-white rounded-2xl smooth-shadow border border-slate-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-display font-bold text-slate-900 text-base flex items-center gap-2">
            <Award className="w-5 h-5 text-blue-600" />
            Certificados de Participação em Campeonatos
          </h3>
          <p className="text-xs text-slate-400">
            Gere e imprima os certificados oficiais dos atletas com base nas suas participações nas etapas.
          </p>
        </div>

        {/* Master Club Selector */}
        {!restrictedToUserId && isMaster && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500">Clube:</label>
            <select
              value={selectedClubId}
              onChange={e => setSelectedClubId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 outline-none font-bold"
            >
              {clubs.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search input */}
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Pesquisar por nome do atleta, CR, CPF ou modalidade..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Championship Select Filter */}
        <div className="relative">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <select
            value={selectedChampFilter}
            onChange={e => setSelectedChampFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">Todos os Campeonatos</option>
            {championships.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Athlete Certificates Grid */}
      {eligibleRegistrations.length === 0 ? (
        <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
          <Award className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Nenhum certificado disponível para os filtros selecionados.</p>
          <p className="text-[10px] text-slate-400">Verifique a pesquisa pelo nome do atleta ou selecione outro campeonato.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {eligibleRegistrations.map((reg) => {
            const athlete = users.find(u => u.id === reg.userId);
            const champ = championships.find(c => c.id === reg.championshipId);
            const modName = getModalityName(reg.modalityId);

            const perf = computeAthletePerformance(
              reg.userId,
              athlete?.fullName || '',
              reg.championshipId,
              reg.modalityId,
              reg.id,
              reg.stageId
            );

            const certData: CertificatePrintModalData = {
              athleteName: athlete?.fullName || 'Atleta G&G',
              cpfNumber: athlete?.cpf || '-',
              rgNumber: athlete?.rg || '-',
              crNumber: reg.crNumber || athlete?.crNumber || '572103',
              championshipTitle: champ?.title || 'Campeonato G&G',
              modalityName: modName,
              stageCount: perf.stageCount,
              totalScore: perf.totalScore,
              bestHitFactor: perf.bestHitFactor,
              posicao: perf.posicaoStr,
              medalha: perf.medalhaStr,
              hash: `GG-CERT-${reg.id.replace(/^REG_/i, '').toUpperCase()}`,
              clubId: reg.clubId || athlete?.clubId || selectedClubId
            };

            return (
              <div
                key={reg.id}
                className="border border-slate-200 rounded-2xl p-5 bg-white hover:border-blue-300 hover:shadow-md transition duration-150 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                      CERTIFICADO ELEGÍVEL
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {reg.id.slice(0, 8).toUpperCase()}</span>
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{athlete?.fullName || 'Atleta Desportivo'}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">CR nº {reg.crNumber || athlete?.crNumber || 'S/CR'}</p>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                    <p className="font-bold text-blue-900 truncate">{champ?.title || 'Campeonato'}</p>
                    <p className="text-[11px] text-slate-600">Modalidade: <strong className="text-slate-800">{modName}</strong></p>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600 pt-1 border-t border-slate-200/60">
                      <div>Pontuação: <strong className="text-blue-700">{perf.totalScore.toFixed(2)} pts</strong></div>
                      <div>Posição: <strong className="text-amber-700">{perf.posicaoStr} ({perf.medalhaStr})</strong></div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setActiveCert(certData)}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FileText className="w-4 h-4" />
                    Gerar Certificado PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CERTIFICATE PRINT / MODAL POPUP */}
      {activeCert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl relative my-8 text-slate-800">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-bold text-slate-900 text-base">Gerar Certificado de Participação (A4)</h3>
                <p className="text-xs text-slate-400">Modelo A4 gerado com os dados reais do atleta e o layout visual salvo do clube.</p>
              </div>
              <button
                onClick={() => setActiveCert(null)}
                className="text-slate-400 hover:text-slate-650 transition cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingTemplate ? (
              <div className="py-12 text-center text-slate-400 text-xs">Carregando modelo A4 do clube...</div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4">
                {/* Printable A4 Certificate Canvas Box */}
                <div
                  id="printable-certificate-area"
                  style={{
                    width: '520px',
                    height: '735px',
                    position: 'relative',
                    backgroundColor: '#ffffff',
                    backgroundImage: clubTemplate?.background_url ? `url("${clubTemplate.background_url}")` : undefined,
                    backgroundSize: '100% 100%',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    userSelect: 'none',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                  }}
                >
                  {/* Background Image Layer */}
                  {clubTemplate?.background_url ? (
                    <img
                      src={clubTemplate.background_url}
                      alt="Fundo Certificado A4"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'fill',
                        pointerEvents: 'none',
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact'
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 border-8 border-double border-amber-600/50 m-3 bg-white pointer-events-none"></div>
                  )}

                  {/* Overlaid Layout Content */}
                  {renderElements.map((el) => {
                    const isQr = el.text.trim() === '{QR_CODE}';
                    return (
                      <div
                        key={el.id}
                        style={{
                          position: 'absolute',
                          left: `${el.x}%`,
                          top: `${el.y}%`,
                          width: el.width ? `${el.width}%` : 'auto',
                          fontSize: `${el.fontSize}px`,
                          fontWeight: el.fontWeight,
                          fontStyle: el.fontStyle,
                          color: el.color,
                          textAlign: el.textAlign,
                          lineHeight: '1.3',
                          whiteSpace: 'pre-line'
                        }}
                      >
                        {isQr ? (
                          <div className="flex flex-col items-center justify-center p-1 bg-white border border-slate-300 rounded shadow-xs">
                            <QRCodeView
                              value={`${window.location.origin}/validar/certificado/${activeCert?.hash || 'validacao'}`}
                              size={55}
                            />
                          </div>
                        ) : (
                          <span>{renderDynamicToken(el.text, activeCert)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Modal Action Buttons */}
                <div className="flex gap-3 w-full pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveCert(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition text-xs cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintCertificate}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Certificado PDF (A4)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
