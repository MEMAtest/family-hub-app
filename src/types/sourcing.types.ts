export type SourcingRoomId = 'main-bathroom' | 'shower-room' | 'small-bathroom';
export type SourcingRequirementStatus = 'confirmed' | 'fitter_check';
export type SourcingBasketStatus = 'review' | 'ask_fitter' | 'approved' | 'ordered';

export interface SourcingRequirement {
  id: string;
  roomId: SourcingRoomId;
  name: string;
  category: string;
  specification: string;
  quantity: number;
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
  category?: string;
  name: string;
  url: string;
  imageUrl: string;
  price: number;
  priceUnit?: string;
  stock: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';
  stockEvidence: string;
  dimensions: Record<string, number | string>;
  finish?: string;
  colour?: string;
  material?: string;
  effect?: string;
  components: string[];
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
  requirements: SourcingRequirement[];
  products: SourcedProduct[];
  basket: SourcingBasketItem[];
}
