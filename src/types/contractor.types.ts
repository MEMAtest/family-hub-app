// Contractor Management Types

export interface Contractor {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;  // Company address
  specialty: ContractorSpecialty;
  notes?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
  updatedAt: string;
}

export type ContractorSpecialty =
  | 'plumber'
  | 'electrician'
  | 'gas_engineer'
  | 'heating_engineer'
  | 'roofer'
  | 'builder'
  | 'decorator'
  | 'gardener'
  | 'cleaner'
  | 'locksmith'
  | 'handyman'
  | 'pest_control'
  | 'window_cleaner'
  | 'carpet_cleaner'
  | 'appliance_repair'
  | 'other';

export const CONTRACTOR_SPECIALTIES: { value: ContractorSpecialty; label: string }[] = [
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'gas_engineer', label: 'Gas Engineer' },
  { value: 'heating_engineer', label: 'Heating Engineer' },
  { value: 'roofer', label: 'Roofer' },
  { value: 'builder', label: 'Builder' },
  { value: 'decorator', label: 'Decorator/Painter' },
  { value: 'gardener', label: 'Gardener' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'locksmith', label: 'Locksmith' },
  { value: 'handyman', label: 'Handyman' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'window_cleaner', label: 'Window Cleaner' },
  { value: 'carpet_cleaner', label: 'Carpet Cleaner' },
  { value: 'appliance_repair', label: 'Appliance Repair' },
  { value: 'other', label: 'Other' },
];

export interface ContractorAppointment {
  id: string;
  contractorId: string;
  contractor?: Contractor; // Populated when fetched
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutes
  purpose: string;
  location?: string;
  notes?: string;
  cost?: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  calendarEventId?: string; // Link to CalendarEvent
  createdAt: string;
  updatedAt: string;
}

export interface QuickAppointmentFormData {
  contractorId?: string;
  newContractor?: Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'>;
  date: string;
  time: string;
  duration: number;
  purpose: string;
  location?: string;
  notes?: string;
  cost?: number;
}

// Date preset helpers
export type DatePreset = 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'custom';

export interface DatePresetOption {
  value: DatePreset;
  label: string;
  getDate: () => string;
}

export const DATE_PRESETS: DatePresetOption[] = [
  {
    value: 'today',
    label: 'Today',
    getDate: () => new Date().toISOString().split('T')[0],
  },
  {
    value: 'tomorrow',
    label: 'Tomorrow',
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    },
  },
  {
    value: 'this_week',
    label: 'This Week',
    getDate: () => {
      const d = new Date();
      // Get next weekday
      const day = d.getDay();
      const daysUntilWeekday = day === 0 ? 1 : day === 6 ? 2 : 0;
      d.setDate(d.getDate() + daysUntilWeekday);
      return d.toISOString().split('T')[0];
    },
  },
  {
    value: 'next_week',
    label: 'Next Week',
    getDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + (8 - d.getDay())); // Next Monday
      return d.toISOString().split('T')[0];
    },
  },
  {
    value: 'custom',
    label: 'Pick Date',
    getDate: () => new Date().toISOString().split('T')[0],
  },
];

// Time preset helpers
export const TIME_PRESETS = [
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '13:00', label: '1:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
];
