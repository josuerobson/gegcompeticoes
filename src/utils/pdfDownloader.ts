export interface PdfDownloadOptions {
  filename: string;
  orientation?: 'portrait' | 'landscape';
  margin?: number | [number, number, number, number];
  scale?: number;
  onProgress?: (current: number, total: number) => void;
}

export function sanitizePdfFilename(name: string): string {
  const clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean.endsWith('.pdf') ? clean : `${clean}.pdf`;
}

interface AvoidBoundary {
  top: number;
  bottom: number;
  isStrongAvoid: boolean;
}

/**
 * Mapeia todos os elementos do DOM que não devem ser cortados ao meio (assinaturas, cards,
 * linhas de tabela, parágrafos, etc.) convertendo suas posições relativas para pixels do canvas.
 */
function getAvoidBoundaries(wrapper: HTMLElement, scaleY: number): AvoidBoundary[] {
  const wrapperRect = wrapper.getBoundingClientRect();
  const boundaries: AvoidBoundary[] = [];

  // Elementos com proibição estrita de quebra (nunca fatiar ao meio)
  const strongSelectors = [
    '.pdf-avoid-break',
    '.signature-block',
    '.page-break-inside-avoid',
    '.no-break',
    '.avoid-break',
    '[style*="break-inside: avoid"]',
    '[style*="break-inside:avoid"]',
    '[style*="page-break-inside: avoid"]',
    '[style*="page-break-inside:avoid"]',
    'tr',
    'thead',
    'tfoot',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
  ];

  const strongElements = wrapper.querySelectorAll(strongSelectors.join(', '));
  strongElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.height > 0) {
      boundaries.push({
        top: Math.floor((rect.top - wrapperRect.top) * scaleY),
        bottom: Math.ceil((rect.bottom - wrapperRect.top) * scaleY),
        isStrongAvoid: true
      });
    }
  });

  // Elementos de texto comuns (parágrafos, blocos, tabelas)
  const regularSelectors = ['p', 'table', 'li', 'blockquote'];
  const regularElements = wrapper.querySelectorAll(regularSelectors.join(', '));
  regularElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.height > 0) {
      boundaries.push({
        top: Math.floor((rect.top - wrapperRect.top) * scaleY),
        bottom: Math.ceil((rect.bottom - wrapperRect.top) * scaleY),
        isStrongAvoid: false
      });
    }
  });

  return boundaries;
}

/**
 * Verifica se uma linha horizontal específica no canvas é inteiramente em branco (fundo branco #ffffff).
 * Analisa a faixa horizontal útil excluindo 2% das margens externas.
 */
function isRowBlank(
  data: Uint8ClampedArray,
  width: number,
  row: number,
  startX: number,
  endX: number
): boolean {
  const rowOffset = row * width * 4;
  for (let x = startX; x < endX; x += 2) {
    const idx = rowOffset + x * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    // Se o pixel não for branco ou quase branco (fundo branco padrão é 255,255,255)
    // Cores de texto ou linhas têm luminância abaixo de 240
    if (a > 20 && (r < 240 || g < 240 || b < 240)) {
      return false;
    }
  }
  return true;
}

/**
 * Encontra a altura ideal de corte vertical no canvas para uma página, garantindo que
 * nenhum parágrafo, frase, assinatura, tabela ou card seja cortado horizontalmente ao meio.
 */
function findSmartSliceHeight(
  canvas: HTMLCanvasElement,
  sourceY: number,
  maxSliceHeight: number,
  boundaries: AvoidBoundary[]
): number {
  const remainingHeight = canvas.height - sourceY;
  if (remainingHeight <= maxSliceHeight) {
    return remainingHeight;
  }

  const idealCutY = sourceY + maxSliceHeight;
  let candidateCutY = idealCutY;

  // 1. Avalia limites DOM de elementos que devem ser mantidos inteiros
  for (const b of boundaries) {
    // Se o elemento cruza a linha de corte ideal (inicia antes da quebra e termina depois dela)
    if (b.top < candidateCutY && b.bottom > candidateCutY) {
      // Se o elemento começou depois do início desta página
      if (b.top > sourceY) {
        const spaceOnPage = b.top - sourceY;
        // Se puxar a quebra para antes deste elemento deixar a página com conteúdo razoável
        const minHeightRequired = b.isStrongAvoid ? maxSliceHeight * 0.15 : maxSliceHeight * 0.35;
        if (spaceOnPage >= minHeightRequired) {
          candidateCutY = Math.min(candidateCutY, b.top - 2);
        }
      }
    }
  }

  // 2. Refinamento por análise de pixels no canvas para achar uma linha 100% em branco (sem cortar fontes)
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (ctx) {
    // Janela de busca subindo a partir do ponto de corte candidato (até 140 pixels para cima)
    const minSearchY = Math.max(sourceY + Math.floor(maxSliceHeight * 0.20), candidateCutY - 140);
    const searchHeight = candidateCutY - minSearchY;

    if (searchHeight > 0) {
      try {
        const startX = Math.floor(canvas.width * 0.02);
        const endX = Math.ceil(canvas.width * 0.98);
        const imgData = ctx.getImageData(0, minSearchY, canvas.width, searchHeight);

        // Varre de baixo (candidateCutY) para cima (minSearchY) em busca da primeira linha horizontal 100% branca
        for (let rowRel = searchHeight - 1; rowRel >= 0; rowRel--) {
          if (isRowBlank(imgData.data, canvas.width, rowRel, startX, endX)) {
            const safeY = minSearchY + rowRel;
            if (safeY > sourceY + 40) {
              return safeY - sourceY;
            }
          }
        }
      } catch (err) {
        console.warn('Não foi possível ler pixels do canvas para corte fino:', err);
      }
    }
  }

  // Se não achou linha em branco ou não conseguiu ler pixels, usa o candidateCutY calculado via DOM
  const finalSlice = Math.max(candidateCutY - sourceY, Math.floor(maxSliceHeight * 0.5));
  return Math.min(finalSlice, remainingHeight);
}

