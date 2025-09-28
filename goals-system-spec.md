# GOALS & ACHIEVEMENTS SYSTEM - BUILD SPECIFICATION

## SYSTEM OVERVIEW
Build a comprehensive goals and achievements system that tracks family and individual goals, celebrates milestones, manages rewards, and motivates progress through gamification.

## DATABASE SCHEMA

```sql
-- Goals and achievements tables
CREATE TABLE IF NOT EXISTS family_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  goal_title VARCHAR(255) NOT NULL,
  goal_description TEXT,
  category VARCHAR(100), -- 'health', 'education', 'financial', 'personal', 'family'
  goal_type VARCHAR(50), -- 'milestone', 'habit', 'project', 'challenge'
  target_value JSONB, -- Flexible for different goal types
  current_value JSONB,
  measurement_unit VARCHAR(50),
  start_date DATE NOT NULL,
  target_date DATE,
  completed_date DATE,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed', 'cancelled'
  priority VARCHAR(20) DEFAULT 'medium',
  participants UUID[], -- Array of family member IDs
  visibility VARCHAR(50) DEFAULT 'family', -- 'private', 'family', 'public'
  parent_goal_id UUID REFERENCES family_goals(id),
  created_by UUID REFERENCES family_members(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES family_goals(id) ON DELETE CASCADE,
  milestone_title VARCHAR(255) NOT NULL,
  milestone_value JSONB,
  achieved_date TIMESTAMP,
  achieved_by UUID REFERENCES family_members(id),
  notes TEXT,
  evidence_url TEXT, -- Photo/document proof
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  person_id UUID REFERENCES family_members(id),
  achievement_title VARCHAR(255) NOT NULL,
  achievement_description TEXT,
  category VARCHAR(100),
  badge_icon VARCHAR(50),
  badge_color VARCHAR(7),
  points_value INTEGER DEFAULT 10,
  rarity VARCHAR(50) DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  criteria JSONB, -- Conditions to earn
  earned_date TIMESTAMP,
  evidence_url TEXT,
  shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reward_system (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  person_id UUID REFERENCES family_members(id),
  current_points INTEGER DEFAULT 0,
  total_earned_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  badges_earned UUID[], -- Array of achievement IDs
  rank VARCHAR(100) DEFAULT 'Beginner',
  last_activity TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rewards_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  reward_name VARCHAR(255) NOT NULL,
  reward_description TEXT,
  points_cost INTEGER NOT NULL,
  category VARCHAR(100),
  availability VARCHAR(50) DEFAULT 'always', -- 'always', 'limited', 'seasonal'
  quantity_available INTEGER,
  expires_date DATE,
  image_url TEXT,
  claimed_by UUID[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goal_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES family_goals(id) ON DELETE CASCADE,
  person_id UUID REFERENCES family_members(id),
  check_in_value JSONB,
  check_in_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  mood VARCHAR(50), -- 'motivated', 'struggling', 'confident', 'frustrated'
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  challenge_name VARCHAR(255) NOT NULL,
  challenge_type VARCHAR(100), -- 'daily', 'weekly', 'monthly', 'custom'
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  participants UUID[],
  winner_id UUID REFERENCES family_members(id),
  prize VARCHAR(255),
  rules JSONB,
  leaderboard JSONB,
  status VARCHAR(50) DEFAULT 'upcoming',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## COMPONENT STRUCTURE

```
src/components/goals/
├── GoalsDashboard.tsx        // Main goals overview
├── GoalCreator.tsx           // Create new goals wizard
├── GoalTracker.tsx           // Track progress interface
├── MilestoneManager.tsx      // Milestone creation and tracking
├── AchievementGallery.tsx    // Display earned achievements
├── RewardStore.tsx           // Points redemption store
├── LeaderBoard.tsx           // Family rankings
├── ChallengeCenter.tsx       // Family challenges
├── ProgressCharts.tsx        // Visualization components
├── CheckInFlow.tsx           // Daily/weekly check-ins
└── CelebrationModal.tsx      // Achievement celebrations
```

## FEATURES TO BUILD

### Core Features

#### 1. Goal Management System
```typescript
interface GoalManagement {
  types: {
    milestone: { // One-time achievement
      target: any;
      deadline: Date;
      subtasks: Task[];
    };
    
    habit: { // Recurring behavior
      frequency: 'daily' | 'weekly' | 'monthly';
      streak: number;
      allowedMisses: number;
    };
    
    project: { // Multi-step goal
      phases: Phase[];
      dependencies: Dependency[];
      timeline: Gantt;
    };
    
    challenge: { // Competition-based
      competitors: Person[];
      rules: Rule[];
      duration: Duration;
    };
  };
  
  creation: {
    templates: GoalTemplate[];
    wizard: StepByStep;
    smartGoals: { // SMART framework
      specific: boolean;
      measurable: boolean;
      achievable: boolean;
      relevant: boolean;
      timeBound: boolean;
    };
    aiSuggestions: boolean;
  };
  
