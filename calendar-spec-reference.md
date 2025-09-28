# FAMILY HUB CALENDAR SYSTEM - COMPLETE BUILD SPECIFICATION

## SYSTEM REQUIREMENTS

### Core Technologies Required
- React 18+ with TypeScript
- react-big-calendar or FullCalendar for calendar UI
- Google Calendar API (googleapis package)
- node-ical for iCal processing
- pdf-parse for PDF extraction
- node-cron for scheduled tasks
- react-hot-toast for notifications UI

### Database Schema Updates Required

```sql
-- Update existing calendar_events table
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS
  external_id VARCHAR(255),
  source VARCHAR(50) DEFAULT 'manual',
  attachments JSONB DEFAULT '[]',
  reminders JSONB DEFAULT '[]',
  attendees JSONB DEFAULT '[]',
  location_details JSONB,
  travel_time INTEGER DEFAULT 0,
  preparation_time INTEGER DEFAULT 0,
  category VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'medium',
  completed BOOLEAN DEFAULT FALSE,
  completion_notes TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}';

-- Create notification queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
  person_id UUID REFERENCES family_members(id),
  channel VARCHAR(50) NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create event templates table
CREATE TABLE IF NOT EXISTS event_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  template_data JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT FALSE,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create calendar sync status table
CREATE TABLE IF NOT EXISTS calendar_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  last_sync TIMESTAMP,
  sync_token TEXT,
  status VARCHAR(50),
  error_log JSONB,
  settings JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## FEATURE SPECIFICATIONS

### 1. CALENDAR VIEWS IMPLEMENTATION

#### Day View Requirements
- 24-hour timeline with 30-minute slots
- Drag-and-drop to reschedule
- Click to create event at specific time
- Show all family members' events with color coding
- Travel time buffer visualization
- Weather icon if outdoor event

#### Week View Requirements
- 7-day grid with time slots
- Current day highlighted
- Mini event cards with essential info
- Overflow indicator (+3 more) for busy slots
- Quick preview on hover
- Swipe or arrow keys to navigate weeks

#### Month View Requirements
- Traditional calendar grid
- Up to 3 events visible per day
- Different colored dots for each family member
- School holidays/INSET days highlighted
- Birthdays with special icon
- Click to expand day view

#### Year View Requirements
- 12-month bird's eye view
- Heat map showing busy periods
- Holiday periods highlighted
- Birthdays marked
- Major events labeled
- Click month to zoom in

#### Agenda View Requirements
- Chronological list format
- Group by day with headers
- Search and filter capabilities
- Bulk selection for operations
- Print-friendly layout
- Export as PDF option

### 2. IMPORT/EXPORT SPECIFICATIONS

#### Google Calendar Integration
**OAuth Setup:**
- Implement OAuth 2.0 flow
- Store refresh tokens securely
- Handle token refresh automatically

**Sync Features:**
- Selective calendar sync (choose which Google calendars)
- Bi-directional sync with conflict resolution
- Real-time webhook updates
- Map Google event properties to Family Hub schema
- Handle recurring events properly
- Preserve Google Meet/Zoom links

**Sync Frequency:**
- Real-time via webhooks
- Manual sync button
- Auto-sync every 30 minutes
- Conflict resolution UI

#### iCal Export Features
- Export single event as .ics
- Export date range
- Export by person
- Export by category
- Include reminders in export
- Subscribe URL for live calendar feed

#### PDF Import Specifications
**Supported Formats:**
- School term date letters
- Activity schedules
- Sports fixtures
- Medical appointment letters
- Event flyers

**Extraction Process:**
1. User uploads PDF via drag-and-drop
2. System extracts text using pdf-parse
3. AI/regex identifies dates, times, locations
4. Preview extracted events for confirmation
5. User can edit before importing
6. Duplicate detection before save

**Smart Recognition Patterns:**
- "Term starts: DD/MM/YYYY"
- "INSET Day - DD Month YYYY"
- "Parent Evening: Date - Time"
- "Swimming Lessons every Tuesday 4:00-4:45pm"
- "Appointment on DD/MM/YYYY at HH:MM"

### 3. NOTIFICATION SYSTEM SPECIFICATIONS

#### Notification Channels
**Browser Push:**
- Request permission on first event creation
- Service worker for background notifications
- Click notification to open event

**Email Reminders:**
- SendGrid or AWS SES integration
- HTML email templates
- Include event details and calendar link
- Unsubscribe option

**In-App Notifications:**
- Toast notifications for immediate alerts
- Notification center with history
- Mark as read/acknowledged
- Snooze options

#### Reminder Configuration
**Default Reminder Times:**
- 15 minutes before
- 1 hour before  
- 1 day before
- 1 week before (for important events)

**Custom Settings Per Event Type:**
- School events: 1 day before
- Medical appointments: 1 week + 1 day
- Sports/activities: 1 hour before
- Birthdays: 1 week + on the day

**Smart Reminders:**
- Add travel time to reminder
- Weather-based alerts (rain for outdoor events)
- Traffic conditions for driving events
- Preparation time buffers

### 4. EVENT CATEGORIES & TEMPLATES

#### Standard Categories
Each with unique color and icon:
- **School** (Blue 📚)
  - Term dates
  - INSET days
  - Parent evenings
  - School trips
  - Homework due
  
- **Activities** (Green ⚽)
  - Sports training
  - Music lessons
  - Drama classes
  - Swimming

- **Medical** (Red 🏥)
  - Doctor appointments
  - Dentist
  - Optician
  - Vaccinations

- **Social** (Purple 🎉)
  - Birthday parties
  - Playdates  
  - Family gatherings
  - Friends meetups

- **Holiday** (Yellow ☀️)
  - School holidays
  - Public holidays
  - Family vacations
  
- **Financial** (Orange 💰)
  - Bill due dates
  - Payment reminders

- **Other** (Gray 📌)

#### Event Templates System
**Pre-built Templates:**
```javascript
const templates = {
  schoolRun: {
    title: "School Run - {child_name}",
    time: "08:30",
    duration: 30,
    recurring: "weekdays",
    reminders: [15],
    category: "School"
  },
  swimmingLesson: {
    title: "{child_name} Swimming",
    duration: 45,
    location: "Leisure Centre",
    reminders: [60],
    category: "Activities",
    notes: "Bring kit and goggles"
  },
  parentEvening: {
    title: "Parent Evening - {child_name}",
    duration: 20,
    reminders: [1440, 60], // 1 day, 1 hour
    category: "School",
    priority: "high"
  }
}
```

### 5. QUICK ACTIONS & SMART FEATURES

#### Dashboard Quick Actions
- **Add Event** button → Opens prefilled form
- **Today** button → Jump to today
- **Import** button → Upload dialog
- **Sync** button → Force sync all calendars

#### Drag and Drop Operations
- Drag event to different day/time
- Drag to family member to reassign
- Drag to trash to delete
- Drag file to import

#### Keyboard Shortcuts
- `N` - New event
- `D` - Day view
- `W` - Week view  
- `M` - Month view
- `T` - Today
- `Delete` - Delete selected
- `Cmd/Ctrl + C/V` - Copy/paste event
- `/` - Search events

#### Conflict Detection Rules
- Check for time overlaps per person
- Warn if travel time causes conflict
- Detect double-booking locations
- Alert for important event conflicts
- Suggest alternative times

#### Natural Language Input
Support commands like:
- "Amari football training every Tuesday 4pm"
- "Doctor appointment next Friday at 2:30"
- "Birthday party on June 15th"
- "Parent evening tomorrow 6pm"

## API ENDPOINTS REQUIRED

### Calendar Events
```
GET    /api/families/:familyId/calendar/events
POST   /api/families/:familyId/calendar/events
PUT    /api/families/:familyId/calendar/events/:id
DELETE /api/families/:familyId/calendar/events/:id
POST   /api/families/:familyId/calendar/events/bulk
GET    /api/families/:familyId/calendar/events/conflicts
```

### Import/Export
```
POST   /api/families/:familyId/calendar/import/pdf
POST   /api/families/:familyId/calendar/import/ical
POST   /api/families/:familyId/calendar/import/csv
GET    /api/families/:familyId/calendar/export/ical
POST   /api/families/:familyId/calendar/sync/google
DELETE /api/families/:familyId/calendar/sync/google
```

### Notifications
```
GET    /api/families/:familyId/notifications
POST   /api/families/:familyId/notifications/settings
PUT    /api/families/:familyId/notifications/:id/acknowledge
POST   /api/families/:familyId/notifications/:id/snooze
```

### Templates
```
GET    /api/families/:familyId/calendar/templates
POST   /api/families/:familyId/calendar/templates
PUT    /api/families/:familyId/calendar/templates/:id
DELETE /api/families/:familyId/calendar/templates/:id
POST   /api/families/:familyId/calendar/events/from-template
```

## UI/UX REQUIREMENTS

### Visual Design Standards
- Maintain existing Family Hub design system
- Use consistent color palette for categories
- Smooth animations for view transitions
- Loading states for all async operations
- Empty states with helpful prompts
- Error states with recovery actions

### Mobile Responsiveness
- Touch-friendly event creation
- Swipe gestures for navigation
- Responsive grid layouts
- Bottom sheet modals on mobile
- Simplified mobile views

### Accessibility Requirements
- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus indicators
- Alt text for icons

## TESTING REQUIREMENTS

### Unit Tests Required
- Event CRUD operations
- Date/time calculations
- Recurring event generation
- Conflict detection logic
- Notification scheduling
- Import parsing functions

### Integration Tests Required
- Google Calendar sync flow
- PDF import process
- Notification delivery
- Template application
- Bulk operations

### E2E Test Scenarios
1. Create event → Set reminder → Receive notification
2. Import PDF → Review events → Save to calendar
3. Sync Google Calendar → Edit event → Verify sync back
4. Create recurring event → Edit single instance → Verify series
5. Detect conflict → Resolve → Verify no conflict

## PERFORMANCE REQUIREMENTS

### Loading Performance
- Calendar view loads < 1 second
- Event creation < 500ms
- View switching < 200ms
- Search results < 300ms

### Data Handling
- Paginate events (load 3 months at a time)
- Lazy load past events
- Cache frequently accessed data
- Debounce search inputs
- Virtualize long lists

### Sync Performance
- Background sync without UI blocking
- Incremental sync (only changes)
- Retry failed syncs with exponential backoff
- Queue sync operations

## SECURITY REQUIREMENTS

### Data Protection
- Encrypt external calendar tokens
- Sanitize imported data
- Validate all user inputs
- CORS properly configured
- Rate limiting on API endpoints

### Privacy
- Family-only event visibility
- Audit log for changes
- GDPR compliance for data export
- Secure token storage
- Session management

## SUCCESS CRITERIA

The calendar system is complete when:

1. ✅ All 5 view types functional (Day/Week/Month/Year/Agenda)
2. ✅ Google Calendar 2-way sync working
3. ✅ PDF upload extracts events with 90%+ accuracy
4. ✅ Notifications deliver on time
5. ✅ No event conflicts go undetected
6. ✅ Dashboard widgets show correct summary
7. ✅ Mobile responsive on all devices
8. ✅ Page loads in under 1 second
9. ✅ All keyboard shortcuts working
10. ✅ Event templates save 50% creation time

## IMPLEMENTATION PHASES

### Phase 1: Core Calendar (Days 1-3)
- Implement all 5 view types
- Enhance event CRUD operations
- Add drag-and-drop functionality
- Implement categories and colors

### Phase 2: Import/Export (Days 4-5)
- Google Calendar OAuth and sync
- iCal export functionality
- Basic PDF text extraction
- CSV import

### Phase 3: Notifications (Days 6-7)
- Browser push notifications
- Email integration
- In-app notification center
- Reminder customization

### Phase 4: Smart Features (Days 8-9)
- Conflict detection
- Event templates
- Natural language input
- Travel time calculation

### Phase 5: Polish & Testing (Day 10)
- Performance optimization
- Mobile responsiveness
- Accessibility compliance
- Comprehensive testing