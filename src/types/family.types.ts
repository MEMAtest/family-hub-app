// Family Management System Types

export interface FamilyMember {
  id: string;
  familyId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  nickname?: string;
  dateOfBirth: Date;
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  relationship: FamilyRelationship;
  role: FamilyRole;
  status: 'active' | 'inactive' | 'away' | 'archived';
  avatar: string;
  profilePhoto?: string;
  profilePicture?: string;
  color: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  joinDate?: Date;
  address?: Address;
  emergencyContacts: EmergencyContact[];
  medicalInfo: MedicalInfo;
  preferences: MemberPreferences;
  permissions: MemberPermissions;
  accountInfo: AccountInfo;
  customFields: { [key: string]: any };
  tags: string[];
  notes?: string;
  isActive: boolean;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface FamilyRelationship {
  type: 'parent' | 'child' | 'spouse' | 'partner' | 'sibling' | 'grandparent' | 'grandchild' |
        'aunt' | 'uncle' | 'cousin' | 'stepparent' | 'stepchild' | 'stepsibling' | 'guardian' |
        'ward' | 'other';
  description?: string;
  relationTo?: string; // ID of related family member
  isPrimary: boolean;
  isLegal: boolean;
  startDate?: Date;
  endDate?: Date;
}

export interface FamilyRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  level: 'admin' | 'parent' | 'teen' | 'child' | 'guest';
  canManageFamily: boolean;
  canManageCalendar: boolean;
  canManageBudget: boolean;
  canManageGoals: boolean;
  canManageShopping: boolean;
  canManageMeals: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  restrictions: RoleRestriction[];
}

export interface RoleRestriction {
  type: 'time_limit' | 'feature_limit' | 'spending_limit' | 'content_filter';
  value: any;
  description: string;
  isActive: boolean;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: 'home' | 'work' | 'school' | 'other';
  isPrimary: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: Address;
  isPrimary: boolean;
  availability?: string;
  notes?: string;
}

export interface MedicalInfo {
  allergies: Allergy[];
  medications: Medication[];
  conditions: MedicalCondition[];
  bloodType?: string;
  insuranceInfo?: InsuranceInfo;
  primaryDoctor?: HealthcareProvider;
  doctorContact?: HealthcareProvider;
  emergencyMedicalInfo?: string;
  medicalNotes?: string;
  lastUpdated: Date;
}

export interface Allergy {
  id: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  symptoms: string[];
  treatment?: string;
  notes?: string;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy: string;
  startDate: Date;
  endDate?: Date;
  purpose: string;
  sideEffects?: string[];
  notes?: string;
}

export interface MedicalCondition {
  id: string;
  condition: string;
  diagnosedDate?: Date;
  status: 'active' | 'managed' | 'resolved' | 'chronic';
  description?: string;
  treatment?: string;
  notes?: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  groupNumber?: string;
  memberId: string;
  effectiveDate: Date;
  expirationDate?: Date;
  copay?: number;
  deductible?: number;
}

export interface HealthcareProvider {
  name: string;
  specialty: string;
  phone: string;
  email?: string;
  address?: Address;
  notes?: string;
}

export interface MemberPreferences {
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  accessibility: AccessibilityPreferences;
  theme: ThemePreferences;
  language: string;
  timezone: string;
  calendar: CalendarPreferences;
  dashboard: DashboardPreferences;
  communication?: PersonalPreferences['communication'];
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
  frequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
  quietHours: { start: string; end: string; enabled?: boolean };
  categories: { [category: string]: boolean };
}

export interface PrivacyPreferences {
  profileVisibility: 'family' | 'extended_family' | 'private';
  activityVisibility: 'family' | 'parents_only' | 'private';
  locationSharing: boolean;
  photoTagging: boolean;
  contactSharing: boolean;
  dataCollection: boolean;
}

export interface AccessibilityPreferences {
  fontSize: 'small' | 'medium' | 'large' | 'extra_large';
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  voiceCommands: boolean;
  keyboardNavigation: boolean;
}

export interface ThemePreferences {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  fontSize: number;
  compactMode: boolean;
}

