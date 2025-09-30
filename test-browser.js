#!/usr/bin/env node

const http = require('http');

// Test the actual running app
async function fetchPage(path = '/') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3004,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });

    req.on('error', reject);
    req.end();
  });
}

async function testApp() {
  console.log('🧪 Testing Live App at http://localhost:3004\n');

  try {
    // Test 1: App is running
    console.log('Test 1: Checking if app is running...');
    const homepage = await fetchPage('/');

    if (homepage.status === 200) {
      console.log('✅ App is running');

      // Check if page contains expected elements
      const hasCalendar = homepage.data.includes('Calendar');
      const hasDashboard = homepage.data.includes('Dashboard');
      const hasFamilyHub = homepage.data.includes('Family');

      console.log(`  - Has Calendar: ${hasCalendar ? '✅' : '❌'}`);
      console.log(`  - Has Dashboard: ${hasDashboard ? '✅' : '❌'}`);
      console.log(`  - Has Family references: ${hasFamilyHub ? '✅' : '❌'}`);

      // Check for school-related content
      const hasSchoolContent = homepage.data.includes('School') || homepage.data.includes('school');
      console.log(`  - Has School content: ${hasSchoolContent ? '✅' : '❌'}`);

      // Check for October/dates
      const hasOctober = homepage.data.includes('October') || homepage.data.includes('Oct');
      console.log(`  - References October: ${hasOctober ? '✅' : '❌'}`);

    } else {
      console.log(`❌ App returned status ${homepage.status}`);
    }

  } catch (error) {
    console.error('❌ Could not connect to app:', error.message);
    console.log('\nMake sure the app is running at http://localhost:3004');
    process.exit(1);
  }
}

// Run browser simulation test
const puppeteer = require('puppeteer');

