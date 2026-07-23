import { PrismaClient } from '@prisma/client';
import { fragranceCatalogSlug } from '../src/lib/fragranceCatalog';

const prisma = new PrismaClient();
const WIKIDATA_QUERY = `SELECT DISTINCT ?item ?itemLabel ?manufacturerLabel WHERE {
  ?item wdt:P31/wdt:P279* wd:Q131746 ; wdt:P176 ?manufacturer .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 2000`;

type Binding = {
  item?: { value?: string };
  itemLabel?: { value?: string };
  manufacturerLabel?: { value?: string };
};

type CuratedEntry = {
  house: string;
  name: string;
  concentration?: string;
  olfactiveFamily?: string;
  notes?: string[];
  sourceName: string;
  sourceUrl: string;
};

// These records make the initial library useful for this household. Each comes
// from the named house's public product or catalogue material; no product media
// or third-party review data is copied into Family Hub.
const curatedStarterEntries: CuratedEntry[] = [
  {
    house: 'KILIAN PARIS',
    name: 'Smoking Hot',
    concentration: 'Eau de Parfum',
    olfactiveFamily: 'The Smokes',
    notes: ['Hookah flavour', 'Tobacco absolute', 'Bourbon vanilla'],
    sourceName: 'KILIAN PARIS official product page',
    sourceUrl: 'https://m.bykilian.com/product/19797/119317/perfume/smoking-hot/the-smokes',
  },
  {
    house: 'KILIAN PARIS',
    name: 'Musk Oud',
    concentration: 'Eau de Parfum',
    olfactiveFamily: 'The Smokes',
    notes: ['Geranium', 'Davana', 'Oud'],
    sourceName: 'KILIAN PARIS official catalogue',
    sourceUrl: 'https://www.bykilian.com/smokes-mpp',
  },
  {
    house: 'Acqua di Parma',
    name: 'Colonia Leather',
    concentration: 'Eau de Cologne Concentree',
    sourceName: 'Acqua di Parma official catalogue',
    sourceUrl: 'https://www.acquadiparma.com/on/demandware.static/-/Library-Sites-acquadiparmaLibrary/default/dw510f0a4c/pdf/adp-gift.pdf',
  },
];

const upsertStarterEntry = async (entry: CuratedEntry) => prisma.fragranceCatalogEntry.upsert({
  where: { slug: fragranceCatalogSlug(entry.house, entry.name, entry.concentration) },
  update: {
    olfactiveFamily: entry.olfactiveFamily || null,
    notes: entry.notes || [],
    sourceName: entry.sourceName,
    sourceUrl: entry.sourceUrl,
    sourceKind: 'official-house',
    catalogueStatus: 'source-attributed',
  },
  create: {
    slug: fragranceCatalogSlug(entry.house, entry.name, entry.concentration),
    house: entry.house,
    name: entry.name,
    concentration: entry.concentration || null,
    olfactiveFamily: entry.olfactiveFamily || null,
    notes: entry.notes || [],
    sourceName: entry.sourceName,
    sourceUrl: entry.sourceUrl,
    sourceKind: 'official-house',
    catalogueStatus: 'source-attributed',
  },
});

const main = async () => {
  const response = await fetch(`https://query.wikidata.org/sparql?${new URLSearchParams({
    format: 'json',
    query: WIKIDATA_QUERY,
  })}`, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'Family-Hub-Fragrance-Catalog/1.0' },
  });
  if (!response.ok) throw new Error(`Wikidata import failed with ${response.status}`);
  const payload = await response.json() as { results?: { bindings?: Binding[] } };
  const entries = (payload.results?.bindings || [])
    .map((binding) => ({
      house: binding.manufacturerLabel?.value?.trim() || '',
      name: binding.itemLabel?.value?.trim() || '',
      sourceUrl: binding.item?.value?.replace('http://', 'https://') || null,
    }))
    .filter((entry) => entry.house && entry.name && !/^Q\d+$/.test(entry.name));

  let imported = 0;
  for (const entry of entries) {
    await prisma.fragranceCatalogEntry.upsert({
      where: { slug: fragranceCatalogSlug(entry.house, entry.name) },
      update: {
        sourceName: 'Wikidata (CC0)',
        sourceUrl: entry.sourceUrl,
        sourceKind: 'wikidata-cc0',
        catalogueStatus: 'source-attributed',
      },
      create: {
        slug: fragranceCatalogSlug(entry.house, entry.name),
        house: entry.house,
        name: entry.name,
        sourceName: 'Wikidata (CC0)',
        sourceUrl: entry.sourceUrl,
        sourceKind: 'wikidata-cc0',
        catalogueStatus: 'source-attributed',
      },
    });
    imported += 1;
  }
  await Promise.all(curatedStarterEntries.map(upsertStarterEntry));
  console.log(`Imported or refreshed ${imported} Wikidata releases and ${curatedStarterEntries.length} official starter records.`);
};

main()
  .catch((error) => {
    console.error('Wikidata fragrance catalogue import failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