export interface CalendarPreferences {
  defaultView: 'month' | 'week' | 'day' | 'agenda';
  weekStart: 'monday' | 'sunday';
  workingHours: { start: string; end: string; enabled?: boolean };
  showWeekends: boolean;
  reminderDefaults: { time: number; type: string }[];
}

export interface DashboardPreferences {
  layout: 'compact' | 'comfortable' | 'spacious';
  widgets: DashboardWidget[];
  showTips: boolean;
  autoRefresh: boolean;
}

export interface DashboardWidget {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  settings: { [key: string]: any };
  isVisible: boolean;
}

export interface MemberPermissions {
  canEditProfile: boolean;
  canViewOtherProfiles: boolean;
  canManageFamily: boolean;
  canCreateEvents: boolean;
  canDeleteEvents: boolean;
  canManageBudget: boolean;
  canViewBudgetReports: boolean;
  canManageGoals: boolean;
  canViewGoalReports: boolean;
  canManageShopping: boolean;
  canManageMeals: boolean;
  canManagePhotos: boolean;
  canInviteMembers: boolean;
  canManageSettings: boolean;
  restrictions: PermissionRestriction[];
}

export interface PermissionRestriction {
  type: 'time_based' | 'approval_required' | 'limit_based' | 'content_filtered';
  description: string;
  settings: { [key: string]: any };
  isActive: boolean;
}

export interface AccountInfo {
  username?: string;
  lastLogin?: Date;
  loginCount: number;
  deviceInfo: DeviceInfo[];
  securitySettings: SecuritySettings;
  parentalControls?: ParentalControls;
}

export interface DeviceInfo {
  id: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'smart_tv' | 'other';
  deviceName: string;
  browser?: string;
  os?: string;
  lastUsed: Date;
  isActive: boolean;
  location?: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  passwordLastChanged: Date;
  securityQuestions: boolean;
  loginNotifications: boolean;
  sessionTimeout: number;
}

export interface ParentalControls {
  screenTimeLimit: number; // minutes per day
  allowedApps: string[];
  blockedWebsites: string[];
  safeSearch: boolean;
  contentRating: string;
  bedtimeRestrictions: { start: string; end: string };
  approvalRequired: string[];
}

