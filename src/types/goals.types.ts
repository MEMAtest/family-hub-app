// Goals & Achievement Management System Types

export interface Goal {
  id: string;
  familyId: string;
  title: string;
  description: string;
  category: GoalCategory;
  type: 'family' | 'individual';
  assignedTo?: string; // person ID for individual goals
  participants: string[]; // person IDs involved
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'abandoned';
  progress: number; // 0-100
  target: GoalTarget;
  current: GoalProgress;
  startDate: Date;
  targetDate: Date;
  completedDate?: Date;
  milestones: Milestone[];
  rewards: Reward[];
  tags: string[];
  notes?: string;
  attachments?: Attachment[];
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoalTarget {
  type: 'numeric' | 'boolean' | 'milestone' | 'habit' | 'custom';
  value: number | string | boolean;
  unit?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'total';
  measurementType?: 'count' | 'duration' | 'distance' | 'weight' | 'percentage' | 'currency';
}

export interface GoalProgress {
  value: number | string | boolean;
  lastUpdated: Date;
  history: ProgressEntry[];
  streak?: number;
  bestStreak?: number;
}

export interface ProgressEntry {
  id: string;
  date: Date;
  value: number | string | boolean;
  notes?: string;
  addedBy: string;
  verified?: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetValue: number | string | boolean;
  targetDate?: Date;
  isCompleted: boolean;
  completedDate?: Date;
  completedBy?: string;
  reward?: Reward;
  order: number;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  type: 'badge' | 'points' | 'privilege' | 'item' | 'experience' | 'custom';
  value?: number;
  icon?: string;
  color?: string;
  criteria: RewardCriteria;
  isEarned: boolean;
  earnedDate?: Date;
  earnedBy?: string[];
}

export interface RewardCriteria {
  type: 'progress' | 'milestone' | 'streak' | 'completion' | 'time' | 'custom';
  threshold: number | string;
  condition: 'equals' | 'greater_than' | 'less_than' | 'range' | 'custom';
}

export interface Achievement {
  id: string;
  familyId: string;
  title: string;
  description: string;
  type: AchievementType;
  category: GoalCategory;
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legendary';
  earnedBy: string; // person ID
  earnedDate: Date;
  goalId?: string; // linked goal if applicable
  evidence?: AchievementEvidence;
  points: number;
  badge: Badge;
  isPublic: boolean;
  celebrationStatus: 'pending' | 'acknowledged' | 'celebrated';
  createdAt: Date;
}

export interface AchievementEvidence {
  type: 'photo' | 'video' | 'document' | 'measurement' | 'witness' | 'auto';
  data: string;
  verifiedBy?: string;
  verificationDate?: Date;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category: GoalCategory;
  description: string;
}

export interface GoalTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  category: GoalCategory;
  type: 'family' | 'individual' | 'both';
  ageGroups: string[];
  defaultTarget: GoalTarget;
  suggestedMilestones: Omit<Milestone, 'id' | 'isCompleted' | 'completedDate' | 'completedBy'>[];
  suggestedRewards: Omit<Reward, 'id' | 'isEarned' | 'earnedDate' | 'earnedBy'>[];
  estimatedDuration: number; // days
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tags: string[];
  popularity: number;
  createdAt: Date;
}

export interface GoalCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  subcategories?: string[];
}

export interface AchievementType {
  id: string;
  name: string;
  description: string;
  category: string;
  requirements: string[];
  autoAwarded: boolean;
}

// Family & Individual Progress Tracking
export interface FamilyProgress {
  familyId: string;
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  averageProgress: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  achievements: {
    total: number;
    thisMonth: number;
    byCategory: { [category: string]: number };
    byDifficulty: { [difficulty: string]: number };
  };
  memberProgress: { [personId: string]: PersonProgress };
  teamChallenges: TeamChallenge[];
  insights: FamilyInsights;
}

export interface PersonProgress {
  personId: string;
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  averageProgress: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  experience: number;
  nextLevelXP: number;
  badges: Badge[];
  achievements: Achievement[];
  strongestCategories: string[];
  improvementAreas: string[];
  weeklyActivity: WeeklyActivity[];
}

export interface TeamChallenge {
  id: string;
  title: string;
  description: string;
  type: 'collaborative' | 'competitive' | 'supportive';
  participants: string[];
  startDate: Date;
  endDate: Date;
  rules: ChallengeRule[];
  prizes: Reward[];
  progress: { [personId: string]: number };
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  winner?: string;
  results?: ChallengeResult[];
}

export interface ChallengeRule {
  id: string;
  description: string;
  type: 'requirement' | 'bonus' | 'penalty';
  condition: string;
  points: number;
}

export interface ChallengeResult {
  personId: string;
  finalScore: number;
  achievements: string[];
  bonusPoints: number;
  rank: number;
}

