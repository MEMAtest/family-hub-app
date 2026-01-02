import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { downloadFile, ensureDir } from './utils';

const sourceUrl = process.env.ONSPD_URL;
const zipPath = process.env.ONSPD_ZIP_PATH || 'data/postcodes/ONSPD.zip';
const extract = process.env.ONSPD_EXTRACT === 'true';
const outputCsv = process.env.ONSPD_OUTPUT_CSV || 'data/postcodes/ONSPD.csv';
const force = process.env.FORCE_DOWNLOAD === 'true';

const listZipEntries = (zipFile: string): string[] => {
  const result = spawnSync('unzip', ['-Z1', zipFile], { encoding: 'utf8' });
  if (result.status !== 0) {
    return [];
  }
  return result.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
};

const extractZipEntry = (zipFile: string, entry: string, dest: string) => {
  ensureDir(dest);
  const result = spawnSync('unzip', ['-p', zipFile, entry], {
    encoding: 'buffer',
    maxBuffer: 1024 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`Failed to extract ${entry} from ${zipFile}`);
  }
  fs.writeFileSync(dest, result.stdout);
};

const run = async () => {
  if (!sourceUrl) {
    throw new Error('Set ONSPD_URL to the ONSPD zip download URL.');
  }

  await downloadFile(sourceUrl, zipPath, { force });

  if (!extract) {
    console.log(`Downloaded ONSPD zip to ${zipPath}.`);
    return;
  }

  const entryOverride = process.env.ONSPD_ZIP_ENTRY;
  const entries = listZipEntries(zipPath);
  if (entries.length === 0) {
    throw new Error('Unable to list zip entries. Install unzip or extract manually.');
  }

  const entry =
    entryOverride ||
    entries.find((value) => value.toLowerCase().endsWith('.csv') && value.toLowerCase().includes('onspd')) ||
    entries.find((value) => value.toLowerCase().endsWith('.csv'));

  if (!entry) {
    throw new Error('No CSV entry found in ONSPD zip.');
  }

  extractZipEntry(zipPath, entry, outputCsv);
  console.log(`Extracted ${entry} to ${outputCsv}.`);
};

run().catch((error) => {
  console.error('ONSPD download failed:', error);
  process.exit(1);
});