/**
 * Renderiza e gera PDF com suporte robusto a documentos extensos com centenas de páginas
 * (ex: Relatório Global de Habitualidades com centenas de atletas).
 * Renderiza cada seção/atleta em um canvas independente, evitando estourar os limites
 * máximos de canvas do navegador (32.767px) que provocam páginas em branco.
 * Aplica quebra de página inteligente com verificação de limites DOM e varredura de pixels
 * em branco, impedindo que qualquer texto, assinatura ou tabela seja fatiado ao meio.
 */
export async function downloadMultiSectionPdfFromHtml(
  sections: string[],
  options: PdfDownloadOptions
): Promise<void> {
  const validSections = sections.map(s => s.trim()).filter(s => s.length > 0);
  if (validSections.length === 0) return;

  const { jsPDF } = await import('jspdf');
  const html2canvasModule = await import('html2canvas');
  const html2canvas = (html2canvasModule as any).default || html2canvasModule;

  const isLandscape = options.orientation === 'landscape';
  const pageWidthMm = isLandscape ? 297 : 210;
  const pageHeightMm = isLandscape ? 210 : 297;

  // Parser das margens em milímetros
  let mTop = 6, mLeft = 6, mBottom = 6, mRight = 6;
  if (typeof options.margin === 'number') {
    mTop = mLeft = mBottom = mRight = options.margin;
  } else if (Array.isArray(options.margin) && options.margin.length === 4) {
    [mTop, mLeft, mBottom, mRight] = options.margin;
  }

  const printableWidthMm = pageWidthMm - mLeft - mRight;
  const printableHeightMm = pageHeightMm - mTop - mBottom;

  const pdf = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Wrapper temporário no DOM fora da visão do usuário, com largura fixa proporcional
  const wrapper = document.createElement('div');
  wrapper.className = 'temp-pdf-export-wrapper';
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.width = isLandscape ? '285mm' : '198mm';
  wrapper.style.zIndex = '-99999';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.opacity = '1';
  wrapper.style.overflow = 'visible';
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.style.color = '#0f172a';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

  document.body.appendChild(wrapper);

  let isFirstPage = true;

  try {
    for (let i = 0; i < validSections.length; i++) {
      const sectionHtml = validSections[i];

      if (options.onProgress) {
        options.onProgress(i + 1, validSections.length);
      }

      wrapper.innerHTML = sectionHtml;

      // Aguarda o pré-carregamento de imagens da seção atual
      const images = Array.from(wrapper.querySelectorAll('img'));
      if (images.length > 0) {
        await Promise.all(
          images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(resolve => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          })
        );
      }

      // Renderização da seção isolada em canvas (escala 1.5 para alta resolução e velocidade)
      const canvas = await html2canvas(wrapper, {
        scale: options.scale || 1.5,
        useCORS: true,
        logging: false,
        scrollY: 0,
        scrollX: 0
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) continue;

      const imgTotalHeightMm = (canvas.height * printableWidthMm) / canvas.width;

      if (imgTotalHeightMm <= printableHeightMm) {
        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.95),
          'JPEG',
          mLeft,
          mTop,
          printableWidthMm,
          imgTotalHeightMm
        );
      } else {
        // Se a seção for maior que 1 página, fatia verticalmente de forma inteligente
        const maxSliceHeightPx = Math.floor((printableHeightMm * canvas.width) / printableWidthMm);
        const scaleY = canvas.height / wrapper.offsetHeight;
        const boundaries = getAvoidBoundaries(wrapper, scaleY);

        let sourceY = 0;

        while (sourceY < canvas.height) {
          const currentSliceHeight = findSmartSliceHeight(canvas, sourceY, maxSliceHeightPx, boundaries);
          if (currentSliceHeight <= 0) break;

          const currentSliceHeightMm = (currentSliceHeight * printableWidthMm) / canvas.width;

          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = currentSliceHeight;
          const ctx = sliceCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            ctx.drawImage(
              canvas,
              0, sourceY, canvas.width, currentSliceHeight,
              0, 0, canvas.width, currentSliceHeight
            );

            if (!isFirstPage) {
              pdf.addPage();
            }
            isFirstPage = false;

            pdf.addImage(
              sliceCanvas.toDataURL('image/jpeg', 0.95),
              'JPEG',
              mLeft,
              mTop,
              printableWidthMm,
              currentSliceHeightMm
            );
          }

          sourceY += currentSliceHeight;
        }
      }
    }

    pdf.save(sanitizePdfFilename(options.filename));
  } finally {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
  }
}

/**
 * Função compatível para download de PDF a partir de HTML completo.
 * Detecta quebras de página automáticas e divide em seções para prevenir telas em branco.
 */
export async function downloadPdfFromHtml(html: string, options: PdfDownloadOptions): Promise<void> {
  // Se contiver delimitadores explícitos de quebra de página, divide em seções independentes
  if (html.includes('html2pdf__page-break')) {
    const rawSections = html.split(/<div class="html2pdf__page-break"[^>]*>[\s\S]*?<\/div>/i);
    const sections = rawSections.map(s => s.trim()).filter(s => s.length > 0);
    if (sections.length > 0) {
      return downloadMultiSectionPdfFromHtml(sections, options);
    }
  }

  return downloadMultiSectionPdfFromHtml([html], options);
}

export async function downloadPdfFromElement(element: HTMLElement, options: PdfDownloadOptions): Promise<void> {
  return downloadPdfFromHtml(element.outerHTML, options);
}
