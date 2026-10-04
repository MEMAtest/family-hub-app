export type SourcingRoomId = 'main-bathroom' | 'shower-room';
export type SourcingRequirementStatus = 'confirmed' | 'fitter_check';
export type SourcingBasketStatus = 'review' | 'ask_fitter' | 'approved' | 'ordered';
export type SourcingCategory = 'Tiles' | 'Sanitaryware' | 'Furniture' | 'Showers' | 'Heating' | 'Fittings';
/** IN_STOCK: supplier page says "In stock". TO_ORDER: "Available to order" (not held, longer delivery). */
export type SourcingStock = 'IN_STOCK' | 'TO_ORDER' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';

export interface FixtureSpace {
  widthMm?: number;
  lengthMm?: number;
  depthMm?: number;
  heightMm?: number;
  clearanceMm: number;
  source: string;
  confirmedAt: string;
}

export interface TileMeasurement {
  method: 'area' | 'dimensions';
  unit: 'm' | 'cm' | 'mm';
  areaM2: number;
  sections: Array<{ label: string; length: number; width: number }>;
  deductionsM2: number;
  wasteIncluded: 'unknown' | 'included' | 'excluded';
  wastePercent: number;
  source: { kind: 'quote' | 'manual' | 'photo' | 'text'; label: string; text?: string; imageDataUrl?: string; imageId?: string };
  confirmedAt?: string;
}

export interface TileChoice {
  name: string;
  supplier: string;
  url: string;
  widthMm: number;
  lengthMm: number;
  coveragePerBoxM2?: number;
  tilesPerBox?: number;
  price: number;
  priceBasis: 'box' | 'm2' | 'tile';
  sourceImageDataUrl?: string;
  sourceImageId?: string;
}

export interface TilePlan {
  measurement: TileMeasurement;
  /** The first confirmed measurement is retained when later revisions are saved. */
  history: TileMeasurement[];
  choice?: TileChoice;
  updatedAt: string;
}

export interface SourcingRequirement {
  id: string;
  roomId: SourcingRoomId;
  name: string;
  category: string;
  /** Exactly what the quote item is, in plain words. */
  specification: string;
  /** The size the quote item must meet, e.g. "1700 × 900mm". */
  size?: string;
  quantity: number;
  unit?: string;
  status: SourcingRequirementStatus;
  notes?: string;
  constraints: Record<string, number | string>;
  requiredComponents: string[];
  referenceProduct?: { name: string; supplier: string; url?: string };
  recommendationNote?: string;
  tilePlan?: TilePlan;
  relatedToId?: string;
  source?: 'quote' | 'household';
  fitSpace?: FixtureSpace;
}

export interface SourcedProduct {
  id: string;
  supplier: string;
  category?: SourcingCategory | string;
  /** Quote items this product can satisfy. */
  requirementIds?: string[];
  name: string;
  /** One-line size summary shown on cards. */
  size?: string;
  url: string;
  imageUrl: string;
  gallery?: string[];
  price: number;
  priceUnit?: string;
  sku?: string;
  stock: SourcingStock;
  stockEvidence: string;
  specs?: Record<string, string>;
  dimensions: Record<string, number | string>;
  finish?: string;
  colour?: string;
  material?: string;
  effect?: string;
  components: string[];
  note?: string;
  topPick?: boolean;
  /** Verdict from the sourcing AI on a supplier search result, against the quote item it was searched for. */
  aiReview?: {
    requirementId: string;
    /** 'similar' is only used for tiles: same look, but size, finish or shade differs. */
    verdict: 'match' | 'needs_parts' | 'part' | 'similar' | 'not_suitable';
    reason: string;
    missingParts: string[];
    model: string;
    checkedAt: string;
  };
  description?: string;
  lastChecked: string;
  source?: 'supplier' | 'household';
}

export interface SourcingBasketItem {
  id: string;
  requirementId: string;
  productId: string;
  quantity: number;
  status: SourcingBasketStatus;
}

export interface ProjectSourcing {
  /** Bumped when the starter catalogue changes so older saved workspaces are refreshed. */
  version?: number;
  /** Household room names and measurement notes; not a guarantee that a product fits. */
  rooms?: Partial<Record<SourcingRoomId, { name?: string; sizeNotes?: string }>>;
  /** Source photos are stored once and referenced by measurement revisions. */
  tileDocuments?: Array<{ id: string; label: string; imageDataUrl: string }>;
  quoteLines?: Array<{ id: string; roomId: SourcingRoomId; text: string; quantity: number; requirementId: string; components: string[] }>;
  choiceHistory?: Array<{ id: string; requirementId: string; at: string; selected: { id: string; name: string; price: number }; replaced: Array<{ id: string; name: string; price: number }> }>;
  requirements: SourcingRequirement[];
  products: SourcedProduct[];
  basket: SourcingBasketItem[];
}
