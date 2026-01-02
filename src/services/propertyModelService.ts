import fs from 'node:fs';
import path from 'node:path';

export type ModelMetrics = {
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
};

export type PropertyModelInputs = {
  postcode: string;
  propertyType?: 'D' | 'S' | 'T' | 'F' | 'O';
  tenure?: 'F' | 'L';
  newBuild?: boolean;
  asOfDate?: string;
};

export type PropertyModelEstimate = {
  estimate: number | null;
  inputs?: {
    postcode: string;
    outcode: string;
    distanceKm: number;
    hpiIndex: number;
    hpiDate: string | null;
    planningCount12m: number;
    propertyType: 'D' | 'S' | 'T' | 'F' | 'O';
    tenure: 'F' | 'L';
    newBuild: boolean;
    saleYear: number;
  };
  warnings: string[];
  meta?: {
    generatedAt: string;
    metrics?: {
      train: ModelMetrics;
      test: ModelMetrics;
    };
    coverage?: {
      transactions: number;
      minDate: string | null;
      maxDate: string | null;
      radiusKm: number | null;
    };
  };
};

type ModelFile = {
  generatedAt: string;
  metrics?: {
    train: ModelMetrics;
    test: ModelMetrics;
  };
  features: {
    order: string[];
    numeric: string[];
    scaling: Record<string, { mean: number; std: number }>;
    baseOutcode: string;
    outcodes: string[];
  };
  coefficients: number[];
};

type PostcodeLookup = Record<string, { lat: number; lon: number; outcode: string; distanceKm: number }>;

type HpiLatest = Record<string, { index: number; dateKey: string }>;

type PlanningCounts = {
  byPostcode: Record<string, number>;
  byOutcode: Record<string, number>;
};

type DatasetMetadata = {
  stats?: {
    includedRows?: number;
    minDate?: string;
    maxDate?: string;
  };
  region?: {
    radiusKm?: number;
  };
};

const MODEL_PATH = path.join(process.cwd(), 'data/property-model/model.json');
const POSTCODE_LOOKUP_PATH = path.join(process.cwd(), 'data/property-model/training/postcode-lookup.json');
const HPI_LATEST_PATH = path.join(process.cwd(), 'data/property-model/training/hpi-latest.json');
const PLANNING_COUNTS_PATH = path.join(process.cwd(), 'data/property-model/training/planning-counts.json');
const DATASET_META_PATH = path.join(process.cwd(), 'data/property-model/training/dataset-metadata.json');

const DISTRICT_TO_UKHPI: Record<string, string> = {
  BROMLEY: 'bromley',
  LEWISHAM: 'lewisham',
  CROYDON: 'croydon',
  SOUTHWARK: 'southwark',
  LAMBETH: 'lambeth',
  GREENWICH: 'greenwich',
  LONDON: 'london',
};

const POSTCODE_DISTRICTS: Record<string, string> = {
  SE20: 'BROMLEY',
  SE6: 'LEWISHAM',
  SE9: 'GREENWICH',
  SE12: 'LEWISHAM',
  SE26: 'LEWISHAM',
  BR1: 'BROMLEY',
  BR2: 'BROMLEY',
  BR3: 'BROMLEY',
  BR4: 'BROMLEY',
  BR5: 'BROMLEY',
  BR6: 'BROMLEY',
  BR7: 'BROMLEY',
};

let cachedModel: ModelFile | null = null;
let cachedPostcodes: PostcodeLookup | null = null;
let cachedHpi: HpiLatest | null = null;
let cachedPlanning: PlanningCounts | null = null;
let cachedDatasetMeta: DatasetMetadata | null = null;

const loadJsonFile = <T>(filePath: string): T | null => {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch (error) {
    console.warn(`Failed to read ${filePath}`, error);
    return null;
  }
};

const normalizePostcode = (postcode: string) =>
  postcode.toUpperCase().replace(/\s+/g, '').trim();

const getOutcode = (normalizedPostcode: string) => normalizedPostcode.slice(0, -3);

const getDistrictForPostcode = (postcode: string) => {
  const outcode = getOutcode(normalizePostcode(postcode));
  if (POSTCODE_DISTRICTS[outcode]) {
    return POSTCODE_DISTRICTS[outcode];
  }
  for (const [prefix, district] of Object.entries(POSTCODE_DISTRICTS)) {
    if (outcode.startsWith(prefix.replace(/\d+$/, ''))) {
      return district;
    }
  }
  return 'LONDON';
};

const getHpiSlug = (district: string) => DISTRICT_TO_UKHPI[district] || 'london';

const ensureModelContext = () => {
  if (!cachedModel) {
    cachedModel = loadJsonFile<ModelFile>(MODEL_PATH);
  }
  if (!cachedPostcodes) {
    cachedPostcodes = loadJsonFile<PostcodeLookup>(POSTCODE_LOOKUP_PATH);
  }
  if (!cachedHpi) {
    cachedHpi = loadJsonFile<HpiLatest>(HPI_LATEST_PATH);
  }
  if (!cachedPlanning) {
    cachedPlanning = loadJsonFile<PlanningCounts>(PLANNING_COUNTS_PATH);
  }
  if (!cachedDatasetMeta) {
    cachedDatasetMeta = loadJsonFile<DatasetMetadata>(DATASET_META_PATH);
  }

  return {
    model: cachedModel,
    postcodes: cachedPostcodes,
    hpiLatest: cachedHpi,
    planningCounts: cachedPlanning,
    datasetMeta: cachedDatasetMeta,
  };
};


