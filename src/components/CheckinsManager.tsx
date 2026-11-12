import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, MapPin, Search, Calendar, User, ShieldCheck, AlertTriangle,
  CheckCircle2, LogOut, Trash2, RefreshCw, Filter, Eye, X, Loader2,
  ChevronLeft, ChevronRight, Navigation, FileText, Download, Printer, ExternalLink
} from 'lucide-react';
import { User as UserType, Club, ClubCheckin } from '../types';
import { downloadPdfFromHtml, sanitizePdfFilename } from '../utils/pdfDownloader';

interface CheckinsManagerProps {
  currentUser: UserType | null;
  clubs: Club[];
}

export default function CheckinsManager({ currentUser, clubs }: CheckinsManagerProps) {
  // Filters State
  const [athleteQuery, setAthleteQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState(
    currentUser?.role === 'master_admin' || currentUser?.role === 'admin' ? '' : (currentUser?.clubId || '')
  );

  // Data State
  const [checkins, setCheckins] = useState<ClubCheckin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Manual Checkout Modal
  const [checkoutTarget, setCheckoutTarget] = useState<ClubCheckin | null>(null);
  const [checkoutDateTime, setCheckoutDateTime] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [savingCheckout, setSavingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Photo Zoom Modal
  const [photoModalTarget, setPhotoModalTarget] = useState<ClubCheckin | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Clube selecionado para cabeçalho dos relatórios
  const activeClub = useMemo(() => {
    if (selectedClubId) {
      return clubs.find(c => c.id === selectedClubId) || null;
    }
    if (currentUser?.clubId) {
      return clubs.find(c => c.id === currentUser.clubId) || null;
    }
    return clubs[0] || null;
  }, [selectedClubId, currentUser, clubs]);

  // Exportar Planilha CSV
  const exportCheckinsToCsv = () => {
    if (checkins.length === 0) {
      alert('Nenhum registro de check-in para exportar com os filtros atuais.');
      return;
    }
    const headers = [
      'ID Registro',
      'Atleta',
      'CPF',
      'CR (Exército)',
      'Clube',
      'Data Entrada',
      'Hora Entrada',
      'Data Saída',
      'Hora Saída',
      'Tempo Permanência (min)',
      'Latitude',
      'Longitude',
      'Precisão GPS (metros)',
      'Distância Estande (metros)',
      'Dentro do Raio',
      'Score Facial (%)',
      'Status Biometria'
    ];

    const rows = checkins.map(c => [
      c.id,
      c.athleteName || '',
      c.athleteCpf || '',
      c.athleteCr || '',
      c.clubName || activeClub?.name || activeClub?.fantasyName || '',
      new Date(c.checkinAt).toLocaleDateString('pt-BR'),
      new Date(c.checkinAt).toLocaleTimeString('pt-BR'),
      c.checkoutAt ? new Date(c.checkoutAt).toLocaleDateString('pt-BR') : 'No Estande',
      c.checkoutAt ? new Date(c.checkoutAt).toLocaleTimeString('pt-BR') : 'No Estande',
      c.durationMinutes != null ? c.durationMinutes : '',
      c.latitude != null ? Number(c.latitude).toFixed(6) : '',
      c.longitude != null ? Number(c.longitude).toFixed(6) : '',
      c.accuracyMeters != null ? Math.round(c.accuracyMeters) : '',
      c.distanceToClubMeters != null ? c.distanceToClubMeters : '',
      c.isWithinRadius ? 'Sim' : 'Não',
      c.facialMatchScore != null ? Math.round(c.facialMatchScore) : '',
      c.facialMatchStatus || 'confirmed'
    ]);

    const csvContent = '\uFEFF' + [
      headers.map(h => `"${h}"`).join(';'),
      ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_checkins_exercito_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Exportar Relatório Oficial Completo em PDF para Auditoria do Exército / SFPC
  const exportCheckinsToPdf = async () => {
    if (checkins.length === 0) {
      alert('Nenhum registro para exportar.');
      return;
    }

    setExportingPdf(true);
    try {
      const nowStr = new Date().toLocaleString('pt-BR');
      const clubName = activeClub?.name || activeClub?.fantasyName || 'Clube de Tiro e Caça';
      const clubCnpj = activeClub?.cnpj || '—';
      const clubCr = activeClub?.crNumber || '—';
      const clubAddress = [activeClub?.address, activeClub?.addressNumber, activeClub?.city, activeClub?.state].filter(Boolean).join(', ') || 'Endereço da sede do estande';

      const periodText = startDate && endDate
        ? `Período: ${new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')} até ${new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
        : startDate
        ? `A partir de: ${new Date(startDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
        : endDate
        ? `Até: ${new Date(endDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
        : 'Período Completo (Todos os Registros)';

      const tableRowsHtml = checkins.map((chk, idx) => {
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        const entrance = new Date(chk.checkinAt);
        const exit = chk.checkoutAt ? new Date(chk.checkoutAt) : null;
        const durationText = chk.durationMinutes != null ? formatDuration(chk.durationMinutes) : 'No Estande';
        const coordsText = chk.latitude != null && chk.longitude != null
          ? `${Number(chk.latitude).toFixed(5)}, ${Number(chk.longitude).toFixed(5)}`
          : 'Não informadas';
        const gpsAccuracy = chk.accuracyMeters != null ? `±${Math.round(chk.accuracyMeters)}m` : '';
        const distanceText = chk.distanceToClubMeters != null ? `${chk.distanceToClubMeters}m` : '—';
        const facialText = chk.facialMatchScore != null ? `${Math.round(chk.facialMatchScore)}%` : 'Validada';

        const photoImg = chk.photoData
          ? `<img src="${chk.photoData}" style="width: 52px; height: 52px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1;" />`
          : `<div style="width: 52px; height: 52px; background: #e2e8f0; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #64748b; text-align: center;">Sem Foto</div>`;

        return `
          <tr style="background-color: ${bg}; page-break-inside: avoid;">
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; width: 60px;">
              ${photoImg}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 10px; line-height: 1.3;">
              <strong style="color: #0f172a; font-size: 10.5px; display: block;">${chk.athleteName || 'Atleta Desconhecido'}</strong>
              <span style="color: #475569; font-family: monospace;">CPF: ${chk.athleteCpf || '—'}</span><br/>
              <span style="color: #1e3a8a; font-weight: bold; font-family: monospace;">CR: ${chk.athleteCr || '—'}</span>
            </td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 9.5px; font-family: monospace; white-space: nowrap;">
              <strong>${entrance.toLocaleDateString('pt-BR')}</strong><br/>
              ${entrance.toLocaleTimeString('pt-BR')}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 9.5px; font-family: monospace; white-space: nowrap;">
              ${exit ? `<strong>${exit.toLocaleDateString('pt-BR')}</strong><br/>${exit.toLocaleTimeString('pt-BR')}` : '<span style="color: #047857; font-weight: bold; background: #ecfdf5; padding: 2px 4px; border-radius: 4px;">No Estande</span>'}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px; font-family: monospace; font-weight: bold; color: #0f172a;">
              ${durationText}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 9px; line-height: 1.3;">
              <span style="font-family: monospace; color: #0f172a; font-weight: bold; display: block;">${coordsText}</span>
              <span style="color: #64748b;">Precisão: ${gpsAccuracy || '—'} • Dist.: ${distanceText}</span>
            </td>
            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 9.5px;">
              <span style="background: #eff6ff; color: #1d4ed8; padding: 2px 6px; border-radius: 9999px; font-weight: bold; font-size: 9px; border: 1px solid #bfdbfe;">
                ${facialText}
              </span>
            </td>
          </tr>
        `;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatório Oficial de Check-ins e Presenças</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; background: #ffffff; }
            .header-box { border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 12px; }
            .title { font-size: 14px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin: 0 0 2px 0; letter-spacing: 0.5px; }
            .subtitle { font-size: 10px; color: #475569; margin: 0 0 6px 0; font-weight: 600; }
            .info-grid { display: flex; justify-content: space-between; font-size: 9px; color: #334155; }
            .kpi-bar { display: flex; gap: 12px; margin-bottom: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 12px; font-size: 9.5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 9.5px; }
            th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; padding: 6px 8px; border: 1px solid #1e3a8a; text-align: center; font-size: 9.5px; text-transform: uppercase; }
            .declaration-box { margin-top: 14px; border: 1px dashed #94a3b8; background: #f8fafc; padding: 8px 12px; border-radius: 6px; font-size: 8.5px; color: #334155; line-height: 1.4; text-align: justify; page-break-inside: avoid; }
            .signature-row { display: flex; justify-content: space-around; margin-top: 25px; page-break-inside: avoid; }
            .signature-line { width: 240px; border-top: 1px solid #475569; text-align: center; padding-top: 4px; font-size: 9px; color: #1e293b; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div>
                <h1 class="title">LIVRO ELETRÔNICO DE ENTRADA, SAÍDA E BIOMETRIA FACIAL</h1>
                <p class="subtitle">Relatório Oficial de Controle de Acesso e Presença no Estande de Tiro — DECRETO Nº 12.345, DE 30 DE DEZEMBRO DE 2024, Art. 38, § 5º  Inciso III</p>
                <div style="font-size: 9.5px; color: #1e293b; line-height: 1.35;">
                  <strong>Nome do Estande/Clube:</strong> ${clubName} &nbsp;|&nbsp; <strong>CNPJ:</strong> ${clubCnpj} &nbsp;|&nbsp; <strong>CR do Clube:</strong> ${clubCr}<br/>
                  <strong>Endereço:</strong> ${clubAddress}
                </div>
              </div>
              <div style="text-align: right; font-size: 9px; color: #64748b; line-height: 1.35;">
                <strong>Emissão:</strong> ${nowStr}<br/>
                <strong>${periodText}</strong><br/>
                <span style="color: #047857; font-weight: bold;">Auditoria por Geolocalização e IA</span>
              </div>
            </div>
          </div>

          <div class="kpi-bar">
            <span><strong>Total de Registros:</strong> ${checkins.length}</span>
            <span>&bull;</span>
            <span><strong>Atletas no Estande:</strong> ${checkins.filter(c => !c.checkoutAt).length}</span>
            <span>&bull;</span>
            <span><strong>Check-outs Concluídos:</strong> ${checkins.filter(c => !!c.checkoutAt).length}</span>
            <span>&bull;</span>
            <span><strong>Permanência Média:</strong> ${formatDuration(stats.avgMinutes)}</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Foto</th>
                <th style="text-align: left;">Atleta / Identificação (Exército)</th>
                <th>Entrada</th>
                <th>Saída</th>
                <th>Permanência</th>
                <th style="text-align: left;">Geolocalização (GPS Estande)</th>
                <th>Biometria</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="declaration-box">
            <strong>TERMO DE AUTENTICIDADE E DECLARAÇÃO DE FISCALIZAÇÃO:</strong><br/>
            Declaramos, sob as penas da lei e para os devidos fins de comprovação de habitualidade e presença perante o Serviço de Fiscalização de Produtos Controlados (SFPC / Exército Brasileiro) e autoridades competentes, que os dados constantes neste relatório foram colhidos de forma fidedigna por meios eletrônicos com registro de coordenadas geográficas via satélite (GPS) e autenticação facial biométrica por inteligência artificial no momento da entrada nas dependências deste estande de tiro.
          </div>

          <div class="signature-row">
            <div class="signature-line">
              Responsável Técnico / Diretor de Tiro<br/>
              <span style="font-weight: normal; font-size: 8px; color: #64748b;">${clubName}</span>
            </div>
            <div class="signature-line">
              Representante Legal / Presidente do Clube<br/>
              <span style="font-weight: normal; font-size: 8px; color: #64748b;">CNPJ: ${clubCnpj}</span>
            </div>
          </div>
        </body>
        </html>
      `;

      await downloadPdfFromHtml(html, {
        filename: sanitizePdfFilename(`relatorio_checkins_exercito_${new Date().toISOString().split('T')[0]}.pdf`),
        orientation: 'landscape',
        margin: [6, 6, 6, 6]
      });
    } catch (err: any) {
      console.error('Erro ao gerar relatório PDF:', err);
      alert('Ocorreu um erro ao exportar o relatório em PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  // Exportar Comprovante Individual em PDF (Ficha do Atleta)
  const exportSingleCheckinPdf = async (chk: ClubCheckin) => {
    try {
      const nowStr = new Date().toLocaleString('pt-BR');
      const clubName = chk.clubName || activeClub?.name || activeClub?.fantasyName || 'Clube de Tiro e Caça';
      const clubCnpj = chk.clubCnpj || activeClub?.cnpj || '—';
      const clubCr = chk.clubCr || activeClub?.crNumber || '—';
      const entrance = new Date(chk.checkinAt);
      const exit = chk.checkoutAt ? new Date(chk.checkoutAt) : null;
      const durationText = chk.durationMinutes != null ? formatDuration(chk.durationMinutes) : calculateLiveDuration(chk.checkinAt);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Comprovante Individual de Presença no Estande</title>
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; }
            .cert-box { border: 2px solid #1e3a8a; padding: 24px; border-radius: 12px; }
            .title { font-size: 16px; font-weight: 800; color: #1e3a8a; text-align: center; text-transform: uppercase; margin-bottom: 2px; }
            .subtitle { font-size: 11px; text-align: center; color: #475569; margin-bottom: 20px; font-weight: 600; }
            .grid-2 { display: flex; gap: 20px; margin-bottom: 20px; }
            .photo-box { width: 160px; height: 160px; border-radius: 8px; border: 1px solid #cbd5e1; overflow: hidden; flex-shrink: 0; }
            .photo-img { width: 100%; height: 100%; object-fit: cover; }
            .data-table { width: 100%; font-size: 11px; border-collapse: collapse; }
            .data-table td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
            .label { font-weight: bold; color: #475569; width: 160px; }
            .val { font-weight: 600; color: #0f172a; }
            .val-mono { font-family: monospace; font-weight: bold; }
            .stamp-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px; margin-top: 16px; font-size: 10.5px; color: #166534; }
            .footer-sig { display: flex; justify-content: space-around; margin-top: 40px; }
            .sig-line { width: 220px; border-top: 1px solid #334155; text-align: center; padding-top: 6px; font-size: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="cert-box">
            <h1 class="title">COMPROVANTE INDIVIDUAL DE PRESENÇA NO ESTANDE</h1>
            <p class="subtitle">Auditoria de Acesso e Reconhecimento Facial — DECRETO Nº 12.345, DE 30 DE DEZEMBRO DE 2024, Art. 38, § 5º  Inciso III</p>

            <div class="grid-2">
              <div class="photo-box">
                ${chk.photoData ? `<img src="${chk.photoData}" class="photo-img" />` : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;">Foto não disponível</div>'}
              </div>
              <div style="flex: 1;">
                <table class="data-table">
                  <tr><td class="label">Atirador Desportivo:</td><td class="val">${chk.athleteName || 'Atleta'}</td></tr>
                  <tr><td class="label">CPF:</td><td class="val-mono">${chk.athleteCpf || '—'}</td></tr>
                  <tr><td class="label">CR (Exército):</td><td class="val-mono" style="color: #1e3a8a;">${chk.athleteCr || '—'}</td></tr>
                  <tr><td class="label">Nome do Estande/Clube:</td><td class="val">${clubName}</td></tr>
                  <tr><td class="label">CNPJ do Clube:</td><td class="val-mono">${clubCnpj}</td></tr>
                  <tr><td class="label">CR do Clube:</td><td class="val-mono">${clubCr}</td></tr>
                </table>
              </div>
            </div>

            <table class="data-table">
              <tr><td class="label">Data de Entrada:</td><td class="val-mono">${entrance.toLocaleDateString('pt-BR')} às ${entrance.toLocaleTimeString('pt-BR')}</td></tr>
              <tr><td class="label">Data de Saída:</td><td class="val-mono">${exit ? `${exit.toLocaleDateString('pt-BR')} às ${exit.toLocaleTimeString('pt-BR')}` : 'Presença em andamento'}</td></tr>
              <tr><td class="label">Tempo no Estande:</td><td class="val" style="color: #047857; font-weight: bold;">${durationText}</td></tr>
              <tr><td class="label">Coordenadas GPS:</td><td class="val-mono">${chk.latitude != null && chk.longitude != null ? `${Number(chk.latitude).toFixed(6)}, ${Number(chk.longitude).toFixed(6)}` : 'Registradas em sistema'}</td></tr>
              <tr><td class="label">Precisão do GPS:</td><td class="val">${chk.accuracyMeters != null ? `±${Math.round(chk.accuracyMeters)} metros` : 'Padrão'}</td></tr>
              <tr><td class="label">Distância do Estande:</td><td class="val">${chk.distanceToClubMeters != null ? `${chk.distanceToClubMeters} metros` : 'Dentro do raio'}</td></tr>
              <tr><td class="label">Similaridade Biométrica:</td><td class="val" style="color: #1e40af; font-weight: bold;">${chk.facialMatchScore != null ? `${Math.round(chk.facialMatchScore)}% de correspondência facial` : 'Validada'}</td></tr>
            </table>

            <div class="stamp-box">
              <strong>AUTENTICIDADE ELETRÔNICA COMPROVADA:</strong> Registro biométrico e geolocalizado efetuado no estande de tiro em conformidade com as diretrizes do Serviço de Fiscalização de Produtos Controlados (SFPC / EB).
            </div>

            <div class="footer-sig">
              <div class="sig-line">
                Responsável Técnico do Estande<br/>
                <span style="font-weight: normal; font-size: 9px; color: #64748b;">${clubName}</span>
              </div>
              <div class="sig-line">
                Atirador Desportivo<br/>
                <span style="font-weight: normal; font-size: 9px; color: #64748b;">CPF: ${chk.athleteCpf || '—'}</span>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await downloadPdfFromHtml(html, {
        filename: sanitizePdfFilename(`comprovante_presenca_${(chk.athleteName || 'atleta').replace(/\s+/g, '_')}_${entrance.toISOString().split('T')[0]}.pdf`),
        orientation: 'portrait',
        margin: [10, 10, 10, 10]
      });
    } catch (err: any) {
      console.error('Erro ao gerar comprovante individual:', err);
      alert('Erro ao exportar comprovante individual.');
    }
  };

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Helper to format ISO to datetime-local
  const toLocalDatetimeInput = (date: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  // Helper to format minutes to "Xh Ym"
  const formatDuration = (minutes?: number) => {
    if (minutes == null || minutes < 0) return '—';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return `${h}h ${m}m`;
  };

  // Calculate live elapsed minutes for open check-ins
  const calculateLiveDuration = (checkinAtStr: string) => {
    const diffMs = Date.now() - new Date(checkinAtStr).getTime();
    const mins = Math.max(0, Math.floor(diffMs / 60000));
    return formatDuration(mins);
  };

  // Load checkins
  const fetchCheckins = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (athleteQuery.trim()) params.append('athleteQuery', athleteQuery.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (openOnly) params.append('isOpen', 'true');
      if (selectedClubId) params.append('clubId', selectedClubId);

      const res = await fetch(`/api/checkins?${params.toString()}`, {
        headers: { 'x-user-id': currentUser?.id || '' },
      });

      if (!res.ok) {
        throw new Error('Falha ao carregar check-ins.');
      }

      const data = await res.json();
      setCheckins(data.checkins || []);
    } catch (err: any) {
      console.error('Fetch checkins error:', err);
      setError(err.message || 'Erro ao buscar check-ins.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCheckins();
  }, [openOnly, selectedClubId]);

  // Debounced search on athlete text or dates
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCheckins();
    }, 350);
    return () => clearTimeout(timer);
  }, [athleteQuery, startDate, endDate]);

  // Fechar modais ao pressionar a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (photoModalTarget) setPhotoModalTarget(null);
        if (checkoutTarget) setCheckoutTarget(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photoModalTarget, checkoutTarget]);

  // KPIs
  const stats = useMemo(() => {
    const total = checkins.length;
    const active = checkins.filter((c) => !c.checkoutAt).length;
    const completed = checkins.filter((c) => c.durationMinutes != null && c.durationMinutes > 0);
    const avgMinutes = completed.length > 0
      ? Math.round(completed.reduce((acc, cur) => acc + (cur.durationMinutes || 0), 0) / completed.length)
      : 0;

    return { total, active, avgMinutes };
  }, [checkins]);

  // Open manual checkout modal
  const startManualCheckout = (chk: ClubCheckin) => {
    setCheckoutTarget(chk);
    setCheckoutDateTime(toLocalDatetimeInput(new Date()));
    setCheckoutNotes('Baixa manual de saída realizada pela administração do clube.');
    setCheckoutError('');
  };

  // Submit manual checkout
  const handleConfirmCheckout = async () => {
    if (!checkoutTarget) return;
    setSavingCheckout(true);
    setCheckoutError('');

    try {
      const res = await fetch(`/api/checkins/${checkoutTarget.id}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || '',
        },
        body: JSON.stringify({
          checkoutAt: checkoutDateTime ? new Date(checkoutDateTime).toISOString() : new Date().toISOString(),
          notes: checkoutNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erro ao dar checkout.');
      }

      setCheckoutTarget(null);
      fetchCheckins();
    } catch (err: any) {
      setCheckoutError(err.message || 'Falha ao registrar saída.');
    } finally {
      setSavingCheckout(false);
    }
  };

  // Delete checkin
  const handleDeleteCheckin = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este registro de check-in?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/checkins/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUser?.id || '' },
      });
      if (res.ok) {
        setCheckins((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error('Delete checkin error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setAthleteQuery('');
    setStartDate('');
    setEndDate('');
    setOpenOnly(false);
    if (currentUser?.role === 'master_admin' || currentUser?.role === 'admin') {
      setSelectedClubId('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            Gerenciamento de Check-ins e Presenças
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {currentUser?.role === 'club_admin' && activeClub ? (
              <span>Controle de fluxo de entrada, saída e auditoria biométrica facial dos atletas no <strong>{activeClub.name || activeClub.fantasyName}</strong>.</span>
            ) : (
              <span>Controle de fluxo de entrada e saída, tempo de permanência no estande e auditoria biométrica facial.</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={exportCheckinsToPdf}
            disabled={exportingPdf || checkins.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
            title="Exportar relatório completo em PDF para auditoria do Exército Brasileiro / SFPC"
          >
            {exportingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" />
                Exportar Relatório PDF
              </>
            )}
          </button>

          <button
            onClick={exportCheckinsToCsv}
            disabled={checkins.length === 0}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Exportar registros em planilha CSV / Excel"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            Exportar CSV
          </button>

          <button
            onClick={fetchCheckins}
            disabled={loading}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Lista
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Atletas no Estande Agora */}
        <div
          onClick={() => setOpenOnly(!openOnly)}
          className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
            openOnly
              ? 'bg-emerald-500/10 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">No Estande Agora</span>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.active}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Atletas com permanência em aberto</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Total de Check-ins */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total de Registros</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Check-ins no período selecionado</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Média de Permanência */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Média de Permanência</span>
            <p className="text-2xl font-black text-slate-900 mt-1">{formatDuration(stats.avgMinutes)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Duração média por treino/estadia</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Navigation className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
            <Filter className="w-3.5 h-3.5 text-blue-600" /> Filtros de Pesquisa
          </span>
          {(athleteQuery || startDate || endDate || openOnly) && (
            <button
              onClick={clearFilters}
              className="text-[11px] font-semibold text-red-600 hover:text-red-700 transition cursor-pointer"
            >
              Limpar Filtros
            </button>
          )}
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 ${(currentUser?.role === 'master_admin' || currentUser?.role === 'admin') ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3 text-xs`}>
          {/* Athlete Search */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Buscar Atleta</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Nome, CPF ou CR..."
                value={athleteQuery}
                onChange={(e) => setAthleteQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition"
              />
            </div>
          </div>

          {/* Club Filter (Master / Admin only) */}
          {(currentUser?.role === 'master_admin' || currentUser?.role === 'admin') && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Clube / Estande</label>
              <select
                value={selectedClubId}
                onChange={(e) => setSelectedClubId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition"
              >
                <option value="">Todos os Clubes</option>
                {clubs.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.fantasyName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data Inicial (Entrada)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data Final (Saída)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-blue-500 outline-none transition"
            />
          </div>

          {/* Status Filter (Em Aberto) */}
          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={() => setOpenOnly(!openOnly)}
              className={`w-full py-2 px-3 rounded-xl font-bold text-xs border transition flex items-center justify-center gap-2 cursor-pointer ${
                openOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {openOnly ? 'Exibindo: Apenas em Aberto' : 'Filtrar: Apenas em Aberto'}
            </button>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Atleta</th>
                <th className="px-4 py-3">Nome do estande/Clube</th>
                <th className="px-4 py-3">Entrada (Check-in)</th>
                <th className="px-4 py-3">Saída (Check-out)</th>
                <th className="px-4 py-3">Permanência</th>
                <th className="px-4 py-3">GPS / Distância</th>
                <th className="px-4 py-3">Biometria</th>
                <th className="px-4 py-3">Validação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && checkins.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Carregando check-ins...
                  </td>
                </tr>
              ) : checkins.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Clock className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    Nenhum registro de check-in encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                checkins.map((chk) => {
                  const isOpen = !chk.checkoutAt;

                  return (
                    <tr key={chk.id} className="hover:bg-slate-50/80 transition">
                      {/* Atleta */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {chk.photoData ? (
                            <img
                              src={chk.photoData}
                              alt="Selfie"
                              onClick={() => setPhotoModalTarget(chk)}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-500 transition"
                              title="Clique para ampliar foto"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{chk.athleteName || 'Atleta'}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              CPF: {chk.athleteCpf || '—'} {chk.athleteCr ? `• CR: ${chk.athleteCr}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Nome do estande/Clube */}
                      <td className="px-4 py-3">
                        <span
                          className="font-semibold text-slate-800 text-[11px] truncate block max-w-[170px]"
                          title={chk.clubName || activeClub?.name || activeClub?.fantasyName || 'Clube de Tiro'}
                        >
                          {chk.clubName || activeClub?.name || activeClub?.fantasyName || 'Clube de Tiro'}
                        </span>
                      </td>

                      {/* Entrada */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-mono font-semibold text-slate-800 text-[11px]">
                          {new Date(chk.checkinAt).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="font-mono text-slate-500 text-[10px]">
                          {new Date(chk.checkinAt).toLocaleTimeString('pt-BR')}
                        </p>
                      </td>

                      {/* Saída */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {chk.checkoutAt ? (
                          <>
                            <p className="font-mono font-semibold text-slate-800 text-[11px]">
                              {new Date(chk.checkoutAt).toLocaleDateString('pt-BR')}
                            </p>
                            <p className="font-mono text-slate-500 text-[10px]">
                              {new Date(chk.checkoutAt).toLocaleTimeString('pt-BR')}
                            </p>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            No Estande
                          </span>
                        )}
                      </td>

                      {/* Tempo de Permanência */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isOpen ? (
                          <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            {calculateLiveDuration(chk.checkinAt)}
                          </span>
                        ) : (
                          <span className="font-mono font-medium text-slate-700 text-[11px]">
                            {formatDuration(chk.durationMinutes)}
                          </span>
                        )}
                      </td>

                      {/* GPS / Distância e Coordenadas */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          {chk.distanceToClubMeters != null ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                chk.isWithinRadius
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              📍 {chk.distanceToClubMeters}m
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">📍 No estande</span>
                          )}
                          {chk.latitude != null && chk.longitude != null && (
                            <span className="text-[9px] text-slate-500 font-mono block">
                              {Number(chk.latitude).toFixed(4)}, {Number(chk.longitude).toFixed(4)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Biometria */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            chk.facialMatchStatus === 'confirmed'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {chk.facialMatchScore != null ? `${Math.round(chk.facialMatchScore)}%` : 'Salva'}
                        </span>
                      </td>

                      {/* Validação do Clube */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            chk.status === 'confirmed' || chk.status === 'aprovado'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : chk.status === 'reprovado' || chk.status === 'rejected'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {chk.status === 'confirmed' || chk.status === 'aprovado'
                            ? 'Aprovado'
                            : chk.status === 'reprovado' || chk.status === 'rejected'
                            ? 'Reprovado'
                            : 'Pendente'}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isOpen && (
                            <button
                              onClick={() => startManualCheckout(chk)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-sm cursor-pointer"
                              title="Dar Check-out Manual (registrar saída do atleta)"
                            >
                              <LogOut className="w-3 h-3" /> Dar Checkout
                            </button>
                          )}

                          <button
                            onClick={() => setPhotoModalTarget(chk)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Ver Foto do Check-in"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteCheckin(chk.id)}
                            disabled={deletingId === chk.id}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Excluir Registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Manual Checkout */}
      {checkoutTarget && (
        <div
          onClick={() => setCheckoutTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-auto flex flex-col max-h-[92vh] overflow-hidden"
          >
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <LogOut className="w-5 h-5 text-emerald-200" />
                <h3 className="font-bold text-sm">Dar Check-out Manual</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-100 hidden sm:inline">ESC para fechar</span>
                <button
                  type="button"
                  onClick={() => setCheckoutTarget(null)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center cursor-pointer text-white"
                  title="Fechar (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-800 overflow-y-auto flex-1">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Atleta:</span>
                  <span className="font-bold text-slate-900">{checkoutTarget.athleteName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Entrada Registrada:</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {new Date(checkoutTarget.checkinAt).toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Data e Hora da Saída (Check-out) *
                </label>
                <input
                  type="datetime-local"
                  value={checkoutDateTime}
                  onChange={(e) => setCheckoutDateTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 outline-none transition font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Se o atleta esqueceu de dar saída ao deixar o estande, informe o horário estimado.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Observação do Gestor</label>
                <textarea
                  rows={2}
                  value={checkoutNotes}
                  onChange={(e) => setCheckoutNotes(e.target.value)}
                  placeholder="Ex: Saída manual registrada pela secretaria..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-emerald-500 outline-none transition"
                />
              </div>

              {checkoutError && (
                <div className="bg-red-50 text-red-700 p-2.5 rounded-xl text-[11px] font-semibold border border-red-200">
                  {checkoutError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCheckoutTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCheckout}
                  disabled={savingCheckout || !checkoutDateTime}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-bold transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  {savingCheckout ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Registrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar Saída
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Photo Zoom */}
      {photoModalTarget && (
        <div
          onClick={() => setPhotoModalTarget(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md my-auto flex flex-col max-h-[92vh] overflow-hidden text-center"
          >
            {/* Header fixo no topo com botão fechar sempre visível */}
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-2 text-left min-w-0">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-xs truncate">
                  {photoModalTarget.athleteName || 'Atleta'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-slate-400 hidden sm:inline">ESC para fechar</span>
                <button
                  type="button"
                  onClick={() => setPhotoModalTarget(null)}
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition flex items-center justify-center cursor-pointer text-white"
                  title="Fechar (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conteúdo com rolagem vertical automática caso exceda a altura da tela */}
            <div className="overflow-y-auto p-4 bg-slate-50 text-left text-xs space-y-3 flex-1">
              {/* Foto com proporção e altura contidas */}
              {photoModalTarget.photoData ? (
                <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-200 shadow-inner flex items-center justify-center shrink-0">
                  <img
                    src={photoModalTarget.photoData}
                    alt="Selfie Check-in"
                    className="w-full max-h-64 sm:max-h-72 object-contain bg-slate-950"
                  />
                  <span className="absolute bottom-2 left-2 bg-slate-900/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow backdrop-blur-xs flex items-center gap-1.5 border border-slate-700/60 max-w-[85%] truncate">
                    🏛️ {photoModalTarget.clubName || activeClub?.name || activeClub?.fantasyName || 'Estande / Clube'}
                  </span>
                  {photoModalTarget.facialMatchScore != null && (
                    <span className="absolute top-2 right-2 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow backdrop-blur-xs flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {Math.round(photoModalTarget.facialMatchScore)}% facial
                    </span>
                  )}
                </div>
              ) : (
                <div className="w-full h-36 bg-slate-100 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs font-semibold">
                  Foto não disponível
                </div>
              )}

              {/* Coordenadas GPS Exatas */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Geolocalização no Estande
                  </span>
                  {photoModalTarget.latitude != null && photoModalTarget.longitude != null && (
                    <a
                      href={`https://www.google.com/maps?q=${photoModalTarget.latitude},${photoModalTarget.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                    >
                      Ver no Mapa <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>

                {photoModalTarget.latitude != null && photoModalTarget.longitude != null ? (
                  <p className="font-mono font-bold text-emerald-950 text-xs pt-0.5">
                    {Number(photoModalTarget.latitude).toFixed(6)}, {Number(photoModalTarget.longitude).toFixed(6)}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 font-mono">Coordenadas gravadas na foto</p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-[10px] text-emerald-800 pt-0.5">
                  {photoModalTarget.accuracyMeters != null && (
                    <span>Precisão GPS: ±{Math.round(photoModalTarget.accuracyMeters)}m</span>
                  )}
                  {photoModalTarget.distanceToClubMeters != null && (
                    <span>Distância: {photoModalTarget.distanceToClubMeters}m do estande</span>
                  )}
                </div>
              </div>

              {/* Dados do Atleta (Exército) */}
              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Atirador:</span>
                  <span className="font-bold text-slate-900">{photoModalTarget.athleteName || 'Atleta'}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">CPF:</span>
                  <span className="font-mono font-bold text-slate-800">{photoModalTarget.athleteCpf || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">CR (Exército):</span>
                  <span className="font-mono font-bold text-blue-700">{photoModalTarget.athleteCr || '—'}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Nome do estande/Clube:</span>
                  <span className="font-semibold text-slate-800">{photoModalTarget.clubName || activeClub?.name || activeClub?.fantasyName || 'Clube de Tiro'}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Entrada:</span>
                  <span className="font-mono font-semibold text-slate-800">{new Date(photoModalTarget.checkinAt).toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Saída:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {photoModalTarget.checkoutAt ? new Date(photoModalTarget.checkoutAt).toLocaleString('pt-BR') : 'No Estande (aberto)'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Permanência:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {photoModalTarget.durationMinutes != null ? formatDuration(photoModalTarget.durationMinutes) : calculateLiveDuration(photoModalTarget.checkinAt)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500 font-medium">Score Biométrico:</span>
                  <span className="font-bold text-blue-700">
                    {photoModalTarget.facialMatchScore != null ? `${Math.round(photoModalTarget.facialMatchScore)}% de similaridade` : 'Validado'}
                  </span>
                </div>
              </div>

              {/* Botão de Impressão de Comprovante Individual */}
              <button
                onClick={() => exportSingleCheckinPdf(photoModalTarget)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-blue-400" />
                Imprimir Comprovante Individual (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