// Family Unit Types
export interface Family {
  id: string;
  name: string;
  description?: string;
  type: 'nuclear' | 'extended' | 'blended' | 'single_parent' | 'multigenerational' | 'other';
  address: Address;
  timezone: string;
  language: string;
  currency: string;
  members: FamilyMember[];
  settings: FamilySettings;
  subscription: FamilySubscription;
  statistics: FamilyStatistics;
  milestones: FamilyMilestone[];
  traditions: FamilyTradition[];
  rules: FamilyRule[];
  emergencyPlan: EmergencyPlan;
  documents: FamilyDocument[];
  photos: FamilyPhoto[];
  timeline: FamilyTimelineEvent[];
  invitations: FamilyInvitation[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface FamilySettings {
  general: GeneralSettings;
  privacy: FamilyPrivacySettings;
  security: FamilySecuritySettings;
  notifications: FamilyNotificationSettings;
  features: FeatureSettings;
  integrations: IntegrationSettings;
  backup: BackupSettings;
  homeAddress?: Address;
  defaultLanguage?: string;
  currency?: string;
  preferences?: any;
  timezone?: string;
  region?: string;
  locationSettings?: any;
  importantLocations?: any[];
  familyMotto?: string;
  familyPhoto?: string;
  familyDescription?: string;
  familyTraditions?: any[];
}

export interface GeneralSettings {
  familyName: string;
  description?: string;
  timezone: string;
  language: string;
  currency: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  firstDayOfWeek: 'monday' | 'sunday';
  defaultReminders: boolean;
  autoArchive: boolean;
  dataRetention: number; // days
}

export interface FamilyPrivacySettings {
  profileVisibility: 'public' | 'family_only' | 'private';
  allowInvitations: boolean;
  requireApproval: boolean;
  shareLocation: boolean;
  shareCalendar: boolean;
  sharePhotos: boolean;
  anonymizeData: boolean;
  dataSharing?: boolean;
  dataRetentionPeriod?: number;
  photoRetention?: number;
}

export interface FamilySecuritySettings {
  requireTwoFactor: boolean;
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number;
  allowMultipleDevices: boolean;
  deviceVerification: boolean;
  loginNotifications: boolean;
  auditLog: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  expirationDays?: number;
}

export interface FamilyNotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  digestFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  categories: { [category: string]: boolean };
  quietHours: { start: string; end: string; enabled?: boolean };
}

export interface FeatureSettings {
  calendar: boolean;
  budget: boolean;
  goals: boolean;
  shopping: boolean;
  meals: boolean;
  photos: boolean;
  documents: boolean;
  analytics: boolean;
  timeline: boolean;
  communication: boolean;
}

export interface IntegrationSettings {
  googleCalendar: IntegrationConfig;
  iCloudCalendar: IntegrationConfig;
  banking: IntegrationConfig;
  fitness: IntegrationConfig;
  education: IntegrationConfig;
  healthcare: IntegrationConfig;
}

export interface IntegrationConfig {
  enabled: boolean;
  accountId?: string;
  settings: { [key: string]: any };
  lastSync?: Date;
  syncFrequency: 'real_time' | 'hourly' | 'daily' | 'weekly' | 'manual';
}

export interface BackupSettings {
  autoBackup: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  retentionPeriod: number; // days
  includePhotos: boolean;
  includeDocuments: boolean;
  cloudProvider: string;
  encryptBackups: boolean;
}

export interface FamilySubscription {
  plan: 'free' | 'basic' | 'premium' | 'family_plus';
  status: 'active' | 'cancelled' | 'expired' | 'suspended';
  startDate: Date;
  endDate?: Date;
  autoRenew: boolean;
  features: string[];
  limits: SubscriptionLimits;
  billing: BillingInfo;
}

export interface SubscriptionLimits {
  maxMembers: number;
  maxStorage: number; // GB
  maxEvents: number;
  maxGoals: number;
  maxPhotos: number;
  maxDocuments: number;
  features: string[];
}

export interface BillingInfo {
  amount: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  nextBillingDate: Date;
  paymentMethod: string;
  billingAddress: Address;
}

export interface FamilyStatistics {
  totalMembers: number;
  activeMembers: number;
  averageAge: number;
  membershipDuration: number; // days
  activityScore: number;
  engagementMetrics: EngagementMetrics;
  usageStatistics: UsageStatistics;
  milestoneCount: number;
  achievementCount: number;
}

export interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  featureUsage: { [feature: string]: number };
  lastActivityDate: Date;
}

export interface UsageStatistics {
  eventsCreated: number;
  goalsCompleted: number;
  photosUploaded: number;
  documentsStored: number;
  totalLogins: number;
  dataUsage: number; // MB
}

export interface FamilyMilestone {
  id: string;
  title: string;
  description: string;
  date: Date;
  type: 'birthday' | 'anniversary' | 'achievement' | 'life_event' | 'family_event' | 'other';
  participants: string[]; // member IDs
  photos: string[];
  isRecurring: boolean;
  recurringType?: 'annual' | 'monthly' | 'custom';
  reminderDays: number[];
  isPrivate: boolean;
  tags: string[];
  createdBy: string;
  createdAt: Date;
}

export interface FamilyTradition {
  id: string;
  name: string;
  description: string;
  category: 'holiday' | 'birthday' | 'annual' | 'seasonal' | 'cultural' | 'religious' | 'custom';
  frequency: 'annual' | 'monthly' | 'weekly' | 'seasonal' | 'irregular';
  schedule?: TraditionSchedule;
  participants: string[];
  activities: TraditionActivity[];
  history: TraditionHistory[];
  isActive: boolean;
  reminderDays: number[];
  photos: string[];
  recipes?: string[];
  notes?: string;
  createdAt: Date;
}

