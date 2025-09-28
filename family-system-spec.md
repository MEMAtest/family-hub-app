# FAMILY MANAGEMENT SYSTEM - BUILD SPECIFICATION

## SYSTEM OVERVIEW
Build a comprehensive family management system that handles member profiles, health records, documents, emergency contacts, household management, and family memories.

## DATABASE SCHEMA

```sql
-- Enhanced family management tables
CREATE TABLE IF NOT EXISTS family_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  person_id UUID REFERENCES family_members(id),
  full_name VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(50),
  blood_type VARCHAR(10),
  photo_url TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  occupation VARCHAR(255),
  employer VARCHAR(255),
  school VARCHAR(255),
  grade_level VARCHAR(50),
  emergency_contact JSONB,
  medical_info JSONB,
  preferences JSONB,
  social_links JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
  record_type VARCHAR(100), -- 'vaccination', 'allergy', 'medication', 'condition', 'appointment'
  title VARCHAR(255) NOT NULL,
  description TEXT,
  provider VARCHAR(255),
  date_recorded DATE,
  expiry_date DATE,
  severity VARCHAR(50),
  treatment TEXT,
  notes TEXT,
  documents JSONB,
  reminders JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100), -- 'passport', 'birth_cert', 'insurance', 'legal', 'financial'
  file_url TEXT,
  file_size INTEGER,
  person_id UUID REFERENCES family_members(id),
  expiry_date DATE,
  reminder_date DATE,
  category VARCHAR(100),
  tags TEXT[],
  is_encrypted BOOLEAN DEFAULT FALSE,
  access_log JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  contact_name VARCHAR(255) NOT NULL,
  relationship VARCHAR(100),
  primary_phone VARCHAR(20) NOT NULL,
  secondary_phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  contact_type VARCHAR(50), -- 'medical', 'school', 'work', 'personal', 'service'
  organization VARCHAR(255),
  notes TEXT,
  priority INTEGER DEFAULT 1,
  available_hours VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS household_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- 'appliance', 'electronics', 'vehicle', 'property'
  brand VARCHAR(100),
  model VARCHAR(100),
  serial_number VARCHAR(255),
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  warranty_expiry DATE,
  service_schedule JSONB,
  last_serviced DATE,
  documents JSONB,
  location VARCHAR(255),
  assigned_to UUID REFERENCES family_members(id),
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  memory_title VARCHAR(255) NOT NULL,
  memory_date DATE,
  memory_type VARCHAR(50), -- 'photo', 'video', 'story', 'milestone', 'quote'
  content TEXT,
  media_urls JSONB,
  participants UUID[], -- Array of family member IDs
  location VARCHAR(255),
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT FALSE,
  album_id UUID,
  reactions JSONB,
  created_by UUID REFERENCES family_members(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chore_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  chore_name VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES family_members(id),
  frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly'
  scheduled_day VARCHAR(20),
  scheduled_time TIME,
  duration_minutes INTEGER,
  difficulty VARCHAR(20) DEFAULT 'medium',
  points_value INTEGER DEFAULT 10,
  rotation_group VARCHAR(100),
  completed_dates DATE[],
  next_due DATE,
  reminders JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  rule_title VARCHAR(255) NOT NULL,
  rule_description TEXT,
  category VARCHAR(100), -- 'screen_time', 'bedtime', 'chores', 'behavior', 'safety'
  applies_to UUID[], -- Specific members or all
  consequences TEXT,
  rewards TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  review_date DATE,
  created_by UUID REFERENCES family_members(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## COMPONENT STRUCTURE

```
src/components/family/
├── FamilyDashboard.tsx       // Main family management view
├── MemberProfiles.tsx        // Individual member profiles
├── HealthRecords.tsx         // Medical and health tracking
├── DocumentVault.tsx         // Secure document storage
├── EmergencyInfo.tsx         // Emergency contacts and plans
├── HouseholdManager.tsx      // Home and asset management
├── ChoreWheel.tsx            // Chore assignments and tracking
├── FamilyMemories.tsx        // Photo albums and stories
├── FamilyTree.tsx            // Visual family tree
├── RulesAndValues.tsx        // Family rules and guidelines
└── PetManager.tsx            // Pet care and records
```

## FEATURES TO BUILD

### Core Features

#### 1. Enhanced Member Profiles
```typescript
interface MemberProfile {
  basicInfo: {
    personal: {
      fullName: string;
      nickname: string;
      dateOfBirth: Date;
      age: CalculatedAge;
      zodiacSign: string;
      photo: Image;
    };
    
    contact: {
      personalPhone: string;
      personalEmail: string;
      workPhone: string;
      workEmail: string;
      socialMedia: SocialLinks;
    };
    
    education: {
      school: string;
      grade: string;
      teacher: string;
      subjects: Subject[];
      extracurriculars: Activity[];
    };
    
    work: {
      occupation: string;
      employer: string;
      workAddress: string;
      workHours: Schedule;
      emergencyContact: Contact;
    };
  };
  