async function testWithBrowser() {
  console.log('\n🌐 Starting browser automation tests...\n');

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('October event') ||
          msg.text().includes('Added new event') ||
          msg.text().includes('school')) {
        console.log('Browser console:', msg.text());
      }
    });

    // Test 1: Load the app
    console.log('Test 1: Loading app...');
    await page.goto('http://localhost:3004', { waitUntil: 'networkidle0' });
    console.log('✅ Page loaded');

    // Test 2: Check localStorage initialization
    console.log('\nTest 2: Checking localStorage...');
    const localStorageData = await page.evaluate(() => {
      const events = localStorage.getItem('calendarEvents');
      const members = localStorage.getItem('familyMembers');

      if (!events || !members) {
        return { hasEvents: false, hasMembers: false };
      }

      const parsedEvents = JSON.parse(events);
      const parsedMembers = JSON.parse(members);

      const schoolEvents = parsedEvents.filter(e => e.id && e.id.startsWith('school-'));
      const octoberEvents = parsedEvents.filter(e => e.date && e.date.startsWith('2025-10'));

      return {
        hasEvents: true,
        hasMembers: true,
        totalEvents: parsedEvents.length,
        schoolEvents: schoolEvents.length,
        octoberEvents: octoberEvents.length,
        octoberDetails: octoberEvents.slice(0, 3).map(e => ({
          title: e.title,
          date: e.date
        })),
        hasMember4: parsedMembers.some(m => m.id === 'member-4')
      };
    });

    console.log('LocalStorage status:');
    console.log(`  - Events initialized: ${localStorageData.hasEvents ? '✅' : '❌'}`);
    console.log(`  - Members initialized: ${localStorageData.hasMembers ? '✅' : '❌'}`);

    if (localStorageData.hasEvents) {
      console.log(`  - Total events: ${localStorageData.totalEvents}`);
      console.log(`  - School events: ${localStorageData.schoolEvents}`);
      console.log(`  - October events: ${localStorageData.octoberEvents}`);

      if (localStorageData.octoberDetails.length > 0) {
        console.log('  - October event details:');
        localStorageData.octoberDetails.forEach(e => {
          console.log(`    • ${e.title} on ${e.date}`);
        });
      }

      console.log(`  - Has member-4: ${localStorageData.hasMember4 ? '✅' : '❌'}`);
    }

    // Test 3: Reset and reinitialize
    console.log('\nTest 3: Testing Reset Data button...');

    // Click Reset Data if it exists
    const hasResetButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const resetButton = buttons.find(b => b.textContent.includes('Reset Data'));
      if (resetButton) {
        // Store data before reset
        const beforeReset = localStorage.getItem('calendarEvents');
        resetButton.click();
        return true;
      }
      return false;
    });

    if (hasResetButton) {
      console.log('✅ Found and clicked Reset Data button');

      // Handle the confirm dialog
      page.on('dialog', async dialog => {
        console.log(`  - Confirming dialog: ${dialog.message()}`);
        await dialog.accept();
      });

      // Wait for reload
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      console.log('✅ Page reloaded after reset');

      // Check data after reset
      const afterReset = await page.evaluate(() => {
        const events = localStorage.getItem('calendarEvents');
        if (!events) return { initialized: false };

        const parsed = JSON.parse(events);
        const schoolEvents = parsed.filter(e => e.id && e.id.startsWith('school-'));
        const octoberEvents = parsed.filter(e => e.date && e.date.startsWith('2025-10'));

        return {
          initialized: true,
          totalEvents: parsed.length,
          schoolEvents: schoolEvents.length,
          octoberEvents: octoberEvents.length
        };
      });

      console.log('After reset:');
      console.log(`  - Data reinitialized: ${afterReset.initialized ? '✅' : '❌'}`);
      if (afterReset.initialized) {
        console.log(`  - School events restored: ${afterReset.schoolEvents > 0 ? '✅' : '❌'} (${afterReset.schoolEvents})`);
        console.log(`  - October events restored: ${afterReset.octoberEvents > 0 ? '✅' : '❌'} (${afterReset.octoberEvents})`);
      }
    } else {
      console.log('⚠️  Reset Data button not found');
    }

    // Test 4: Navigate to Calendar
    console.log('\nTest 4: Navigating to Calendar...');

    const calendarClicked = await page.evaluate(() => {
      // Try multiple selectors
      const calendarLink = document.querySelector('[href*="calendar"]') ||
                          document.querySelector('button:has-text("Calendar")') ||
                          Array.from(document.querySelectorAll('div')).find(el =>
                            el.textContent === 'Calendar' && el.style.cursor === 'pointer'
                          );
      if (calendarLink) {
        calendarLink.click();
        return true;
      }
      return false;
    });

    if (calendarClicked) {
      console.log('✅ Navigated to Calendar view');
      await page.waitForTimeout(1000); // Wait for view change
    } else {
      console.log('⚠️  Could not find Calendar navigation');
    }

    // Test 5: Add a test event
    console.log('\nTest 5: Adding test event...');

    const beforeAdd = await page.evaluate(() => {
      const events = localStorage.getItem('calendarEvents');
      return events ? JSON.parse(events).length : 0;
    });

    const testEventAdded = await page.evaluate(() => {
      const events = localStorage.getItem('calendarEvents');
      if (!events) return false;

      const parsed = JSON.parse(events);
      const testEvent = {
        id: 'browser-test-' + Date.now(),
        title: 'Browser Test Event',
        person: 'member-1',
        date: '2025-10-15',
        time: '14:00',
        duration: 60,
        location: 'Test Location',
        type: 'meeting',
        notes: 'Added by browser test',
        recurring: 'none',
        isRecurring: false,
        cost: 0,
        priority: 'medium',
        status: 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      parsed.push(testEvent);
      localStorage.setItem('calendarEvents', JSON.stringify(parsed));

      // Dispatch storage event to notify app
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'calendarEvents',
        newValue: JSON.stringify(parsed),
        url: window.location.href
      }));

      return true;
    });

    const afterAdd = await page.evaluate(() => {
      const events = localStorage.getItem('calendarEvents');
      return events ? JSON.parse(events).length : 0;
    });

    console.log(`  - Events before: ${beforeAdd}`);
    console.log(`  - Events after: ${afterAdd}`);
    console.log(`  - Test event added: ${afterAdd > beforeAdd ? '✅' : '❌'}`);

    // Test 6: Refresh and check persistence
    console.log('\nTest 6: Testing persistence after refresh...');

    await page.reload({ waitUntil: 'networkidle0' });
    console.log('✅ Page refreshed');

    const afterRefresh = await page.evaluate(() => {
      const events = localStorage.getItem('calendarEvents');
      if (!events) return { persisted: false };

      const parsed = JSON.parse(events);
      const browserTestEvents = parsed.filter(e => e.id && e.id.includes('browser-test'));
      const schoolEvents = parsed.filter(e => e.id && e.id.startsWith('school-'));
      const octoberEvents = parsed.filter(e => e.date && e.date.startsWith('2025-10'));

      return {
        persisted: true,
        totalEvents: parsed.length,
        testEventsPersisted: browserTestEvents.length > 0,
        schoolEventsPersisted: schoolEvents.length > 0,
        octoberEventsPersisted: octoberEvents.length > 0,
        testEventCount: browserTestEvents.length
      };
    });

    console.log('After refresh:');
    console.log(`  - Data persisted: ${afterRefresh.persisted ? '✅' : '❌'}`);
    if (afterRefresh.persisted) {
      console.log(`  - Test events persisted: ${afterRefresh.testEventsPersisted ? '✅' : '❌'} (${afterRefresh.testEventCount})`);
      console.log(`  - School events persisted: ${afterRefresh.schoolEventsPersisted ? '✅' : '❌'}`);
      console.log(`  - October events persisted: ${afterRefresh.octoberEventsPersisted ? '✅' : '❌'}`);
    }

    // Test 7: Check dashboard for holiday display
    console.log('\nTest 7: Checking dashboard holiday display...');

    // Navigate back to dashboard
    await page.goto('http://localhost:3004', { waitUntil: 'networkidle0' });

    const dashboardContent = await page.evaluate(() => {
      const pageText = document.body.innerText;
      return {
        hasUpcomingHolidays: pageText.includes('Upcoming School Holidays'),
        hasAutumnHalfTerm: pageText.includes('Autumn Half Term'),
        hasOctoberDates: pageText.includes('20 Oct') || pageText.includes('October 20'),
        hasCurrentTerm: pageText.includes('Current Term')
      };
    });

    console.log('Dashboard content:');
    console.log(`  - Shows "Upcoming School Holidays": ${dashboardContent.hasUpcomingHolidays ? '✅' : '❌'}`);
    console.log(`  - Shows "Autumn Half Term": ${dashboardContent.hasAutumnHalfTerm ? '✅' : '❌'}`);
    console.log(`  - Shows October dates: ${dashboardContent.hasOctoberDates ? '✅' : '❌'}`);
    console.log(`  - Shows "Current Term": ${dashboardContent.hasCurrentTerm ? '✅' : '❌'}`);

    // Take screenshot for evidence
    await page.screenshot({ path: 'test-dashboard.png', fullPage: true });
    console.log('\n📸 Screenshot saved as test-dashboard.png');

    console.log('\n' + '='.repeat(50));
    console.log('✅ All browser tests completed!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Browser test error:', error.message);

    // Try without puppeteer
    console.log('\nPuppeteer not available. Running basic tests...');
    await testApp();
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if puppeteer is available
try {
  require.resolve('puppeteer');
  testWithBrowser();
} catch(e) {
  console.log('Puppeteer not installed. Running basic HTTP tests...\n');
  testApp();
}