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

export const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current);
  return values.map((value) => value.trim());
};

export const normalizePostcode = (postcode: string) =>
  postcode.toUpperCase().replace(/\s+/g, '').trim();

const toRadians = (value: number) => (value * Math.PI) / 180;

export const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const radius = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radius * c;
};

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
