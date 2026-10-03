/** @jest-environment node */
import { extractStatementPdf } from '../statementPdf';
const getDocument = jest.fn();
jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({ getDocument: (...args: unknown[]) => getDocument(...args) }));
jest.mock('pdfjs-dist/legacy/build/pdf.worker.mjs', () => ({}));

test('extracts a PDF from an offset slice without reading the surrounding buffer', async () => {
  const pdf = Buffer.from('%PDF-synthetic-buffer-test');
  const storage = Buffer.alloc(pdf.length + 1024, 'x');
  pdf.copy(storage, 512);
  const offsetPdf = storage.subarray(512, 512 + pdf.length);
  expect(offsetPdf.byteOffset).toBeGreaterThan(0);
  const destroy = jest.fn();
  getDocument.mockReturnValue({ destroy, promise: Promise.resolve({ numPages: 1,
    getPage: async () => ({ cleanup: jest.fn(), getTextContent: async () => ({ items: [
      { str: 'Virgin Money', transform: [1, 0, 0, 1, 0, 100] }, { str: 'Synthetic shop', transform: [1, 0, 0, 1, 0, 80] },
    ] }) }),
  }) });
  const parsed = await extractStatementPdf(offsetPdf);
  expect(parsed.text).toContain('Virgin Money');
  expect(parsed.text).toContain('Synthetic shop');
  expect(parsed.numpages).toBe(1);
  expect(getDocument).toHaveBeenCalledWith(expect.objectContaining({ isEvalSupported: false, useWorkerFetch: false }));
  const data = getDocument.mock.calls[0][0].data;
  expect(data.byteOffset).toBe(0); expect(Buffer.from(data)).toEqual(pdf);
  expect(destroy).toHaveBeenCalled();
});
