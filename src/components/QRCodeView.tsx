import React, { useMemo } from 'react';
import { generateQRCodeMatrix } from '../utils/qrCodeGenerator';

interface QRCodeViewProps {
  value: string;
  size?: number; // Size in pixels
  fgColor?: string;
  bgColor?: string;
  className?: string;
  logoUrl?: string;
}

export function QRCodeView({
  value,
  size = 140,
  fgColor = '#0f172a',
  bgColor = '#ffffff',
  className = '',
  logoUrl
}: QRCodeViewProps) {
  const matrix = useMemo(() => {
    try {
      return generateQRCodeMatrix(value || 'https://gegcompeticoes-web.5450wp.easypanel.host');
    } catch (e) {
      console.error('Error generating QR matrix:', e);
      return [];
    }
  }, [value]);

  if (!matrix || matrix.length === 0) {
    return <div className="w-16 h-16 bg-slate-200 animate-pulse rounded" />;
  }

  const n = matrix.length;
  const quietZone = 2;
  const totalModules = n + quietZone * 2;
  const cellSize = size / totalModules;

  // Build SVG path
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

  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="w-full h-full rounded"
      >
        <rect width={size} height={size} fill={bgColor} />
        <path d={pathD} fill={fgColor} />
      </svg>
      {logoUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-white p-0.5 rounded-full border border-slate-300 shadow-xs">
            <img src={logoUrl} alt="Logo" className="w-5 h-5 rounded-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
