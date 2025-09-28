import { CalendarEvent, Person } from '@/types/calendar.types';
import { ConflictData } from '@/services/emailService';

export interface ConflictRule {
  id: string;
  name: string;
  type: 'time_overlap' | 'double_booking' | 'location_conflict' | 'travel_time' | 'family_conflict';
  severity: 'minor' | 'major' | 'critical';
  enabled: boolean;
  description: string;
}

export interface ConflictResolution {
  id: string;
  type: 'reschedule' | 'relocate' | 'cancel' | 'modify_duration' | 'split_event';
  description: string;
  automated: boolean;
  impact: 'low' | 'medium' | 'high';
}

export interface DetectedConflict extends ConflictData {
  id: string;
  detectedAt: Date;
  resolved: boolean;
  resolutions: ConflictResolution[];
  affectedPeople: string[];
  priority: number; // 1-10, higher = more urgent
}

class ConflictDetectionService {
  private rules: ConflictRule[] = [
    {
      id: 'time-overlap',
      name: 'Time Overlap Detection',
      type: 'time_overlap',
      severity: 'major',
      enabled: true,
      description: 'Detects when events overlap in time for the same person'
    },
    {
      id: 'double-booking',
      name: 'Double Booking Prevention',
      type: 'double_booking',
      severity: 'critical',
      enabled: true,
      description: 'Prevents scheduling multiple events at exactly the same time'
    },
    {
      id: 'location-conflict',
      name: 'Location Conflict Detection',
      type: 'location_conflict',
      severity: 'major',
      enabled: true,
      description: 'Detects when events are scheduled at different locations too close together'
    },
    {
      id: 'travel-time',
      name: 'Travel Time Consideration',
      type: 'travel_time',
      severity: 'minor',
      enabled: true,
      description: 'Considers travel time between different locations'
    },
    {
      id: 'family-conflict',
      name: 'Family Event Conflicts',
      type: 'family_conflict',
      severity: 'major',
      enabled: true,
      description: 'Detects conflicts with family-wide events'
    }
  ];

  /**
   * Detect all conflicts for a new or updated event
   */
  detectConflicts(
    newEvent: CalendarEvent,
    existingEvents: CalendarEvent[],
    people: Person[]
  ): DetectedConflict[] {
    const conflicts: DetectedConflict[] = [];

    // Filter events for the same person or family-wide events
    const relevantEvents = existingEvents.filter(event =>
      event.id !== newEvent.id && (
        event.person === newEvent.person ||
        event.person === 'all' ||
        newEvent.person === 'all'
      )
    );

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      const detectedConflicts = this.applyRule(rule, newEvent, relevantEvents, people);
      conflicts.push(...detectedConflicts);
    }

    // Sort by priority (highest first)
    return conflicts.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Apply a specific conflict detection rule
   */
  private applyRule(
    rule: ConflictRule,
    newEvent: CalendarEvent,
    existingEvents: CalendarEvent[],
    people: Person[]
  ): DetectedConflict[] {
    switch (rule.type) {
      case 'time_overlap':
        return this.detectTimeOverlaps(rule, newEvent, existingEvents, people);
      case 'double_booking':
        return this.detectDoubleBookings(rule, newEvent, existingEvents, people);
      case 'location_conflict':
        return this.detectLocationConflicts(rule, newEvent, existingEvents, people);
      case 'travel_time':
        return this.detectTravelTimeConflicts(rule, newEvent, existingEvents, people);
      case 'family_conflict':
        return this.detectFamilyConflicts(rule, newEvent, existingEvents, people);
      default:
        return [];
    }
  }

