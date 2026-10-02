export async function downloadInvoicePdf(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ]);

  await Promise.all(Array.from(element.querySelectorAll('img')).map(async (image) => {
    if (!image.complete) await new Promise<void>((resolve) => {
      const finish = () => resolve();
      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
    });
    if (typeof image.decode === 'function') await image.decode().catch(() => undefined);
  }));

  // Render at a fixed A4 pixel width (210mm @ 96dpi) so the exported text size
  // is the same every time, regardless of how wide the on-screen preview panel
  // is when "Download PDF" is pressed.
  const A4_WIDTH_PX = 794;
  const previousWidth = element.style.width;
  const previousMaxWidth = element.style.maxWidth;
  element.style.width = `${A4_WIDTH_PX}px`;
  element.style.maxWidth = `${A4_WIDTH_PX}px`;

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      width: A4_WIDTH_PX,
      windowWidth: A4_WIDTH_PX,
    });
  } finally {
    element.style.width = previousWidth;
    element.style.maxWidth = previousMaxWidth;
  }

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  // JPEG instead of PNG: the rendered page is lossless pixel data (text edges,
  // subtle antialiasing noise) that PNG compresses poorly, often 5MB+. JPEG at
  // high quality is visually indistinguishable here and a fraction of the size.
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
  pdf.save(filename);
}
