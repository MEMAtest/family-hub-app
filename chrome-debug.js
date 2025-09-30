// Chrome Debug Script - Copy and paste this into Chrome DevTools Console

console.log('🔍 Chrome Debug Script Starting...\n');

// 1. Check localStorage support
console.group('1. LocalStorage Check');
try {
  const testKey = 'chrome-test-' + Date.now();
  localStorage.setItem(testKey, 'test');
  const retrieved = localStorage.getItem(testKey);
  localStorage.removeItem(testKey);

  if (retrieved === 'test') {
    console.log('✅ LocalStorage is working');
  } else {
    console.error('❌ LocalStorage read/write failed');
  }

  // Check for existing data
  const events = localStorage.getItem('calendarEvents');
  const members = localStorage.getItem('familyMembers');

  console.log('Existing data:');
  console.log('- calendarEvents:', events ? JSON.parse(events).length + ' events' : 'NOT FOUND');
  console.log('- familyMembers:', members ? JSON.parse(members).length + ' members' : 'NOT FOUND');

  if (events) {
    const parsed = JSON.parse(events);
    const schoolEvents = parsed.filter(e => e.id && e.id.startsWith('school-'));
    const octoberEvents = parsed.filter(e => e.date && e.date.startsWith('2025-10'));
    console.log('- School events:', schoolEvents.length);
    console.log('- October events:', octoberEvents.length);

    if (octoberEvents.length > 0) {
      console.log('October events found:');
      octoberEvents.forEach(e => console.log(`  • ${e.title} - ${e.date}`));
    }
  }

} catch (error) {
  console.error('❌ LocalStorage error:', error);
  console.log('Possible causes:');
  console.log('- Chrome running in incognito mode with third-party cookies blocked');
  console.log('- localStorage disabled in Chrome settings');
  console.log('- Site data blocked for this domain');
}
console.groupEnd();

// 2. Check Chrome-specific settings
console.group('2. Chrome Settings Check');
console.log('Navigator info:');
console.log('- User Agent:', navigator.userAgent);
console.log('- Cookies enabled:', navigator.cookieEnabled);
console.log('- Online:', navigator.onLine);
console.log('- Language:', navigator.language);

// Check for Chrome-specific storage issues
if ('storage' in navigator && 'estimate' in navigator.storage) {
  navigator.storage.estimate().then(estimate => {
    console.log('Storage quota:');
    console.log('- Used:', (estimate.usage / 1024 / 1024).toFixed(2), 'MB');
    console.log('- Available:', (estimate.quota / 1024 / 1024).toFixed(2), 'MB');
  });
}
console.groupEnd();

// 3. Try to manually initialize data
console.group('3. Manual Data Initialization');
function initializeData() {
  try {
    // Check if data exists
    const existingEvents = localStorage.getItem('calendarEvents');

    if (!existingEvents || existingEvents === '[]') {
      console.log('Initializing with school events...');

      // Create minimal school events
      const schoolEvents = [
        {
          id: 'school-autumn-half-term-2025',
          title: '🏖️ Autumn Half Term (12 days)',
          person: 'member-4',
          date: '2025-10-20',
          time: '00:00',
          duration: 1440,
          location: '',
          recurring: 'none',
          cost: 0,
          type: 'other',
          notes: 'School holiday from 2025-10-20 to 2025-10-31 for Amari',
          isRecurring: false,
          priority: 'high',
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'school-autumn-half-term-2025-end',
          title: '📚 Autumn Half Term Ends',
          person: 'member-4',
          date: '2025-10-31',
          time: '18:00',
          duration: 60,
          location: '',
          recurring: 'none',
          cost: 0,
          type: 'education',
          notes: 'Back to school tomorrow for Amari',
          isRecurring: false,
          priority: 'medium',
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      localStorage.setItem('calendarEvents', JSON.stringify(schoolEvents));
      console.log('✅ School events initialized');

      // Initialize family members if needed
      const existingMembers = localStorage.getItem('familyMembers');
      if (!existingMembers || existingMembers === '[]') {
        const members = [
          { id: 'member-1', name: 'Parent 1', color: '#3B82F6', icon: '👤', age: 'Adult', role: 'Parent' },
          { id: 'member-2', name: 'Parent 2', color: '#EC4899', icon: '👤', age: 'Adult', role: 'Parent' },
          { id: 'member-3', name: 'Child 1', color: '#10B981', icon: '🧒', age: 'Preschool', role: 'Student' },
          { id: 'member-4', name: 'Amari', color: '#F59E0B', icon: '🧒', age: 'Child', role: 'Student' }
        ];
        localStorage.setItem('familyMembers', JSON.stringify(members));
        console.log('✅ Family members initialized');
      }

      console.log('🔄 Please refresh the page to see the changes');
      return true;
    } else {
      console.log('Data already exists. To reinitialize, first run: localStorage.clear()');
      return false;
    }
  } catch (error) {
    console.error('Failed to initialize:', error);
    return false;
  }
}

console.log('Run initializeData() to manually set up the data');
console.log('Or run localStorage.clear() to completely reset');
console.groupEnd();

// 4. Check for Chrome extensions interference
console.group('4. Possible Interference Check');
console.log('Common issues in Chrome:');
console.log('1. Ad blockers may interfere with localStorage');
console.log('2. Privacy extensions may block storage');
console.log('3. Chrome settings: chrome://settings/content/cookies');
console.log('   - Make sure "Block third-party cookies" is OFF');
console.log('   - Or add this site to exceptions');
console.log('4. Try disabling extensions: chrome://extensions/');
console.groupEnd();

// 5. Direct fix attempt
console.group('5. Direct Fix Attempt');
console.log('Attempting direct fix...');

// Try to trigger storage event
window.dispatchEvent(new StorageEvent('storage', {
  key: 'calendarEvents',
  newValue: localStorage.getItem('calendarEvents'),
  url: window.location.href
}));

console.log('✅ Triggered storage event');
console.log('If data still doesn\'t show:');
console.log('1. Type: initializeData() and press Enter');
console.log('2. Then refresh the page');
console.groupEnd();

// Make initializeData available globally
window.initializeData = initializeData;
window.debugStorage = function() {
  const events = localStorage.getItem('calendarEvents');
  const members = localStorage.getItem('familyMembers');

  console.table({
    'Calendar Events': events ? JSON.parse(events).length : 0,
    'Family Members': members ? JSON.parse(members).length : 0,
    'Total Size': new Blob([events || '', members || '']).size + ' bytes'
  });

  if (events) {
    const parsed = JSON.parse(events);
    console.log('Events:', parsed);
  }
};

console.log('\n📝 Available commands:');
console.log('- initializeData() - Set up school events and family members');
console.log('- debugStorage() - Show current storage state');
console.log('- localStorage.clear() - Clear all data');

console.log('\n✨ Debug script loaded. Check the groups above for issues.');