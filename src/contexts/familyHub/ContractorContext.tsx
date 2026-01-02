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
  createContractor: (data: Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'>) => Contractor;
  updateContractor: (id: string, updates: Partial<Contractor>) => void;
  deleteContractor: (id: string) => void;

  // Appointment operations
  createAppointment: (data: QuickAppointmentFormData) => Promise<ContractorAppointment>;
  updateAppointment: (id: string, updates: Partial<ContractorAppointment>) => void;
  deleteAppointment: (id: string) => void;
  markAppointmentComplete: (id: string) => void;

  // Utilities
  getContractorById: (id: string) => Contractor | undefined;
  getSpecialtyLabel: (specialty: string) => string;
}

const ContractorContext = createContext<ContractorContextValue | undefined>(undefined);

export const ContractorProvider = ({ children }: PropsWithChildren) => {
  const contractors = useFamilyStore((state) => state.contractors);
  const contractorAppointments = useFamilyStore((state) => state.contractorAppointments);
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

  const createContractor = useCallback((data: Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'>): Contractor => {
    const now = new Date().toISOString();
    const contractor: Contractor = {
      ...data,
      id: createId('contractor'),
      createdAt: now,
      updatedAt: now,
    };
    addContractorStore(contractor);
    return contractor;
  }, [addContractorStore]);

  const updateContractor = useCallback((id: string, updates: Partial<Contractor>) => {
    updateContractorStore(id, updates);
  }, [updateContractorStore]);

  const deleteContractor = useCallback((id: string) => {
    deleteContractorStore(id);
  }, [deleteContractorStore]);

  const createAppointment = useCallback(async (data: QuickAppointmentFormData): Promise<ContractorAppointment> => {
    const now = new Date().toISOString();

    // Create contractor if new
    let contractorId = data.contractorId;
    let contractor: Contractor | undefined;

    if (data.newContractor) {
      contractor = createContractor(data.newContractor);
      contractorId = contractor.id;
    } else {
      contractor = contractors.find((c) => c.id === contractorId);
    }

    if (!contractorId) {
      throw new Error('No contractor specified');
    }

    const appointmentId = createId('apt');

    // Create calendar event
    const eventTitle = contractor
      ? `${contractor.name}${contractor.company ? ` (${contractor.company})` : ''}`
      : 'Contractor Visit';

    const calendarEventData: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      title: `${eventTitle} - ${data.purpose}`,
      person: 'family', // Default to family-wide event
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

    // Create the calendar event
    const eventResult = await createEvent(calendarEventData);

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
      calendarEventId: eventResult === 'created' ? undefined : undefined, // TODO: Get event ID
      createdAt: now,
      updatedAt: now,
    };

    addAppointmentStore(appointment);

    return {
      ...appointment,
      contractor,
    };
  }, [contractors, createContractor, createEvent, addAppointmentStore]);

  const updateAppointment = useCallback((id: string, updates: Partial<ContractorAppointment>) => {
    updateAppointmentStore(id, updates);
  }, [updateAppointmentStore]);

  const deleteAppointment = useCallback((id: string) => {
    deleteAppointmentStore(id);
  }, [deleteAppointmentStore]);

  const markAppointmentComplete = useCallback((id: string) => {
    updateAppointmentStore(id, { status: 'completed' });
  }, [updateAppointmentStore]);

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
