import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

type FeedSeverity = 'info' | 'attention' | 'urgent';

type FeedItem = {
  id: string;
  type: string;
  title: string;
  summary: string;
  timestamp: string;
  severity: FeedSeverity;
  cta?: {
    label: string;
    view: string;
    params?: Record<string, string>;
  };
  entity?: { kind: string; id: string };
  related?: Array<{ kind: string; id: string }>;
};

const isoDate = (d: Date) => d.toISOString().split('T')[0];

export const GET = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const today = isoDate(now);

    const inDays = (days: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      return d;
    };

    const [upcomingEvents, unreadNotifications, upcomingAppointments, adults] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: {
          familyId,
          eventDate: { gte: todayStart, lte: inDays(7) },
        },
        orderBy: [{ eventDate: 'asc' }, { eventTime: 'asc' }],
        take: 10,
      }),
      prisma.notification.findMany({
        where: { familyId, read: false },
        orderBy: [{ timestamp: 'desc' }],
        take: 10,
      }),
      prisma.contractorAppointment.findMany({
        where: { familyId, status: 'scheduled', date: { gte: today } },
        include: { contractor: true },
        orderBy: [{ date: 'asc' }, { time: 'asc' }],
        take: 10,
      }),
      prisma.familyMember.findMany({
        where: { familyId, ageGroup: 'Adult' },
        select: { id: true, name: true, fitnessGoals: true },
      }),
    ]);

    const items: FeedItem[] = [];

    // Calendar: upcoming
    for (const event of upcomingEvents) {
      items.push({
        id: `calendar:${event.id}`,
        type: 'calendar',
        title: event.title,
        summary: `Upcoming event on ${event.eventDate.toISOString().split('T')[0]} at ${event.eventTime.toTimeString().slice(0, 5)}`,
        timestamp: event.eventDate.toISOString(),
        severity: 'info',
        cta: { label: 'Open calendar', view: 'calendar' },
        entity: { kind: 'calendar_event', id: event.id },
      });
    }

    // Notifications: unread
    for (const n of unreadNotifications) {
      items.push({
        id: `notification:${n.id}`,
        type: 'notification',
        title: n.title,
        summary: n.message,
        timestamp: n.timestamp.toISOString(),
        severity: n.priority === 'urgent' ? 'urgent' : n.priority === 'high' ? 'attention' : 'info',
        cta: { label: 'View notifications', view: 'dashboard' },
        entity: { kind: 'notification', id: n.id },
      });
    }

    // Contractors: upcoming appointments
    for (const apt of upcomingAppointments) {
      items.push({
        id: `contractor_apt:${apt.id}`,
        type: 'contractors',
        title: `${apt.contractor?.name || 'Contractor'}: ${apt.purpose}`,
        summary: `${apt.date} ${apt.time}${apt.location ? ` · ${apt.location}` : ''}`,
        timestamp: `${apt.date}T${apt.time}:00.000Z`,
        severity: 'info',
        cta: { label: 'Open contractors', view: 'contractors' },
        entity: { kind: 'contractor_appointment', id: apt.id },
        related: apt.contractorId ? [{ kind: 'contractor', id: apt.contractorId }] : [],
      });
    }

    // Fitness: streak-at-risk + weekly progress
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    for (const adult of adults) {
      const last = await prisma.fitnessTracking.findFirst({
        where: { personId: adult.id },
        orderBy: { activityDate: 'desc' },
        select: { id: true, activityDate: true, activityType: true, durationMinutes: true },
      });

      if (!last) {
        items.push({
          id: `fitness:none:${adult.id}`,
          type: 'fitness',
          title: `${adult.name}: No workouts logged yet`,
          summary: 'Log your first activity to start tracking.',
          timestamp: new Date().toISOString(),
          severity: 'attention',
          cta: { label: 'Open fitness', view: 'fitness' },
          entity: { kind: 'family_member', id: adult.id },
        });
        continue;
      }

      const daysSince = Math.floor((Date.now() - last.activityDate.getTime()) / (24 * 60 * 60 * 1000));
      if (daysSince >= 2) {
        items.push({
          id: `fitness:streak:${adult.id}`,
          type: 'fitness',
          title: `${adult.name}: Streak at risk`,
          summary: `Last workout was ${daysSince} days ago.`,
          timestamp: new Date().toISOString(),
          severity: 'attention',
          cta: { label: 'Log workout', view: 'fitness' },
          entity: { kind: 'family_member', id: adult.id },
          related: [{ kind: 'fitness_activity', id: last.id }],
        });
      }

      const weeklyCount = await prisma.fitnessTracking.count({
        where: {
          personId: adult.id,
          activityDate: { gte: weekStart },
        },
      });

      const goal = (adult.fitnessGoals as any)?.workouts || 0;
      if (goal > 0) {
        items.push({
          id: `fitness:weekly:${adult.id}:${isoDate(weekStart)}`,
          type: 'fitness',
          title: `${adult.name}: Weekly goal progress`,
          summary: `${weeklyCount}/${goal} workouts this week`,
          timestamp: new Date().toISOString(),
          severity: weeklyCount >= goal ? 'info' : 'attention',
          cta: { label: 'Open fitness', view: 'fitness' },
          entity: { kind: 'family_member', id: adult.id },
        });
      }
    }

    // Budget: top expenses last 7 days
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const recentExpenses = await prisma.budgetExpense.findMany({
      where: { familyId, paymentDate: { gte: start } },
      orderBy: { amount: 'desc' },
      take: 5,
    });
    for (const exp of recentExpenses) {
      items.push({
        id: `budget_expense:${exp.id}`,
        type: 'budget',
        title: `Expense: ${exp.expenseName}`,
        summary: `£${Number(exp.amount).toFixed(2)} · ${exp.category}`,
        timestamp: (exp.paymentDate || exp.createdAt).toISOString(),
        severity: Number(exp.amount) >= 200 ? 'attention' : 'info',
        cta: { label: 'Open budget', view: 'budget' },
        entity: { kind: 'budget_expense', id: exp.id },
      });
    }

    // Sort newest first; UI can re-sort as needed.
    items.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 30)));

    return NextResponse.json(items.slice(0, limit));
  } catch (error) {
    console.error('Feed error:', error);
    return NextResponse.json({ error: 'Failed to build feed' }, { status: 500 });
  }
});
