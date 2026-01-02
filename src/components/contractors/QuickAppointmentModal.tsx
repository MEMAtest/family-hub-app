'use client'

import { useState, useCallback, useMemo } from 'react';
import { X, User, Building, Phone, Mail, Clock, Calendar, MapPin, Wrench, Plus, Check } from 'lucide-react';
import { useContractorContext } from '@/contexts/familyHub/ContractorContext';
import {
  Contractor,
  ContractorSpecialty,
  CONTRACTOR_SPECIALTIES,
  DATE_PRESETS,
  TIME_PRESETS,
  DatePreset,
} from '@/types/contractor.types';

interface QuickAppointmentModalProps {
  onClose: () => void;
}

type Step = 'contractor' | 'datetime' | 'details';

export const QuickAppointmentModal = ({ onClose }: QuickAppointmentModalProps) => {
  const {
    contractors,
    createAppointment,
    getSpecialtyLabel,
  } = useContractorContext();

  const [step, setStep] = useState<Step>('contractor');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contractor selection
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newContractor, setNewContractor] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    specialty: 'handyman' as ContractorSpecialty,
  });

  // Date/time selection
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>('tomorrow');
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('10:00');

  // Details
  const [purpose, setPurpose] = useState('');
  const [location, setLocation] = useState('21 Tremaine Road');
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState<number | undefined>(undefined);

  const selectedDate = useMemo(() => {
    if (selectedDatePreset === 'custom') {
      return customDate;
    }
    const preset = DATE_PRESETS.find((p) => p.value === selectedDatePreset);
    return preset?.getDate() || new Date().toISOString().split('T')[0];
  }, [selectedDatePreset, customDate]);

  const selectedContractor = useMemo(() => {
    return contractors.find((c) => c.id === selectedContractorId);
  }, [contractors, selectedContractorId]);

  const canProceedToDateTime = useMemo(() => {
    if (isCreatingNew) {
      return newContractor.name.trim().length > 0;
    }
    return selectedContractorId !== null;
  }, [isCreatingNew, newContractor.name, selectedContractorId]);

  const canProceedToDetails = useMemo(() => {
    return selectedDate && selectedTime;
  }, [selectedDate, selectedTime]);

  const canSubmit = useMemo(() => {
    return purpose.trim().length > 0;
  }, [purpose]);

  const handleSelectContractor = useCallback((id: string) => {
    setSelectedContractorId(id);
    setIsCreatingNew(false);
  }, []);

  const handleCreateNew = useCallback(() => {
    setIsCreatingNew(true);
    setSelectedContractorId(null);
  }, []);

  const handleNext = useCallback(() => {
    if (step === 'contractor' && canProceedToDateTime) {
      setStep('datetime');
    } else if (step === 'datetime' && canProceedToDetails) {
      setStep('details');
    }
  }, [step, canProceedToDateTime, canProceedToDetails]);

  const handleBack = useCallback(() => {
    if (step === 'details') {
      setStep('datetime');
    } else if (step === 'datetime') {
      setStep('contractor');
    }
  }, [step]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      await createAppointment({
        contractorId: isCreatingNew ? undefined : selectedContractorId || undefined,
        newContractor: isCreatingNew ? {
          name: newContractor.name,
          company: newContractor.company || undefined,
          phone: newContractor.phone || undefined,
          email: newContractor.email || undefined,
          specialty: newContractor.specialty,
        } : undefined,
        date: selectedDate,
        time: selectedTime,
        duration,
        purpose,
        location: location || undefined,
        notes: notes || undefined,
        cost,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create appointment:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    createAppointment,
    isCreatingNew,
    selectedContractorId,
    newContractor,
    selectedDate,
    selectedTime,
    duration,
    purpose,
    location,
    notes,
    cost,
    onClose,
  ]);

  const formatDateDisplay = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Quick Appointment
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {step === 'contractor' && 'Select or add a contractor'}
              {step === 'datetime' && 'Choose when'}
              {step === 'details' && 'Add details'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-1 px-6 pt-4">
          {['contractor', 'datetime', 'details'].map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= ['contractor', 'datetime', 'details'].indexOf(step)
                  ? 'bg-blue-600'
                  : 'bg-gray-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Contractor Selection */}
          {step === 'contractor' && (
            <div className="space-y-4">
              {/* Existing contractors */}
              {contractors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300">Recent contractors</p>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {contractors.map((contractor) => (
                      <button
                        key={contractor.id}
                        onClick={() => handleSelectContractor(contractor.id)}
                        className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                          selectedContractorId === contractor.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700">
                          <Wrench className="h-5 w-5 text-gray-600 dark:text-slate-300" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-slate-100">
                            {contractor.name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            {contractor.company && `${contractor.company} • `}
                            {getSpecialtyLabel(contractor.specialty)}
                          </p>
                        </div>
                        {selectedContractorId === contractor.id && (
                          <Check className="h-5 w-5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              {contractors.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-slate-700" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-sm text-gray-500 dark:bg-slate-900 dark:text-slate-400">or</span>
                  </div>
                </div>
              )}

              {/* Create new contractor */}
              {!isCreatingNew ? (
                <button
                  onClick={handleCreateNew}
                  className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-4 text-left transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-slate-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Plus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">Add new contractor</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Create a new contact</p>
                  </div>
                </button>
              ) : (
                <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={newContractor.name}
                          onChange={(e) => setNewContractor((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="John Smith"
                          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        Company
                      </label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={newContractor.company}
                          onChange={(e) => setNewContractor((prev) => ({ ...prev, company: e.target.value }))}
                          placeholder="ABC Plumbing"
                          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        Phone
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          value={newContractor.phone}
                          onChange={(e) => setNewContractor((prev) => ({ ...prev, phone: e.target.value }))}
                          placeholder="07700 900000"
                          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                        Trade
                      </label>
                      <select
                        value={newContractor.specialty}
                        onChange={(e) => setNewContractor((prev) => ({ ...prev, specialty: e.target.value as ContractorSpecialty }))}
                        className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      >
                        {CONTRACTOR_SPECIALTIES.map((spec) => (
                          <option key={spec.value} value={spec.value}>
                            {spec.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Date/Time Selection */}
          {step === 'datetime' && (
            <div className="space-y-6">
              {/* Date presets */}
              <div>
                <p className="mb-3 text-sm font-medium text-gray-700 dark:text-slate-300">When?</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {DATE_PRESETS.filter((p) => p.value !== 'custom').map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setSelectedDatePreset(preset.value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        selectedDatePreset === preset.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom date */}
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                  <Calendar className="h-4 w-4" />
                  Or pick a date
                </label>
                <input
                  type="date"
                  value={selectedDatePreset === 'custom' ? customDate : selectedDate}
                  onChange={(e) => {
                    setCustomDate(e.target.value);
                    setSelectedDatePreset('custom');
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Time selection */}
              <div>
                <p className="mb-3 text-sm font-medium text-gray-700 dark:text-slate-300">What time?</p>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => setSelectedTime(preset.value)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                        selectedTime === preset.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-slate-800">
                <p className="text-sm text-gray-500 dark:text-slate-400">Appointment for</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {formatDateDisplay(selectedDate)} at{' '}
                  {TIME_PRESETS.find((t) => t.value === selectedTime)?.label || selectedTime}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Details */}
          {step === 'details' && (
            <div className="space-y-4">
              {/* Purpose */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  What for? *
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Fix leaking tap, Boiler service"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Location */}
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                  <MapPin className="h-4 w-4" />
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Address"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Duration & Cost */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
                    <Clock className="h-4 w-4" />
                    Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                    <option value={240}>4 hours</option>
                    <option value={480}>Full day</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Estimated cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                    <input
                      type="number"
                      value={cost || ''}
                      onChange={(e) => setCost(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="0"
                      className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-7 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional details..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Summary</p>
                <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                  {isCreatingNew ? newContractor.name : selectedContractor?.name || 'Contractor'} •{' '}
                  {formatDateDisplay(selectedDate)} at{' '}
                  {TIME_PRESETS.find((t) => t.value === selectedTime)?.label || selectedTime}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-slate-700">
          <button
            onClick={step === 'contractor' ? onClose : handleBack}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {step === 'contractor' ? 'Cancel' : 'Back'}
          </button>
          {step === 'details' ? (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-slate-600"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Add Appointment
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={
                (step === 'contractor' && !canProceedToDateTime) ||
                (step === 'datetime' && !canProceedToDetails)
              }
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-slate-600"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickAppointmentModal;
