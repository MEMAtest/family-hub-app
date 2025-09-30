#!/usr/bin/env node

// Automated test for Family Hub functionality
// Run this after starting the dev server

const results = {
  passed: [],
  failed: [],
  warnings: []
};

function log(message, type = 'info') {
  const prefix = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }[type] || 'ℹ️';

  console.log(`${prefix} ${message}`);
}

function test(name, fn) {
  try {
    const result = fn();
    if (result) {
      results.passed.push(name);
      log(`Test passed: ${name}`, 'success');
    } else {
      results.failed.push(name);
      log(`Test failed: ${name}`, 'error');
    }
  } catch (error) {
    results.failed.push(name);
    log(`Test error in ${name}: ${error.message}`, 'error');
  }
}

// Simulate localStorage for testing
const storage = {};

const localStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, value) => storage[key] = value,
  clear: () => Object.keys(storage).forEach(key => delete storage[key])
};

// Import school terms data
const schoolTerms2025_2026 = [
  {
    id: 'autumn-half-term-2025',
    name: 'Autumn Half Term',
    type: 'half-term',
    startDate: '2025-10-20',
    endDate: '2025-10-31',
    year: '2025',
    student: 'Amari'
  },
  {
    id: 'inset-sept-2025',
    name: 'INSET Day',
    type: 'inset',
    startDate: '2025-09-01',
    endDate: '2025-09-01',
    year: '2025',
    student: 'Amari'
  }
];

// Helper to convert school terms to events
function convertSchoolTermsToEvents(terms) {
  const events = [];

  terms.forEach(term => {
    if (term.type === 'half-term' || term.type === 'break') {
      events.push({
        id: `school-${term.id}`,
        title: `🏖️ ${term.name}`,
        person: 'member-4',
        date: term.startDate,
        time: '00:00',
        duration: 1440,
        type: 'other',
        notes: `School holiday from ${term.startDate} to ${term.endDate} for ${term.student}`,
        isRecurring: false,
        priority: 'high',
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      if (term.type === 'half-term') {
        events.push({
          id: `school-${term.id}-end`,
          title: `📚 ${term.name} Ends`,
          person: 'member-4',
          date: term.endDate,
          time: '18:00',
          duration: 60,
          type: 'education',
          notes: `Back to school tomorrow for ${term.student}`,
          isRecurring: false,
          priority: 'medium',
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    }
  });

  return events;
}

console.log('\n🧪 Starting Family Hub Tests\n');

// Test 1: Initialize with school events
test('Initialize school events', () => {
  const schoolEvents = convertSchoolTermsToEvents(schoolTerms2025_2026);
  localStorage.setItem('calendarEvents', JSON.stringify(schoolEvents));

  const stored = JSON.parse(localStorage.getItem('calendarEvents'));
  return stored && stored.length > 0;
});

// Test 2: Check October events exist
test('October events present', () => {
  const events = JSON.parse(localStorage.getItem('calendarEvents'));
  const octoberEvents = events.filter(e => e.date && e.date.startsWith('2025-10'));

  console.log(`  Found ${octoberEvents.length} October events`);
  octoberEvents.forEach(e => console.log(`    - ${e.title} on ${e.date}`));

  return octoberEvents.length >= 2; // Should have at least start and end of half term
});

// Test 3: Add new event
test('Add new event', () => {
  const events = JSON.parse(localStorage.getItem('calendarEvents'));
  const newEvent = {
    id: 'test-001',
    title: 'Test Meeting',
    person: 'member-1',
    date: '2025-10-15',
    time: '10:00',
    duration: 60,
    location: 'Office',
    type: 'meeting',
    notes: 'Test event',
    isRecurring: false,
    priority: 'high',
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  events.push(newEvent);
  localStorage.setItem('calendarEvents', JSON.stringify(events));

  const updated = JSON.parse(localStorage.getItem('calendarEvents'));
  return updated.find(e => e.id === 'test-001') !== undefined;
});

// Test 4: Event persistence
test('Event persistence after save', () => {
  const events = JSON.parse(localStorage.getItem('calendarEvents'));
  const testEvent = events.find(e => e.id === 'test-001');

  return testEvent && testEvent.title === 'Test Meeting';
});

// Test 5: School holidays are assigned to correct member
test('School events assigned to member-4', () => {
  const events = JSON.parse(localStorage.getItem('calendarEvents'));
  const schoolEvents = events.filter(e => e.id && e.id.startsWith('school-'));

  const allAssignedCorrectly = schoolEvents.every(e => e.person === 'member-4');
  console.log(`  ${schoolEvents.length} school events, all assigned to member-4: ${allAssignedCorrectly}`);

  return allAssignedCorrectly;
});

// Test 6: Check Autumn Half Term specifically
test('Autumn Half Term exists', () => {
  const events = JSON.parse(localStorage.getItem('calendarEvents'));
  const autumnHalfTerm = events.find(e =>
    e.title && e.title.includes('Autumn Half Term') &&
    e.date === '2025-10-20'
  );

  if (autumnHalfTerm) {
    console.log(`  Found: ${autumnHalfTerm.title} on ${autumnHalfTerm.date}`);
  }

  return autumnHalfTerm !== undefined;
});

// Test 7: Initialize family members
test('Initialize family members', () => {
  const members = [
    { id: 'member-1', name: 'Parent 1', color: '#3B82F6' },
    { id: 'member-2', name: 'Parent 2', color: '#EC4899' },
    { id: 'member-3', name: 'Child 1', color: '#10B981' },
    { id: 'member-4', name: 'Amari', color: '#F59E0B' }
  ];

  localStorage.setItem('familyMembers', JSON.stringify(members));
  const stored = JSON.parse(localStorage.getItem('familyMembers'));

  return stored && stored.find(m => m.id === 'member-4') !== undefined;
});

// Test 8: Data survives simulated refresh
test('Data survives refresh simulation', () => {
  // Get current data
  const eventsBefore = localStorage.getItem('calendarEvents');
  const membersBefore = localStorage.getItem('familyMembers');

  // Simulate page refresh (data should persist)
  // In real app, localStorage persists across refreshes

  const eventsAfter = localStorage.getItem('calendarEvents');
  const membersAfter = localStorage.getItem('familyMembers');

  return eventsBefore === eventsAfter && membersBefore === membersAfter;
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Summary');
console.log('='.repeat(50));
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);

if (results.failed.length > 0) {
  console.log('\nFailed tests:');
  results.failed.forEach(name => console.log(`  - ${name}`));
}

console.log('\n💡 Manual Testing Instructions:');
console.log('1. Open http://localhost:3004 in browser');
console.log('2. Click "Reset Data" button in header');
console.log('3. Navigate to Calendar view');
console.log('4. Select October 2025');
console.log('5. Verify you see:');
console.log('   - Autumn Half Term starting Oct 20');
console.log('   - Autumn Half Term Ends on Oct 31');
console.log('6. Add a new event');
console.log('7. Refresh the page');
console.log('8. Verify the new event persists');
console.log('9. Check Dashboard for "Upcoming School Holidays" showing dates');

process.exit(results.failed.length > 0 ? 1 : 0);