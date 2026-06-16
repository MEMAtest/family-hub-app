export const DEFAULT_FAMILY_ID = 'family-omosanya-home';
export const DEFAULT_FAMILY_NAME = 'Omosanya Home';
export const DEFAULT_FAMILY_CODE = 'OMOSANYA';

export const DEFAULT_FAMILY_MEMBERS = [
  {
    id: 'member-ade',
    userId: 'user-ade-local',
    localEmail: 'ade@family-hub.local',
    name: 'Ade',
    role: 'Parent',
    ageGroup: 'Adult',
    color: '#147c72',
    icon: 'AO',
  },
  {
    id: 'member-angela',
    userId: 'user-angela-local',
    localEmail: 'angela@family-hub.local',
    name: 'Angela',
    role: 'Parent',
    ageGroup: 'Adult',
    color: '#d8527d',
    icon: 'AN',
  },
] as const;

export const buildDefaultLocalMembers = (
  familyId: string = DEFAULT_FAMILY_ID,
  timestamp: string = new Date().toISOString()
) =>
  DEFAULT_FAMILY_MEMBERS.map(({ localEmail: _localEmail, userId: _userId, ...member }) => ({
    ...member,
    familyId,
    fitnessGoals: { steps: 8000, workouts: 3 },
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
