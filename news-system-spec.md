# NEWS & INFORMATION SYSTEM - BUILD SPECIFICATION

## SYSTEM OVERVIEW
Build a comprehensive news and information system that aggregates family-relevant news, local events, school updates, and creates a family newsletter/bulletin board.

## DATABASE SCHEMA

```sql
-- News and information tables
CREATE TABLE IF NOT EXISTS news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  source_name VARCHAR(255) NOT NULL,
  source_type VARCHAR(100), -- 'rss', 'api', 'email', 'manual', 'school'
  source_url TEXT,
  categories TEXT[],
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  refresh_frequency VARCHAR(50), -- 'hourly', 'daily', 'weekly'
  last_fetched TIMESTAMP,
  credentials JSONB, -- Encrypted credentials if needed
  filters JSONB, -- Keywords, topics to include/exclude
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  source_id UUID REFERENCES news_sources(id),
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  content TEXT,
  article_url TEXT,
  author VARCHAR(255),
  published_date TIMESTAMP,
  category VARCHAR(100),
  tags TEXT[],
  relevance_score INTEGER DEFAULT 50,
  sentiment VARCHAR(50), -- 'positive', 'neutral', 'negative'
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_saved BOOLEAN DEFAULT FALSE,
  read_by UUID[], -- Array of family member IDs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  author_id UUID REFERENCES family_members(id),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  announcement_type VARCHAR(50), -- 'news', 'achievement', 'reminder', 'event'
  priority VARCHAR(20) DEFAULT 'normal',
  expires_date DATE,
  pin_to_top BOOLEAN DEFAULT FALSE,
  attachments JSONB,
  reactions JSONB, -- Emoji reactions from family
  comments JSONB,
  visibility VARCHAR(50) DEFAULT 'family',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS local_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  event_name VARCHAR(255) NOT NULL,
  description TEXT,
  location_name VARCHAR(255),
  location_address TEXT,
  location_coords POINT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  category VARCHAR(100), -- 'community', 'sports', 'education', 'entertainment'
  age_groups TEXT[],
  cost VARCHAR(100),
  registration_url TEXT,
  image_url TEXT,
  source VARCHAR(255),
  is_interested BOOLEAN DEFAULT FALSE,
  interested_members UUID[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS school_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  school_name VARCHAR(255) NOT NULL,
  student_id UUID REFERENCES family_members(id),
  update_type VARCHAR(100), -- 'newsletter', 'announcement', 'homework', 'event'
  title VARCHAR(500) NOT NULL,
  content TEXT,
  due_date DATE,
  importance VARCHAR(20) DEFAULT 'normal',
  requires_action BOOLEAN DEFAULT FALSE,
  action_taken BOOLEAN DEFAULT FALSE,
  attachments JSONB,
  teacher_name VARCHAR(255),
  subject VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS information_digest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  digest_date DATE NOT NULL,
  digest_type VARCHAR(50), -- 'daily', 'weekly', 'monthly'
  content JSONB, -- Structured digest content
  sent_to TEXT[], -- Email addresses
  opened_by UUID[], -- Family members who viewed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## COMPONENT STRUCTURE

```
src/components/news/
├── NewsDashboard.tsx         // Main news view
├── NewsFeeds.tsx             // Aggregated news feeds
├── FamilyBulletin.tsx        // Family announcements board
├── LocalEvents.tsx           // Local area events
├── SchoolHub.tsx             // School-related updates
├── NewsSourceManager.tsx     // Manage news sources
├── ArticleReader.tsx         // Full article view
├── DigestCreator.tsx         // Create family digest
├── NotificationPrefs.tsx     // News notification settings
└── SavedArticles.tsx         // Bookmarked content
```

## FEATURES TO BUILD

### Core Features

#### 1. Smart News Aggregation
```typescript
interface NewsAggregation {
  sources: {
    familyInterests: { // Based on family profile
      topics: string[];
      keywords: string[];
      excludeKeywords: string[];
    };
    
    localNews: {
      radius: number; // Miles from home
      sources: LocalSource[];
      categories: string[];
    };
    
    schoolNews: {
      schoolWebsites: string[];
      parentPortals: Portal[];
      emailDigests: boolean;
    };
    
    specialInterests: {
      sports: Team[];
      hobbies: string[];
      education: string[];
      health: string[];
    };
  };
  
  filtering: {
    relevanceScoring: {
      algorithm: 'keyword' | 'ml' | 'hybrid';
      threshold: number;
      personalization: boolean;
    };
    
    ageAppropriate: {
      contentFiltering: boolean;
      ageGroups: Map<PersonId, AgeGroup>;
      safeSearch: boolean;
    };
    
    sentiment: {
      preferPositive: boolean;
      blockNegative: boolean;
      balancedFeed: boolean;
    };
  };
  
