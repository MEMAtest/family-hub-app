// Kids Events Types

export type EventCategory =
  | 'free'
  | 'museum'
  | 'theatre'
  | 'sports'
  | 'arts'
  | 'swimming'
  | 'nature'
  | 'science'
  | 'music'
  | 'festival'
  | 'workshop'
  | 'outdoor'
  | 'indoor'
  | 'other';

export type AgeRange = 'toddler' | 'preschool' | 'early-years' | 'all-ages';

export type CostBracket = 'free' | 'low' | 'medium' | 'high';

export type EventSource =
  | 'eventbrite'
  | 'timeout'
  | 'kidrated'
  | 'visitlondon'
  | 'local_council'
  | 'manual';

export interface EventLocation {
  name: string;
  address: string;
  postcode: string;
  borough?: string;
  latitude?: number;
  longitude?: number;
  distanceFromSE20?: number; // miles
}

export interface EventTiming {
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  isAllDay?: boolean;
  isRecurring?: boolean;
  recurringPattern?: string; // e.g., "Every Saturday", "Daily in August"
  duration?: number; // minutes
}

export interface EventPricing {
  isFree: boolean;
  adultPrice?: number;
  childPrice?: number;
  familyPrice?: number; // e.g., 2 adults + 2 kids
  priceNotes?: string; // e.g., "Under 3s free"
  bookingRequired?: boolean;
  bookingUrl?: string;
}

export interface EventReview {
  source: string;
  rating: number; // 1-5
  reviewCount?: number;
  snippet?: string;
}

export interface KidsEvent {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: EventCategory;
  categories?: EventCategory[]; // multiple categories

  // Age suitability
  ageRange: AgeRange;
  minAge?: number;
  maxAge?: number;
  suitableForToddlers: boolean; // 2.5yo
  suitableForPreschool: boolean; // 5.5yo

  // Location
  location: EventLocation;
  isLocal: boolean; // SE20/nearby

  // Timing
  timing: EventTiming;
  timings?: EventTiming[]; // multiple dates

  // Pricing
  pricing: EventPricing;
  costBracket: CostBracket;

  // Media
  imageUrl?: string;
  thumbnailUrl?: string;
  images?: string[];

  // Reviews & ratings
  reviews?: EventReview[];
  averageRating?: number;

  // Source & metadata
  source: EventSource;
  sourceUrl: string;
  sourceId?: string;

  // Features
  features?: string[]; // e.g., "Buggy friendly", "Cafe on-site", "Parking"
  highlights?: string[]; // Key selling points

  // User interaction
  isSubscribed?: boolean;
  isSaved?: boolean;

  // Timestamps
  scrapedAt: string;
  updatedAt: string;
  expiresAt?: string;
}

// Subscription for email digests
export interface EventSubscription {
  id: string;
  eventId: string;
  userId?: string;
  email: string;
  subscribedAt: string;
  notificationSent?: boolean;
}

// User preferences for email digest
export interface EventDigestPreferences {
  id: string;
  emails: string[]; // Multiple recipients (you + wife)
  sendDay: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  sendTime: string; // HH:MM, default "08:00"
  includeLocal: boolean;
  includeLondon: boolean;
  maxDistance?: number; // miles
  categories?: EventCategory[];
  budgetMax?: CostBracket;
  onlyFree?: boolean;
  enabled: boolean;
}

// Saved events
export interface SavedEvent {
  id: string;
  eventId: string;
  savedAt: string;
  notes?: string;
  reminder?: string; // Date to remind
}

// API response types
export interface EventsApiResponse {
  success: boolean;
  events: KidsEvent[];
  total: number;
  page: number;
  pageSize: number;
  filters?: EventFilters;
  lastUpdated: string;
}

export interface EventFilters {
  search?: string;
  categories?: EventCategory[];
  ageRange?: AgeRange;
  costBracket?: CostBracket[];
  isFree?: boolean;
  maxDistance?: number;
  dateFrom?: string;
  dateTo?: string;
  isLocal?: boolean;
}

// Email digest content
export interface WeeklyDigest {
  id: string;
  generatedAt: string;
  weekStarting: string;
  localEvents: KidsEvent[];
  londonEvents: KidsEvent[];
  savedEvents: KidsEvent[];
  topPicks: KidsEvent[];
  freeEvents: KidsEvent[];
  newThisWeek: KidsEvent[];
}

// Helper constants
export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  'toddler': '0-3 years',
  'preschool': '3-5 years',
  'early-years': '5-7 years',
  'all-ages': 'All ages',
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  'free': 'Free Activities',
  'museum': 'Museums & Exhibitions',
  'theatre': 'Theatre & Shows',
  'sports': 'Sports & Active',
  'arts': 'Arts & Crafts',
  'swimming': 'Swimming & Water',
  'nature': 'Nature & Wildlife',
  'science': 'Science & Discovery',
  'music': 'Music & Dance',
  'festival': 'Festivals & Fairs',
  'workshop': 'Workshops',
  'outdoor': 'Outdoor Adventures',
  'indoor': 'Indoor Play',
  'other': 'Other',
};

export const CATEGORY_ICONS: Record<EventCategory, string> = {
  'free': '🆓',
  'museum': '🏛️',
  'theatre': '🎭',
  'sports': '⚽',
  'arts': '🎨',
  'swimming': '🏊',
  'nature': '🌳',
  'science': '🔬',
  'music': '🎵',
  'festival': '🎪',
  'workshop': '🛠️',
  'outdoor': '🏕️',
  'indoor': '🎠',
  'other': '📍',
};

export const COST_BRACKET_LABELS: Record<CostBracket, string> = {
  'free': 'Free',
  'low': '£ (Under £10)',
  'medium': '££ (£10-25)',
  'high': '£££ (£25+)',
};

export const COST_BRACKET_COLORS: Record<CostBracket, string> = {
  'free': 'bg-green-100 text-green-800',
  'low': 'bg-blue-100 text-blue-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'high': 'bg-orange-100 text-orange-800',
};

// SE20 postcode area coordinates (Crystal Palace)
export const SE20_COORDS = {
  latitude: 51.4184,
  longitude: -0.0726,
};

// Distance thresholds
export const DISTANCE_THRESHOLDS = {
  LOCAL: 3, // miles - considered local
  NEARBY: 7, // miles - easy travel
  LONDON: 15, // miles - central London accessible
};