export interface WeeklyActivity {
  week: string; // YYYY-WW format
  goalsWorkedOn: number;
  progressMade: number;
  milestonesReached: number;
  pointsEarned: number;
  timeSpent: number; // minutes
}

export interface FamilyInsights {
  topPerformer: {
    personId: string;
    metric: string;
    value: number;
  };
  mostImprovedMember: {
    personId: string;
    improvement: number;
    category: string;
  };
  popularCategories: {
    category: string;
    goalCount: number;
    completionRate: number;
  }[];
  successPatterns: {
    pattern: string;
    correlation: number;
    examples: string[];
  }[];
  recommendations: {
    type: 'goal_suggestion' | 'improvement_area' | 'celebration' | 'intervention';
    priority: 'low' | 'medium' | 'high';
    message: string;
    actionRequired: boolean;
    targetPerson?: string;
  }[];
}

// Goal Setting & Management
export interface GoalFormData {
  title: string;
  description: string;
  category: string;
  type: 'family' | 'individual';
  assignedTo?: string;
  participants: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  targetType: 'numeric' | 'boolean' | 'milestone' | 'habit' | 'custom';
  targetValue: number | string | boolean;
  targetUnit?: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'total';
  startDate: Date;
  targetDate: Date;
  milestones: string[];
  tags: string[];
  notes?: string;
  isPublic: boolean;
}

export interface MilestoneFormData {
  title: string;
  description?: string;
  targetValue: number | string | boolean;
  targetDate?: Date;
  rewardTitle?: string;
  rewardDescription?: string;
}

export interface ProgressUpdateData {
  value: number | string | boolean;
  notes?: string;
  date: Date;
  evidence?: File[];
}

// Analytics & Reporting
export interface GoalAnalytics {
  overview: {
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    completionRate: number;
    averageTimeToComplete: number;
    totalPointsEarned: number;
  };
  trends: {
    dailyProgress: ProgressTrend[];
    weeklyCompletion: CompletionTrend[];
    monthlyActivity: ActivityTrend[];
    categoryPopularity: CategoryTrend[];
  };
  performance: {
    topCategories: PerformanceMetric[];
    strugglingAreas: PerformanceMetric[];
    consistencyScore: number;
    motivationFactors: MotivationFactor[];
  };
  predictions: {
    likelyToComplete: Goal[];
    atRisk: Goal[];
    recommendedGoals: GoalRecommendation[];
    optimalTargetDates: { [goalId: string]: Date };
  };
  comparisons: {
    familyRanking: FamilyRanking[];
    peerComparison: PeerComparison[];
    historicalComparison: HistoricalComparison;
  };
}

export interface ProgressTrend {
  date: Date;
  totalProgress: number;
  goalsActive: number;
  pointsEarned: number;
}

export interface CompletionTrend {
  week: string;
  completed: number;
  started: number;
  abandoned: number;
}

export interface ActivityTrend {
  month: string;
  updates: number;
  milestones: number;
  achievements: number;
  timeSpent: number;
}

export interface CategoryTrend {
  category: string;
  goalCount: number;
  completionRate: number;
  averageProgress: number;
  popularity: number;
}

