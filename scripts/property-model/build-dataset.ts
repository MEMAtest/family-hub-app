import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import {
  DATASET_OUTPUT_PATH,
  MODEL_REGION_CONFIG,
  ONSPD_SOURCE_PATH,
  PLANNING_DIR,
  PPD_DIR,
  TRAINING_DIR,
  UKHPI_DIR,
} from './config';
import {
  ensureDir,
  haversineKm,
  normalizePostcode,
  parseCsvLine,
  readJsonFile,
  writeJsonFile,
} from './utils';

type OnspdHeaderIndex = {
  postcode: number;
  latitude: number;
  longitude: number;
  termination: number;
};

type PostcodeInfo = {
  lat: number;
  lon: number;
  outcode: string;
  distanceKm: number;
};

type PlanningRecord = {
  postcode?: string;
  receivedDate?: string;
};

type PlanningCounts = {
  byPostcode: Map<string, number>;
  byOutcode: Map<string, number>;
};

type HpiSeries = Map<string, number>;
type HpiLatest = Record<string, { index: number; dateKey: string }>;

type TrainingRecord = {
  id: string;
  price: number;
  logPrice: number;
  date: string;
  year: number;
  month: number;
  postcode: string;
  outcode: string;
  propertyType: 'D' | 'S' | 'T' | 'F' | 'O';
  newBuild: boolean;
  tenure: 'F' | 'L';
  district: string;
  distanceKm: number;
  hpiIndex: number;
  planningCount12m: number;
};

const DISTRICT_TO_UKHPI: Record<string, string> = {
  BROMLEY: 'bromley',
  LEWISHAM: 'lewisham',
  CROYDON: 'croydon',
  SOUTHWARK: 'southwark',
  LAMBETH: 'lambeth',
  GREENWICH: 'greenwich',
  LONDON: 'london',
};

const PPD_INDEX = {
  id: 0,
  price: 1,
  date: 2,
  postcode: 3,
  propertyType: 4,
  newBuild: 5,
  tenure: 6,
  paon: 7,
  saon: 8,
  street: 9,
  locality: 10,
  town: 11,
  district: 12,
  county: 13,
  category: 14,
  recordStatus: 15,
};

const isAllowedArea = (outcode: string) =>
  MODEL_REGION_CONFIG.allowedPostcodeAreas.some((area) =>
    outcode.startsWith(area)
  );

const parseOutcode = (normalizedPostcode: string) =>
  normalizedPostcode.slice(0, -3);

const resolveOnspdHeaderIndex = (header: string[]): OnspdHeaderIndex => {
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

const parseDateParts = (value: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  let parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]) - 1;
      const year = Number(match[3]);
      parsed = new Date(Date.UTC(year, month, day));
    }
  }

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getUTCFullYear();
  const month = parsed.getUTCMonth() + 1;

  return {
    date: parsed,
    year,
    month,
    dateKey: `${year}-${String(month).padStart(2, '0')}`,
    isoDate: parsed.toISOString().slice(0, 10),
  };
};

const buildPostcodeLookup = async () => {
  const stream = fs.createReadStream(ONSPD_SOURCE_PATH);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headerIndex: OnspdHeaderIndex | null = null;
  const lookup = new Map<string, PostcodeInfo>();
  let total = 0;
  let included = 0;

  for await (const line of rl) {
    if (!headerIndex) {
      headerIndex = resolveOnspdHeaderIndex(parseCsvLine(line));
      continue;
    }

    const values = parseCsvLine(line);
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
    const normalized = normalizePostcode(postcode);
    const outcode = parseOutcode(normalized);

    if (!isAllowedArea(outcode)) {
      continue;
    }

    const distanceKm = haversineKm(
      MODEL_REGION_CONFIG.center.latitude,
      MODEL_REGION_CONFIG.center.longitude,
      lat,
      lon
    );

    if (distanceKm <= MODEL_REGION_CONFIG.radiusKm) {
      lookup.set(normalized, { lat, lon, outcode, distanceKm });
      included += 1;
    }
  }

  return { lookup, total, included };
};

const parseHpiHeader = (header: string[]) => {
  const dateIndex = header.findIndex((value) => value.toLowerCase().includes('date'));
  const indexIndex = header.findIndex((value) => value.toLowerCase().includes('index'));

  if (dateIndex === -1 || indexIndex === -1) {
    throw new Error('Missing Date or Index columns in UKHPI file.');
  }

  return { dateIndex, indexIndex };
};

