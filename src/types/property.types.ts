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
  propertyType?: 'D' | 'S' | 'T' | 'F' | 'O';
  nearbyStreets?: string[];
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

// CRM Types for Task Workflow
export interface TaskContact {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  contactDate: string;
  notes?: string;
}

export type TaskQuoteStatus = 'pending' | 'accepted' | 'rejected';

// Manual quote line item (for multi-room quotes)
export interface ManualQuoteLineItem {
  id: string;
  description: string;  // e.g., "Main Bathroom", "Shower room"
  labour?: number;
  materials?: number;
  amount: number;  // Total for this line
}

export interface TaskQuote {
  id: string;
  title?: string;  // Editable title (e.g., "Bathroom Renovation Quote")
  contractorName: string;
  company?: string;
  phone?: string;
  email?: string;
  amount: number;
  currency: 'GBP';
  validUntil?: string;
  notes?: string;
  terms?: string;  // Terms/conditions/caveats
  status: TaskQuoteStatus;
  attachments?: PropertyDocument[];
  createdAt: string;
  // Manual quote line items (for multi-room/multi-item quotes)
  manualLineItems?: ManualQuoteLineItem[];
  includesVat?: boolean;  // Whether VAT is included
  // Enhanced fields for PDF extraction
  extractedQuoteData?: import('./quote.types').ExtractedQuote;  // Full extracted data from PDF
  contractorId?: string;  // Link to contractor record
}

export interface TaskScheduledVisit {
  id: string;
  date: string;
  time?: string;
  contractorName: string;
  company?: string;
  purpose: string;
  completed: boolean;
  notes?: string;
}

export interface TaskFollowUp {
  id: string;
  dueDate: string;
  description: string;
  completed: boolean;
  createdAt: string;
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
  // CRM workflow fields
  contacts?: TaskContact[];
  quotes?: TaskQuote[];
  scheduledVisits?: TaskScheduledVisit[];
  followUps?: TaskFollowUp[];
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

// ============== PROJECT TYPES ==============

// Email extraction types (from AI parsing)
export interface ExtractedContact {
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  role?: string;
}

export interface ExtractedPrice {
  description: string;
  amount: number;
  currency: 'GBP';
  type: 'quote' | 'estimate' | 'mention';
}

export interface ExtractedDate {
  description: string;
  date: string;
  type: 'proposed_visit' | 'start_date' | 'completion' | 'deadline' | 'other';
}

export interface ExtractedFollowUp {
  action: string;
  dueDate?: string;
}

export interface ProjectEmailExtractedData {
  contacts: ExtractedContact[];
  prices: ExtractedPrice[];
  dates: ExtractedDate[];
  followUps: ExtractedFollowUp[];
  topics: string[];
  summary: string;
}

export interface ProjectEmail {
  id: string;
  projectId: string;
  rawContent: string;
  subject?: string;
  sender?: string;
  receivedDate?: string;
  parsedAt: string;
  extractedData: ProjectEmailExtractedData;
  // Track which items were created from this email
  contactsCreated: string[];
  quotesCreated: string[];
  visitsCreated: string[];
  followUpsCreated: string[];
  createdAt: string;
}

// Project types
export type ProjectStatus = 'planning' | 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

export type ProjectCategory = 'Bathroom' | 'Kitchen' | 'Electrics' | 'Plumbing' | 'Heating' | 'Roofing' | 'Extension' | 'Garden' | 'Decoration' | 'Other';

export interface ProjectMilestone {
  id: string;
  title: string;
  targetDate?: string;
  completedDate?: string;
  status: 'pending' | 'completed' | 'missed';
  notes?: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  assignedTo?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PropertyProject {
  id: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  category: ProjectCategory | string;

  // Budget
  budgetMin?: number;
  budgetMax?: number;
  actualSpend?: number;
  currency: 'GBP';

  // Timeline
  targetStartDate?: string;
  targetCompletionDate?: string;
  actualStartDate?: string;
  actualCompletionDate?: string;
  milestones: ProjectMilestone[];

  // Content
  emails: ProjectEmail[];
  tasks: ProjectTask[];

  // CRM (reuses existing types)
  contacts: TaskContact[];
  quotes: TaskQuote[];
  scheduledVisits: TaskScheduledVisit[];
  followUps: TaskFollowUp[];

  // Documents
  attachments: PropertyDocument[];

  // Metadata
  createdAt: string;
  updatedAt: string;
}