export interface TraditionSchedule {
  type: 'fixed_date' | 'relative_date' | 'day_of_week' | 'custom';
  month?: number;
  day?: number;
  weekOfMonth?: number;
  dayOfWeek?: number;
  customRule?: string;
}

export interface TraditionActivity {
  id: string;
  name: string;
  description?: string;
  duration?: number;
  location?: string;
  cost?: number;
  materials?: string[];
  instructions?: string[];
  order: number;
}

export interface TraditionHistory {
  id: string;
  date: Date;
  participants: string[];
  photos: string[];
  notes?: string;
  rating?: number;
  memories: string[];
}

export interface FamilyRule {
  id: string;
  title: string;
  description: string;
  category: 'household' | 'behavior' | 'screen_time' | 'chores' | 'safety' | 'respect' | 'other';
  appliesTo: string[]; // member IDs or 'all'
  consequences: RuleConsequence[];
  rewards?: RuleReward[];
  isActive: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdBy: string;
  agreedBy: string[]; // member IDs who agreed to the rule
  violations: RuleViolation[];
  lastReviewed: Date;
  createdAt: Date;
}

export interface RuleConsequence {
  id: string;
  type: 'warning' | 'time_out' | 'privilege_loss' | 'extra_chores' | 'restriction' | 'other';
  description: string;
  duration?: number; // minutes/hours/days
  severity: 'minor' | 'moderate' | 'major';
}

export interface RuleReward {
  id: string;
  type: 'praise' | 'privilege' | 'treat' | 'activity' | 'monetary' | 'other';
  description: string;
  value?: number;
}

export interface RuleViolation {
  id: string;
  date: Date;
  memberId: string;
  description: string;
  consequenceApplied?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  notes?: string;
}

export interface EmergencyPlan {
  contacts: EmergencyContact[];
  procedures: EmergencyProcedure[];
  meetingPoints: MeetingPoint[];
  importantDocuments: string[];
  medicalInformation: string[];
  insuranceInfo: string[];
  utilityContacts: UtilityContact[];
  lastUpdated: Date;
  reviewSchedule: 'monthly' | 'quarterly' | 'biannually' | 'annually';
}

export interface EmergencyProcedure {
  id: string;
  type: 'fire' | 'medical' | 'natural_disaster' | 'security' | 'utility' | 'other';
  title: string;
  steps: string[];
  contacts: string[];
  notes?: string;
}

export interface MeetingPoint {
  id: string;
  name: string;
  address: Address;
  type: 'primary' | 'secondary' | 'emergency_services';
  coordinates?: { lat: number; lng: number };
  notes?: string;
}

export interface UtilityContact {
  id: string;
  type: 'electric' | 'gas' | 'water' | 'internet' | 'security' | 'other';
  company: string;
  phone: string;
  accountNumber?: string;
  website?: string;
  notes?: string;
}

export interface FamilyDocument {
  id: string;
  name: string;
  type: 'identity' | 'medical' | 'financial' | 'legal' | 'education' | 'insurance' | 'other';
  category: string;
  description?: string;
  file?: File;
  url?: string;
  size?: number;
  mimeType?: string;
  tags: string[];
  isConfidential: boolean;
  accessLevel: 'family' | 'parents_only' | 'owner_only';
  expirationDate?: Date;
  reminderDays?: number[];
  relatedMembers: string[];
  uploadedBy: string;
  uploadedAt: Date;
  lastAccessedAt?: Date;
  version: number;
  isArchived: boolean;
}

export interface FamilyPhoto {
  id: string;
  name?: string;
  description?: string;
  caption?: string;
  file?: File;
  url?: string;
  thumbnailUrl?: string;
  size?: number;
  dimensions?: { width: number; height: number };
  location?: { lat: number; lng: number; name?: string };
  dateTaken: Date;
  uploadedBy: string;
  uploadedAt: Date;
  tags: string[];
  peopleTagged: PhotoTag[];
  albums: string[];
  albumId?: string;
  isPrivate: boolean;
  isFavorite: boolean;
  views?: number;
  likes?: number;
  fileSize?: number;
  people?: string[];
  rating?: number;
  metadata?: PhotoMetadata;
}