  /**
   * Detect time overlap conflicts
   */
  private detectTimeOverlaps(
    rule: ConflictRule,
    newEvent: CalendarEvent,
    existingEvents: CalendarEvent[],
    people: Person[]
  ): DetectedConflict[] {
    const conflicts: DetectedConflict[] = [];
    const newEventStart = new Date(`${newEvent.date}T${newEvent.time}`);
    const newEventEnd = new Date(newEventStart.getTime() + (newEvent.duration * 60000));

    for (const existingEvent of existingEvents) {
      // Skip if different people (unless one is 'all')
      if (existingEvent.person !== newEvent.person &&
          existingEvent.person !== 'all' &&
          newEvent.person !== 'all') {
        continue;
      }

      const existingStart = new Date(`${existingEvent.date}T${existingEvent.time}`);
      const existingEnd = new Date(existingStart.getTime() + (existingEvent.duration * 60000));

      // Check for overlap
      if (this.eventsOverlap(newEventStart, newEventEnd, existingStart, existingEnd)) {
        const overlapMinutes = this.calculateOverlapMinutes(
          newEventStart, newEventEnd, existingStart, existingEnd
        );

        const severity = this.calculateOverlapSeverity(overlapMinutes, newEvent.duration);

        conflicts.push({
          id: `time-overlap-${newEvent.id}-${existingEvent.id}`,
          newEvent,
          conflictingEvents: [existingEvent],
          conflictType: 'time_overlap',
          severity,
          detectedAt: new Date(),
          resolved: false,
          resolutions: this.generateTimeOverlapResolutions(newEvent, existingEvent, overlapMinutes),
          affectedPeople: this.getAffectedPeople([newEvent, existingEvent]),
          priority: this.calculatePriority(severity, 'time_overlap', overlapMinutes)
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect exact double booking conflicts
   */
  private detectDoubleBookings(
    rule: ConflictRule,
    newEvent: CalendarEvent,
    existingEvents: CalendarEvent[],
    people: Person[]
  ): DetectedConflict[] {
    const conflicts: DetectedConflict[] = [];

    for (const existingEvent of existingEvents) {
      // Check for exact same time and person
      if (existingEvent.date === newEvent.date &&
          existingEvent.time === newEvent.time &&
          (existingEvent.person === newEvent.person ||
           existingEvent.person === 'all' ||
           newEvent.person === 'all')) {

        conflicts.push({
          id: `double-booking-${newEvent.id}-${existingEvent.id}`,
          newEvent,
          conflictingEvents: [existingEvent],
          conflictType: 'double_booking',
          severity: 'critical',
          detectedAt: new Date(),
          resolved: false,
          resolutions: this.generateDoubleBookingResolutions(newEvent, existingEvent),
          affectedPeople: this.getAffectedPeople([newEvent, existingEvent]),
          priority: 10 // Highest priority
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect location-based conflicts
   */
  private detectLocationConflicts(
    rule: ConflictRule,
    newEvent: CalendarEvent,
    existingEvents: CalendarEvent[],
    people: Person[]
  ): DetectedConflict[] {
    const conflicts: DetectedConflict[] = [];

    if (!newEvent.location) return conflicts;

    for (const existingEvent of existingEvents) {
      if (!existingEvent.location || existingEvent.location === newEvent.location) continue;

      // Check if events are close in time but at different locations
      const timeDiffMinutes = this.getTimeDifferenceBetweenEvents(newEvent, existingEvent);

      if (timeDiffMinutes <= 60 && timeDiffMinutes >= -60) { // Within 1 hour
        const estimatedTravelTime = this.estimateTravelTime(existingEvent.location, newEvent.location);

        if (timeDiffMinutes < estimatedTravelTime) {
          conflicts.push({
            id: `location-conflict-${newEvent.id}-${existingEvent.id}`,
            newEvent,
            conflictingEvents: [existingEvent],
            conflictType: 'location_conflict',
            severity: timeDiffMinutes < estimatedTravelTime / 2 ? 'major' : 'minor',
            detectedAt: new Date(),
            resolved: false,
            resolutions: this.generateLocationConflictResolutions(newEvent, existingEvent, estimatedTravelTime),
            affectedPeople: this.getAffectedPeople([newEvent, existingEvent]),
            priority: this.calculatePriority('major', 'location_conflict', timeDiffMinutes)
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect travel time conflicts
   */
  private detectTravelTimeConflicts(
    rule: ConflictRule,
    newEvent: CalendarEvent,
    existingEvents: CalendarEvent[],
    people: Person[]
  ): DetectedConflict[] {
    return this.detectLocationConflicts(rule, newEvent, existingEvents, people)
      .filter(conflict => conflict.conflictType === 'location_conflict');
  }

  /**
   * Detect family-wide event conflicts
   */
  private detectFamilyConflicts(
    rule: ConflictRule,
    newEvent: CalendarEvent,
    existingEvents: CalendarEvent[],
    people: Person[]
  ): DetectedConflict[] {
    const conflicts: DetectedConflict[] = [];

    // If new event is for 'all', check for any individual conflicts
    if (newEvent.person === 'all') {
      const individualEvents = existingEvents.filter(event =>
        event.person !== 'all' &&
        this.eventsOverlapByDateTime(newEvent, event)
      );

      if (individualEvents.length > 0) {
        conflicts.push({
          id: `family-conflict-${newEvent.id}`,
          newEvent,
          conflictingEvents: individualEvents,
          conflictType: 'double_booking',
          severity: 'major',
          detectedAt: new Date(),
          resolved: false,
          resolutions: this.generateFamilyConflictResolutions(newEvent, individualEvents),
          affectedPeople: this.getAffectedPeople([newEvent, ...individualEvents]),
          priority: 8
        });
      }
    }

    return conflicts;
  }

  /**
   * Check if two events overlap in time
   */
  private eventsOverlap(
    start1: Date, end1: Date,
    start2: Date, end2: Date
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  /**
   * Check if two events overlap by their date and time
   */
  private eventsOverlapByDateTime(event1: CalendarEvent, event2: CalendarEvent): boolean {
    const start1 = new Date(`${event1.date}T${event1.time}`);
    const end1 = new Date(start1.getTime() + (event1.duration * 60000));
    const start2 = new Date(`${event2.date}T${event2.time}`);
    const end2 = new Date(start2.getTime() + (event2.duration * 60000));

    return this.eventsOverlap(start1, end1, start2, end2);
  }

  /**
   * Calculate overlap in minutes
   */
  private calculateOverlapMinutes(
    start1: Date, end1: Date,
    start2: Date, end2: Date
  ): number {
    const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
    const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));

    return Math.max(0, (overlapEnd.getTime() - overlapStart.getTime()) / 60000);
  }

  /**
   * Calculate severity based on overlap
   */
  private calculateOverlapSeverity(overlapMinutes: number, eventDuration: number): 'minor' | 'major' | 'critical' {
    const overlapPercentage = (overlapMinutes / eventDuration) * 100;

    if (overlapPercentage >= 90) return 'critical';
    if (overlapPercentage >= 50) return 'major';
    return 'minor';
  }

  /**
   * Get time difference between events in minutes
   */
  private getTimeDifferenceBetweenEvents(event1: CalendarEvent, event2: CalendarEvent): number {
    const time1 = new Date(`${event1.date}T${event1.time}`);
    const time2 = new Date(`${event2.date}T${event2.time}`);

    return (time1.getTime() - time2.getTime()) / 60000;
  }

  /**
   * Estimate travel time between two locations (simplified)
   */
  private estimateTravelTime(location1: string, location2: string): number {
    // Simplified estimation - in real app, would use Google Maps API
    const keywords = ['home', 'work', 'school', 'gym', 'shop'];

    const loc1Type = keywords.find(k => location1.toLowerCase().includes(k));
    const loc2Type = keywords.find(k => location2.toLowerCase().includes(k));

    // Same type of location = likely nearby
    if (loc1Type === loc2Type) return 10;

    // Different boroughs/areas
    if (location1.toLowerCase().includes('london') && location2.toLowerCase().includes('london')) {
      return 30; // Cross-London travel
    }

    // Default estimate
    return 20;
  }

  /**
   * Get affected people from events
   */
  private getAffectedPeople(events: CalendarEvent[]): string[] {
    const people = new Set<string>();
    events.forEach(event => {
      if (event.person === 'all') {
        people.add('all');
      } else {
        people.add(event.person);
      }
    });
    return Array.from(people);
  }

  /**
   * Calculate priority score
   */
  private calculatePriority(
    severity: 'minor' | 'major' | 'critical',
    conflictType: string,
    impactValue: number
  ): number {
    const severityScore = { minor: 3, major: 6, critical: 9 }[severity];
    const typeScore = {
      'double_booking': 3,
      'time_overlap': 2,
      'family_conflict': 2,
      'location_conflict': 1,
      'travel_time': 1
    }[conflictType] || 1;

    return Math.min(10, severityScore + typeScore);
  }

  /**
   * Generate resolution options for time overlaps
   */
  private generateTimeOverlapResolutions(
    newEvent: CalendarEvent,
    conflictingEvent: CalendarEvent,
    overlapMinutes: number
  ): ConflictResolution[] {
    const resolutions: ConflictResolution[] = [];

    // Reschedule new event
    resolutions.push({
      id: 'reschedule-new',
      type: 'reschedule',
      description: `Reschedule "${newEvent.title}" to avoid overlap`,
      automated: false,
      impact: 'medium'
    });

    // Reschedule existing event
    resolutions.push({
      id: 'reschedule-existing',
      type: 'reschedule',
      description: `Reschedule "${conflictingEvent.title}" to accommodate new event`,
      automated: false,
      impact: 'high'
    });

    // Modify duration if overlap is small
    if (overlapMinutes < 30) {
      resolutions.push({
        id: 'modify-duration',
        type: 'modify_duration',
        description: `Reduce duration of one or both events to eliminate overlap`,
        automated: true,
        impact: 'low'
      });
    }

    return resolutions;
  }

  /**
   * Generate resolution options for double bookings
   */
  private generateDoubleBookingResolutions(
    newEvent: CalendarEvent,
    conflictingEvent: CalendarEvent
  ): ConflictResolution[] {
    return [
      {
        id: 'cancel-new',
        type: 'cancel',
        description: `Cancel "${newEvent.title}" (keep existing event)`,
        automated: false,
        impact: 'low'
      },
      {
        id: 'cancel-existing',
        type: 'cancel',
        description: `Cancel "${conflictingEvent.title}" (keep new event)`,
        automated: false,
        impact: 'high'
      },
      {
        id: 'reschedule-new',
        type: 'reschedule',
        description: `Reschedule "${newEvent.title}" to next available slot`,
        automated: true,
        impact: 'medium'
      }
    ];
  }

  /**
   * Generate resolution options for location conflicts
   */
  private generateLocationConflictResolutions(
    newEvent: CalendarEvent,
    conflictingEvent: CalendarEvent,
    travelTime: number
  ): ConflictResolution[] {
    return [
      {
        id: 'reschedule-buffer',
        type: 'reschedule',
        description: `Add ${travelTime} minute buffer between events`,
        automated: true,
        impact: 'low'
      },
      {
        id: 'relocate-new',
        type: 'relocate',
        description: `Change location of "${newEvent.title}" to match existing event`,
        automated: false,
        impact: 'medium'
      },
      {
        id: 'virtual-option',
        type: 'modify_duration',
        description: `Make one event virtual to eliminate travel time`,
        automated: false,
        impact: 'low'
      }
    ];
  }

  /**
   * Generate resolution options for family conflicts
   */
  private generateFamilyConflictResolutions(
    familyEvent: CalendarEvent,
    conflictingEvents: CalendarEvent[]
  ): ConflictResolution[] {
    return [
      {
        id: 'reschedule-individual',
        type: 'reschedule',
        description: `Reschedule individual events to accommodate family event`,
        automated: false,
        impact: 'high'
      },
      {
        id: 'reschedule-family',
        type: 'reschedule',
        description: `Reschedule family event to avoid individual conflicts`,
        automated: false,
        impact: 'medium'
      },
      {
        id: 'split-family',
        type: 'split_event',
        description: `Split family event to work around individual schedules`,
        automated: false,
        impact: 'high'
      }
    ];
  }

  /**
   * Get conflict detection rules
   */
  getRules(): ConflictRule[] {
    return [...this.rules];
  }

  /**
   * Update a conflict detection rule
   */
  updateRule(ruleId: string, updates: Partial<ConflictRule>): void {
    const ruleIndex = this.rules.findIndex(rule => rule.id === ruleId);
    if (ruleIndex !== -1) {
      this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    }
  }

  /**
   * Suggest optimal reschedule times
   */
  suggestRescheduleOptions(
    event: CalendarEvent,
    existingEvents: CalendarEvent[],
    preferences: {
      preferredTimeSlots?: string[];
      maxDaysOut?: number;
      avoidWeekends?: boolean;
    } = {}
  ): Date[] {
    const suggestions: Date[] = [];
    const eventDuration = event.duration;
    const maxDays = preferences.maxDaysOut || 7;
    const currentDate = new Date(event.date);

    for (let day = 1; day <= maxDays; day++) {
      const testDate = new Date(currentDate);
      testDate.setDate(currentDate.getDate() + day);

      // Skip weekends if preferred
      if (preferences.avoidWeekends && (testDate.getDay() === 0 || testDate.getDay() === 6)) {
        continue;
      }

      const timeSlots = preferences.preferredTimeSlots || [
        '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '18:00', '19:00'
      ];

      for (const timeSlot of timeSlots) {
        const testDateTime = new Date(`${testDate.toISOString().split('T')[0]}T${timeSlot}`);
        const testEndTime = new Date(testDateTime.getTime() + (eventDuration * 60000));

        // Check if this slot conflicts with existing events
        const hasConflict = existingEvents.some(existingEvent => {
          const existingStart = new Date(`${existingEvent.date}T${existingEvent.time}`);
          const existingEnd = new Date(existingStart.getTime() + (existingEvent.duration * 60000));

          return this.eventsOverlap(testDateTime, testEndTime, existingStart, existingEnd);
        });

        if (!hasConflict) {
          suggestions.push(testDateTime);
          if (suggestions.length >= 5) break; // Limit suggestions
        }
      }

      if (suggestions.length >= 5) break;
    }

    return suggestions;
  }
}

// Export singleton instance
export const conflictDetectionService = new ConflictDetectionService();
export default conflictDetectionService;