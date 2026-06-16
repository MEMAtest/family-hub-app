import prisma from '@/lib/prisma';
import {
  DEFAULT_FAMILY_CODE,
  DEFAULT_FAMILY_ID,
  DEFAULT_FAMILY_MEMBERS,
  DEFAULT_FAMILY_NAME,
} from '@/lib/defaultFamilyProfile';

const normaliseName = (value: string) => value.trim().toLowerCase();

export const ensureDefaultMembers = async (familyId: string) => {
  const existingMembers = await prisma.familyMember.findMany({
    where: { familyId },
    select: { id: true, name: true, userId: true },
  });
  const existingByName = new Map(existingMembers.map((member) => [normaliseName(member.name), member]));

  for (const profile of DEFAULT_FAMILY_MEMBERS) {
    const existing = existingByName.get(normaliseName(profile.name));

    if (existing?.userId) {
      continue;
    }

    const user = await prisma.user.upsert({
      where: { email: profile.localEmail },
      update: {
        displayName: profile.name,
        authProvider: 'local-profile',
      },
      create: {
        id: profile.userId,
        email: profile.localEmail,
        displayName: profile.name,
        authProvider: 'local-profile',
      },
    });

    if (existing) {
      await prisma.familyMember.update({
        where: { id: existing.id },
        data: {
          userId: user.id,
          color: profile.color,
          icon: profile.icon,
        },
      });
      continue;
    }

    await prisma.familyMember.create({
      data: {
        id: profile.id,
        familyId,
        userId: user.id,
        name: profile.name,
        role: profile.role,
        ageGroup: profile.ageGroup,
        color: profile.color,
        icon: profile.icon,
        fitnessGoals: { steps: 8000, workouts: 3 },
      },
    });
  }
};

export const getOrCreateOpenFamily = async (preferredFamilyId?: string | null) => {
  let family = preferredFamilyId
    ? await prisma.family.findUnique({
        where: { id: preferredFamilyId },
        include: { members: true },
      })
    : null;

  if (!family) {
    family = await prisma.family.findFirst({
      orderBy: { createdAt: 'asc' },
      include: { members: true },
    });
  }

  if (!family) {
    family = await prisma.family.create({
      data: {
        id: preferredFamilyId || DEFAULT_FAMILY_ID,
        familyName: DEFAULT_FAMILY_NAME,
        familyCode: DEFAULT_FAMILY_CODE,
      },
      include: { members: true },
    });
  }

  await ensureDefaultMembers(family.id);

  return prisma.family.findUnique({
    where: { id: family.id },
    include: {
      members: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
};