export interface PhotoTag {
  memberId: string;
  position: { x: number; y: number; width: number; height: number };
  confidence?: number;
  isVerified: boolean;
}

export interface PhotoMetadata {
  camera?: string;
  lens?: string;
  settings?: {
    aperture?: string;
    shutter?: string;
    iso?: number;
    focal?: string;
  };
  gps?: { lat: number; lng: number; altitude?: number };
  originalFilename?: string;
}

export interface FamilyTimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: 'milestone' | 'achievement' | 'event' | 'tradition' | 'photo' | 'document' | 'goal' | 'other';
  category: string;
  participants: string[];
  location?: string;
  photos: string[];
  documents: string[];
  tags: string[];
  importance: 'low' | 'medium' | 'high' | 'critical';
  isPrivate: boolean;
  reactions: EventReaction[];
  comments: EventComment[];
  linkedEvents: string[];
  createdBy: string;
  createdAt: Date;
}

export interface EventReaction {
  memberId: string;
  type: 'like' | 'love' | 'celebrate' | 'support' | 'wow' | 'sad';
  createdAt: Date;
}

export interface EventComment {
  id: string;
  memberId: string;
  comment: string;
  parentId?: string; // for replies
  reactions: EventReaction[];
  createdAt: Date;
  editedAt?: Date;
}

export interface FamilyInvitation {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  relationship: string;
  role: string;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  message?: string;
  remindersSent: number;
  acceptedAt?: Date;
  declinedAt?: Date;
  declineReason?: string;
}

// Form and UI Types
export interface FamilyMemberFormData {
  firstName: string;
  lastName: string;
  displayName: string;
  nickname?: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  relationship: string;
  role: string;
  email?: string;
  phone?: string;
  avatar: string;
  color: string;
  tags: string[];
  notes?: string;
}

export interface FamilySettingsFormData {
  familyName: string;
  description?: string;
  timezone: string;
  language: string;
  currency: string;
  privacy: FamilyPrivacySettings;
  notifications: FamilyNotificationSettings;
  features: FeatureSettings;
}

export interface MemberPermissionsFormData {
  canEditProfile: boolean;
  canViewOtherProfiles: boolean;
  canManageFamily: boolean;
  canCreateEvents: boolean;
  canDeleteEvents: boolean;
  canManageBudget: boolean;
  canViewBudgetReports: boolean;
  canManageGoals: boolean;
  canViewGoalReports: boolean;
  canManageShopping: boolean;
  canManageMeals: boolean;
  canManagePhotos: boolean;
  canInviteMembers: boolean;
  canManageSettings: boolean;
  restrictions: PermissionRestriction[];
}

// Analytics and Reporting
export interface FamilyAnalytics {
  overview: FamilyOverviewAnalytics;
  engagement: FamilyEngagementAnalytics;
  activity: FamilyActivityAnalytics;
  growth: FamilyGrowthAnalytics;
  insights: FamilyInsights;
}

export interface FamilyOverviewAnalytics {
  totalMembers: number;
  activeMembers: number;
  averageAge: number;
  membershipDuration: number;
  activityScore: number;
  engagementRate: number;
}

export interface FamilyEngagementAnalytics {
  dailyActiveUsers: number[];
  weeklyActiveUsers: number[];
  monthlyActiveUsers: number[];
  sessionDuration: number[];
  featureUsage: { [feature: string]: number };
  timeOfDayActivity: { [hour: string]: number };
  dayOfWeekActivity: { [day: string]: number };
}

export interface FamilyActivityAnalytics {
  eventsCreated: number[];
  goalsCompleted: number[];
  photosUploaded: number[];
  documentsUploaded: number[];
  messagesExchanged: number[];
  achievementsEarned: number[];
}

export interface FamilyGrowthAnalytics {
  memberAdditionRate: number[];
  retentionRate: number[];
  churnRate: number[];
  invitationAcceptanceRate: number;
  averageOnboardingTime: number;
}