const buildFeatureVector = (
  model: ModelFile,
  inputs: {
    propertyType: 'D' | 'S' | 'T' | 'F' | 'O';
    tenure: 'F' | 'L';
    newBuild: boolean;
    outcode: string;
    distanceKm: number;
    hpiIndex: number;
    planningCount12m: number;
    saleYear: number;
  }
) => {
  const scale = (name: string, value: number) => {
    const stats = model.features.scaling?.[name];
    if (!stats || !Number.isFinite(stats.std) || stats.std === 0) {
      return value;
    }
    return (value - stats.mean) / stats.std;
  };

  const numericValues = {
    distanceKm: scale('distanceKm', inputs.distanceKm),
    distanceKm2: scale('distanceKm2', inputs.distanceKm * inputs.distanceKm),
    hpiIndex: scale('hpiIndex', inputs.hpiIndex),
    planningCount12m: scale('planningCount12m', inputs.planningCount12m),
    saleYear: scale('saleYear', inputs.saleYear),
  };

  const featureValues: Record<string, number> = {
    intercept: 1,
    type_D: inputs.propertyType === 'D' ? 1 : 0,
    type_S: inputs.propertyType === 'S' ? 1 : 0,
    type_T: inputs.propertyType === 'T' ? 1 : 0,
    type_F: inputs.propertyType === 'F' ? 1 : 0,
    newBuild: inputs.newBuild ? 1 : 0,
    leasehold: inputs.tenure === 'L' ? 1 : 0,
    distanceKm: numericValues.distanceKm,
    distanceKm2: numericValues.distanceKm2,
    hpiIndex: numericValues.hpiIndex,
    planningCount12m: numericValues.planningCount12m,
    saleYear: numericValues.saleYear,
  };

  for (const outcode of model.features.outcodes.slice(1)) {
    featureValues[`outcode_${outcode}`] = inputs.outcode === outcode ? 1 : 0;
  }

  return model.features.order.map((name) => featureValues[name] ?? 0);
};

const dot = (a: number[], b: number[]) => a.reduce((sum, value, idx) => sum + value * b[idx], 0);

export const getPropertyModelEstimate = (params: PropertyModelInputs): PropertyModelEstimate => {
  const warnings: string[] = [];
  const context = ensureModelContext();

  if (!context.model || !context.postcodes) {
    return { estimate: null, warnings: ['Model files not available.'] };
  }

  const normalizedPostcode = normalizePostcode(params.postcode);
  const postcodeInfo = context.postcodes[normalizedPostcode];
  if (!postcodeInfo) {
    return { estimate: null, warnings: ['Postcode is outside the trained model radius.'] };
  }

  const district = getDistrictForPostcode(params.postcode);
  const hpiSlug = getHpiSlug(district);
  const hpiLatest = context.hpiLatest || {};
  const hpiRecord = hpiLatest[hpiSlug] || hpiLatest.london;

  if (!hpiRecord) {
    warnings.push('Latest HPI index not available; using default index baseline.');
  }

  const planningCounts = context.planningCounts || { byPostcode: {}, byOutcode: {} };
  const planningCount =
    planningCounts.byPostcode[normalizedPostcode] || planningCounts.byOutcode[postcodeInfo.outcode] || 0;

  const asOfDate = params.asOfDate ? new Date(params.asOfDate) : new Date();
  const saleYear = Number.isNaN(asOfDate.getTime()) ? new Date().getFullYear() : asOfDate.getFullYear();

  const inputs = {
    postcode: params.postcode.toUpperCase(),
    outcode: postcodeInfo.outcode,
    distanceKm: postcodeInfo.distanceKm,
    hpiIndex: hpiRecord?.index ?? 100,
    hpiDate: hpiRecord?.dateKey || null,
    planningCount12m: planningCount,
    propertyType: params.propertyType || 'O',
    tenure: params.tenure || 'F',
    newBuild: params.newBuild ?? false,
    saleYear,
  };

  const featureVector = buildFeatureVector(context.model, inputs);
  if (featureVector.length !== context.model.coefficients.length) {
    warnings.push('Model feature mismatch; skipping estimate.');
    return { estimate: null, warnings };
  }

  const logPrice = dot(context.model.coefficients, featureVector);
  const estimate = Math.round(Math.exp(logPrice));

  const coverage = context.datasetMeta?.stats
    ? {
        transactions: context.datasetMeta.stats.includedRows || 0,
        minDate: context.datasetMeta.stats.minDate || null,
        maxDate: context.datasetMeta.stats.maxDate || null,
        radiusKm: context.datasetMeta.region?.radiusKm || null,
      }
    : undefined;

  return {
    estimate,
    inputs,
    warnings,
    meta: {
      generatedAt: context.model.generatedAt,
      metrics: context.model.metrics,
      coverage,
    },
  };
};
