import { PDFDocument, StandardFonts } from 'pdf-lib';

export async function virginStatementPdf() {
  const lines = ['Virgin Money - SYNTHETIC QA STATEMENT', 'Statement date 30 September 2026', '01 Sep 2026', 'Previous statement 100.00', '02 Sep 2026', 'Synthetic shop', '10.00 90.00'];
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  lines.forEach((line, index) => page.drawText(line, { x: 50, y: 750 - index * 20, font, size: 12 }));
  return Buffer.from(await document.save({ useObjectStreams: false }));
}
