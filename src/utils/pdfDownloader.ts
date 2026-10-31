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
      windowWidth: options.orientation === 'landscape' ? 1400 : 1000
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
  const container = document.createElement('div');
  container.className = 'temp-pdf-export-container';
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = options.orientation === 'landscape' ? '280mm' : '195mm';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
  container.innerHTML = html;
  document.body.appendChild(container);

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
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
