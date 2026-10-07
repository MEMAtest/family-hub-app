'use client';
import { useEffect, useState } from 'react';
import { useFamilyStore } from '@/store/familyStore';
import type { SchoolMember } from '@/utils/schoolSources';

type Source = { institution: string | null; sender: string | null; subject: string | null; receivedAt: string;
  originalText: string | null; messageUrl: string | null; originalPortalUrl?: string | null;
  schoolAssignment?: { concernedMemberIds: string[]; attendeePersonId: string | null; attendeeStatus: 'confirmed' | 'needs_confirmation' } | null };
export default function EventSourceDetails({ familyId, eventId, people }: { familyId?: string | null; eventId: string; people?: SchoolMember[] }) {
  const storedPeople = useFamilyStore((state) => state.people);
  const storedFamilyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const members = people || (storedFamilyId === familyId ? storedPeople : []);
  const [source, setSource] = useState<Source | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  useEffect(() => {
    if (!familyId) return;
    const controller = new AbortController();
    setState('loading'); setSource(null);
    fetch(`/api/families/${familyId}/events/${eventId}/source`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error('Unavailable'); return response.json(); })
      .then((payload) => { setSource(payload.source); setState('ready'); })
      .catch(() => { if (!controller.signal.aborted) setState('failed'); });
    return () => controller.abort();
  }, [familyId, eventId]);
  if (!familyId || (state === 'ready' && !source)) return null;
  const concernNames = source?.schoolAssignment?.concernedMemberIds?.map((id) => members.find((member) => member.id === id)?.name).filter(Boolean) || [];
  const attendeeName = members.find((member) => member.id === source?.schoolAssignment?.attendeePersonId)?.name;
  return <section aria-label="Event source" className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500 dark:border-slate-700 dark:text-slate-400">
    {state === 'loading' ? <p>Loading source...</p> : state === 'failed' ? <p>Source unavailable. Reopen to retry.</p> : source && <>
      {source.institution && <p className="font-medium text-gray-700 dark:text-slate-200">{source.institution}</p>}
      {source.schoolAssignment?.concernedMemberIds?.length ? <p>Concerns: {concernNames.length ? concernNames.join(', ') : 'Enrolled child at this institution'}</p> : null}
      {source.schoolAssignment && <p>{source.schoolAssignment.attendeeStatus === 'needs_confirmation'
        ? 'Attendee to confirm' : `Attendee: ${attendeeName || 'Confirmed attendee'}`}</p>}
      <p>From: {source.sender || 'Sender not recorded'}</p>
      <p>Received: {new Date(source.receivedAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })}</p>
      {source.messageUrl && <a href={source.messageUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-teal-700 underline">Open original email</a>}
      {source.originalPortalUrl && <a href={source.originalPortalUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-sky-700 underline">Open original nursery post</a>}
      <details className="mt-1"><summary className="cursor-pointer">Original source</summary>
        <p className="font-medium">{source.subject}</p><p className="max-h-36 overflow-auto whitespace-pre-wrap">{source.originalText || 'Content not available'}</p>
      </details>
    </>}
  </section>;
}
