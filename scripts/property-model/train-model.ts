import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { DATASET_OUTPUT_PATH, MODEL_OUTPUT_PATH, TRAINING_DIR } from './config';
import { ensureDir, writeJsonFile } from './utils';

type TrainingRecord = {
  price: number;
  logPrice: number;
  year: number;
  month: number;
  propertyType: 'D' | 'S' | 'T' | 'F' | 'O';
  newBuild: boolean;
  tenure: 'F' | 'L';
  distanceKm: number;
  hpiIndex: number;
  planningCount12m: number;
  outcode: string;
};

type FeatureStats = {
  mean: number;
  std: number;
};

type Metrics = {
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
};

const NUMERIC_FEATURES = [
  'distanceKm',
  'distanceKm2',
  'hpiIndex',
  'planningCount12m',
  'saleYear',
] as const;

type NumericFeatureName = (typeof NUMERIC_FEATURES)[number];

const readDataset = async () => {
  if (!fs.existsSync(DATASET_OUTPUT_PATH)) {
    throw new Error(`Dataset not found at ${DATASET_OUTPUT_PATH}`);
  }

  const stream = fs.createReadStream(DATASET_OUTPUT_PATH);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const records: TrainingRecord[] = [];

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    records.push(JSON.parse(trimmed) as TrainingRecord);
  }

  return records;
};

const computeNumericStats = (records: TrainingRecord[]): Record<NumericFeatureName, FeatureStats> => {
  const sums: Record<NumericFeatureName, number> = {
    distanceKm: 0,
    distanceKm2: 0,
    hpiIndex: 0,
    planningCount12m: 0,
    saleYear: 0,
  };
  const sumsSq: Record<NumericFeatureName, number> = {
    distanceKm: 0,
    distanceKm2: 0,
    hpiIndex: 0,
    planningCount12m: 0,
    saleYear: 0,
  };

  for (const record of records) {
    const values = getNumericValues(record);
    for (const key of NUMERIC_FEATURES) {
      const value = values[key];
      sums[key] += value;
      sumsSq[key] += value * value;
    }
  }

  const stats = {} as Record<NumericFeatureName, FeatureStats>;
  for (const key of NUMERIC_FEATURES) {
    const mean = sums[key] / records.length;
    const variance = sumsSq[key] / records.length - mean * mean;
    const std = Math.sqrt(Math.max(variance, 1e-12));
    stats[key] = { mean, std };
  }

  return stats;
};

const getNumericValues = (record: TrainingRecord) => ({
  distanceKm: record.distanceKm,
  distanceKm2: record.distanceKm * record.distanceKm,
  hpiIndex: record.hpiIndex,
  planningCount12m: record.planningCount12m || 0,
  saleYear: record.year,
});

const buildFeatureNames = (outcodes: string[]) => {
  const baseOutcode = outcodes[0] || '';
  const featureNames = [
    'intercept',
    'type_D',
    'type_S',
    'type_T',
    'type_F',
    'newBuild',
    'leasehold',
    'distanceKm',
    'distanceKm2',
    'hpiIndex',
    'planningCount12m',
    'saleYear',
    ...outcodes.slice(1).map((code) => `outcode_${code}`),
  ];

  return { featureNames, baseOutcode };
};

const buildFeatureVector = (
  record: TrainingRecord,
  outcodes: string[],
  stats: Record<NumericFeatureName, FeatureStats>
) => {
  const values = getNumericValues(record);
  const scale = (key: NumericFeatureName) => (values[key] - stats[key].mean) / stats[key].std;

  const features = [
    1,
    record.propertyType === 'D' ? 1 : 0,
    record.propertyType === 'S' ? 1 : 0,
    record.propertyType === 'T' ? 1 : 0,
    record.propertyType === 'F' ? 1 : 0,
    record.newBuild ? 1 : 0,
    record.tenure === 'L' ? 1 : 0,
    scale('distanceKm'),
    scale('distanceKm2'),
    scale('hpiIndex'),
    scale('planningCount12m'),
    scale('saleYear'),
    ...outcodes.slice(1).map((code) => (record.outcode === code ? 1 : 0)),
  ];

  return features;
};

const dot = (a: number[], b: number[]) => a.reduce((sum, value, idx) => sum + value * b[idx], 0);

const solveLinearSystem = (matrix: number[][], vector: number[]) => {
  const n = matrix.length;
  const augmented = matrix.map((row, i) => [...row, vector[i]]);

  for (let i = 0; i < n; i += 1) {
    let maxRow = i;
    for (let k = i + 1; k < n; k += 1) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }

    if (maxRow !== i) {
      const temp = augmented[i];
      augmented[i] = augmented[maxRow];
      augmented[maxRow] = temp;
    }

    const pivot = augmented[i][i];
    if (Math.abs(pivot) < 1e-12) {
      throw new Error('Singular matrix while solving regression.');
    }

    for (let k = i + 1; k < n; k += 1) {
      const factor = augmented[k][i] / pivot;
      for (let j = i; j <= n; j += 1) {
        augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }

  const result = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i -= 1) {
    let sum = augmented[i][n];
    for (let j = i + 1; j < n; j += 1) {
      sum -= augmented[i][j] * result[j];
    }
    result[i] = sum / augmented[i][i];
  }

  return result;
};

