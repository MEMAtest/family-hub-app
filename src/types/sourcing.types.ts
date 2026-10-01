export type SourcingRoomId = 'main-bathroom' | 'shower-room';
export type SourcingRequirementStatus = 'confirmed' | 'fitter_check';
export type SourcingBasketStatus = 'review' | 'ask_fitter' | 'approved' | 'ordered';
export type SourcingCategory = 'Tiles' | 'Sanitaryware' | 'Furniture' | 'Showers' | 'Heating' | 'Fittings';
/** IN_STOCK: supplier page says "In stock". TO_ORDER: "Available to order" (not held, longer delivery). */
export type SourcingStock = 'IN_STOCK' | 'TO_ORDER' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';

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
  description?: string;
  lastChecked: string;
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
  requirements: SourcingRequirement[];
  products: SourcedProduct[];
  basket: SourcingBasketItem[];
}
