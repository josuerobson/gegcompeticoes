import { downloadPdfFromHtml, sanitizePdfFilename } from './pdfDownloader';

export interface ResultsExportData {
  title: string;
  championshipTitle: string;
  stageTitle: string;
  modalityName: string;
  categoryFilter?: string;
  headers: string[];
  rows: (string | number)[][];
  isLandscape?: boolean;
}

export function exportResultsToExcel(data: ResultsExportData, filename: string) {
  const { title, championshipTitle, stageTitle, modalityName, categoryFilter, headers, rows } = data;
  const now = new Date().toLocaleString('pt-BR');

  const tableHeaders = headers
    .map(h => `<th style="background-color:#1e3a8a;color:#ffffff;font-weight:bold;padding:8px 12px;border:1px solid #94a3b8;text-align:center;font-size:11px;">${h}</th>`)
    .join('');

  const tableRows = rows
    .map((r, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = r
        .map((cell, colIdx) => {
          const val = String(cell ?? '');
          const isPos = colIdx === 0;
          const isAtleta = colIdx === 1 || (headers[1] === 'Medalha' && colIdx === 2);
          const align = isPos ? 'center' : isAtleta ? 'left' : 'center';
          const weight = isPos || isAtleta ? 'font-weight:bold;' : '';
          return `<td style="padding:6px 10px;border:1px solid #cbd5e1;text-align:${align};background-color:${bg};${weight}font-size:10.5px;">${val}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Resultados Oficiais</x:Name>
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
  </style>
</head>
<body>
  <table style="margin-bottom:12px;">
    <tr><td colspan="${headers.length}" style="font-size:16px;font-weight:bold;color:#1e3a8a;">G&G Competições — ${title}</td></tr>
    <tr><td colspan="${headers.length}" style="font-size:13px;font-weight:bold;color:#0f172a;">${championshipTitle}</td></tr>
    <tr><td colspan="${headers.length}" style="font-size:11px;color:#475569;">Etapa: ${stageTitle} • Modalidade: ${modalityName}${categoryFilter ? ` • Categoria: ${categoryFilter}` : ''}</td></tr>
    <tr><td colspan="${headers.length}" style="font-size:10px;color:#64748b;font-style:italic;">Emitido em: ${now}</td></tr>
  </table>

  <table>
    <thead><tr>${tableHeaders}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>

  <p style="font-size:9px;color:#94a3b8;margin-top:14px;font-style:italic;">Planilha gerada automaticamente pelo sistema oficial G&G Competições.</p>
</body>
</html>`;

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

export async function exportResultsToPdf(data: ResultsExportData, filename?: string): Promise<void> {
  const { title, championshipTitle, stageTitle, modalityName, categoryFilter, headers, rows, isLandscape = false } = data;
  const now = new Date().toLocaleString('pt-BR');

  const tableHeaders = headers
    .map(h => `<th style="background-color:#1e293b;color:#ffffff;font-size:10px;font-weight:bold;padding:7px 6px;border:1px solid #475569;text-align:center;text-transform:uppercase;letter-spacing:0.3px;">${h}</th>`)
    .join('');

  const tableRows = rows
    .map((r, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = r
        .map((cell, colIdx) => {
          const val = String(cell ?? '');
          const isPos = colIdx === 0;
          const isAtleta = colIdx === 1 || (headers[1] === 'Medalha' && colIdx === 2);
          const align = isPos ? 'center' : isAtleta ? 'left' : 'center';
          const weight = isPos || isAtleta ? 'font-weight:bold;' : '';
          return `<td style="padding:6px 6px;border:1px solid #cbd5e1;text-align:${align};background-color:${bg};${weight}font-size:10px;">${val}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `
  <div style="padding:15px 20px;background:#ffffff;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="border-bottom:2px solid #2563eb;padding-bottom:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-size:13px;font-weight:800;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.5px;">G&G Competições — ${title}</div>
        <div style="font-size:14px;font-weight:800;color:#0f172a;margin:3px 0 2px 0;text-transform:uppercase;">${championshipTitle}</div>
        <div style="font-size:11px;color:#334155;font-weight:600;">${stageTitle} • Modalidade: ${modalityName}${categoryFilter ? ` • ${categoryFilter}` : ''}</div>
      </div>
      <div style="text-align:right;font-size:9.5px;color:#64748b;">
        <div style="font-weight:bold;color:#1e3a8a;">Relatório Oficial Homologado</div>
        <div>Emitido em: ${now}</div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:10px;">
      <thead><tr>${tableHeaders}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>

    <div style="margin-top:14px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:8.5px;color:#64748b;">
      <span>Documento gerado oficialmente pela plataforma G&G Competições.</span>
      <span>Emissão: ${now}</span>
    </div>
  </div>`;

  const fallbackName = `${title}_${championshipTitle}_${stageTitle}_${modalityName}`;
  const targetFilename = filename || sanitizePdfFilename(fallbackName);

  await downloadPdfFromHtml(html, {
    filename: targetFilename,
    orientation: isLandscape ? 'landscape' : 'portrait',
    margin: [6, 6, 6, 6]
  });
}

export interface ModalityPdfSection {
  modalityName: string;
  categoryFilter?: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface AllModalitiesExportData {
  title: string;
  championshipTitle: string;
  stageTitle: string;
  sections: ModalityPdfSection[];
  isLandscape?: boolean;
}

export async function exportAllModalitiesResultsToPdf(data: AllModalitiesExportData, filename?: string): Promise<void> {
  const { title, championshipTitle, stageTitle, sections, isLandscape = false } = data;
  const now = new Date().toLocaleString('pt-BR');

  const sectionsHtml = sections.map((sec, secIdx) => {
    const isLast = secIdx === sections.length - 1;
    const pageBreak = isLast ? '' : '<div class="html2pdf__page-break" style="page-break-after: always; break-after: page; height: 0; line-height: 0; margin: 0; padding: 0;"></div>';

    const tableHeaders = sec.headers
      .map(h => `<th style="background-color:#1e293b;color:#ffffff;font-size:9.5px;font-weight:bold;padding:6px 5px;border:1px solid #475569;text-align:center;text-transform:uppercase;letter-spacing:0.3px;">${h}</th>`)
      .join('');

    const tableRows = sec.rows.length === 0
      ? `<tr><td colspan="${sec.headers.length}" style="padding:14px;text-align:center;color:#64748b;font-size:11px;font-style:italic;">Nenhum resultado homologado para esta modalidade.</td></tr>`
      : sec.rows.map((r, i) => {
          const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
          const cells = r
            .map((cell, colIdx) => {
              const val = String(cell ?? '');
              const isPos = colIdx === 0;
              const isAtleta = colIdx === 1 || (sec.headers[1] === 'Medalha' && colIdx === 2);
              const align = isPos ? 'center' : isAtleta ? 'left' : 'center';
              const weight = isPos || isAtleta ? 'font-weight:bold;' : '';
              return `<td style="padding:5px 5px;border:1px solid #cbd5e1;text-align:${align};background-color:${bg};${weight}font-size:9.5px;">${val}</td>`;
            })
            .join('');
          return `<tr>${cells}</tr>`;
        }).join('');

    return `
    <div style="padding:16px 20px;background:#ffffff;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;box-sizing:border-box;">
      <div style="border-bottom:2px solid #2563eb;padding-bottom:8px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-size:11px;font-weight:800;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.5px;">G&G Competições — ${title}</div>
          <div style="font-size:13px;font-weight:800;color:#0f172a;margin:2px 0;text-transform:uppercase;">${championshipTitle}</div>
          <div style="font-size:11px;color:#334155;font-weight:600;">${stageTitle}</div>
        </div>
        <div style="text-align:right;font-size:9px;color:#64748b;">
          <div style="font-weight:bold;color:#1e3a8a;">Relatório Oficial Homologado</div>
          <div>Emitido em: ${now}</div>
          <div style="margin-top:2px;font-weight:bold;color:#2563eb;">Modalidade ${secIdx + 1} de ${sections.length}</div>
        </div>
      </div>

      <div style="background-color:#eff6ff;border-left:4px solid #2563eb;padding:7px 12px;border-radius:4px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="font-size:9.5px;text-transform:uppercase;color:#1e40af;font-weight:bold;display:block;">Modalidade</span>
          <span style="font-size:12.5px;font-weight:800;color:#1e3a8a;">${sec.modalityName}</span>
        </div>
        ${sec.categoryFilter ? `<span style="font-size:9.5px;background:#dbeafe;color:#1e40af;font-weight:bold;padding:2px 8px;border-radius:12px;">${sec.categoryFilter}</span>` : ''}
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:9.5px;">
        <thead><tr>${tableHeaders}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>

      <div style="margin-top:12px;padding-top:6px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:8px;color:#64748b;">
        <span>Documento gerado oficialmente pela plataforma G&G Competições.</span>
        <span>Modalidade: ${sec.modalityName} • Emissão: ${now}</span>
      </div>
    </div>
    ${pageBreak}`;
  }).join('');

  const targetFilename = filename || sanitizePdfFilename(`${title}_${championshipTitle}_${stageTitle}_todas_modalidades`);

  await downloadPdfFromHtml(sectionsHtml, {
    filename: targetFilename,
    orientation: isLandscape ? 'landscape' : 'portrait',
    margin: [6, 6, 6, 6]
  });
}