  tracking: {
    manualInput: boolean;
    autoTracking: boolean; // Via integrations
    photoEvidence: boolean;
    witnessValidation: boolean;
    progressAlerts: boolean;
  };
}
```

#### 2. Achievement System
```typescript
interface AchievementSystem {
  categories: {
    fitness: Achievement[];
    education: Achievement[];
    family: Achievement[];
    personal: Achievement[];
    special: Achievement[];
  };
  
  rarities: {
    common: { color: 'gray'; points: 10; };
    rare: { color: 'blue'; points: 25; };
    epic: { color: 'purple'; points: 50; };
    legendary: { color: 'gold'; points: 100; };
  };
  
  triggers: {
    automatic: { // System-detected
      streaks: boolean;
      milestones: boolean;
      firstTime: boolean;
      records: boolean;
    };
    
    manual: { // Parent-approved
      approval: boolean;
      evidence: boolean;
      nomination: boolean;
    };
  };
  
  display: {
    badgeGallery: boolean;
    profileBadges: boolean;
    recentUnlocks: boolean;
    progressBars: boolean;
    animations: boolean;
  };
}
```

#### 3. Reward & Points System
```typescript
interface RewardSystem {
  points: {
    earning: {
      goalCompletion: number;
      milestones: number;
      dailyCheckIn: number;
      helpingOthers: number;
      bonusActivities: number;
    };
    
    multipliers: {
      streakBonus: number;
      teamGoals: number;
      difficulty: number;
      earlyCompletion: number;
    };
    
    spending: {
      rewardStore: boolean;
      privileges: boolean;
      donations: boolean;
      savings: boolean;
    };
  };
  
  levels: {
    system: 'xp' | 'points' | 'custom';
    progression: Level[];
    perks: LevelPerk[];
    titles: Title[];
  };
  
  store: {
    catalog: Reward[];
    categories: string[];
    customRewards: boolean;
    parentApproval: boolean;
    pointsTransfer: boolean;
  };
}
```

#### 4. Family Challenges
```typescript
interface FamilyChallenges {
  types: {
    fitness: { // Steps, workouts, sports
      tracking: 'automatic' | 'manual';
      metrics: string[];
      leaderboard: boolean;
    };
    
    learning: { // Books, courses, skills
      validation: 'quiz' | 'project' | 'certificate';
      categories: string[];
    };
    
    chores: { // Household tasks
      rotation: boolean;
      points: Map<Task, Points>;
      verification: boolean;
    };
    
    savings: { // Financial goals
      target: number;
      contributions: boolean;
      matching: boolean;
    };
  };
  
  features: {
    teamMode: boolean; // Collaborate vs compete
    handicaps: boolean; // Level playing field
    voting: boolean; // Family votes on winner
    prizes: Prize[];
    history: PastChallenge[];
  };
}
```

#### 5. Progress Visualization
```typescript
interface ProgressVisualization {
  charts: {
    progressRings: { // Circular progress
      daily: Ring;
      weekly: Ring;
      monthly: Ring;
    };
    
    trendLines: { // Historical progress
      timeframe: 'week' | 'month' | 'year';
      smoothing: boolean;
      predictions: boolean;
    };
    
    heatMaps: { // Activity calendars
      intensity: ColorScale;
      streaks: boolean;
      patterns: boolean;
    };
    
    comparison: { // Family member comparison
      bars: boolean;
      radar: boolean;
      race: boolean; // Animated progress race
    };
  };
  
  dashboards: {
    personal: Dashboard;
    family: Dashboard;
    goals: Dashboard;
    achievements: Dashboard;
  };
}
```

### Gamification Features

#### 1. Motivation Mechanics
```typescript
interface MotivationMechanics {
  streaks: {
    daily: Streak;
    weekly: Streak;
    monthly: Streak;
    bonuses: StreakBonus[];
    recovery: boolean; // Streak freeze/save
  };
  
  quests: {
    daily: Quest[];
    weekly: Quest[];
    special: Quest[];
    storyline: boolean;
  };
  
  powerUps: {
    doublePoints: PowerUp;
    streakFreeze: PowerUp;
    skipDay: PowerUp;
    boost: PowerUp;
  };
  
  social: {
    encouragement: Message[];
    celebrations: Animation[];
    sharing: boolean;
    competitions: boolean;
  };
}
```

#### 2. Family Dynamics
```typescript
interface FamilyDynamics {
  roles: {
    coach: { // Motivator
      permissions: string[];
      abilities: string[];
    };
    
    cheerleader: { // Supporter
      reactions: string[];
      boosts: string[];
    };
    
    competitor: { // Challenger
      challenges: string[];
      rivalries: string[];
    };
  };
  
  teamwork: {
    familyGoals: Goal[];
    collaboration: boolean;
    assists: boolean;
    bonuses: TeamBonus[];
  };
  
