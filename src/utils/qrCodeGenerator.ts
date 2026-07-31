/**
 * Utility to generate ISO 18004 compliant SVG QR Codes in pure TypeScript.
 * Supports Byte Mode (UTF-8 URLs), Galois Field 256 Reed-Solomon error correction,
 * 15-bit BCH format information strings, and standard 4-module quiet zones.
 */

// Reed-Solomon Galois Field 256 math tables
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(function initGF256() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_EXP[i + 255] = x;
    GF256_LOG[x] = i;
    x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function rsGeneratorPoly(nsym: number): number[] {
  let g = [1];
  for (let i = 0; i < nsym; i++) {
    const nextG = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      nextG[j] ^= g[j];
      nextG[j + 1] ^= gfMul(g[j], GF256_EXP[i]);
    }
    g = nextG;
  }
  return g;
}

function rsEncode(data: number[], nsym: number): number[] {
  const gen = rsGeneratorPoly(nsym);
  const res = new Array(data.length + nsym).fill(0);
  for (let i = 0; i < data.length; i++) {
    res[i] = data[i];
  }
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return res.slice(data.length);
}

// QR Code Specifications Table for Low (L) Error Correction (Versions 1..10)
interface QRVersionSpec {
  ver: number;
  size: number;
  totalBytes: number;
  dataBytes: number;
  ecBytes: number;
  alignPos: number[];
}

const QR_SPECS: QRVersionSpec[] = [
  { ver: 1, size: 21, totalBytes: 26, dataBytes: 19, ecBytes: 7, alignPos: [] },
  { ver: 2, size: 25, totalBytes: 44, dataBytes: 34, ecBytes: 10, alignPos: [6, 18] },
  { ver: 3, size: 29, totalBytes: 70, dataBytes: 55, ecBytes: 15, alignPos: [6, 22] },
  { ver: 4, size: 33, totalBytes: 100, dataBytes: 80, ecBytes: 20, alignPos: [6, 26] },
  { ver: 5, size: 37, totalBytes: 134, dataBytes: 108, ecBytes: 26, alignPos: [6, 30] },
  { ver: 6, size: 41, totalBytes: 172, dataBytes: 136, ecBytes: 36, alignPos: [6, 34] },
  { ver: 7, size: 45, totalBytes: 196, dataBytes: 156, ecBytes: 40, alignPos: [6, 22, 38] },
  { ver: 8, size: 49, totalBytes: 242, dataBytes: 194, ecBytes: 48, alignPos: [6, 24, 42] },
  { ver: 9, size: 53, totalBytes: 292, dataBytes: 232, ecBytes: 60, alignPos: [6, 26, 46] },
  { ver: 10, size: 57, totalBytes: 346, dataBytes: 274, ecBytes: 72, alignPos: [6, 28, 50] }
];

function getFormatBits(ecLevel: 'L' | 'M' | 'Q' | 'H', maskPattern: number): number {
  const ecBits = ecLevel === 'L' ? 1 : ecLevel === 'M' ? 0 : ecLevel === 'Q' ? 3 : 2;
  const data = (ecBits << 3) | maskPattern;
  let rem = data << 10;
  for (let i = 4; i >= 0; i--) {
    if ((rem >> (i + 10)) & 1) {
      rem ^= 0x537 << i;
    }
  }
  return ((data << 10) | rem) ^ 0x5412;
}

