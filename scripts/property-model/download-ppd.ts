import path from 'node:path';
import { PPD_DIR, PPD_SOURCE_BASE } from './config';
import { downloadFile } from './utils';

const parseYear = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const currentYear = new Date().getFullYear();
const startYear = parseYear(process.env.PPD_START_YEAR, 2015);
const endYear = parseYear(process.env.PPD_END_YEAR, currentYear);
const includeMonthly = process.env.PPD_INCLUDE_MONTHLY === 'true';
const includeComplete = process.env.PPD_INCLUDE_COMPLETE === 'true';
const force = process.env.FORCE_DOWNLOAD === 'true';

const buildUrl = (filename: string) => `${PPD_SOURCE_BASE}/${filename}`;

const run = async () => {
  if (startYear > endYear) {
    throw new Error('PPD_START_YEAR must be <= PPD_END_YEAR');
  }

  const tasks: Array<Promise<unknown>> = [];

  for (let year = startYear; year <= endYear; year += 1) {
    const filename = `pp-${year}.csv`;
    const url = buildUrl(filename);
    const dest = path.join(PPD_DIR, filename);
    tasks.push(downloadFile(url, dest, { force }));
  }

  if (includeMonthly) {
    const filename = 'pp-monthly-update-new-version.csv';
    const url = buildUrl(filename);
    const dest = path.join(PPD_DIR, filename);
    tasks.push(downloadFile(url, dest, { force }));
  }

  if (includeComplete) {
    const filename = 'pp-complete.csv';
    const url = buildUrl(filename);
    const dest = path.join(PPD_DIR, filename);
    tasks.push(downloadFile(url, dest, { force }));
  }

  const results = await Promise.allSettled(tasks);
  const failures = results.filter((result) => result.status === 'rejected');

  if (failures.length > 0) {
    throw new Error(`PPD download failures: ${failures.length}`);
  }
};

run().catch((error) => {
  console.error('PPD download failed:', error);
  process.exit(1);
});
