export async function downloadElementAsPdf(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element #${elementId} not found`);

  const html2pdf = (await import('html2pdf.js')).default;

  await html2pdf()
    .from(element)
    .set({
      margin:      [8, 8, 8, 8],
      filename,
      image:       { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
      jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
    })
    .save();
}
