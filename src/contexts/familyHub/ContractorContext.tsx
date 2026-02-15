'use client'

import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { Contractor, ContractorAppointment, QuickAppointmentFormData, CONTRACTOR_SPECIALTIES } from '@/types/contractor.types';
import { CalendarEvent } from '@/types/calendar.types';
import { useFamilyStore } from '@/store/familyStore';
import { useCalendarContext } from './CalendarContext';
import { createId } from '@/utils/id';

interface ContractorContextValue {
  // Data
  contractors: Contractor[];
  appointments: ContractorAppointment[];
  upcomingAppointments: ContractorAppointment[];

  // Modal state
  isQuickAppointmentOpen: boolean;
  openQuickAppointment: () => void;
  closeQuickAppointment: () => void;

  // CRUD operations
  createContractor: (data: Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Contractor>;
  updateContractor: (id: string, updates: Partial<Contractor>) => Promise<void>;
  deleteContractor: (id: string) => Promise<void>;

  // Appointment operations
  createAppointment: (data: QuickAppointmentFormData) => Promise<ContractorAppointment>;
  updateAppointment: (id: string, updates: Partial<ContractorAppointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  markAppointmentComplete: (id: string) => Promise<void>;

  // Utilities
  getContractorById: (id: string) => Contractor | undefined;
  getSpecialtyLabel: (specialty: string) => string;
}

const ContractorContext = createContext<ContractorContextValue | undefined>(undefined);

export const ContractorProvider = ({ children }: PropsWithChildren) => {
  const contractors = useFamilyStore((state) => state.contractors);
  const contractorAppointments = useFamilyStore((state) => state.contractorAppointments);
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const familyMembers = useFamilyStore((state) => state.people);
  const selectedPerson = useFamilyStore((state) => state.selectedPerson);
  const addContractorStore = useFamilyStore((state) => state.addContractor);
  const updateContractorStore = useFamilyStore((state) => state.updateContractor);
  const deleteContractorStore = useFamilyStore((state) => state.deleteContractor);
  const addAppointmentStore = useFamilyStore((state) => state.addContractorAppointment);
  const updateAppointmentStore = useFamilyStore((state) => state.updateContractorAppointment);
  const deleteAppointmentStore = useFamilyStore((state) => state.deleteContractorAppointment);

  const { createEvent } = useCalendarContext();

  const [isQuickAppointmentOpen, setIsQuickAppointmentOpen] = useState(false);

  const openQuickAppointment = useCallback(() => {
    setIsQuickAppointmentOpen(true);
  }, []);

  const closeQuickAppointment = useCallback(() => {
    setIsQuickAppointmentOpen(false);
  }, []);

  const upcomingAppointments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return contractorAppointments
      .filter((apt) => apt.date >= today && apt.status === 'scheduled')
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      })
      .map((apt) => ({
        ...apt,
        contractor: contractors.find((c) => c.id === apt.contractorId),
      }));
  }, [contractorAppointments, contractors]);

  const createContractor = useCallback(async (data: Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contractor> => {
    const now = new Date().toISOString();
    const contractor: Contractor = {
      ...data,
      id: createId('contractor'),
      createdAt: now,
      updatedAt: now,
    };
    addContractorStore(contractor);
    if (familyId) {
      try {
        const response = await fetch(`/api/families/${familyId}/contractors`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contractor),
        });

        if (response.ok) {
          const saved = await response.json();
          updateContractorStore(contractor.id, saved);
          return { ...contractor, ...saved };
        }
      } catch (error) {
        console.warn('Failed to persist contractor (offline mode):', error);
      }
    }

    return contractor;
  }, [addContractorStore, familyId, updateContractorStore]);

  const updateContractor = useCallback(async (id: string, updates: Partial<Contractor>) => {
    updateContractorStore(id, updates);
    if (!familyId) return;

    try {
      const response = await fetch(`/api/families/${familyId}/contractors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const saved = await response.json();
        updateContractorStore(id, saved);
      }
    } catch (error) {
      console.warn('Failed to update contractor (offline mode):', error);
    }
  }, [familyId, updateContractorStore]);

  const deleteContractor = useCallback(async (id: string) => {
    deleteContractorStore(id);
    if (!familyId) return;

    try {
      await fetch(`/api/families/${familyId}/contractors/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Failed to delete contractor (offline mode):', error);
    }
  }, [deleteContractorStore, familyId]);

  const createAppointment = useCallback(async (data: QuickAppointmentFormData): Promise<ContractorAppointment> => {
    const now = new Date().toISOString();

    // Create contractor if new
    let contractorId = data.contractorId;
    let contractor: Contractor | undefined;

    if (data.newContractor) {
      contractor = await createContractor(data.newContractor);
      contractorId = contractor.id;
    } else {
      contractor = contractors.find((c) => c.id === contractorId);
    }

    if (!contractorId) {
      throw new Error('No contractor specified');
    }

    const appointmentId = createId('apt');

    // Create calendar event (best-effort). CalendarEvent.person must be a valid FamilyMember.id for DB persistence.
    const eventTitle = contractor
      ? `${contractor.name}${contractor.company ? ` (${contractor.company})` : ''}`
      : 'Contractor Visit';

    const fallbackPersonId =
      selectedPerson && selectedPerson !== 'all'
        ? selectedPerson
        : familyMembers.find((m) => m.ageGroup === 'Adult')?.id ?? familyMembers[0]?.id;

    let calendarEventId: string | undefined;
    if (fallbackPersonId) {
      const calendarEventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
        title: `${eventTitle} - ${data.purpose}`,
        person: fallbackPersonId,
        date: data.date,
        time: data.time,
        duration: data.duration || 60,
        location: data.location || '21 Tremaine Road',
        recurring: 'none',
        cost: data.cost || 0,
        type: 'appointment',
        notes: data.notes || `Contractor: ${contractor?.name || 'TBC'}\nPurpose: ${data.purpose}`,
        isRecurring: false,
        priority: 'high',
        status: 'confirmed',
      };

      const eventResult = await createEvent(calendarEventData);
      if (eventResult.status === 'created' && !eventResult.event.id.startsWith('event-')) {
        calendarEventId = eventResult.event.id;
      }
    } else {
      console.warn('No family members available; skipping calendar event for contractor appointment');
    }

    // Create the appointment
    const appointment: ContractorAppointment = {
      id: appointmentId,
      contractorId,
      date: data.date,
      time: data.time,
      duration: data.duration || 60,
      purpose: data.purpose,
      location: data.location,
      notes: data.notes,
      cost: data.cost,
      status: 'scheduled',
      calendarEventId,
      createdAt: now,
      updatedAt: now,
    };

    addAppointmentStore(appointment);

    if (familyId) {
      try {
        const response = await fetch(`/api/families/${familyId}/contractors/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: appointment.id,
            contractorId: appointment.contractorId,
            date: appointment.date,
            time: appointment.time,
            durationMinutes: appointment.duration,
            purpose: appointment.purpose,
            location: appointment.location ?? null,
            notes: appointment.notes ?? null,
            cost: appointment.cost ?? null,
            status: appointment.status,
            calendarEventId: appointment.calendarEventId ?? null,
          }),
        });

        if (response.ok) {
          const saved = await response.json();
          updateAppointmentStore(appointment.id, saved);
        }
      } catch (error) {
        console.warn('Failed to persist appointment (offline mode):', error);
      }
    }

    return {
      ...appointment,
      contractor,
    };
  }, [addAppointmentStore, contractors, createContractor, createEvent, familyId, familyMembers, selectedPerson, updateAppointmentStore]);

  const updateAppointment = useCallback(async (id: string, updates: Partial<ContractorAppointment>) => {
    updateAppointmentStore(id, updates);
    if (!familyId) return;

    const payload: Record<string, any> = { ...updates };
    if (payload.duration !== undefined) {
      payload.durationMinutes = payload.duration;
      delete payload.duration;
    }

    try {
      const response = await fetch(`/api/families/${familyId}/contractors/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const saved = await response.json();
        updateAppointmentStore(id, saved);
      }
    } catch (error) {
      console.warn('Failed to update appointment (offline mode):', error);
    }
  }, [familyId, updateAppointmentStore]);

  const deleteAppointment = useCallback(async (id: string) => {
    deleteAppointmentStore(id);
    if (!familyId) return;

    try {
      await fetch(`/api/families/${familyId}/contractors/appointments/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Failed to delete appointment (offline mode):', error);
    }
  }, [deleteAppointmentStore, familyId]);

  const markAppointmentComplete = useCallback(async (id: string) => {
    await updateAppointment(id, { status: 'completed' });
  }, [updateAppointment]);

  const getContractorById = useCallback((id: string) => {
    return contractors.find((c) => c.id === id);
  }, [contractors]);

  const getSpecialtyLabel = useCallback((specialty: string) => {
    const found = CONTRACTOR_SPECIALTIES.find((s) => s.value === specialty);
    return found?.label || specialty;
  }, []);

  const value = useMemo<ContractorContextValue>(() => ({
    contractors,
    appointments: contractorAppointments,
    upcomingAppointments,
    isQuickAppointmentOpen,
    openQuickAppointment,
    closeQuickAppointment,
    createContractor,
    updateContractor,
    deleteContractor,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    markAppointmentComplete,
    getContractorById,
    getSpecialtyLabel,
  }), [
    contractors,
    contractorAppointments,
    upcomingAppointments,
    isQuickAppointmentOpen,
    openQuickAppointment,
    closeQuickAppointment,
    createContractor,
    updateContractor,
    deleteContractor,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    markAppointmentComplete,
    getContractorById,
    getSpecialtyLabel,
  ]);

  return (
    <ContractorContext.Provider value={value}>
      {children}
    </ContractorContext.Provider>
  );
};

export const useContractorContext = () => {
  const context = useContext(ContractorContext);
  if (!context) {
    throw new Error('useContractorContext must be used within a ContractorProvider');
  }
  return context;
};
