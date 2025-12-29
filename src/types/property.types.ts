export type PropertyTaskStatus = 'outstanding' | 'in_progress' | 'blocked' | 'verify' | 'completed';

export type PropertyTaskPriority = 'urgent' | 'short' | 'medium' | 'long';

export type PropertyTaskSource = 'survey' | 'maintenance' | 'owner';

export type PropertyDocumentType = 'survey' | 'legal' | 'invoice' | 'warranty' | 'photo' | 'other';

export interface PropertyDocument {
  id: string;
  name: string;
  type: PropertyDocumentType;
  fileName?: string;
  url?: string;
  uploadedAt: string;
  notes?: string;
}

export interface PropertyBaseline {
  propertyName: string;
  address: string;
  purchaseDate?: string;
  purchasePrice?: number;
  documents: PropertyDocument[];
}

export interface CostRange {
  min: number;
  max: number;
  currency: 'GBP';
}

export interface TaskRecurrence {
  interval: number;
  unit: 'month' | 'year';
}

export interface PropertyWorkLog {
  id: string;
  taskId: string;
  completedDate: string;
  completedBy: string;
  cost: number;
  costIncludesVat: boolean;
  warrantyEndDate?: string;
  notes?: string;
  attachments?: PropertyDocument[];
}

export interface PropertyTask {
  id: string;
  title: string;
  category: string;
  conditionRating?: 1 | 2 | 3;
  priority: PropertyTaskPriority;
  impact: string;
  timeframe: string;
  pageReference?: string;
  surveyEvidence?: string;
  recommendedContractor?: string;
  defaultCostRange?: CostRange;
  status: PropertyTaskStatus;
  nextDueDate?: string;
  recurrence?: TaskRecurrence;
  components?: string[];
  attachments?: PropertyDocument[];
  workLogs: PropertyWorkLog[];
  source: PropertyTaskSource;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyValueEntry {
  id: string;
  date: string;
  value: number;
  source: 'land_registry' | 'house_price_index' | 'manual';
  notes?: string;
}

export interface AreaWatchItem {
  id: string;
  category: 'planning' | 'roadworks' | 'flooding' | 'crime' | 'development' | 'insurance';
  title: string;
  description?: string;
  status: 'open' | 'monitor' | 'closed';
  impact: 'low' | 'medium' | 'high';
  sourceUrl?: string;
  lastUpdated: string;
  notify: boolean;
}

export interface PropertyComponent {
  id: string;
  label: string;
  type: 'room' | 'element' | 'system' | 'exterior';
  floor: 'cellar' | 'ground' | 'first' | 'second' | 'roof' | 'exterior';
  description?: string;
}
