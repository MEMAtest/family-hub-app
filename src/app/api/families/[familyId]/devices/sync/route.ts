import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';

/**
 * POST /api/families/[familyId]/devices/sync
 * Sync data from connected devices
 */
export const POST = requireFamilyAccess(async (request: NextRequest, context, _authUser) => {
  try {
    const { familyId } = await context.params;
    const body = await request.json();
    const { personId, provider } = body;

    if (!personId) {
      return NextResponse.json(
        { error: 'personId is required' },
        { status: 400 }
      );
    }

    // Verify person belongs to family
    const person = await prisma.familyMember.findFirst({
      where: { id: personId, familyId },
    });

    if (!person) {
      return NextResponse.json(
        { error: 'Person not found in this family' },
        { status: 404 }
      );
    }

    // Find devices to sync
    const where: { personId: string; provider?: string; syncEnabled: boolean } = {
      personId,
      syncEnabled: true,
    };
    if (provider) {
      where.provider = provider;
    }

    const devices = await prisma.deviceSync.findMany({ where });

    if (devices.length === 0) {
      return NextResponse.json(
        { error: 'No connected devices found' },
        { status: 404 }
      );
    }

    const results: Record<string, { success: boolean; activitiesSynced?: number; error?: string }> = {};

    for (const device of devices) {
      if (device.provider === 'garmin') {
        results.garmin = await syncGarminData(personId, device);
      } else if (device.provider === 'ultrahuman') {
        results.ultrahuman = await syncUltrahumanData(personId, device);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error syncing devices:', error);
    return NextResponse.json(
      { error: 'Failed to sync devices' },
      { status: 500 }
    );
  }
});

interface DeviceSyncRecord {
  id: string;
  personId: string;
  provider: string;
  settings: Prisma.JsonValue;
  syncEnabled: boolean;
}

/**
 * Sync data from Garmin Connect
 */
async function syncGarminData(
  personId: string,
  device: DeviceSyncRecord
): Promise<{ success: boolean; activitiesSynced?: number; error?: string }> {
  try {
    const settings = device.settings as { username?: string; password?: string } | null;

    if (!settings?.username || !settings?.password) {
      return { success: false, error: 'Missing Garmin credentials' };
    }

    // Dynamic import to avoid issues if package isn't installed
    const { GarminConnect } = await import('garmin-connect');
    const client = new GarminConnect({
      username: settings.username,
      password: settings.password,
    });

    await client.login();

    // Fetch recent activities
    const activities = await client.getActivities(0, 20);
    let syncedCount = 0;

    for (const activity of activities || []) {
      // Check if already synced
      const existing = await prisma.fitnessTracking.findFirst({
        where: {
          personId,
          source: 'garmin',
          externalId: activity.activityId?.toString(),
        },
      });

      if (existing) continue;

      // Map activity type
      const typeKey = activity.activityType?.typeKey?.toLowerCase() || 'other';
      const activityType = mapGarminActivityType(typeKey);

      // Create activity
      await prisma.fitnessTracking.create({
        data: {
          personId,
          activityType,
          durationMinutes: Math.round((activity.duration || 0) / 60),
          intensityLevel: estimateIntensity(activity.averageHR),
          activityDate: new Date(activity.startTimeLocal || new Date()),
          workoutName: activity.activityName || `${activityType} workout`,
          calories: activity.calories,
          heartRateAvg: activity.averageHR,
          heartRateMax: activity.maxHR,
          notes: typeof activity.description === 'string' ? activity.description : undefined,
          source: 'garmin',
          externalId: activity.activityId?.toString(),
          exercises: Prisma.JsonNull,
        },
      });

      syncedCount++;
    }

    // Update last sync time
    await prisma.deviceSync.update({
      where: { id: device.id },
      data: { lastSyncAt: new Date() },
    });

    return { success: true, activitiesSynced: syncedCount };
  } catch (error: any) {
    console.error('Garmin sync error:', error);
    return { success: false, error: error.message || 'Failed to sync Garmin data' };
  }
}

/**
 * Sync data from Ultrahuman Ring
 * Note: Ultrahuman requires partnership API access
 */
async function syncUltrahumanData(
  personId: string,
  device: DeviceSyncRecord
): Promise<{ success: boolean; activitiesSynced?: number; error?: string }> {
  // Ultrahuman requires partnership approval
  // For now, return a message indicating this
  return {
    success: false,
    error: 'Ultrahuman integration requires partnership API access. Apply at ultrahuman.com/ultrasignal',
  };
}

/**
 * Map Garmin activity types to our types
 */
function mapGarminActivityType(typeKey: string): string {
  const map: Record<string, string> = {
    running: 'run',
    cycling: 'cycle',
    swimming: 'swim',
    walking: 'walk',
    strength_training: 'gym',
    fitness_equipment: 'gym',
    yoga: 'yoga',
    cardio: 'cardio',
    hiking: 'walk',
    elliptical: 'cardio',
    stair_climbing: 'cardio',
    indoor_cycling: 'cycle',
    treadmill_running: 'run',
    open_water_swimming: 'swim',
    lap_swimming: 'swim',
  };
  return map[typeKey] || 'other';
}

/**
 * Estimate intensity from heart rate
 */
function estimateIntensity(avgHR?: number): 'low' | 'moderate' | 'high' {
  if (!avgHR) return 'moderate';
  if (avgHR > 140) return 'high';
  if (avgHR > 100) return 'moderate';
  return 'low';
}
