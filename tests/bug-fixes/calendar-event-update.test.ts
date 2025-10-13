/**
 * Bug Fix Test: Calendar Event Update (500 Error Fix)
 *
 * This test verifies that the PUT endpoint at /api/families/[familyId]/events
 * properly maps UI fields to Prisma schema fields and doesn't return a 500 error.
 *
 * Fix: Updated PUT endpoint to map:
 * - date → eventDate
 * - time → eventTime
 * - person → personId
 * - type → eventType
 * - duration → durationMinutes
 * - recurring → recurringPattern
 */

import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';
import { PUT as updateEventHandler } from '../../src/app/api/families/[familyId]/events/route';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_FfSTB5lXxPU4@ep-bold-pine-abqy8czb-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require';
}

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_FfSTB5lXxPU4@ep-bold-pine-abqy8czb-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"
});

const FAMILY_ID = 'cmg741w2h0000ljcb3f6fo19g';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  message: string;
  details?: any;
}

const results: TestResult[] = [];
let httpWarningLogged = false;

async function tryHttpEventUpdate(payload: any) {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    return null;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/families/${FAMILY_ID}/events`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const preview = await response.text();
      throw new Error(`Non-JSON response (${response.status}): ${preview.slice(0, 200)}`);
    }

    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    if (!httpWarningLogged) {
      console.log('⚠️  HTTP update request failed or returned non-JSON. Falling back to direct route handler.');
      if (error instanceof Error) {
        console.log(`   Reason: ${error.message}`);
      }
      httpWarningLogged = true;
    }
    return null;
  }
}

async function performEventUpdate(payload: any) {
  const httpResult = await tryHttpEventUpdate(payload);
  if (httpResult) {
    return httpResult;
  }

  const request = new NextRequest(`http://localhost/api/families/${FAMILY_ID}/events`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const response = await updateEventHandler(request, { params: { familyId: FAMILY_ID } });
  const data = await response.json();

  return {
    status: response.status,
    data,
  };
}

async function setupTestData() {
  console.log('\n📝 Setting up test data...\n');

  // Get first family member
  const familyMember = await prisma.familyMember.findFirst({
    where: { familyId: FAMILY_ID }
  });

  if (!familyMember) {
    throw new Error('No family members found. Please ensure test family has members.');
  }

  console.log(`✓ Found family member: ${familyMember.name} (${familyMember.id})`);

  // Create a test event
  const testEvent = await prisma.calendarEvent.create({
    data: {
      familyId: FAMILY_ID,
      personId: familyMember.id,
      title: 'Test Event - Calendar Update',
      description: 'This is a test event for verifying the update fix',
      eventDate: new Date('2025-11-15'),
      eventTime: new Date('2025-11-15T14:00:00'),
      durationMinutes: 60,
      location: 'Test Location',
      cost: 25.00,
      eventType: 'meeting',
      recurringPattern: 'none',
      isRecurring: false,
      notes: 'Original test event'
    },
    include: {
      person: true
    }
  });

  console.log(`✓ Created test event: ${testEvent.id}`);

  return { testEvent, familyMember };
}

