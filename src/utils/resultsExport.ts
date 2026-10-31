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

export function exportResultsToPdf(data: ResultsExportData) {
  const { title, championshipTitle, stageTitle, modalityName, categoryFilter, headers, rows, isLandscape = false } = data;
  const now = new Date().toLocaleString('pt-BR');

  const w = window.open('', '_blank');
  if (!w) {
    alert('Por favor, permita pop-ups nesta página para abrir a visualização e impressão do PDF.');
    return;
  }

  const tableHeaders = headers
    .map(h => `<th style="background-color:#1e293b;color:#ffffff;font-size:10px;font-weight:bold;padding:6px 6px;border:1px solid #475569;text-align:center;text-transform:uppercase;letter-spacing:0.3px;">${h}</th>`)
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
          return `<td style="padding:5px 6px;border:1px solid #cbd5e1;text-align:${align};background-color:${bg};${weight}font-size:10px;">${val}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title} - ${championshipTitle}</title>
  <style>
    @page {
      size: ${isLandscape ? 'landscape' : 'portrait'};
      margin: 10mm 12mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 10.5px;
      color: #0f172a;
      line-height: 1.35;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .header-box {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand {
      font-size: 13px;
      font-weight: 800;
      color: #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .main-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin: 3px 0 2px 0;
      text-transform: uppercase;
    }
    .sub-title {
      font-size: 11px;
      color: #334155;
      font-weight: 600;
    }
    .meta-box {
      text-align: right;
      font-size: 9.5px;
      color: #64748b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th, td {
      border: 1px solid #cbd5e1;
    }
    .footer-box {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      color: #64748b;
    }
    @media print {
      body {
        margin: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      <div class="brand">G&G Competições — ${title}</div>
      <div class="main-title">${championshipTitle}</div>
      <div class="sub-title">${stageTitle} • Modalidade: ${modalityName}${categoryFilter ? ` • ${categoryFilter}` : ''}</div>
    </div>
    <div class="meta-box">
      <div style="font-weight:bold;color:#1e3a8a;">Relatório Oficial Homologado</div>
      <div>Emitido em: ${now}</div>
    </div>
  </div>

  <table>
    <thead><tr>${tableHeaders}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="footer-box">
    <span>Documento gerado oficialmente pela plataforma G&G Competições.</span>
    <span>Emissão: ${now}</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    };
  <\/script>
</body>
</html>`;

  w.document.open();
  w.document.write(content);
  w.document.close();
}
