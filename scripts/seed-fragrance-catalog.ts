import { PrismaClient } from '@prisma/client';
import { fragranceCatalogSlug } from '../src/lib/fragranceCatalog';

const prisma = new PrismaClient();

const main = async () => {
  const fragrances = await prisma.fragrance.findMany({
    select: { id: true, house: true, name: true, concentration: true },
  });
  const entries = new Map<string, { house: string; name: string; concentration: string | null }>();
  fragrances.forEach((fragrance) => {
    const slug = fragranceCatalogSlug(fragrance.house, fragrance.name, fragrance.concentration);
    entries.set(slug, { house: fragrance.house, name: fragrance.name, concentration: fragrance.concentration });
  });

  let linked = 0;
  for (const [slug, entry] of entries) {
    const catalogEntry = await prisma.fragranceCatalogEntry.upsert({
      where: { slug },
      update: {},
      create: {
        ...entry,
        slug,
        sourceName: 'Profile-confirmed collection',
        sourceKind: 'profile-confirmed',
        catalogueStatus: 'profile-confirmed',
      },
    });
    const result = await prisma.fragrance.updateMany({
      where: {
        house: entry.house,
        name: entry.name,
        concentration: entry.concentration,
      },
      data: { catalogEntryId: catalogEntry.id },
    });
    linked += result.count;
  }

  console.log(`Catalogue entries: ${entries.size}; personal bottles linked: ${linked}`);
};

main()
  .catch((error) => {
    console.error('Seed fragrance catalogue failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