  organization: {
    categories: Category[];
    priority: 'chronological' | 'relevance' | 'source';
    grouping: 'source' | 'topic' | 'date';
    deduplication: boolean;
  };
}
```

#### 2. Family Bulletin Board
```typescript
interface FamilyBulletin {
  announcements: {
    types: {
      achievement: Announcement;
      reminder: Announcement;
      event: Announcement;
      discussion: Announcement;
      poll: Announcement;
    };
    
    features: {
      pinning: boolean;
      expiry: boolean;
      targeting: PersonId[]; // Specific members
      scheduling: boolean; // Future posts
      templates: Template[];
    };
    
    interactions: {
      reactions: Emoji[];
      comments: boolean;
      mentions: boolean;
      voting: boolean;
      sharing: boolean;
    };
  };
  
  familyNewsletter: {
    frequency: 'daily' | 'weekly' | 'monthly';
    sections: {
      achievements: boolean;
      upcomingEvents: boolean;
      photos: boolean;
      quotes: boolean;
      stats: boolean;
    };
    
    automation: {
      autoGenerate: boolean;
      contentSuggestions: boolean;
      layoutTemplates: Template[];
      distribution: string[]; // Email list
    };
  };
}
```

#### 3. Local Events Discovery
```typescript
interface LocalEvents {
  discovery: {
    sources: {
      council: boolean;
      libraries: boolean;
      communityCenter: boolean;
      schools: boolean;
      churches: boolean;
      localBusinesses: boolean;
    };
    
    radius: {
      walking: number; // 1 mile
      driving: number; // 10 miles
      dayTrip: number; // 50 miles
    };
    
    categories: {
      familyFriendly: boolean;
      free: boolean;
      educational: boolean;
      sports: boolean;
      cultural: boolean;
      seasonal: boolean;
    };
  };
  
  filtering: {
    ageAppropriate: boolean;
    accessibility: boolean;
    cost: PriceRange;
    timing: TimeSlot[];
    weather: boolean; // Indoor/outdoor based on forecast
  };
  
  integration: {
    addToCalendar: boolean;
    directions: boolean;
    rsvp: boolean;
    reminders: boolean;
    carpoolCoordination: boolean;
  };
}
```

#### 4. School Integration Hub
```typescript
interface SchoolHub {
  connections: {
    parentPortals: {
      autoSync: boolean;
      credentials: Encrypted;
      frequency: string;
    };
    
    emailParsing: {
      schoolEmails: boolean;
      newsletters: boolean;
      alerts: boolean;
      homework: boolean;
    };
    
    calendarSync: {
      schoolCalendar: boolean;
      termDates: boolean;
      events: boolean;
      deadlines: boolean;
    };
  };
  
  organization: {
    byChild: Map<ChildId, Updates>;
    byType: Map<Type, Updates>;
    byUrgency: Priority[];
    bySubject: Map<Subject, Updates>;
  };
  
  actions: {
    acknowledgement: boolean; // Mark as read/actioned
    reminders: boolean;
    todoCreation: boolean; // Create tasks from homework
    documentStorage: boolean; // Save attachments
    signatures: boolean; // Digital permission slips
  };
}
```

#### 5. Content Curation
```typescript
interface ContentCuration {
  learning: {
    algorithms: {
      interests: MachineLearning;
      readingPatterns: Analysis;
      engagement: Metrics;
    };
    
    improvement: {
      feedback: ThumbsUpDown;
      hideSimilar: boolean;
      morelikethis: boolean;
      sourceRating: Rating;
    };
  };
  
  personalization: {
    perPerson: Map<PersonId, Preferences>;
    timeOfDay: Schedule; // Morning news, evening digest
    deviceOptimized: boolean;
    readingLevel: string;
  };
  
  summaries: {
    aiGenerated: boolean;
    bulletPoints: boolean;
    readTime: number;
    keyTakeaways: string[];
  };
}
```

### Visual Components

#### 1. News Feed Interface
```typescript
interface NewsFeedUI {
  layout: {
    style: 'cards' | 'list' | 'magazine';
    columns: 'single' | 'double' | 'masonry';
    density: 'compact' | 'normal' | 'comfortable';
  };
  
  articleCard: {
    elements: {
      image: boolean;
      headline: boolean;
      summary: boolean;
      source: boolean;
      date: boolean;
      readTime: boolean;
      relevanceScore: boolean;
    };
    
    actions: {
      quickRead: boolean; // Expand inline
      save: boolean;
      share: boolean;
      hide: boolean;
      report: boolean;
    };
    
    indicators: {
      new: Badge;
      trending: Icon;
      local: Icon;
      school: Icon;
      saved: Icon;
    };
  };
}
```

#### 2. Bulletin Board Layout
```typescript
interface BulletinBoardUI {
  layout: {
    style: 'pinterest' | 'timeline' | 'grid';
    sections: {
      pinned: Area;
      recent: Area;
      upcoming: Area;
      achievements: Area;
    };
  };
  
