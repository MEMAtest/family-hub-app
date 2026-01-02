import path from 'node:path';
import { PLANNING_DIR, REGION_OUTPUT_PATH } from './config';
import { readJsonFile, writeJsonFile } from './utils';

type PlanningRecord = {
  id: string;
  reference?: string;
  address?: string;
  proposal?: string;
  status?: string;
  decision?: string;
  decisionDate?: string;
  receivedDate?: string;
  link?: string;
  postcodeQuery: string;
  scrapedAt: string;
  rawColumns: string[];
};

const BASE_URL = process.env.BROMLEY_PLANNING_BASE_URL ||
  'https://pa.bromley.gov.uk/online-applications';

const cleanHtmlText = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const extractTable = (html: string) => {
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return null;

  const tableHtml = tableMatch[1];
  const headers = Array.from(tableHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)).map((match) =>
    cleanHtmlText(match[1])
  );

  const rows = Array.from(tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)).map((match) => match[1]);
  const records = rows
    .map((rowHtml) => {
      const cells = Array.from(rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((match) =>
        cleanHtmlText(match[1])
      );
      const linkMatch = rowHtml.match(/href="([^"]*applicationDetails\.do[^"]*)"/i);
      const link = linkMatch ? new URL(linkMatch[1], BASE_URL).toString() : undefined;
      const id = link ? new URL(link).searchParams.get('keyVal') || link : undefined;
      return { cells, link, id };
    })
    .filter((row) => row.cells.length > 0);

  return { headers, records };
};

const mapRecord = (
  headers: string[],
  row: { cells: string[]; link?: string; id?: string },
  postcodeQuery: string
): PlanningRecord => {
  const headerMap = headers.reduce<Record<string, string>>((acc, header, index) => {
    acc[header.toLowerCase()] = row.cells[index] || '';
    return acc;
  }, {});

  return {
    id: row.id || row.cells[0] || `${postcodeQuery}-${row.cells.join('-')}`,
    reference: headerMap['reference'] || row.cells[0],
    address: headerMap['address'] || row.cells[1],
    proposal: headerMap['proposal'] || row.cells[2],
    status: headerMap['status'] || row.cells[3],
    decision: headerMap['decision'] || row.cells[4],
    decisionDate: headerMap['decision date'] || row.cells[5],
    receivedDate: headerMap['received date'] || row.cells[5],
    link: row.link,
    postcodeQuery,
    scrapedAt: new Date().toISOString(),
    rawColumns: row.cells,
  };
};

const fetchPlanning = async (postcode: string) => {
  const params = new URLSearchParams({
    action: 'simple',
    searchType: 'Application',
    postcode,
  });
  const url = `${BASE_URL}/search.do?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'family-hub-property-model/1.0',
      Accept: 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`Planning search failed (${response.status})`);
  }

  const html = await response.text();
  const table = extractTable(html);

  if (!table) {
    return [];
  }

  return table.records.map((row) => mapRecord(table.headers, row, postcode));
};

const loadPostcodeQueries = () => {
  if (process.env.PLANNING_POSTCODES) {
    return process.env.PLANNING_POSTCODES.split(',').map((value) => value.trim()).filter(Boolean);
  }

  const region = readJsonFile<{ postcodeDistricts?: string[] }>(REGION_OUTPUT_PATH, {});
  if (region.postcodeDistricts && region.postcodeDistricts.length > 0) {
    return region.postcodeDistricts;
  }

  return ['SE20'];
};

const mergeRecords = (existing: PlanningRecord[], incoming: PlanningRecord[]) => {
  const recordsById = new Map<string, PlanningRecord>();
  for (const record of existing) {
    recordsById.set(record.id, record);
  }
  for (const record of incoming) {
    recordsById.set(record.id, record);
  }
  return Array.from(recordsById.values());
};

const run = async () => {
  const postcodes = loadPostcodeQueries();
  const allRecords: PlanningRecord[] = [];

  for (const postcode of postcodes) {
    const records = await fetchPlanning(postcode);
    const outputPath = path.join(
      PLANNING_DIR,
      `bromley-${postcode.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`
    );
    writeJsonFile(outputPath, {
      postcode,
      scrapedAt: new Date().toISOString(),
      records,
    });
    allRecords.push(...records);
  }

  const latestPath = path.join(PLANNING_DIR, 'bromley-latest.json');
  const existing = readJsonFile<PlanningRecord[]>(latestPath, []);
  const merged = mergeRecords(existing, allRecords);
  writeJsonFile(latestPath, merged);
};

run().catch((error) => {
  console.error('Planning download failed:', error);
  process.exit(1);
});
