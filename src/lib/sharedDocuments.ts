// Household data stored as whole JSON documents in `family_documents` and shared
// between every signed-in device. Collections are arrays of records with an `id`;
// objects are single values (e.g. the property profile).

export const SHARED_DOCUMENTS = {
  'property.profile': 'object',
  'property.tasks': 'collection',
  'property.values': 'collection',
  'property.areaWatch': 'collection',
  'property.components': 'collection',
  'property.projects': 'collection',
  'property.issues': 'collection',
  'kids.marks': 'collection',
  'digest.preferences': 'object',
} as const;

export type SharedDocumentKey = keyof typeof SHARED_DOCUMENTS;

export const isSharedDocumentKey = (key: string): key is SharedDocumentKey =>
  Object.prototype.hasOwnProperty.call(SHARED_DOCUMENTS, key);

// Projects can hold extracted quote text, so allow a few MB but stay under
// the platform's request body limit.
export const MAX_SHARED_DOCUMENT_BYTES = 3_000_000;

export interface SharedDocumentPayload<T = unknown> {
  key: SharedDocumentKey;
  data: T;
  version: number;
  updatedAt: string;
}

// Kids activities a family member bookmarked or asked to hear about in the weekly email.
export interface KidsEventMark {
  id: string; // `${kind}:${eventId}`
  eventId: string;
  kind: 'saved' | 'subscribed';
  at: string;
}

export interface DigestPreferences {
  kidsIdeas: boolean;
  kidsLocalOnly: boolean;
  kidsFreeOnly: boolean;
  homeJobs: boolean;
  extraRecipients: string[]; // e.g. a partner without their own login
}

export const DEFAULT_DIGEST_PREFERENCES: DigestPreferences = {
  kidsIdeas: true,
  kidsLocalOnly: false,
  kidsFreeOnly: false,
  homeJobs: true,
  extraRecipients: [],
};

const EMAIL_PATTERN = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]{2,}$/;

export const MAX_EXTRA_RECIPIENTS = 5;

export const normalizeDigestPreferences = (raw: unknown): DigestPreferences => {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);
  const extras = Array.isArray(data.extraRecipients) ? data.extraRecipients : [];
  return {
    kidsIdeas: bool(data.kidsIdeas, DEFAULT_DIGEST_PREFERENCES.kidsIdeas),
    kidsLocalOnly: bool(data.kidsLocalOnly, DEFAULT_DIGEST_PREFERENCES.kidsLocalOnly),
    kidsFreeOnly: bool(data.kidsFreeOnly, DEFAULT_DIGEST_PREFERENCES.kidsFreeOnly),
    homeJobs: bool(data.homeJobs, DEFAULT_DIGEST_PREFERENCES.homeJobs),
    extraRecipients: Array.from(new Set(
      extras
        .filter((email): email is string => typeof email === 'string')
        .map((email) => email.trim().toLowerCase())
        .filter((email) => EMAIL_PATTERN.test(email))
    )).slice(0, MAX_EXTRA_RECIPIENTS),
  };
};
