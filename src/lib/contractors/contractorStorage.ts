import type { Contractor as DatabaseContractor } from '@prisma/client';
import type { ContractorProfile } from '@/types/contractor.types';

const METADATA_PREFIX = '__family_hub_contractor_v2__:';

export type ContractorMetadata = {
  notes?: string | null;
  website?: string | null;
  imageUrl?: string | null;
  serviceArea?: string | null;
  companyNumber?: string | null;
  status?: string | null;
  profile?: ContractorProfile | null;
};

export function readContractorMetadata(notes: string | null | undefined): ContractorMetadata {
  if (!notes) return {};
  if (!notes.startsWith(METADATA_PREFIX)) return { notes };

  try {
    const parsed = JSON.parse(notes.slice(METADATA_PREFIX.length)) as ContractorMetadata;
    return parsed && typeof parsed === 'object' ? parsed : { notes };
  } catch {
    return { notes };
  }
}

export function writeContractorMetadata(metadata: ContractorMetadata): string | null {
  const compact = Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  return Object.keys(compact).length ? `${METADATA_PREFIX}${JSON.stringify(compact)}` : null;
}

export function contractorResponse(contractor: DatabaseContractor) {
  const metadata = readContractorMetadata(contractor.notes);
  return {
    ...contractor,
    notes: metadata.notes ?? undefined,
    website: metadata.website ?? undefined,
    imageUrl: metadata.imageUrl ?? undefined,
    serviceArea: metadata.serviceArea ?? undefined,
    companyNumber: metadata.companyNumber ?? undefined,
    status: metadata.status ?? 'candidate',
    profile: metadata.profile ?? undefined,
  };
}