export interface PerformanceMetric {
  category: string;
  score: number;
  goalCount: number;
  completionRate: number;
  averageTime: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface MotivationFactor {
  factor: string;
  impact: number;
  correlation: number;
  examples: string[];
}

export interface GoalRecommendation {
  templateId: string;
  title: string;
  description: string;
  category: string;
  confidence: number;
  reasoning: string;
  estimatedSuccess: number;
}

export interface FamilyRanking {
  personId: string;
  rank: number;
  score: number;
  category: string;
  changeFromLastWeek: number;
}

export interface PeerComparison {
  metric: string;
  yourValue: number;
  peerAverage: number;
  percentile: number;
  trend: 'above' | 'at' | 'below';
}

export interface HistoricalComparison {
  period: string;
  metrics: {
    goalsCompleted: { current: number; previous: number; change: number };
    averageProgress: { current: number; previous: number; change: number };
    pointsEarned: { current: number; previous: number; change: number };
    consistencyScore: { current: number; previous: number; change: number };
  };
}

// Notification & Communication
export interface GoalNotification {
  id: string;
  type: 'milestone_reached' | 'goal_completed' | 'progress_reminder' | 'encouragement' | 'achievement_earned' | 'challenge_started';
  goalId?: string;
  personId: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  actionRequired: boolean;
  actions?: NotificationAction[];
  createdAt: Date;
  scheduledFor?: Date;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'button' | 'link' | 'form';
  action: string;
  data?: any;
}

export interface GoalComment {
  id: string;
  goalId: string;
  personId: string;
  message: string;
  type: 'update' | 'encouragement' | 'question' | 'celebration' | 'concern';
  attachments?: Attachment[];
  reactions: GoalReaction[];
  createdAt: Date;
}

export interface GoalReaction {
  personId: string;
  type: 'like' | 'love' | 'celebrate' | 'support' | 'concern';
  createdAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document' | 'audio';
  url: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

// Integration with Other Systems
export interface GoalIntegration {
  calendar: {
    syncEvents: boolean;
    createReminders: boolean;
    goalDeadlines: boolean;
    milestoneEvents: boolean;
  };
  budget: {
    trackGoalCosts: boolean;
    budgetForRewards: boolean;
    costPerCategory: { [category: string]: number };
  };
  health: {
    syncFitnessData: boolean;
    healthGoalTracking: boolean;
    wearableIntegration: boolean;
    healthMetrics: string[];
  };
  education: {
    schoolGoalSync: boolean;
    academicTracking: boolean;
    extracurricularGoals: boolean;
  };
}

// Export and Sharing
export type GoalExportFormat = 'pdf' | 'csv' | 'json' | 'html';
export type GoalExportType = 'goals-summary' | 'progress-report' | 'achievements' | 'analytics';

export interface GoalExportOptions {
  format: GoalExportFormat;
  type: GoalExportType;
  dateRange: { start: Date; end: Date };
  includePersonalGoals: boolean;
  includeFamilyGoals: boolean;
  includeAchievements: boolean;
  includeProgress: boolean;
  includeAnalytics: boolean;
  filterByCategory: string[];
  filterByPerson: string[];
}

// API Response Types
export interface GoalApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface GoalPaginatedResponse<T> extends GoalApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Search and Filtering
export interface GoalSearchCriteria {
  query?: string;
  category?: string;
  type?: 'family' | 'individual';
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'abandoned';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  dateRange?: { start: Date; end: Date };
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface GoalSortOptions {
  field: 'title' | 'progress' | 'priority' | 'targetDate' | 'createdAt' | 'category';
  direction: 'asc' | 'desc';
}

// Habit and Routine Integration
export interface HabitGoal extends Goal {
  habitType: 'daily' | 'weekly' | 'custom';
  streak: HabitStreak;
  missedDays: Date[];
  reminders: HabitReminder[];
  flexibilityRules: FlexibilityRule[];
}

export interface HabitStreak {
  current: number;
  longest: number;
  streakStart: Date;
  lastCompleted: Date;
  streakHistory: StreakPeriod[];
}

export interface StreakPeriod {
  start: Date;
  end: Date;
  length: number;
  reason?: string;
}

export interface HabitReminder {
  id: string;
  time: string;
  days: string[];
  enabled: boolean;
  message: string;
}

export interface FlexibilityRule {
  id: string;
  type: 'grace_period' | 'makeup_window' | 'intensity_adjustment' | 'skip_allowance';
  parameters: { [key: string]: any };
  description: string;
}

// Collaboration and Social Features
export interface GoalCollaboration {
  accountability: {
    partners: AccountabilityPartner[];
    checkIns: CheckIn[];
    supportMessages: SupportMessage[];
  };
  sharing: {
    publicGoals: boolean;
    shareProgress: boolean;
    allowComments: boolean;
    allowEncouragement: boolean;
  };
  mentorship: {
    mentors: Mentor[];
    mentees: Mentee[];
    guidanceRequests: GuidanceRequest[];
  };
}

export interface AccountabilityPartner {
  personId: string;
  role: 'mutual' | 'mentor' | 'supporter';
  since: Date;
  checkInFrequency: 'daily' | 'weekly' | 'monthly';
  permissions: string[];
}

export interface CheckIn {
  id: string;
  partnerId: string;
  goalId: string;
  scheduledDate: Date;
  completedDate?: Date;
  status: 'pending' | 'completed' | 'missed';
  questions: CheckInQuestion[];
  responses: CheckInResponse[];
}

export interface CheckInQuestion {
  id: string;
  question: string;
  type: 'text' | 'rating' | 'boolean' | 'multiple_choice';
  required: boolean;
  options?: string[];
}

export interface CheckInResponse {
  questionId: string;
  answer: string | number | boolean;
  notes?: string;
}

export interface SupportMessage {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  goalId?: string;
  message: string;
  type: 'encouragement' | 'advice' | 'celebration' | 'concern';
  createdAt: Date;
  read: boolean;
}

export interface Mentor {
  personId: string;
  expertise: string[];
  experience: number;
  rating: number;
  availability: string;
  bio: string;
}

export interface Mentee {
  personId: string;
  goals: string[];
  needsHelp: string[];
  experience: string;
}

export interface GuidanceRequest {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  goalId: string;
  question: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'pending' | 'answered' | 'resolved';
  response?: string;
  createdAt: Date;
  respondedAt?: Date;
}