async function testEventUpdateWithUIFields(testEvent: any, familyMember: any) {
  console.log('\n🧪 Test 1: Update event with UI field names (date, time, person, type, duration, recurring)\n');

  const updatePayload = {
    id: testEvent.id,
    date: '2025-11-20', // UI field
    time: '15:30', // UI field
    person: familyMember.id, // UI field
    type: 'appointment', // UI field
    duration: 90, // UI field
    recurring: 'weekly', // UI field
    title: 'Updated Test Event',
    description: 'Updated description',
    location: 'Updated Location',
    cost: 35.00,
    notes: 'Updated notes'
  };

  try {
    const result = await performEventUpdate(updatePayload);
    const responseStatus = result.status;
    const responseData = result.data;

    if (responseStatus === 500) {
      results.push({
        testName: 'Event Update with UI Fields',
        status: 'FAIL',
        message: '500 Error returned when updating event with UI fields',
        details: { status: responseStatus, error: responseData }
      });
      console.log('❌ FAIL: Received 500 error');
      console.log('Error details:', JSON.stringify(responseData, null, 2));
      return false;
    }

    if (responseStatus < 200 || responseStatus >= 300) {
      results.push({
        testName: 'Event Update with UI Fields',
        status: 'FAIL',
        message: `HTTP ${responseStatus} error`,
        details: { status: responseStatus, error: responseData }
      });
      console.log(`❌ FAIL: HTTP ${responseStatus}`);
      console.log('Error details:', JSON.stringify(responseData, null, 2));
      return false;
    }

    // Verify the response has correct UI field mapping
    if (responseData.date !== '2025-11-20') {
      results.push({
        testName: 'Event Update with UI Fields',
        status: 'FAIL',
        message: 'Response date field incorrect',
        details: { expected: '2025-11-20', received: responseData.date }
      });
      console.log('❌ FAIL: Date field not mapped correctly');
      return false;
    }

    if (responseData.time !== '15:30') {
      results.push({
        testName: 'Event Update with UI Fields',
        status: 'FAIL',
        message: 'Response time field incorrect',
        details: { expected: '15:30', received: responseData.time }
      });
      console.log('❌ FAIL: Time field not mapped correctly');
      return false;
    }

    if (responseData.person !== familyMember.id) {
      results.push({
        testName: 'Event Update with UI Fields',
        status: 'FAIL',
        message: 'Response person field incorrect',
        details: { expected: familyMember.id, received: responseData.person }
      });
      console.log('❌ FAIL: Person field not mapped correctly');
      return false;
    }

    if (responseData.type !== 'appointment') {
      results.push({
        testName: 'Event Update with UI Fields',
        status: 'FAIL',
        message: 'Response type field incorrect',
        details: { expected: 'appointment', received: responseData.type }
      });
      console.log('❌ FAIL: Type field not mapped correctly');
      return false;
    }

    if (responseData.duration !== 90) {
      results.push({
        testName: 'Event Update with UI Fields',
        status: 'FAIL',
        message: 'Response duration field incorrect',
        details: { expected: 90, received: responseData.duration }
      });
      console.log('❌ FAIL: Duration field not mapped correctly');
      return false;
    }

    if (responseData.recurring !== 'weekly') {
      results.push({
        testName: 'Event Update with UI Fields',
        status: 'FAIL',
        message: 'Response recurring field incorrect',
        details: { expected: 'weekly', received: responseData.recurring }
      });
      console.log('❌ FAIL: Recurring field not mapped correctly');
      return false;
    }

    results.push({
      testName: 'Event Update with UI Fields',
      status: 'PASS',
      message: 'Event updated successfully with correct UI field mapping',
      details: { updatedEvent: responseData }
    });

    console.log('✅ PASS: Event updated successfully');
    console.log('✓ Date mapped correctly:', responseData.date);
    console.log('✓ Time mapped correctly:', responseData.time);
    console.log('✓ Person mapped correctly:', responseData.person);
    console.log('✓ Type mapped correctly:', responseData.type);
    console.log('✓ Duration mapped correctly:', responseData.duration);
    console.log('✓ Recurring mapped correctly:', responseData.recurring);

    return true;
  } catch (error) {
    results.push({
      testName: 'Event Update with UI Fields',
      status: 'FAIL',
      message: 'Exception during update request',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Exception occurred');
    console.error(error);
    return false;
  }
}

async function testDatabaseFieldMapping(testEvent: any) {
  console.log('\n🧪 Test 2: Verify database fields are correctly mapped from UI fields\n');

  try {
    // Fetch the updated event from database
    const updatedEvent = await prisma.calendarEvent.findUnique({
      where: { id: testEvent.id },
      include: { person: true }
    });

    if (!updatedEvent) {
      results.push({
        testName: 'Database Field Mapping',
        status: 'FAIL',
        message: 'Event not found in database',
        details: { eventId: testEvent.id }
      });
      console.log('❌ FAIL: Event not found');
      return false;
    }

    // Check that Prisma fields were updated correctly
    const dateStr = updatedEvent.eventDate.toISOString().split('T')[0];
    if (dateStr !== '2025-11-20') {
      results.push({
        testName: 'Database Field Mapping',
        status: 'FAIL',
        message: 'eventDate not mapped correctly in database',
        details: { expected: '2025-11-20', received: dateStr }
      });
      console.log('❌ FAIL: eventDate field incorrect in database');
      return false;
    }

    const timeStr = updatedEvent.eventTime.toTimeString().slice(0, 5);
    if (timeStr !== '15:30') {
      results.push({
        testName: 'Database Field Mapping',
        status: 'FAIL',
        message: 'eventTime not mapped correctly in database',
        details: { expected: '15:30', received: timeStr }
      });
      console.log('❌ FAIL: eventTime field incorrect in database');
      return false;
    }

    if (updatedEvent.eventType !== 'appointment') {
      results.push({
        testName: 'Database Field Mapping',
        status: 'FAIL',
        message: 'eventType not mapped correctly in database',
        details: { expected: 'appointment', received: updatedEvent.eventType }
      });
      console.log('❌ FAIL: eventType field incorrect in database');
      return false;
    }

    if (updatedEvent.durationMinutes !== 90) {
      results.push({
        testName: 'Database Field Mapping',
        status: 'FAIL',
        message: 'durationMinutes not mapped correctly in database',
        details: { expected: 90, received: updatedEvent.durationMinutes }
      });
      console.log('❌ FAIL: durationMinutes field incorrect in database');
      return false;
    }

    if (updatedEvent.recurringPattern !== 'weekly') {
      results.push({
        testName: 'Database Field Mapping',
        status: 'FAIL',
        message: 'recurringPattern not mapped correctly in database',
        details: { expected: 'weekly', received: updatedEvent.recurringPattern }
      });
      console.log('❌ FAIL: recurringPattern field incorrect in database');
      return false;
    }

    if (!updatedEvent.isRecurring) {
      results.push({
        testName: 'Database Field Mapping',
        status: 'FAIL',
        message: 'isRecurring not set correctly for weekly recurring event',
        details: { expected: true, received: updatedEvent.isRecurring }
      });
      console.log('❌ FAIL: isRecurring field incorrect in database');
      return false;
    }

    results.push({
      testName: 'Database Field Mapping',
      status: 'PASS',
      message: 'All database fields correctly mapped from UI fields'
    });

    console.log('✅ PASS: Database fields correctly mapped');
    console.log('✓ eventDate:', dateStr);
    console.log('✓ eventTime:', timeStr);
    console.log('✓ eventType:', updatedEvent.eventType);
    console.log('✓ durationMinutes:', updatedEvent.durationMinutes);
    console.log('✓ recurringPattern:', updatedEvent.recurringPattern);
    console.log('✓ isRecurring:', updatedEvent.isRecurring);

    return true;
  } catch (error) {
    results.push({
      testName: 'Database Field Mapping',
      status: 'FAIL',
      message: 'Exception during database verification',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Exception occurred');
    console.error(error);
    return false;
  }
}

async function testDragDropScenario(familyMember: any) {
  console.log('\n🧪 Test 3: Simulate drag & drop event update (date and time change)\n');

  // Create a fresh event for drag/drop test
  const dragEvent = await prisma.calendarEvent.create({
    data: {
      familyId: FAMILY_ID,
      personId: familyMember.id,
      title: 'Drag Test Event',
      eventDate: new Date('2025-11-10T10:00:00'),
      eventTime: new Date('2025-11-10T10:00:00'),
      durationMinutes: 30,
      eventType: 'meeting',
      recurringPattern: 'none',
      isRecurring: false
    }
  });

  console.log(`✓ Created drag test event: ${dragEvent.id}`);

  // Simulate drag to new date/time (this is what the UI sends)
  const dragUpdatePayload = {
    id: dragEvent.id,
    date: '2025-11-12', // Dragged to 2 days later
    time: '14:00' // Dragged to different time
  };

  try {
    const result = await performEventUpdate(dragUpdatePayload);
    const responseStatus = result.status;
    const responseData = result.data;

    if (responseStatus < 200 || responseStatus >= 300) {
      results.push({
        testName: 'Drag & Drop Update',
        status: 'FAIL',
        message: `Drag drop update failed with status ${responseStatus}`,
        details: { status: responseStatus, error: responseData }
      });
      console.log(`❌ FAIL: HTTP ${responseStatus}`);
      console.log('Error:', JSON.stringify(responseData, null, 2));

      // Cleanup
      await prisma.calendarEvent.delete({ where: { id: dragEvent.id } });
      return false;
    }

    // Verify the update worked
    const updatedEvent = await prisma.calendarEvent.findUnique({
      where: { id: dragEvent.id }
    });

    if (!updatedEvent) {
      results.push({
        testName: 'Drag & Drop Update',
        status: 'FAIL',
        message: 'Event disappeared after drag update'
      });
      console.log('❌ FAIL: Event not found after update');
      return false;
    }

    const dateStr = updatedEvent.eventDate.toISOString().split('T')[0];
    const timeStr = updatedEvent.eventTime.toTimeString().slice(0, 5);

    if (dateStr !== '2025-11-12' || timeStr !== '14:00') {
      results.push({
        testName: 'Drag & Drop Update',
        status: 'FAIL',
        message: 'Drag drop date/time not updated correctly',
        details: {
          expectedDate: '2025-11-12',
          receivedDate: dateStr,
          expectedTime: '14:00',
          receivedTime: timeStr
        }
      });
      console.log('❌ FAIL: Date/time not updated correctly');

      // Cleanup
      await prisma.calendarEvent.delete({ where: { id: dragEvent.id } });
      return false;
    }

    results.push({
      testName: 'Drag & Drop Update',
      status: 'PASS',
      message: 'Drag & drop update successful'
    });

    console.log('✅ PASS: Drag & drop update successful');
    console.log('✓ New date:', dateStr);
    console.log('✓ New time:', timeStr);

    // Cleanup
    await prisma.calendarEvent.delete({ where: { id: dragEvent.id } });
    console.log('✓ Cleaned up drag test event');

    return true;
  } catch (error) {
    results.push({
      testName: 'Drag & Drop Update',
      status: 'FAIL',
      message: 'Exception during drag drop test',
      details: { error: error instanceof Error ? error.message : String(error) }
    });
    console.log('❌ FAIL: Exception occurred');
    console.error(error);

    // Cleanup
    try {
      await prisma.calendarEvent.delete({ where: { id: dragEvent.id } });
    } catch {}

    return false;
  }
}

async function cleanup(testEventId: string) {
  console.log('\n🧹 Cleaning up test data...\n');

  try {
    await prisma.calendarEvent.delete({
      where: { id: testEventId }
    });
    console.log('✓ Deleted test event');
  } catch (error) {
    console.log('⚠ Warning: Could not delete test event');
  }
}

function printTestSummary() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY - Calendar Event Update Fix');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  results.forEach((result, index) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} Test ${index + 1}: ${result.testName}`);
    console.log(`   Status: ${result.status}`);
    console.log(`   Message: ${result.message}`);
    if (result.details && result.status === 'FAIL') {
      console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log('');
  });

  console.log('-'.repeat(80));
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  console.log('-'.repeat(80) + '\n');

  if (failed === 0) {
    console.log('🎉 All tests passed! The calendar event update fix is working correctly.\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('CALENDAR EVENT UPDATE BUG FIX VERIFICATION');
  console.log('='.repeat(80));
  console.log('\nThis test suite verifies that:');
  console.log('1. Calendar events can be updated using UI field names (date, time, person, etc.)');
  console.log('2. The API correctly maps UI fields to Prisma schema fields');
  console.log('3. No 500 errors occur during event updates');
  console.log('4. Drag & drop event updates work correctly');
  console.log('\n' + '='.repeat(80) + '\n');

  try {
    const { testEvent, familyMember } = await setupTestData();

    await testEventUpdateWithUIFields(testEvent, familyMember);
    await testDatabaseFieldMapping(testEvent);
    await testDragDropScenario(familyMember);

    await cleanup(testEvent.id);
    printTestSummary();

    await prisma.$disconnect();

    // Exit with error code if tests failed
    const hasFailures = results.some(r => r.status === 'FAIL');
    process.exit(hasFailures ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Fatal error during test execution:');
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run tests
runTests();
