import React, { useState, useEffect } from 'react';
import { User, Club, Registration, Championship, StageScore, Stage, Modality } from '../types';
import { Award, Search, Printer, CheckCircle2, QrCode, FileText, X, Filter } from 'lucide-react';
import { TextElement } from './ClubTemplatesManager';

interface ClubCertificatesViewerProps {
  currentUser: User | null;
  clubs: Club[];
  users: User[];
  registrations: Registration[];
  championships: Championship[];
  stages: Stage[];
  stageScores: StageScore[];
  modalities: Modality[];
}

interface CertificatePrintModalData {
  athleteName: string;
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

export function ClubCertificatesViewer({
  currentUser,
  clubs,
  users,
  registrations,
  championships,
  stages,
  stageScores,
  modalities
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

  // Fetch custom template when opening modal for a club
  useEffect(() => {
    if (activeCert) {
      setLoadingTemplate(true);
      fetch(`/api/club-templates?clubId=${activeCert.clubId}`)
        .then(r => r.json())
        .then(data => {
          if (data.templates && Array.isArray(data.templates)) {
            const certTmpl = data.templates.find((t: any) => t.template_type === 'certificate');
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

  // Filter approved registrations for the selected club
  const eligibleRegistrations = registrations.filter(r => {
    // Only approved registrations qualify for certificates
    if (r.paymentStatus !== 'approved') return false;

    // Filter by club
    if (effectiveClubId && r.clubId && r.clubId !== effectiveClubId) {
      // Check if user belongs to club
      const athlete = users.find(u => u.id === r.userId);
      if (athlete?.clubId !== effectiveClubId && r.registeredByUserId !== currentUser?.id) {
        return false;
      }
    }

    // Filter by championship dropdown
    if (selectedChampFilter && r.championshipId !== selectedChampFilter) {
      return false;
    }

    // Filter by search query (athlete name, cpf, cr)
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
    const printableArea = document.getElementById('printable-certificate-area')?.outerHTML;
    if (!printableArea) return;

    const originalContent = document.body.innerHTML;
    document.body.innerHTML = `
      <div style="width: 100%; display: flex; justify-content: center; align-items: center; padding: 0; margin: 0;">
        ${printableArea}
      </div>
    `;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  // Dynamic token replacement for active certificate
  const renderDynamicToken = (text: string, cert: CertificatePrintModalData) => {
    const clubObj = clubs.find(c => c.id === cert.clubId);
    return text
      .replace(/{NOME_ATLETA}/g, cert.athleteName)
      .replace(/{CR_ATLETA}/g, cert.crNumber)
      .replace(/{NOME_CLUBE}/g, clubObj?.name || 'Clube de Tiro')
      .replace(/{CAMPEONATO}/g, cert.championshipTitle)
      .replace(/{ETAPA}/g, `${cert.stageCount} Etapa(s) Homologada(s)`)
      .replace(/{MODALIDADE}/g, cert.modalityName)
      .replace(/{PONTOS}/g, cert.totalScore.toFixed(2))
      .replace(/{POSICAO_GERAL}/g, cert.posicao)
      .replace(/{MEDALHA}/g, cert.medalha)
      .replace(/{POSICAO_CATEGORIA}/g, cert.posicao)
      .replace(/{LOCAL_PROVA}/g, clubObj?.name || 'Clube de Tiro')
      .replace(/{CIDADE}/g, clubObj?.city || 'Brasília')
      .replace(/{UF}/g, clubObj?.state || 'DF')
      .replace(/{CNPJ_CLUBE}/g, clubObj?.cnpj || '-')
      .replace(/{CR_CLUBE}/g, clubObj?.crNumber || '-')
      .replace(/{DATA_EMISSAO_EXTENSO}/g, new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }))
      .replace(/{CODIGO_VALIDACAO}/g, cert.hash);
  };

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
        {isMaster && (
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

            // Compute athlete scores for this championship
            const userScores = stageScores.filter(s => s.userId === reg.userId && s.championshipId === reg.championshipId && s.modalityId === reg.modalityId);
            const totalScore = userScores.reduce((sum, s) => sum + s.score, 0);
            const bestHitFactor = userScores.length > 0 ? Math.max(...userScores.map(s => s.hitFactor || 0)) : 0;
            const stageCount = userScores.length > 0 ? userScores.length : 1;

            const certData: CertificatePrintModalData = {
              athleteName: athlete?.fullName || 'Atleta G&G',
              crNumber: reg.crNumber || athlete?.crNumber || '572103',
              championshipTitle: champ?.title || 'Campeonato G&G',
              modalityName: modName,
              stageCount: stageCount,
              totalScore: totalScore,
              bestHitFactor: bestHitFactor,
              posicao: 'Geral',
              medalha: 'HOMOLOGADO',
              hash: `GG-CERT-${reg.id.slice(0, 10).toUpperCase()}`,
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
                      <div>Pontuação: <strong className="text-blue-700">{totalScore.toFixed(2)} pts</strong></div>
                      <div>Etapas Disputadas: <strong className="text-slate-800">{stageCount}</strong></div>
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
                <h3 className="font-display font-bold text-slate-900 text-base">Gerar Certificado de Participação</h3>
                <p className="text-xs text-slate-400">Certificado gerado com os dados oficiais do atleta e layout do clube.</p>
              </div>
              <button
                onClick={() => setActiveCert(null)}
                className="text-slate-400 hover:text-slate-650 transition cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingTemplate ? (
              <div className="py-12 text-center text-slate-400 text-xs">Carregando modelo do clube...</div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4">
                {/* Printable Certificate Box */}
                <div
                  id="printable-certificate-area"
                  style={{
                    width: '100%',
                    maxWidth: '750px',
                    minHeight: '520px',
                    position: 'relative',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '24px'
                  }}
                >
                  {/* Background Layer */}
                  {clubTemplate?.background_url ? (
                    <img
                      src={clubTemplate.background_url}
                      alt="Fundo Certificado"
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none opacity-90"
                    />
                  ) : (
                    <div className="absolute inset-0 border-8 border-double border-amber-600/60 m-2 pointer-events-none"></div>
                  )}

                  {/* Overlaid Layout Content */}
                  {clubTemplate?.layout_config?.elements && clubTemplate.layout_config.elements.length > 0 ? (
                    <div className="relative z-10 w-full h-[500px]">
                      {clubTemplate.layout_config.elements.map((el) => {
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
                              <div className="flex flex-col items-center justify-center p-1 bg-white border border-slate-300 rounded">
                                <QrCode className="w-12 h-12 text-slate-900" />
                              </div>
                            ) : (
                              <span>{renderDynamicToken(el.text, activeCert)}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Default G&G Certificate Layout */
                    <div className="relative z-10 w-full p-6 text-center space-y-4 font-sans text-slate-800">
                      <div className="space-y-1">
                        <span className="font-mono text-[10px] text-amber-700 font-bold tracking-widest block uppercase">G&G COMPETIÇÕES</span>
                        <h2 className="font-display font-extrabold text-2xl text-slate-900 uppercase">Certificado de Participação</h2>
                        <div className="h-0.5 bg-amber-600 w-20 mx-auto"></div>
                      </div>

                      <div className="text-xs text-slate-700 leading-relaxed max-w-xl mx-auto space-y-3">
                        <p>
                          Certificamos que o(a) Atleta Desportivo(a) <strong className="text-slate-900 text-sm">{activeCert.athleteName}</strong>, inscrito(a) sob o CR nº <strong className="font-mono">{activeCert.crNumber}</strong>, participou das etapas homologadas do campeonato:
                        </p>
                        <p className="font-bold text-blue-900 text-sm bg-blue-50 py-2 px-4 rounded-lg border border-blue-100 uppercase">
                          {activeCert.championshipTitle}
                        </p>
                        <p>
                          Disputando na modalidade <strong className="text-slate-900">{activeCert.modalityName}</strong> e acumulando o total de <strong className="text-amber-700 font-mono text-sm">{activeCert.totalScore.toFixed(2)} pontos</strong>.
                        </p>
                      </div>

                      <div className="pt-4 flex justify-between items-center text-[10px] text-slate-500 font-mono border-t border-slate-200">
                        <span>CÓD: {activeCert.hash}</span>
                        <span>Emissão: {new Date().toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  )}
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
                    Imprimir Certificado PDF
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