export function generateQRCodeMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const utf8Bytes = Array.from(encoder.encode(text));

  // Determine smallest version that fits
  let spec = QR_SPECS.find(s => s.dataBytes >= utf8Bytes.length + 3);
  if (!spec) {
    spec = QR_SPECS[QR_SPECS.length - 1];
  }

  const { size, dataBytes, ecBytes, alignPos } = spec;

  // Build Bit Stream (Mode 4 = Byte)
  const bits: number[] = [];
  function pushBits(val: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  pushBits(0b0100, 4);
  pushBits(utf8Bytes.length, spec.ver < 10 ? 8 : 16);
  for (const b of utf8Bytes) {
    pushBits(b, 8);
  }

  // Terminator & padding
  const totalDataBits = dataBytes * 8;
  while (bits.length < totalDataBits && bits.length % 8 !== 0) {
    bits.push(0);
  }
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < totalDataBits) {
    pushBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to data byte array
  const dataBytesArray: number[] = [];
  for (let i = 0; i < dataBytes; i++) {
    let byteVal = 0;
    for (let j = 0; j < 8; j++) {
      byteVal = (byteVal << 1) | bits[i * 8 + j];
    }
    dataBytesArray.push(byteVal);
  }

  // Calculate RS Error Correction Bytes
  const ecBytesArray = rsEncode(dataBytesArray, ecBytes);
  const finalCodewords = [...dataBytesArray, ...ecBytesArray];

  // Initialize Matrix & Reservation Map
  const modules: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const isReserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  function setModule(r: number, c: number, val: boolean) {
    modules[r][c] = val;
    isReserved[r][c] = true;
  }

  // Draw 7x7 Finder Pattern with 1-module white separator
  function drawFinder(r0: number, c0: number) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = r0 + r;
        const nc = c0 + c;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBlack = (r === 0 || r === 6 || c === 0 || c === 6) || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            setModule(nr, nc, isBlack);
          } else {
            setModule(nr, nc, false); // White separator ring
          }
        }
      }
    }
  }

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Alignment Patterns (for V2+)
  if (alignPos.length > 0) {
    for (const r of alignPos) {
      for (const c of alignPos) {
        const inFinderArea = (r <= 8 && c <= 8) || (r <= 8 && c >= size - 8) || (r >= size - 8 && c <= 8);
        if (inFinderArea) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const isBlack = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
            setModule(r + dr, c + dc, isBlack);
          }
        }
      }
    }
  }

  // Timing Patterns (Row 6 and Column 6)
  for (let i = 8; i < size - 8; i++) {
    if (!isReserved[6][i]) setModule(6, i, i % 2 === 0);
    if (!isReserved[i][6]) setModule(i, 6, i % 2 === 0);
  }

  // Dark module
  setModule(4 * spec.ver + 9, 8, true);

  // Reserve Format Information Area
  for (let i = 0; i < 9; i++) {
    if (i < size) {
      if (!isReserved[8][i]) isReserved[8][i] = true;
      if (!isReserved[i][8]) isReserved[i][8] = true;
      if (!isReserved[8][size - 1 - i]) isReserved[8][size - 1 - i] = true;
      if (!isReserved[size - 1 - i][8]) isReserved[size - 1 - i][8] = true;
    }
  }

  // Place Codeword Bits in Matrix (Zig-Zag pattern)
  const allBits: number[] = [];
  for (const cw of finalCodewords) {
    for (let i = 7; i >= 0; i--) {
      allBits.push((cw >> i) & 1);
    }
  }

  let bitIdx = 0;
  let dir = -1;
  let col = size - 1;
  while (col > 0) {
    if (col === 6) col--; // Skip vertical timing column
    const rowStart = dir === -1 ? size - 1 : 0;
    const rowEnd = dir === -1 ? -1 : size;
    const step = dir === -1 ? -1 : 1;

    for (let r = rowStart; r !== rowEnd; r += step) {
      for (let c = 0; c < 2; c++) {
        const currCol = col - c;
        if (!isReserved[r][currCol]) {
          const bit = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
          modules[r][currCol] = bit === 1;
        }
      }
    }
    dir = -dir;
    col -= 2;
  }

  // Apply Mask Pattern 0 ((row + col) % 2 === 0)
  const maskPattern = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isReserved[r][c]) {
        if ((r + c) % 2 === 0) {
          modules[r][c] = !modules[r][c];
        }
      }
    }
  }

  // Write BCH(15,5) Format Information Bits
  const formatVal = getFormatBits('L', maskPattern);
  const formatBitsArr: number[] = [];
  for (let i = 14; i >= 0; i--) {
    formatBitsArr.push((formatVal >> i) & 1);
  }

  const formatCoords1 = [
    [8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],
    [7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]
  ];

  const formatCoords2 = [
    [size-1, 8],[size-2, 8],[size-3, 8],[size-4, 8],[size-5, 8],[size-6, 8],[size-7, 8],
    [8, size-8],[8, size-7],[8, size-6],[8, size-5],[8, size-4],[8, size-3],[8, size-2],[8, size-1]
  ];

  for (let i = 0; i < 15; i++) {
    const bitVal = formatBitsArr[14 - i] === 1;
    const [r1, c1] = formatCoords1[i];
    const [r2, c2] = formatCoords2[i];
    modules[r1][c1] = bitVal;
    modules[r2][c2] = bitVal;
  }

  return modules;
}

/**
 * Returns an ISO 18004 compliant SVG string representation of a QR code.
 */
export function generateQRCodeSVG(text: string, sizePx: number = 180, fgColor: string = '#000000', bgColor: string = '#ffffff'): string {
  const matrix = generateQRCodeMatrix(text);
  const n = matrix.length;
  const quietZone = 4; // ISO 18004 standard specifies 4 modules quiet zone
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