const loadHpiSeries = async () => {
  const seriesMap = new Map<string, HpiSeries>();
  if (!fs.existsSync(UKHPI_DIR)) {
    return seriesMap;
  }

  const files = fs.readdirSync(UKHPI_DIR).filter((file) => file.endsWith('.csv'));

  for (const file of files) {
    const match = file.match(
      /^ukhpi-(.+?)-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}\.csv$/i
    );
    const slug = match?.[1];
    if (!slug) continue;

    const filePath = path.join(UKHPI_DIR, file);
    const stream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let headerParsed = false;
    let dateIndex = -1;
    let indexIndex = -1;
    const series: HpiSeries = new Map();

    for await (const line of rl) {
      if (!headerParsed) {
        const header = parseCsvLine(line);
        const resolved = parseHpiHeader(header);
        dateIndex = resolved.dateIndex;
        indexIndex = resolved.indexIndex;
        headerParsed = true;
        continue;
      }

      const values = parseCsvLine(line);
      const dateValue = values[dateIndex];
      const indexValue = parseFloat(values[indexIndex]);

      if (!dateValue || !Number.isFinite(indexValue)) {
        continue;
      }

      const dateParts = parseDateParts(dateValue);
      if (!dateParts) {
        continue;
      }

      series.set(dateParts.dateKey, indexValue);
    }

    if (series.size > 0) {
      seriesMap.set(slug.toLowerCase(), series);
    }
  }

  return seriesMap;
};

const buildHpiLatest = (seriesMap: Map<string, HpiSeries>): HpiLatest => {
  const latest: HpiLatest = {};
  for (const [slug, series] of seriesMap) {
    let latestKey = '';
    let latestIndex = 0;
    for (const [dateKey, index] of series) {
      if (!latestKey || dateKey > latestKey) {
        latestKey = dateKey;
        latestIndex = index;
      }
    }
    if (latestKey) {
      latest[slug] = { index: latestIndex, dateKey: latestKey };
    }
  }
  return latest;
};

const resolveHpiSlug = (district: string | undefined) => {
  const key = (district || '').trim().toUpperCase();
  return DISTRICT_TO_UKHPI[key] || 'london';
};

const getHpiIndex = (seriesMap: Map<string, HpiSeries>, slug: string, dateKey: string) => {
  const series = seriesMap.get(slug) || seriesMap.get('london');
  if (!series) return null;

  const direct = series.get(dateKey);
  if (direct) return direct;

  const [yearStr, monthStr] = dateKey.split('-');
  let year = Number(yearStr);
  let month = Number(monthStr);

  for (let i = 0; i < 24; i += 1) {
    month -= 1;
    if (month <= 0) {
      month = 12;
      year -= 1;
    }
    const fallbackKey = `${year}-${String(month).padStart(2, '0')}`;
    const fallback = series.get(fallbackKey);
    if (fallback) return fallback;
  }

  return null;
};

const loadPlanningCounts = (): PlanningCounts => {
  const planningPath = path.join(PLANNING_DIR, 'bromley-latest.json');
  const records = readJsonFile<PlanningRecord[]>(planningPath, []);
  const byPostcode = new Map<string, number>();
  const byOutcode = new Map<string, number>();

  if (records.length === 0) {
    return { byPostcode, byOutcode };
  }

  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);

  for (const record of records) {
    const dateParts = record.receivedDate ? parseDateParts(record.receivedDate) : null;
    if (!dateParts || dateParts.date < cutoff) {
      continue;
    }

    const normalized = record.postcode ? normalizePostcode(record.postcode) : '';
    if (!normalized) {
      continue;
    }

    const outcode = parseOutcode(normalized);
    byPostcode.set(normalized, (byPostcode.get(normalized) || 0) + 1);
    byOutcode.set(outcode, (byOutcode.get(outcode) || 0) + 1);
  }

  return { byPostcode, byOutcode };
};

const mapToRecord = <T>(map: Map<string, T>) => {
  const record: Record<string, T> = {};
  for (const [key, value] of map) {
    record[key] = value;
  }
  return record;
};

const normalizePropertyType = (value: string): 'D' | 'S' | 'T' | 'F' | 'O' => {
  const normalized = value?.trim().toUpperCase();
  if (normalized === 'D' || normalized === 'S' || normalized === 'T' || normalized === 'F') {
    return normalized;
  }
  return 'O';
};

