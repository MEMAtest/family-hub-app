/**
 * Garmin Connect Service
 * Uses unofficial garmin-connect library to sync fitness data
 *
 * Note: This uses username/password authentication.
 * For production, consider using the official Garmin Developer Program
 * with OAuth2 PKCE flow.
 */

import { GarminConnect } from 'garmin-connect';
import { Prisma } from '@prisma/client';
import type { FitnessActivity, ActivityType, IntensityLevel } from '@/types/fitness.types';
import prisma from '@/lib/prisma';

interface GarminCredentials {
  username: string;
  password: string;
}

// Use any for Garmin activities since the library types may differ
type GarminActivity = any; // eslint-disable-line

interface GarminSleepData {
  dailySleepDTO: {
    sleepTimeSeconds: number;
    awakeSleepSeconds: number;
    lightSleepSeconds: number;
    deepSleepSeconds: number;
    remSleepSeconds: number;
    sleepStartTimestampGMT: number;
    sleepEndTimestampGMT: number;
  };
}

interface GarminHeartRate {
  restingHeartRate: number;
  maxHeartRateValue: number;
  minHeartRateValue: number;
  heartRateValues: Array<[number, number]>;
}

// Map Garmin activity types to our types
const activityTypeMap: Record<string, ActivityType> = {
  running: 'run',
  cycling: 'cycle',
  swimming: 'swim',
  walking: 'walk',
  strength_training: 'gym',
  fitness_equipment: 'gym',
  yoga: 'yoga',
  cardio: 'cardio',
  other: 'other',
};

// Estimate intensity from heart rate
function estimateIntensity(avgHR?: number, maxHR?: number): IntensityLevel {
  if (!avgHR) return 'moderate';
  // Rough estimate: >140 is high, 100-140 is moderate, <100 is low
  if (avgHR > 140) return 'high';
  if (avgHR > 100) return 'moderate';
  return 'low';
}

class GarminService {
  private client: InstanceType<typeof GarminConnect> | null = null;
  private isAuthenticated = false;

  /**
   * Initialize and authenticate with Garmin Connect
   */
  async connect(credentials: GarminCredentials): Promise<boolean> {
    try {
      this.client = new GarminConnect({
        username: credentials.username,
        password: credentials.password,
      });

      await this.client.login();
      this.isAuthenticated = true;
      return true;
    } catch (error) {
      console.error('Garmin authentication failed:', error);
      this.isAuthenticated = false;
      return false;
    }
  }

  /**
   * Connect using stored credentials from DeviceSync
   */
  async connectFromDeviceSync(personId: string): Promise<boolean> {
    try {
      const deviceSync = await prisma.deviceSync.findUnique({
        where: {
          personId_provider: {
            personId,
            provider: 'garmin',
          },
        },
      });

      if (!deviceSync || !deviceSync.settings) {
        throw new Error('No Garmin credentials found');
      }

      const settings = deviceSync.settings as { username?: string; password?: string };
      if (!settings.username || !settings.password) {
        throw new Error('Invalid Garmin credentials');
      }

      return await this.connect({
        username: settings.username,
        password: settings.password,
      });
    } catch (error) {
      console.error('Failed to connect from DeviceSync:', error);
      return false;
    }
  }

  /**
   * Get recent activities from Garmin
   */
  async getActivities(limit = 20): Promise<GarminActivity[]> {
    if (!this.client || !this.isAuthenticated) {
      throw new Error('Not authenticated with Garmin');
    }

    try {
      const activities = await this.client.getActivities(0, limit);
      return activities || [];
    } catch (error) {
      console.error('Failed to fetch Garmin activities:', error);
      return [];
    }
  }

  /**
   * Get sleep data for a specific date
   */
  async getSleepData(date: Date): Promise<GarminSleepData | null> {
    if (!this.client || !this.isAuthenticated) {
      throw new Error('Not authenticated with Garmin');
    }

    try {
      const sleep = await this.client.getSleepData(date);
      return sleep;
    } catch (error) {
      console.error('Failed to fetch Garmin sleep data:', error);
      return null;
    }
  }

