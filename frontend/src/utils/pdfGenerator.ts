import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export async function downloadAuditReport(elementId: string): Promise<void> {
  const element = document.getElementById(elementId);

  if (!element) {
    throw new Error(`Report element not found: ${elementId}`);
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imageData = canvas.toDataURL('image/png');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const imageHeight = (canvas.height * pageWidth) / canvas.width;

  let heightLeft = imageHeight;
  let position = 0;

  doc.addImage(imageData, 'PNG', 0, position, pageWidth, imageHeight, undefined, 'FAST');
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imageHeight;
    doc.addPage();
    doc.addImage(imageData, 'PNG', 0, position, pageWidth, imageHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  doc.save('HQUD_Audit_Report.pdf');
}