export interface FamilyInsights {
  mostActiveMembers: { memberId: string; score: number }[];
  popularFeatures: { feature: string; usage: number }[];
  peakActivityTimes: { hour: number; activity: number }[];
  suggestions: FamilyInsight[];
  trends: FamilyTrend[];
}

export interface FamilyInsight {
  type: 'engagement' | 'feature' | 'content' | 'behavior' | 'growth';
  title: string;
  description: string;
  recommendation: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  confidence: number;
}

export interface FamilyTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number;
  period: string;
  significance: 'low' | 'medium' | 'high';
}

// API Response Types
export interface FamilyApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface FamilyPaginatedResponse<T> extends FamilyApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Search and Filtering
export interface FamilySearchCriteria {
  query?: string;
  role?: string;
  relationship?: string;
  ageRange?: { min: number; max: number };
  status?: 'active' | 'inactive' | 'away' | 'archived';
  tags?: string[];
  hasEmail?: boolean;
  hasPhone?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface FamilySortOptions {
  field: 'firstName' | 'lastName' | 'age' | 'role' | 'relationship' | 'lastActive' | 'createdAt';
  direction: 'asc' | 'desc';
}

// Export and Backup Types
export type FamilyExportFormat = 'json' | 'csv' | 'pdf' | 'xml';
export type FamilyExportType = 'members' | 'timeline' | 'documents' | 'photos' | 'complete';

export interface FamilyExportOptions {
  format: FamilyExportFormat;
  type: FamilyExportType;
  includePersonalInfo: boolean;
  includeMedicalInfo: boolean;
  includePhotos: boolean;
  includeDocuments: boolean;
  dateRange?: { start: Date; end: Date };
  members?: string[];
  password?: string;
}

export interface FamilyBackup {
  id: string;
  createdAt: Date;
  size: number;
  type: 'manual' | 'automatic';
  status: 'creating' | 'completed' | 'failed';
  includes: string[];
  location: string;
  encrypted: boolean;
  expiresAt?: Date;
}

// Communication and Messaging
export interface FamilyMessage {
  id: string;
  fromMemberId: string;
  toMemberIds: string[];
  subject?: string;
  content: string;
  type: 'text' | 'announcement' | 'reminder' | 'alert' | 'celebration';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  replies: FamilyMessage[];
  isRead: { [memberId: string]: boolean };
  scheduledFor?: Date;
  expiresAt?: Date;
  createdAt: Date;
  editedAt?: Date;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'video' | 'audio' | 'link';
  url: string;
  size?: number;
  thumbnailUrl?: string;
}

export interface MessageReaction {
  memberId: string;
  type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
  createdAt: Date;
}

// Notification Types
export interface FamilyNotification {
  id: string;
  type: 'member_added' | 'member_updated' | 'role_changed' | 'permission_changed' |
        'setting_updated' | 'invitation_sent' | 'invitation_accepted' | 'milestone_reached' |
        'tradition_reminder' | 'document_uploaded' | 'photo_uploaded' | 'emergency_alert';
  title: string;
  message: string;
  targetMembers: string[];
  data?: { [key: string]: any };
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: { [memberId: string]: boolean };
  actions?: NotificationAction[];
  expiresAt?: Date;
  createdAt: Date;
}

// Missing Type Exports - Priority 1 Fix
export interface ContactInfo {
  email?: string;
  phone?: string;
  address?: string;
  emergencyContact?: string;
}

export interface PersonalPreferences {
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  privacy?: {
    profileVisibility?: string;
    shareActivity?: boolean;
  };
  communication?: {
    preferredMethod?: string;
    language?: string;
    preferredLanguage?: string;
    timezone?: string;
  };
}

export interface FamilyAlbum {
  id: string;
  name: string;
  description?: string;
  photos: string[];
  photoCount?: number;
  coverPhoto?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyPermission {
  id: string;
  name: string;
  description: string;
  level: 'view' | 'edit' | 'admin';
}

export type MilestoneType = 'birthday' | 'anniversary' | 'achievement' | 'life_event' | 'family_event' | 'other';

export interface NotificationAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'navigation';
  action: string;
  data?: { [key: string]: any };
}