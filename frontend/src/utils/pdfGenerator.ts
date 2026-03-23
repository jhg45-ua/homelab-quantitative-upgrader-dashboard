import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function downloadAuditReport(elementId: string): Promise<void> {
  const rootElement = document.getElementById(elementId);
  if (!rootElement) {
    throw new Error(`Report element not found: ${elementId}`);
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageIds = ['report-page-1', 'report-page-2', 'report-page-3'];
  let renderedPages = 0;

  for (const pageId of pageIds) {
    const pageElement = document.getElementById(pageId);
    if (!pageElement) {
      continue;
    }

    const canvas = await html2canvas(pageElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });
    const imageData = canvas.toDataURL('image/png');

    if (renderedPages > 0) {
      pdf.addPage();
    }
    pdf.addImage(imageData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    renderedPages += 1;
  }

  if (renderedPages === 0) {
    throw new Error('No report pages were found to render.');
  }

  pdf.save('HQUD_Audit_Report.pdf');
}