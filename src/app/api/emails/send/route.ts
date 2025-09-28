import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    let result = false;

    switch (type) {
      case 'event_reminder':
        result = await emailService.sendEventReminder(
          data.event,
          data.recipient,
          data.reminderTime
        );
        break;

      case 'conflict_alert':
        result = await emailService.sendConflictAlert(
          data.conflictData,
          data.recipients
        );
        break;

      case 'daily_digest':
        result = await emailService.sendDailyDigest(
          data.events,
          data.notifications,
          data.recipient,
          new Date(data.date)
        );
        break;

      case 'weekly_summary':
        result = await emailService.sendWeeklySummary(
          data.events,
          data.people,
          data.recipient,
          new Date(data.weekStart)
        );
        break;

      case 'test':
        result = await emailService.testEmail(data.recipient);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid email type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: result });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email' },
      { status: 500 }
    );
  }
}