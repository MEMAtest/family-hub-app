let runtime: Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')> | undefined;
function pdfRuntime() {
  return runtime ??= (async () => {
    const worker = await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
    // Preload the in-process worker so Next's bundled server never fetches a URL.
    (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
    return import('pdfjs-dist/legacy/build/pdf.mjs');
  })();
}

export async function extractStatementPdf(bytes: Buffer) {
  const { getDocument } = await pdfRuntime();
  const task = getDocument({ data: Uint8Array.from(bytes), isEvalSupported: false, useWorkerFetch: false,
    disableFontFace: true, useSystemFonts: false, verbosity: 0 });
  try {
    const document = await task.promise;
    if (document.numPages > 200) throw new Error('Statement exceeds 200 pages.');
    const pages: string[] = [];
    for (let index = 1; index <= document.numPages; index++) {
      const page = await document.getPage(index);
      const content = await page.getTextContent();
      let text = '';
      let lastY: number | undefined;
      for (const item of content.items) {
        if (!('str' in item) || !item.str) continue;
        const y = item.transform[5];
        text += (lastY === undefined ? '' : Math.abs(lastY - y) > 2 ? '\n' : ' ') + item.str;
        lastY = y;
      }
      pages.push(text);
      page.cleanup();
    }
    return { text: pages.join('\n\n'), numpages: document.numPages };
  } finally { await task.destroy(); }
}