  postTypes: {
    announcement: {
      icon: string;
      color: string;
      template: Template;
    };
    
    achievement: {
      celebration: Animation;
      badge: Icon;
      sharing: boolean;
    };
    
    poll: {
      options: Option[];
      results: Chart;
      anonymous: boolean;
    };
    
    photo: {
      gallery: boolean;
      captions: boolean;
      tags: PersonId[];
    };
  };
}
```

#### 3. Event Discovery Map
```typescript
interface EventMapUI {
  map: {
    provider: 'google' | 'mapbox' | 'openstreetmap';
    view: 'map' | 'list' | 'calendar';
    filters: FilterBar;
  };
  
  markers: {
    clustering: boolean;
    categories: ColorCode;
    preview: PopUp;
    navigation: boolean;
  };
  
  sidebar: {
    eventList: ScrollableList;
    filtering: Filters;
    search: SearchBar;
    savedEvents: Tab;
  };
}
```

### Smart Features

#### 1. AI News Assistant
```typescript
interface NewsAI {
  capabilities: {
    summarization: {
      length: 'brief' | 'detailed';
      style: 'bullets' | 'paragraph';
      keyPoints: string[];
    };
    
    factChecking: {
      enabled: boolean;
      sources: string[];
      confidence: number;
    };
    
    translation: {
      languages: string[];
      autoDetect: boolean;
    };
    
    readability: {
      simplify: boolean;
      ageAdjust: boolean;
      vocabulary: Level;
    };
  };
}
```

#### 2. Family Digest Generator
```typescript
interface DigestGenerator {
  creation: {
    automatic: {
      schedule: CronJob;
      content: ContentSelection;
      layout: Template;
      distribution: Email[];
    };
    
    sections: {
      headlines: Article[];
      familyNews: Announcement[];
      achievements: Achievement[];
      upcomingEvents: Event[];
      photos: Photo[];
      quotes: Quote[];
      weather: Forecast;
      tips: Tip[];
    };
    
    personalization: {
      perPerson: boolean;
      interests: boolean;
      readingTime: number;
    };
  };
  
  formats: {
    email: HTMLEmail;
    pdf: PDFDocument;
    web: WebPage;
    print: PrintFriendly;
  };
}
```

## INTEGRATIONS

### External APIs
```typescript
interface NewsIntegrations {
  newsAPIs: {
    googleNews: boolean;
    bingNews: boolean;
    newsAPI: boolean;
    rssFeeds: string[];
  };
  
  localSources: {
    councilAPI: boolean;
    eventbrite: boolean;
    meetup: boolean;
    facebook: boolean;
  };
  
  schoolSystems: {
    classDojo: boolean;
    seesaw: boolean;
    googleClassroom: boolean;
    schoology: boolean;
  };
  
  weather: {
    provider: string;
    location: Coordinates;
    alerts: boolean;
  };
}
```

### Dashboard Integration
```typescript
interface NewsDashboardWidget {
  display: {
    headlines: {
      count: number;
      categories: string[];
      layout: 'list' | 'ticker';
    };
    
    familyBulletin: {
      latest: number;
      pinned: boolean;
      announcements: boolean;
    };
    
    localEvents: {
      upcoming: number;
      thisWeek: boolean;
      interested: boolean;
    };
    
    quickActions: {
      viewAll: Button;
      addAnnouncement: Button;
      digest: Button;
    };
  };
}
```

## API ENDPOINTS

```typescript
// News Sources
GET    /api/families/:familyId/news/sources
POST   /api/families/:familyId/news/sources
PUT    /api/families/:familyId/news/sources/:id
DELETE /api/families/:familyId/news/sources/:id

// Articles
GET    /api/families/:familyId/news/articles
GET    /api/families/:familyId/news/articles/:id
POST   /api/families/:familyId/news/articles/:id/read
POST   /api/families/:familyId/news/articles/:id/save

// Family Bulletin
GET    /api/families/:familyId/bulletin
POST   /api/families/:familyId/bulletin
PUT    /api/families/:familyId/bulletin/:id
DELETE /api/families/:familyId/bulletin/:id
POST   /api/families/:familyId/bulletin/:id/react

// Local Events
GET    /api/families/:familyId/events/local
POST   /api/families/:familyId/events/local/:id/interested
GET    /api/families/:familyId/events/map

// School Updates
GET    /api/families/:familyId/school/updates
POST   /api/families/:familyId/school/acknowledge/:id
GET    /api/families/:familyId/school/calendar

// Digest
POST   /api/families/:familyId/digest/generate
GET    /api/families/:familyId/digest/latest
POST   /api/families/:familyId/digest/send
```

## SUCCESS METRICS
- News relevance score > 75%
- Family bulletin engagement > 80%
- Local event discovery leads to 2+ monthly activities
- School update acknowledgment < 24 hours
- Digest open rate > 60%
- Content filtering accuracy > 95%