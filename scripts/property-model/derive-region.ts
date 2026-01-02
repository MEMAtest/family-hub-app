import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {
  MODEL_REGION_CONFIG,
  ONSPD_SOURCE_PATH,
  REGION_OUTPUT_PATH,
} from './config';

type HeaderIndex = {
  postcode: number;
  latitude: number;
  longitude: number;
  termination: number;
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

const splitCsvLine = (line: string): string[] => {
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

const resolveHeaderIndex = (header: string[]): HeaderIndex => {
  const findIndex = (options: string[]) =>
    header.findIndex((value) => options.includes(value.toLowerCase()));

  const postcode = findIndex(['pcd', 'pcd2', 'pcds', 'postcode']);
  const latitude = findIndex(['lat', 'latitude']);
  const longitude = findIndex(['long', 'longitude', 'lng']);
  const termination = findIndex(['doterm', 'termination']);

  if (postcode === -1 || latitude === -1 || longitude === -1) {
    throw new Error('Missing required columns in ONSPD source file.');
  }

  return { postcode, latitude, longitude, termination };
};

const ensureDir = (filePath: string) => {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
};

const isAllowedArea = (postcodeArea: string) =>
  MODEL_REGION_CONFIG.allowedPostcodeAreas.some((area) =>
    postcodeArea.startsWith(area)
  );

const parseOutcode = (postcode: string) => postcode.split(' ')[0].trim();

const run = async () => {
  const stream = fs.createReadStream(ONSPD_SOURCE_PATH);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headerIndex: HeaderIndex | null = null;
  const postcodeDistricts = new Set<string>();
  let total = 0;
  let included = 0;

  for await (const line of rl) {
    if (!headerIndex) {
      headerIndex = resolveHeaderIndex(splitCsvLine(line));
      continue;
    }

    const values = splitCsvLine(line);
    const termination = headerIndex.termination >= 0 ? values[headerIndex.termination] : '';
    if (termination) {
      continue;
    }

    const lat = parseFloat(values[headerIndex.latitude]);
    const lon = parseFloat(values[headerIndex.longitude]);
    const postcode = values[headerIndex.postcode];

    if (!postcode || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      continue;
    }

    total += 1;
    const outcode = parseOutcode(postcode);
    if (!isAllowedArea(outcode)) {
      continue;
    }

    const distance = haversineKm(
      MODEL_REGION_CONFIG.center.latitude,
      MODEL_REGION_CONFIG.center.longitude,
      lat,
      lon
    );

    if (distance <= MODEL_REGION_CONFIG.radiusKm) {
      postcodeDistricts.add(outcode);
      included += 1;
    }
  }

  const output = {
    generatedAt: new Date().toISOString(),
    center: MODEL_REGION_CONFIG.center,
    radiusKm: MODEL_REGION_CONFIG.radiusKm,
    allowedPostcodeAreas: MODEL_REGION_CONFIG.allowedPostcodeAreas,
    postcodeDistricts: Array.from(postcodeDistricts).sort(),
    totalPostcodesScanned: total,
    totalPostcodesIncluded: included,
  };

  ensureDir(REGION_OUTPUT_PATH);
  fs.writeFileSync(REGION_OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Saved region to ${REGION_OUTPUT_PATH}`);
};

run().catch((error) => {
  console.error('Failed to derive model region:', error);
  process.exit(1);
});