  preferences: {
    dietary: {
      restrictions: string[];
      allergies: string[];
      favorites: string[];
      dislikes: string[];
    };
    
    interests: {
      hobbies: string[];
      sports: string[];
      music: string[];
      books: string[];
      movies: string[];
    };
    
    sizing: {
      clothing: Sizes;
      shoes: string;
      ring: string;
    };
    
    wishlist: {
      items: WishItem[];
      giftIdeas: string[];
      experiences: string[];
    };
  };
}
```

#### 2. Health Management System
```typescript
interface HealthManagement {
  records: {
    vaccinations: {
      record: Vaccination[];
      schedule: VaccinationSchedule;
      reminders: boolean;
      certificates: Document[];
    };
    
    medications: {
      current: Medication[];
      history: Medication[];
      reminders: MedReminder[];
      refills: RefillTracker;
    };
    
    allergies: {
      food: Allergy[];
      environmental: Allergy[];
      medication: Allergy[];
      severity: Map<AllergyId, Severity>;
      emergencyPlan: Plan;
    };
    
    conditions: {
      chronic: Condition[];
      acute: Condition[];
      mentalHealth: Condition[];
      treatments: Treatment[];
    };
  };
  
  appointments: {
    upcoming: Appointment[];
    history: Appointment[];
    providers: Provider[];
    reminders: boolean;
    documents: Document[];
  };
  
  tracking: {
    growth: { // For children
      height: Measurement[];
      weight: Measurement[];
      charts: GrowthChart;
    };
    
    vitals: {
      bloodPressure: Reading[];
      temperature: Reading[];
      heartRate: Reading[];
    };
    
    wellness: {
      exercise: Activity[];
      sleep: SleepData[];
      mood: MoodTracking[];
    };
  };
  
  emergency: {
    medicalInfo: {
      bloodType: string;
      conditions: string[];
      medications: string[];
      allergies: string[];
      emergencyContacts: Contact[];
    };
    
    insuranceInfo: {
      provider: string;
      policyNumber: string;
      groupNumber: string;
      cards: Image[];
    };
  };
}
```

#### 3. Document Management Vault
```typescript
interface DocumentVault {
  categories: {
    identification: {
      passports: Document[];
      driverLicenses: Document[];
      birthCertificates: Document[];
      socialSecurity: Document[];
    };
    
    financial: {
      bankStatements: Document[];
      taxReturns: Document[];
      investments: Document[];
      insurance: Document[];
    };
    
    legal: {
      wills: Document[];
      contracts: Document[];
      deeds: Document[];
      powerOfAttorney: Document[];
    };
    
    education: {
      transcripts: Document[];
      diplomas: Document[];
      certificates: Document[];
      reports: Document[];
    };
    
    medical: {
      records: Document[];
      insurance: Document[];
      prescriptions: Document[];
      testResults: Document[];
    };
  };
  
