export interface PdfDownloadOptions {
  filename: string;
  orientation?: 'portrait' | 'landscape';
  margin?: number | [number, number, number, number];
  scale?: number;
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

export async function downloadPdfFromElement(element: HTMLElement, options: PdfDownloadOptions): Promise<void> {
  const html2pdfModule = await import('html2pdf.js');
  const html2pdf = (html2pdfModule as any).default || html2pdfModule;
  const filename = sanitizePdfFilename(options.filename);

  const opt = {
    margin: options.margin !== undefined ? options.margin : [6, 6, 6, 6],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: options.scale || 2,
      useCORS: true,
      logging: false,
      scrollY: 0,
      scrollX: 0
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: options.orientation || 'portrait'
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  await html2pdf().set(opt).from(element).save();
}

export async function downloadPdfFromHtml(html: string, options: PdfDownloadOptions): Promise<void> {
  const isLandscape = options.orientation === 'landscape';

  // Wrapper posicionado fora do alcance visual via z-index negativo mas no topo absoluto (0, 0)
  // garantindo que o html2canvas renderize o elemento perfeitamente sem cortes ou deslocamentos
  const wrapper = document.createElement('div');
  wrapper.className = 'temp-pdf-export-wrapper';
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '0';
  wrapper.style.width = isLandscape ? '287mm' : '198mm';
  wrapper.style.zIndex = '-99999';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.opacity = '1';
  wrapper.style.overflow = 'visible';

  // Container interno com os estilos do documento, sem posições fixas ou coordenadas negativas
  const container = document.createElement('div');
  container.className = 'temp-pdf-export-container';
  container.style.width = '100%';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.boxSizing = 'border-box';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  container.innerHTML = html;

  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  try {
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );
    await downloadPdfFromElement(container, options);
  } finally {
    if (document.body.contains(wrapper)) {
      document.body.removeChild(wrapper);
    }
  }
}