const run = async () => {
  if (!fs.existsSync(PPD_DIR)) {
    throw new Error(`PPD directory not found: ${PPD_DIR}`);
  }

  const { lookup, total: onspdTotal, included: onspdIncluded } = await buildPostcodeLookup();
  const hpiSeries = await loadHpiSeries();
  const hpiLatest = buildHpiLatest(hpiSeries);
  const planningCounts = loadPlanningCounts();

  const ppdFiles = fs.readdirSync(PPD_DIR).filter((file) => file.endsWith('.csv'));
  if (ppdFiles.length === 0) {
    throw new Error(`No PPD CSV files found in ${PPD_DIR}`);
  }

  ensureDir(DATASET_OUTPUT_PATH);
  const outputStream = fs.createWriteStream(DATASET_OUTPUT_PATH);

  let totalRows = 0;
  let includedRows = 0;
  let skippedOutside = 0;
  let skippedMissing = 0;
  let missingHpi = 0;
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (const file of ppdFiles) {
    const filePath = path.join(PPD_DIR, file);
    const stream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      totalRows += 1;

      const values = parseCsvLine(line);
      if (values.length <= PPD_INDEX.recordStatus) {
        skippedMissing += 1;
        continue;
      }

      const recordStatus = values[PPD_INDEX.recordStatus];
      if (recordStatus && recordStatus !== 'A') {
        continue;
      }

      const price = Number(values[PPD_INDEX.price]);
      const postcodeRaw = values[PPD_INDEX.postcode];
      const dateRaw = values[PPD_INDEX.date];

      if (!postcodeRaw || !Number.isFinite(price) || price <= 0) {
        skippedMissing += 1;
        continue;
      }

      const dateParts = parseDateParts(dateRaw);
      if (!dateParts) {
        skippedMissing += 1;
        continue;
      }

      const normalizedPostcode = normalizePostcode(postcodeRaw);
      const postcodeInfo = lookup.get(normalizedPostcode);
      if (!postcodeInfo) {
        skippedOutside += 1;
        continue;
      }

      const district = values[PPD_INDEX.district] || '';
      const outcode = postcodeInfo.outcode;
      const hpiSlug = resolveHpiSlug(district);
      const hpiIndex = getHpiIndex(hpiSeries, hpiSlug, dateParts.dateKey);

      if (!hpiIndex) {
        missingHpi += 1;
      }

      const planningCount =
        planningCounts.byPostcode.get(normalizedPostcode) ||
        planningCounts.byOutcode.get(outcode) ||
        0;

      const record: TrainingRecord = {
        id: values[PPD_INDEX.id],
        price,
        logPrice: Math.log(price),
        date: dateParts.isoDate,
        year: dateParts.year,
        month: dateParts.month,
        postcode: postcodeRaw.trim().toUpperCase(),
        outcode,
        propertyType: normalizePropertyType(values[PPD_INDEX.propertyType]),
        newBuild: values[PPD_INDEX.newBuild]?.trim().toUpperCase() === 'Y',
        tenure: values[PPD_INDEX.tenure]?.trim().toUpperCase() === 'L' ? 'L' : 'F',
        district,
        distanceKm: postcodeInfo.distanceKm,
        hpiIndex: hpiIndex || 100,
        planningCount12m: planningCount,
      };

      outputStream.write(`${JSON.stringify(record)}\n`);
      includedRows += 1;

      minDate = minDate ? (record.date < minDate ? record.date : minDate) : record.date;
      maxDate = maxDate ? (record.date > maxDate ? record.date : maxDate) : record.date;
    }
  }

  outputStream.end();

  writeJsonFile(path.join(TRAINING_DIR, 'dataset-metadata.json'), {
    generatedAt: new Date().toISOString(),
    region: MODEL_REGION_CONFIG,
    onspd: {
      totalPostcodesScanned: onspdTotal,
      totalPostcodesIncluded: onspdIncluded,
    },
    sources: {
      ppdFiles,
      ukHpiFiles: Array.from(hpiSeries.keys()),
      planningRecords: planningCounts.byPostcode.size,
    },
    stats: {
      totalRows,
      includedRows,
      skippedOutside,
      skippedMissing,
      missingHpi,
      minDate,
      maxDate,
    },
  });

  writeJsonFile(path.join(TRAINING_DIR, 'postcode-lookup.json'), mapToRecord(lookup));
  writeJsonFile(path.join(TRAINING_DIR, 'hpi-latest.json'), hpiLatest);
  writeJsonFile(path.join(TRAINING_DIR, 'planning-counts.json'), {
    generatedAt: new Date().toISOString(),
    byPostcode: mapToRecord(planningCounts.byPostcode),
    byOutcode: mapToRecord(planningCounts.byOutcode),
  });

  console.log(`Saved training dataset to ${DATASET_OUTPUT_PATH}`);
};

run().catch((error) => {
  console.error('Dataset build failed:', error);
  process.exit(1);
});