  features: {
    encryption: boolean;
    ocr: boolean; // Text extraction
    expiry: ExpiryTracking;
    sharing: SecureSharing;
    backup: CloudBackup;
    search: FullTextSearch;
    versioning: boolean;
    audit: AccessLog;
  };
}
```

#### 4. Household Management
```typescript
interface HouseholdManagement {
  inventory: {
    appliances: {
      item: Appliance[];
      warranties: Warranty[];
      manuals: Document[];
      serviceHistory: Service[];
      reminders: ServiceReminder[];
    };
    
    vehicles: {
      details: Vehicle[];
      registration: Document[];
      insurance: Document[];
      maintenance: MaintenanceLog[];
      fuel: FuelTracking;
    };
    
    property: {
      mortgage: Document[];
      insurance: Document[];
      utilities: Utility[];
      maintenance: Task[];
      improvements: Project[];
    };
  };
  
  chores: {
    assignments: {
      daily: Chore[];
      weekly: Chore[];
      monthly: Chore[];
      seasonal: Chore[];
    };
    
    rotation: {
      automatic: boolean;
      fairness: Algorithm;
      preferences: Map<PersonId, Preference>;
      swapping: boolean;
    };
    
    tracking: {
      completion: boolean;
      quality: Rating;
      points: number;
      streaks: Streak;
    };
    
    rewards: {
      points: PointSystem;
      privileges: Privilege[];
      allowance: Allowance;
    };
  };
  
  maintenance: {
    schedule: {
      regular: Task[];
      seasonal: Task[];
      annual: Task[];
    };
    
    contractors: {
      contacts: Contractor[];
      history: Service[];
      ratings: Rating[];
      documents: Document[];
    };
  };
}
```

#### 5. Family Memories & Heritage
```typescript
interface FamilyMemories {
  albums: {
    photos: {
      organization: 'chronological' | 'event' | 'person';
      tagging: PersonTag[];
      editing: BasicEditing;
      printing: PrintService;
    };
    
    videos: {
      storage: CloudStorage;
      editing: VideoEditor;
      compilation: AutoCompilation;
      sharing: SecureSharing;
    };
    
    stories: {
      written: Story[];
      audio: Recording[];
      video: VideoStory[];
      collaborative: boolean;
    };
  };
  
  milestones: {
    firstTime: Milestone[];
    achievements: Achievement[];
    celebrations: Event[];
    traditions: Tradition[];
  };
  
  familyTree: {
    visualization: TreeView;
    relationships: Relationship[];
    extendedFamily: Person[];
    history: FamilyHistory;
    heritage: Heritage;
  };
  
  timeCapsule: {
    messages: Message[];
    predictions: Prediction[];
    artifacts: Digital[];
    openDate: Date;
  };
}
```

### Visual Components

#### 1. Member Profile Card
```typescript
interface ProfileCard {
  layout: {
    header: {
      photo: Avatar;
      name: string;
      age: number;
      role: string;
      status: 'home' | 'away' | 'school' | 'work';
    };
    
    quickInfo: {
      phone: string;
      email: string;
      location: string;
      nextEvent: Event;
    };
    
    tabs: {
      overview: Tab;
      health: Tab;
      schedule: Tab;
      preferences: Tab;
      documents: Tab;
    };
  };
  
  actions: {
    call: Button;
    message: Button;
    locate: Button;
    schedule: Button;
    edit: Button;
  };
}
```

#### 2. Health Dashboard
```typescript
interface HealthDashboard {
  layout: {
    overview: {
      alerts: Alert[];
      upcomingAppointments: Appointment[];
      medicationReminders: Medication[];
      immunizationStatus: Status;
    };
    
    charts: {
      growthChart: LineChart;
      vitalsTrend: AreaChart;
      medicationAdherence: ProgressBar;
      appointmentHistory: Timeline;
    };
    
    quickActions: {
      addAppointment: Button;
      logMedication: Button;
      uploadDocument: Button;
      emergencyInfo: Button;
    };
  };
}
```

#### 3. Chore Management Interface
```typescript
interface ChoreInterface {
  views: {
    wheel: { // Visual rotation wheel
      current: Person;
      next: Person;
      history: Rotation[];
    };
    
    calendar: { // Calendar view
      daily: Task[];
      weekly: Task[];
      assigned: Map<PersonId, Task[]>;
    };
    
    list: { // List view
      pending: Task[];
      completed: Task[];
      overdue: Task[];
    };
  };
  
