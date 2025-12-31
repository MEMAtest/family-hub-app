/**
 * Client-side OCR using Tesseract.js
 * No AI/API dependencies - runs entirely in the browser
 */

import type { OcrResult } from '@/types/receipt.types';

// Lazy-loaded worker instance
type TesseractWorker = Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>;
let workerInstance: TesseractWorker | null = null;
let isInitializing = false;
let initPromise: Promise<TesseractWorker> | null = null;

// Progress callback storage - allows logger to forward progress to UI
let currentProgressCallback: ((progress: number) => void) | null = null;

/**
 * Get or create the Tesseract worker
 * Uses CDN-hosted files to avoid bundling large WASM files
 */
const getWorker = async () => {
  if (workerInstance) {
    return workerInstance;
  }

  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;

  initPromise = (async () => {
    const Tesseract = await import('tesseract.js');

    const worker = await Tesseract.createWorker('eng', 1, {
      // Use CDN-hosted files to minimize bundle size
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
      logger: (m) => {
        // Forward progress to UI callback
        if (m.status === 'recognizing text' && currentProgressCallback) {
          const progress = Math.round(m.progress * 100);
          currentProgressCallback(progress);
        }
        // Also log in development
        if (process.env.NODE_ENV === 'development' && m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    workerInstance = worker;
    isInitializing = false;
    return worker;
  })();

  return initPromise;
};

/**
 * Perform OCR on an image
 * @param imageData - File, Blob, base64 string, or image URL
 * @param onProgress - Optional progress callback (0-100)
 * @returns Extracted text and confidence score
 */
export const performOcr = async (
  imageData: File | Blob | string,
  onProgress?: (progress: number) => void
): Promise<OcrResult> => {
  const startTime = Date.now();

  try {
    const worker = await getWorker();

    if (!worker) {
      throw new Error('Failed to initialize OCR worker');
    }

    // Store progress callback so logger can forward progress to UI
    currentProgressCallback = onProgress || null;

    const result = await worker.recognize(imageData, {}, {
      text: true,
    });

    // Clear callback after recognition complete
    currentProgressCallback = null;

    // Call final progress
    onProgress?.(100);

    return {
      text: result.data.text,
      confidence: result.data.confidence / 100, // Normalize to 0-1
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('OCR error:', error);
    throw new Error(
      error instanceof Error
        ? `OCR failed: ${error.message}`
        : 'OCR processing failed'
    );
  }
};

/**
 * Preload the OCR worker for faster first scan
 * Call this early (e.g., when user opens budget page)
 */
export const preloadOcrWorker = async (): Promise<void> => {
  try {
    await getWorker();
  } catch (error) {
    console.warn('Failed to preload OCR worker:', error);
  }
};

/**
 * Terminate the OCR worker to free memory
 * Call this when leaving the budget section
 */
export const terminateOcrWorker = async (): Promise<void> => {
  if (workerInstance) {
    try {
      await workerInstance.terminate();
    } catch (error) {
      console.warn('Error terminating OCR worker:', error);
    }
    workerInstance = null;
    initPromise = null;
    isInitializing = false;
  }
};

export default {
  performOcr,
  preloadOcrWorker,
  terminateOcrWorker,
};
