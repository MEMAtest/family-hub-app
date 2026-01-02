import path from 'node:path';
import { UKHPI_DIR, UKHPI_DOWNLOAD_URL } from './config';
import { downloadFile, slugify, writeJsonFile } from './utils';

const defaultLocations = [
  'http://landregistry.data.gov.uk/id/region/london',
  'http://landregistry.data.gov.uk/id/region/bromley',
  'http://landregistry.data.gov.uk/id/region/lewisham',
  'http://landregistry.data.gov.uk/id/region/croydon',
  'http://landregistry.data.gov.uk/id/region/southwark',
  'http://landregistry.data.gov.uk/id/region/lambeth',
  'http://landregistry.data.gov.uk/id/region/greenwich',
];

const parseDate = (value: string | undefined, fallback: Date) => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const now = new Date();
const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
const fromDate = parseDate(process.env.UKHPI_FROM, new Date(2000, 0, 1));
const toDate = parseDate(process.env.UKHPI_TO, monthStart);
const force = process.env.FORCE_DOWNLOAD === 'true';

const locations = process.env.UKHPI_LOCATIONS
  ? process.env.UKHPI_LOCATIONS.split(',').map((value) => value.trim()).filter(Boolean)
  : defaultLocations;

const buildUrl = (location: string) => {
  const base = UKHPI_DOWNLOAD_URL.endsWith('.csv')
    ? UKHPI_DOWNLOAD_URL
    : `${UKHPI_DOWNLOAD_URL}.csv`;
  const params = new URLSearchParams({
    location,
    from: formatDate(fromDate),
    to: formatDate(toDate),
  });
  return `${base}?${params.toString()}`;
};

const run = async () => {
  if (locations.length === 0) {
    throw new Error('No UKHPI locations configured.');
  }

  const tasks = locations.map((location) => {
    const slug = slugify(location.split('/').pop() || location);
    const filename = `ukhpi-${slug}-${formatDate(fromDate)}-to-${formatDate(toDate)}.csv`;
    const dest = path.join(UKHPI_DIR, filename);
    return downloadFile(buildUrl(location), dest, { force });
  });

  const results = await Promise.allSettled(tasks);
  const failures = results.filter((result) => result.status === 'rejected');

  writeJsonFile(path.join(UKHPI_DIR, 'ukhpi-sources.json'), {
    generatedAt: new Date().toISOString(),
    from: formatDate(fromDate),
    to: formatDate(toDate),
    locations,
    downloadUrl: UKHPI_DOWNLOAD_URL,
  });

  if (failures.length > 0) {
    throw new Error(`UKHPI download failures: ${failures.length}`);
  }
};

run().catch((error) => {
  console.error('UKHPI download failed:', error);
  process.exit(1);
});