  gamification: {
    points: PointDisplay;
    streaks: StreakCounter;
    leaderboard: Ranking;
    rewards: RewardShop;
  };
}
```

### Smart Features

#### 1. Family AI Assistant
```typescript
interface FamilyAI {
  suggestions: {
    choreOptimization: {
      fairDistribution: Algorithm;
      ageAppropriate: boolean;
      skillMatching: boolean;
    };
    
    healthReminders: {
      appointmentScheduling: boolean;
      medicationRefills: boolean;
      checkupDue: boolean;
    };
    
    documentOrganization: {
      categorization: boolean;
      expiryAlerts: boolean;
      renewal: boolean;
    };
  };
  
  insights: {
    familyPatterns: Pattern[];
    healthTrends: Trend[];
    choreCompletion: Analysis;
    documentStatus: Status;
  };
}
```

#### 2. Emergency Preparedness
```typescript
interface EmergencySystem {
  plans: {
    medical: {
      allergicReactions: Plan;
      injuries: Plan;
      evacuation: Plan;
    };
    
    contacts: {
      ice: Contact[]; // In Case of Emergency
      medical: Contact[];
      school: Contact[];
      work: Contact[];
    };
    
    documents: {
      quick_access: Document[];
      offline_copies: boolean;
      sharing: InstantShare;
    };
  };
  
  alerts: {
    location: LocationSharing;
    panic: PanicButton;
    checkIn: SafetyCheck;
  };
}
```

## DASHBOARD INTEGRATION

### Family Widget for Main Dashboard
```typescript
interface FamilyDashboardWidget {
  display: {
    memberStatus: {
      photos: Avatar[];
      locations: Status[];
      activities: Current[];
    };
    
    health: {
      alerts: Alert[];
      medications: Due[];
      appointments: Upcoming[];
    };
    
    household: {
      choresToday: Task[];
      maintenance: Due[];
      documents: Expiring[];
    };
    
    quickActions: {
      viewProfiles: Button;
      healthRecords: Button;
      documents: Button;
      memories: Button;
    };
  };
  
  metrics: {
    choreCompletion: Percentage;
    healthCompliance: Percentage;
    documentStatus: Status;
    upcomingEvents: Count;
  };
}
```

## API ENDPOINTS

```typescript
// Profiles
GET    /api/families/:familyId/members/profiles
PUT    /api/families/:familyId/members/:memberId/profile
POST   /api/families/:familyId/members/:memberId/photo

// Health
GET    /api/families/:familyId/health/records
POST   /api/families/:familyId/health/records
PUT    /api/families/:familyId/health/records/:id
GET    /api/families/:familyId/health/appointments
POST   /api/families/:familyId/health/medications

// Documents
GET    /api/families/:familyId/documents
POST   /api/families/:familyId/documents/upload
GET    /api/families/:familyId/documents/:id/download
DELETE /api/families/:familyId/documents/:id
POST   /api/families/:familyId/documents/:id/share

// Household
GET    /api/families/:familyId/household/inventory
POST   /api/families/:familyId/household/items
GET    /api/families/:familyId/chores
POST   /api/families/:familyId/chores/assign
PATCH  /api/families/:familyId/chores/:id/complete

// Memories
GET    /api/families/:familyId/memories
POST   /api/families/:familyId/memories/upload
GET    /api/families/:familyId/memories/albums
POST   /api/families/:familyId/memories/albums

// Emergency
GET    /api/families/:familyId/emergency/contacts
POST   /api/families/:familyId/emergency/alert
GET    /api/families/:familyId/emergency/plans
```

## SUCCESS METRICS
- Profile completion rate > 90%
- Document upload and organization < 2 minutes
- Health record access < 1 second
- Chore completion rate > 80%
- Emergency info accessible in < 3 taps
- Memory creation engagement > weekly