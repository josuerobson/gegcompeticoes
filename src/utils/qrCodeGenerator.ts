import QRCode from 'qrcode';

/**
 * Utility to generate 100% compliant QR Codes using the official `qrcode` library.
 * Supports Error Correction Level M and standard module matrices.
 */
export function generateQRCodeMatrix(text: string): boolean[][] {
  try {
    const targetUrl = text || 'https://gegcompeticoes-web.5450wp.easypanel.host';
    const qr = QRCode.create(targetUrl, {
      errorCorrectionLevel: 'M'
    });
    const size = qr.modules.size;
    const matrix: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) {
        row.push(qr.modules.get(r, c) === 1);
      }
      matrix.push(row);
    }
    return matrix;
  } catch (e) {
    console.error('Error generating QR matrix:', e);
    return [];
  }
}

/**
 * Returns an ISO 18004 compliant SVG string representation of a QR code.
 */
export function generateQRCodeSVG(
  text: string,
  sizePx: number = 180,
  fgColor: string = '#000000',
  bgColor: string = '#ffffff'
): string {
  const matrix = generateQRCodeMatrix(text);
  if (!matrix || matrix.length === 0) return '';
  const n = matrix.length;
  const quietZone = 4; // ISO 18004 4-module quiet zone
  const totalModules = n + quietZone * 2;
  const cellSize = sizePx / totalModules;

  let pathD = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        const x = (c + quietZone) * cellSize;
        const y = (r + quietZone) * cellSize;
        pathD += `M${x.toFixed(2)},${y.toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sizePx} ${sizePx}" width="${sizePx}" height="${sizePx}">
    <rect width="${sizePx}" height="${sizePx}" fill="${bgColor}" />
    <path d="${pathD}" fill="${fgColor}" />
  </svg>`;
}
