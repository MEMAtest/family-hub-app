import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

export const ensureDir = (filePath: string) => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
};

export const fileExists = (filePath: string) =>
  fs.existsSync(filePath) && fs.statSync(filePath).size > 0;

export const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export const downloadFile = async (
  url: string,
  destPath: string,
  options?: { force?: boolean }
) => {
  if (!options?.force && fileExists(destPath)) {
    return { skipped: true, path: destPath };
  }

  ensureDir(destPath);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'family-hub-property-model/1.0',
      Accept: '*/*',
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url} (${response.status})`);
  }

  const tempPath = `${destPath}.tmp`;
  const nodeStream = Readable.fromWeb(response.body as NodeReadableStream);
  await pipeline(nodeStream, fs.createWriteStream(tempPath));
  fs.renameSync(tempPath, destPath);

  return { skipped: false, path: destPath };
};

export const readJsonFile = <T>(filePath: string, fallback: T): T => {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch (error) {
    console.warn(`Failed to read JSON ${filePath}`, error);
    return fallback;
  }
};

export const writeJsonFile = (filePath: string, payload: unknown) => {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
};