const computeMetrics = (records: TrainingRecord[], predictLog: (record: TrainingRecord) => number): Metrics => {
  if (records.length === 0) {
    return { mae: 0, rmse: 0, mape: 0, r2: 0 };
  }

  let mae = 0;
  let mse = 0;
  let mape = 0;
  let actualSum = 0;

  for (const record of records) {
    const predicted = Math.exp(predictLog(record));
    const actual = record.price;
    const error = predicted - actual;
    mae += Math.abs(error);
    mse += error * error;
    if (actual > 0) {
      mape += Math.abs(error) / actual;
    }
    actualSum += actual;
  }

  const meanActual = actualSum / records.length;
  let ssTot = 0;
  let ssRes = 0;

  for (const record of records) {
    const predicted = Math.exp(predictLog(record));
    const actual = record.price;
    ssTot += (actual - meanActual) * (actual - meanActual);
    ssRes += (actual - predicted) * (actual - predicted);
  }

  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return {
    mae: mae / records.length,
    rmse: Math.sqrt(mse / records.length),
    mape: mape / records.length,
    r2,
  };
};

const splitRecords = (records: TrainingRecord[]) => {
  const splitMode = process.env.MODEL_SPLIT || 'random';
  const testRatio = Number(process.env.MODEL_TEST_RATIO || 0.2);

  if (splitMode === 'temporal') {
    const sorted = [...records].sort(
      (a, b) => a.year - b.year || a.month - b.month
    );
    const last = sorted[sorted.length - 1];
    const cutoff = new Date(Date.UTC(last.year, last.month - 1, 1));
    cutoff.setUTCMonth(cutoff.getUTCMonth() - 12);

    const train: TrainingRecord[] = [];
    const test: TrainingRecord[] = [];

    for (const record of sorted) {
      const recordDate = new Date(Date.UTC(record.year, record.month - 1, 1));
      if (recordDate > cutoff) {
        test.push(record);
      } else {
        train.push(record);
      }
    }

    if (test.length >= 10 && train.length >= 10) {
      return { train, test, splitMode };
    }
  }

  let seed = Number(process.env.MODEL_SEED || 42) >>> 0;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };

  const train: TrainingRecord[] = [];
  const test: TrainingRecord[] = [];

  for (const record of records) {
    if (random() < testRatio) {
      test.push(record);
    } else {
      train.push(record);
    }
  }

  return { train, test, splitMode: 'random' };
};

const run = async () => {
  const records = await readDataset();
  if (records.length === 0) {
    throw new Error('No training records found.');
  }

  const outcodes = Array.from(new Set(records.map((record) => record.outcode))).sort();
  const stats = computeNumericStats(records);
  const { featureNames, baseOutcode } = buildFeatureNames(outcodes);
  const { train, test, splitMode } = splitRecords(records);

  const featureCount = featureNames.length;
  const xtx = Array.from({ length: featureCount }, () => Array(featureCount).fill(0));
  const xty = new Array<number>(featureCount).fill(0);

  for (const record of train) {
    const features = buildFeatureVector(record, outcodes, stats);
    const target = record.logPrice;

    for (let i = 0; i < featureCount; i += 1) {
      xty[i] += features[i] * target;
      for (let j = 0; j < featureCount; j += 1) {
        xtx[i][j] += features[i] * features[j];
      }
    }
  }

  const lambda = Number(process.env.MODEL_LAMBDA || 1);
  for (let i = 1; i < featureCount; i += 1) {
    xtx[i][i] += lambda;
  }

  const coefficients = solveLinearSystem(xtx, xty);

  const predictLog = (record: TrainingRecord) => {
    const features = buildFeatureVector(record, outcodes, stats);
    return dot(coefficients, features);
  };

  const metrics = {
    train: computeMetrics(train, predictLog),
    test: computeMetrics(test, predictLog),
  };

  ensureDir(MODEL_OUTPUT_PATH);
  writeJsonFile(MODEL_OUTPUT_PATH, {
    generatedAt: new Date().toISOString(),
    records: {
      total: records.length,
      train: train.length,
      test: test.length,
    },
    splitMode,
    lambda,
    features: {
      order: featureNames,
      numeric: NUMERIC_FEATURES,
      scaling: stats,
      baseOutcode,
      outcodes,
      typeBaseline: 'O',
    },
    coefficients,
    metrics,
  });

  writeJsonFile(path.join(TRAINING_DIR, 'training-metrics.json'), {
    generatedAt: new Date().toISOString(),
    splitMode,
    lambda,
    metrics,
  });

  console.log(`Saved model to ${MODEL_OUTPUT_PATH}`);
};

run().catch((error) => {
  console.error('Model training failed:', error);
  process.exit(1);
});
