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

/**
 * Renderiza e gera PDF com suporte robusto a documentos extensos com centenas de páginas
 * (ex: Relatório Global de Habitualidades com centenas de atletas).
 * Renderiza cada seção/atleta em um canvas independente, evitando estourar os limites
 * máximos de canvas do navegador (32.767px) que provocam páginas em branco.
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
        // Se a seção for maior que 1 página (ex: atleta com histórico longo de habitualidades), fatia verticalmente
        const sliceHeightPx = (printableHeightMm * canvas.width) / printableWidthMm;
        let sourceY = 0;

        while (sourceY < canvas.height) {
          const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - sourceY);
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

          sourceY += sliceHeightPx;
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