  mentoring: {
    pairings: Pair[];
    guidance: boolean;
    teaching: boolean;
    bonuses: MentorBonus[];
  };
}
```

### Visual Components

#### 1. Goal Cards
```typescript
interface GoalCard {
  display: {
    header: {
      title: string;
      category: Icon;
      deadline: Countdown;
      participants: Avatar[];
    };
    
    progress: {
      bar: ProgressBar;
      percentage: number;
      trend: Arrow;
      pace: 'ahead' | 'onTrack' | 'behind';
    };
    
    actions: {
      checkIn: Button;
      viewDetails: Button;
      share: Button;
      edit: Button;
    };
  };
  
  states: {
    active: Style;
    completed: Style;
    paused: Style;
    failed: Style;
  };
}
```

#### 2. Achievement Badges
```typescript
interface AchievementBadge {
  design: {
    shape: 'circle' | 'shield' | 'star' | 'hexagon';
    color: string;
    icon: string;
    border: 'none' | 'bronze' | 'silver' | 'gold';
    animation: 'none' | 'pulse' | 'sparkle' | 'rotate';
  };
  
  metadata: {
    title: string;
    description: string;
    earnedDate: Date;
    rarity: string;
    points: number;
  };
  
  interactions: {
    hover: 'details' | 'animation';
    click: 'expand' | 'share';
    showcase: boolean;
  };
}
```

#### 3. Leaderboard
```typescript
interface LeaderboardUI {
  layout: {
    style: 'list' | 'podium' | 'cards';
    timeframe: 'daily' | 'weekly' | 'monthly' | 'allTime';
    metric: 'points' | 'goals' | 'streaks' | 'achievements';
  };
  
  entries: {
    rank: number;
    avatar: Image;
    name: string;
    score: number;
    change: number; // Position change
    badges: Badge[];
    trend: Graph;
  };
  
  features: {
    animations: boolean;
    filters: Filter[];
    categories: Category[];
    prizes: Prize[];
  };
}
```

### Smart Features

#### 1. AI Goal Coach
```typescript
interface AIGoalCoach {
  suggestions: {
    goalRecommendations: Goal[];
    adjustments: string[]; // Too ambitious/easy
    strategies: Strategy[];
    habits: Habit[];
  };
  
  analysis: {
    patterns: Pattern[];
    obstacles: Obstacle[];
    strengths: Strength[];
    predictions: Prediction[];
  };
  
  motivation: {
    messages: string[];
    quotes: Quote[];
    tips: Tip[];
    celebrations: Celebration[];
  };
}
```

#### 2. Smart Notifications
```typescript
interface SmartNotifications {
  types: {
    encouragement: { // When struggling
      trigger: 'noProgress' | 'missed' | 'declining';
      message: string;
      action: string;
    };
    
    celebration: { // On success
      trigger: 'milestone' | 'streak' | 'completion';
      animation: string;
      reward: number;
    };
    
    reminder: { // Check-in time
      frequency: string;
      customTime: boolean;
      snooze: boolean;
    };
    
    challenge: { // From family
      sender: Person;
      type: string;
      accept: boolean;
    };
  };
}
```

## DASHBOARD INTEGRATION

### Goals Widget for Main Dashboard
```typescript
interface GoalsDashboardWidget {
  display: {
    activeGoals: {
      count: number;
      nextMilestone: Goal;
      todaysTasks: Task[];
    };
    
    progress: {
      dailyProgress: ProgressRing;
      weeklyStreak: number;
      pointsToday: number;
    };
    
    achievements: {
      recent: Badge[];
      nextUnlock: Achievement;
      progressToNext: Percentage;
    };
    
    quickActions: {
      checkIn: Button;
      viewGoals: Button;
      newGoal: Button;
    };
  };
  
  metrics: {
    completionRate: number;
    currentStreak: number;
    totalPoints: number;
    familyRank: number;
  };
}
```

## API ENDPOINTS

```typescript
// Goals
GET    /api/families/:familyId/goals
POST   /api/families/:familyId/goals
PUT    /api/families/:familyId/goals/:id
DELETE /api/families/:familyId/goals/:id
POST   /api/families/:familyId/goals/:id/check-in

// Milestones
GET    /api/families/:familyId/goals/:goalId/milestones
POST   /api/families/:familyId/goals/:goalId/milestones
PUT    /api/families/:familyId/milestones/:id

// Achievements
GET    /api/families/:familyId/achievements
POST   /api/families/:familyId/achievements/unlock
GET    /api/families/:familyId/achievements/available

// Rewards
GET    /api/families/:familyId/rewards/store
POST   /api/families/:familyId/rewards/redeem
GET    /api/families/:familyId/rewards/points

// Challenges
GET    /api/families/:familyId/challenges
POST   /api/families/:familyId/challenges
POST   /api/families/:familyId/challenges/:id/join
GET    /api/families/:familyId/challenges/:id/leaderboard

// Analytics
GET    /api/families/:familyId/goals/analytics
GET    /api/families/:familyId/goals/insights
```

## SUCCESS METRICS
- Goal completion rate > 70%
- Daily check-in rate > 80%
- Achievement unlock celebrations displayed within 1 second
- Family engagement (all members active) > 90%
- Streak retention > 60% after 30 days
- Reward redemption satisfaction > 4.5/5