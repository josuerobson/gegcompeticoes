import { User, Club } from '../types';

export interface HabitualityItemExport {
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

export interface GlobalHabitualityAthlete {
  athlete: User;
  activities: HabitualityItemExport[];
}

export interface ClubExportInfo {
  name: string;
  fantasyName?: string;
  crNumber?: string;
  cnpj?: string;
  cityState?: string;
}

const slug = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

function triggerExcelDownload(html: string, filename: string) {
  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanFilename = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  a.download = cleanFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function wrapExcelHtml(title: string, content: string): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${title.slice(0, 31)}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Arial, sans-serif; }
    table { border-collapse: collapse; width: 100%; }
    th { font-family: Arial, sans-serif; }
    td { font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

/**
 * Exporta o resumo consolidado de atletas do clube (Atleta, CPF, CR, Total de Habitualidades, Status)
 */
export function exportClubHabitualitiesSummaryToExcel(params: {
  club: ClubExportInfo;
  startDate: string;
  endDate: string;
  globalData: GlobalHabitualityAthlete[];
}) {
  const { club, startDate, endDate, globalData } = params;
  const now = new Date().toLocaleString('pt-BR');
  const periodStr = `${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}`;
  const totalActivities = globalData.reduce((acc, curr) => acc + curr.activities.length, 0);

  const headers = ['Nº', 'Atleta', 'CPF', 'CR', 'Habitualidades', 'Situação Regularidade'];

  const headerCells = headers
    .map(h => `<th style="background-color:#1e3a8a;color:#ffffff;font-weight:bold;padding:8px 10px;border:1px solid #94a3b8;text-align:center;font-size:11px;">${h}</th>`)
    .join('');

  const rowCells = globalData
    .map((item, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const statusText = item.activities.length >= 8
        ? 'Regular (8+ freq.)'
        : item.activities.length > 0
          ? `${item.activities.length} freq.`
          : 'Sem registros';
      const statusColor = item.activities.length >= 8
        ? 'color:#047857;font-weight:bold;'
        : item.activities.length > 0
          ? 'color:#1d4ed8;font-weight:bold;'
          : 'color:#94a3b8;';

      return `<tr>
        <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-weight:bold;">${idx + 1}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:left;background-color:${bg};font-size:11px;font-weight:bold;color:#0f172a;">${item.athlete.fullName || '—'}</td>
        <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10.5px;font-family:monospace;">${item.athlete.cpf || '—'}</td>
        <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10.5px;font-family:monospace;">${item.athlete.crNumber || '—'}</td>
        <td style="padding:6px 8px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:11px;font-weight:bold;color:#1e40af;">${item.activities.length}</td>
        <td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10.5px;${statusColor}">${statusText}</td>
      </tr>`;
    })
    .join('');

  const content = `
    <table style="margin-bottom:14px;">
      <tr><td colspan="6" style="font-size:16px;font-weight:bold;color:#1e3a8a;">G&G Competições — Relatório Consolidado de Habitualidades do Clube</td></tr>
      <tr><td colspan="6" style="font-size:13px;font-weight:bold;color:#0f172a;">${club.name} ${club.fantasyName ? `(${club.fantasyName})` : ''}</td></tr>
      <tr><td colspan="6" style="font-size:11px;color:#334155;">CR: ${club.crNumber || 'N/A'} • CNPJ: ${club.cnpj || 'N/A'}${club.cityState ? ` • ${club.cityState}` : ''}</td></tr>
      <tr><td colspan="6" style="font-size:11px;color:#475569;">Período: ${periodStr} • Total de Atletas: ${globalData.length} • Total de Habitualidades Válidas: ${totalActivities}</td></tr>
      <tr><td colspan="6" style="font-size:10px;color:#64748b;font-style:italic;">Emitido em: ${now}</td></tr>
    </table>

    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${rowCells}</tbody>
    </table>

    <p style="font-size:9.5px;color:#94a3b8;margin-top:14px;font-style:italic;">
      Planilha oficial gerada automaticamente pelo sistema G&G Competições conforme Decreto nº 11.615/2023.
    </p>
  `;

  const filename = `relatorio_habitualidades_resumo_${slug(club.fantasyName || club.name)}_${startDate}_a_${endDate}.xls`;
  triggerExcelDownload(wrapExcelHtml('Resumo Habitualidades', content), filename);
}

/**
 * Exporta o relatório detalhado completo com todos os registros individuais de habitualidades de todos os atletas
 */
export function exportClubHabitualitiesCompleteToExcel(params: {
  club: ClubExportInfo;
  startDate: string;
  endDate: string;
  globalData: GlobalHabitualityAthlete[];
}) {
  const { club, startDate, endDate, globalData } = params;
  const now = new Date().toLocaleString('pt-BR');
  const periodStr = `${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}`;

  // Flatten all activities
  const flatActivities: { athlete: User; activity: HabitualityItemExport }[] = [];
  globalData.forEach(({ athlete, activities }) => {
    activities.forEach(activity => {
      flatActivities.push({ athlete, activity });
    });
  });

  const headers = [
    'Ordem',
    'Data',
    'Hora',
    'Atleta',
    'CPF',
    'CR',
    'Tipo de Evento',
    'Nome do Evento / Prova',
    'Modalidade',
    'Classe da Arma',
    'Arma / Modelo',
    'Calibre',
    'Nº de Série / Registro',
    'SIGMA',
    'Qtd Tiros',
    'Pontuação',
    'Origem da Arma',
    'Origem da Munição'
  ];

  const headerCells = headers
    .map(h => `<th style="background-color:#0f766e;color:#ffffff;font-weight:bold;padding:8px 8px;border:1px solid #5eead4;text-align:center;font-size:10.5px;white-space:nowrap;">${h}</th>`)
    .join('');

  const rowCells = flatActivities
    .map((item, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f0fdfa';
      const a = item.athlete;
      const act = item.activity;

      return `<tr>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-weight:bold;">${idx + 1}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;white-space:nowrap;">${act.dateFormatted}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;">${act.timeFormatted}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;background-color:${bg};font-size:10.5px;font-weight:bold;color:#0f172a;white-space:nowrap;">${a.fullName || '—'}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-family:monospace;white-space:nowrap;">${a.cpf || '—'}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-family:monospace;white-space:nowrap;">${a.crNumber || '—'}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-weight:600;color:#0f766e;">${act.eventType}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;background-color:${bg};font-size:10px;color:#334155;">${act.eventName}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;background-color:${bg};font-size:10px;color:#334155;">${act.modality || '—'}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;">${act.weaponClass || '—'}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;background-color:${bg};font-size:10px;font-weight:600;">${act.model || '—'}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-weight:bold;">${act.caliber || '—'}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-family:monospace;">${act.weaponNumber || '—'}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-family:monospace;">${act.sigma || '—'}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-weight:bold;color:#0f172a;">${act.shotsCount}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;">${act.score}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;">${act.weaponOwnerText}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;">${act.ammoOwnerText}</td>
      </tr>`;
    })
    .join('');

  const content = `
    <table style="margin-bottom:14px;">
      <tr><td colspan="${headers.length}" style="font-size:16px;font-weight:bold;color:#0f766e;">G&G Competições — Relatório Completo de Habitualidades do Clube</td></tr>
      <tr><td colspan="${headers.length}" style="font-size:13px;font-weight:bold;color:#0f172a;">${club.name} ${club.fantasyName ? `(${club.fantasyName})` : ''}</td></tr>
      <tr><td colspan="${headers.length}" style="font-size:11px;color:#334155;">CR: ${club.crNumber || 'N/A'} • CNPJ: ${club.cnpj || 'N/A'}${club.cityState ? ` • ${club.cityState}` : ''}</td></tr>
      <tr><td colspan="${headers.length}" style="font-size:11px;color:#475569;">Período: ${periodStr} • Total de Registros de Habitualidade: ${flatActivities.length} • Total de Atletas: ${globalData.length}</td></tr>
      <tr><td colspan="${headers.length}" style="font-size:10px;color:#64748b;font-style:italic;">Emitido em: ${now}</td></tr>
    </table>

    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${rowCells}</tbody>
    </table>

    <p style="font-size:9.5px;color:#94a3b8;margin-top:14px;font-style:italic;">
      Documento para auditoria e controle de comprovações de habitualidades de tiro desportivo conforme Decreto nº 11.615/2023.
    </p>
  `;

  const filename = `relatorio_habitualidades_completo_${slug(club.fantasyName || club.name)}_${startDate}_a_${endDate}.xls`;
  triggerExcelDownload(wrapExcelHtml('Detalhamento Habitualidades', content), filename);
}

/**
 * Exporta a declaração de habitualidade detalhada de um atleta específico
 */
export function exportIndividualHabitualityToExcel(params: {
  club: ClubExportInfo;
  startDate: string;
  endDate: string;
  athlete: User;
  activities: HabitualityItemExport[];
}) {
  const { club, startDate, endDate, athlete, activities } = params;
  const now = new Date().toLocaleString('pt-BR');
  const periodStr = `${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}`;

  const headers = [
    'Ordem',
    'Data',
    'Hora',
    'Tipo de Evento',
    'Nome do Evento / Prova',
    'Modalidade',
    'Classe da Arma',
    'Arma / Modelo',
    'Calibre',
    'Nº de Série / Registro',
    'SIGMA',
    'Qtd Tiros',
    'Pontuação',
    'Origem da Arma',
    'Origem da Munição'
  ];

  const headerCells = headers
    .map(h => `<th style="background-color:#1e3a8a;color:#ffffff;font-weight:bold;padding:8px 8px;border:1px solid #94a3b8;text-align:center;font-size:10.5px;white-space:nowrap;">${h}</th>`)
    .join('');

  const rowCells = activities
    .map((act, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

      return `<tr>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-weight:bold;">${idx + 1}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;white-space:nowrap;">${act.dateFormatted}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;">${act.timeFormatted}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-weight:600;color:#1e40af;">${act.eventType}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;background-color:${bg};font-size:10px;color:#334155;">${act.eventName}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;background-color:${bg};font-size:10px;color:#334155;">${act.modality || '—'}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;">${act.weaponClass || '—'}</td>
        <td style="padding:5px 8px;border:1px solid #cbd5e1;text-align:left;background-color:${bg};font-size:10px;font-weight:600;">${act.model || '—'}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-weight:bold;">${act.caliber || '—'}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-family:monospace;">${act.weaponNumber || '—'}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-family:monospace;">${act.sigma || '—'}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;font-weight:bold;color:#0f172a;">${act.shotsCount}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;">${act.score}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;">${act.weaponOwnerText}</td>
        <td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:center;background-color:${bg};font-size:10px;">${act.ammoOwnerText}</td>
      </tr>`;
    })
    .join('');

  const content = `
    <table style="margin-bottom:14px;">
      <tr><td colspan="${headers.length}" style="font-size:16px;font-weight:bold;color:#1e3a8a;">G&G Competições — Declaração de Habitualidade de Tiro Desportivo</td></tr>
      <tr><td colspan="${headers.length}" style="font-size:13px;font-weight:bold;color:#0f172a;">Atleta: ${athlete.fullName || 'Não informado'} • CPF: ${athlete.cpf || 'Não informado'} • CR: ${athlete.crNumber || 'Emissão pendente'}</td></tr>
      <tr><td colspan="${headers.length}" style="font-size:11px;color:#334155;">Clube: ${club.name} ${club.fantasyName ? `(${club.fantasyName})` : ''} • CR: ${club.crNumber || 'N/A'} • CNPJ: ${club.cnpj || 'N/A'}</td></tr>
      <tr><td colspan="${headers.length}" style="font-size:11px;color:#475569;">Período: ${periodStr} • Total de Habitualidades: ${activities.length}</td></tr>
      <tr><td colspan="${headers.length}" style="font-size:10px;color:#64748b;font-style:italic;">Emitido em: ${now}</td></tr>
    </table>

    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${rowCells}</tbody>
    </table>

    <p style="font-size:9.5px;color:#94a3b8;margin-top:14px;font-style:italic;">
      Documento comprobatório de participações em treinamentos e/ou competições de tiro (art. 35 do Decreto nº 11.615/2023).
    </p>
  `;

  const filename = `declaracao_habitualidade_${slug(athlete.fullName || 'atleta')}_${startDate}_a_${endDate}.xls`;
  triggerExcelDownload(wrapExcelHtml('Habitualidades Atleta', content), filename);
}