  /**
   * Get heart rate data for a specific date
   */
  async getHeartRateData(date: Date): Promise<GarminHeartRate | null> {
    if (!this.client || !this.isAuthenticated) {
      throw new Error('Not authenticated with Garmin');
    }

    try {
      const heartRate = await this.client.getHeartRate(date);
      return heartRate;
    } catch (error) {
      console.error('Failed to fetch Garmin heart rate data:', error);
      return null;
    }
  }

  /**
   * Get step count for a specific date
   */
  async getSteps(date: Date): Promise<number> {
    if (!this.client || !this.isAuthenticated) {
      throw new Error('Not authenticated with Garmin');
    }

    try {
      const steps = await this.client.getSteps(date);
      return steps || 0;
    } catch (error) {
      console.error('Failed to fetch Garmin steps:', error);
      return 0;
    }
  }

  /**
   * Sync Garmin activities to database
   */
  async syncActivities(personId: string, limit = 20): Promise<number> {
    const activities = await this.getActivities(limit);
    let syncedCount = 0;

    for (const activity of activities) {
      // Check if activity already synced
      const existing = await prisma.fitnessTracking.findFirst({
        where: {
          personId,
          source: 'garmin',
          externalId: activity.activityId.toString(),
        },
      });

      if (existing) continue;

      // Map activity type
      const typeKey = activity.activityType?.typeKey?.toLowerCase() || 'other';
      const activityType = activityTypeMap[typeKey] || 'other';

      // Create new activity
      await prisma.fitnessTracking.create({
        data: {
          personId,
          activityType,
          durationMinutes: Math.round(activity.duration / 60),
          intensityLevel: estimateIntensity(activity.averageHR, activity.maxHR),
          activityDate: new Date(activity.startTimeLocal),
          workoutName: activity.activityName || `${activityType} workout`,
          calories: activity.calories,
          heartRateAvg: activity.averageHR,
          heartRateMax: activity.maxHR,
          notes: activity.description,
          source: 'garmin',
          externalId: activity.activityId.toString(),
          exercises: Prisma.JsonNull,
        },
      });

      syncedCount++;
    }

    // Update last sync time
    await prisma.deviceSync.update({
      where: {
        personId_provider: {
          personId,
          provider: 'garmin',
        },
      },
      data: {
        lastSyncAt: new Date(),
      },
    });

    return syncedCount;
  }

  /**
   * Sync sleep data for the last N days
   */
  async syncSleepData(personId: string, days = 7): Promise<number> {
    let syncedCount = 0;

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const sleepData = await this.getSleepData(date);
      if (!sleepData?.dailySleepDTO) continue;

      const { dailySleepDTO } = sleepData;

      // Check if already synced
      const existing = await prisma.fitnessTracking.findFirst({
        where: {
          personId,
          source: 'garmin',
          activityType: 'other', // We store sleep as 'other' type
          activityDate: {
            gte: new Date(date.setHours(0, 0, 0, 0)),
            lt: new Date(date.setHours(23, 59, 59, 999)),
          },
          notes: {
            contains: 'Sleep:',
          },
        },
      });

      if (existing) continue;

      // Store sleep as an activity with detailed notes
      const sleepMinutes = Math.round(dailySleepDTO.sleepTimeSeconds / 60);
      const deepSleep = Math.round(dailySleepDTO.deepSleepSeconds / 60);
      const remSleep = Math.round(dailySleepDTO.remSleepSeconds / 60);
      const lightSleep = Math.round(dailySleepDTO.lightSleepSeconds / 60);

      await prisma.fitnessTracking.create({
        data: {
          personId,
          activityType: 'other',
          durationMinutes: sleepMinutes,
          intensityLevel: 'low',
          activityDate: new Date(dailySleepDTO.sleepStartTimestampGMT),
          workoutName: 'Sleep',
          notes: `Sleep: ${Math.round(sleepMinutes / 60)}h ${sleepMinutes % 60}m | Deep: ${deepSleep}m | REM: ${remSleep}m | Light: ${lightSleep}m`,
          source: 'garmin',
          externalId: `sleep_${date.toISOString().split('T')[0]}`,
          exercises: Prisma.JsonNull,
        },
      });

      syncedCount++;
    }

    return syncedCount;
  }
}

export const garminService = new GarminService();
export default garminService;
