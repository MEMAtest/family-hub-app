'use client';

import { Cloud, CloudOff, HardDrive, RefreshCw } from 'lucide-react';
import { useFamilyStore, type SharedSyncStatus } from '@/store/familyStore';

const STATUS: Record<SharedSyncStatus, { label: string; title: string; className: string; icon: typeof Cloud }> = {
  synced: {
    label: 'Shared with family',
    title: 'Saved to your household account and visible on every signed-in device.',
    className: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300',
    icon: Cloud,
  },
  syncing: {
    label: 'Saving…',
    title: 'Sharing your latest changes with the rest of the family.',
    className: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
    icon: RefreshCw,
  },
  offline: {
    label: 'Offline — will sync',
    title: 'Changes are kept on this device and will be shared when you are back online.',
    className: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200',
    icon: CloudOff,
  },
  unavailable: {
    label: 'Only on this device',
    title: 'Shared storage is not set up on the server yet (run `npm run db:push`). Changes stay on this device until then.',
    className: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200',
    icon: HardDrive,
  },
  local: {
    label: 'Only on this device',
    title: 'Not connected to your household account, so changes stay on this device.',
    className: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300',
    icon: HardDrive,
  },
};

export const SharedSyncBadge = () => {
  const status = useFamilyStore((state) => state.sharedSyncStatus);
  const { label, title, className, icon: Icon } = STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
      title={title}
      role="status"
      aria-label={`Sync status: ${label}`}
    >
      <Icon className={`h-3 w-3 ${status === 'syncing' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
};
