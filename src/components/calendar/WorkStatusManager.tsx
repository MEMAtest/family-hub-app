'use client'

import React, { useState } from 'react';
import {
  Building2,
  Home,
  Plane,
  MapPin,
  Clock,
  AlertTriangle,
  Car,
  Train,
  X,
  Check,
  Plus
} from 'lucide-react';
import { WorkStatus, CalendarEvent, Person } from '@/types/calendar.types';

interface WorkStatusManagerProps {
  people: Person[];
  events: CalendarEvent[];
  onAddWorkEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
}

const WorkStatusManager: React.FC<WorkStatusManagerProps> = ({
  people,
  events,
  onAddWorkEvent,
  onClose
}) => {
  const [selectedPerson, setSelectedPerson] = useState<string>('');
  const [workDate, setWorkDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [workTime, setWorkTime] = useState<string>('09:00');
  const [duration, setDuration] = useState<number>(480); // 8 hours default
  const [workStatus, setWorkStatus] = useState<WorkStatus>({
    type: 'office',
    affectsPickup: false,
    location: ''
  });

  const workTypeIcons = {
    office: <Building2 className="w-5 h-5" />,
    remote: <Home className="w-5 h-5" />,
    travel: <Plane className="w-5 h-5" />,
    client_site: <MapPin className="w-5 h-5" />
  };

  const workTypeLabels = {
    office: 'Office',
    remote: 'Working from Home',
    travel: 'Business Travel',
    client_site: 'Client Site'
  };

  const transportationIcons = {
    flight: <Plane className="w-4 h-4" />,
    train: <Train className="w-4 h-4" />,
    car: <Car className="w-4 h-4" />,
    other: <MapPin className="w-4 h-4" />
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPerson) {
      alert('Please select a person');
      return;
    }

    const title = workStatus.type === 'travel' && workStatus.travelDetails?.destination
      ? `Business Travel - ${workStatus.travelDetails.destination}`
      : workStatus.type === 'office'
      ? `Office Work${workStatus.location ? ` - ${workStatus.location}` : ''}`
      : workStatus.type === 'remote'
      ? 'Working from Home'
      : `Client Work${workStatus.location ? ` - ${workStatus.location}` : ''}`;

    const newEvent: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      person: selectedPerson,
      date: workDate,
      time: workTime,
      duration,
      location: workStatus.location || undefined,
      recurring: 'none',
      cost: 0,
      type: 'work',
      isRecurring: false,
      priority: 'medium',
      status: 'confirmed',
      workStatus,
      notes: workStatus.notes
    };

    onAddWorkEvent(newEvent);
    onClose();
  };

  const updateWorkStatus = (updates: Partial<WorkStatus>) => {
    setWorkStatus(prev => ({ ...prev, ...updates }));
  };

  const updateTravelDetails = (updates: Partial<WorkStatus['travelDetails']>) => {
    setWorkStatus(prev => ({
      ...prev,
      travelDetails: { ...prev.travelDetails, ...updates } as WorkStatus['travelDetails']
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Log Work Status</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Person Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Family Member
              </label>
              <select
                value={selectedPerson}
                onChange={(e) => setSelectedPerson(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a person</option>
                {people.map(person => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={workTime}
                  onChange={(e) => setWorkTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={duration / 60}
                  onChange={(e) => setDuration(parseFloat(e.target.value) * 60)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Work Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Work Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(workTypeLabels).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => updateWorkStatus({ type: type as WorkStatus['type'] })}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      workStatus.type === type
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {workTypeIcons[type as keyof typeof workTypeIcons]}
                      <span className="font-medium">{label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {workStatus.type === 'travel' ? 'Destination' :
                 workStatus.type === 'office' ? 'Office Location' :
                 workStatus.type === 'client_site' ? 'Client Site' : 'Location'} (Optional)
              </label>
              <input
                type="text"
                value={workStatus.location || ''}
                onChange={(e) => updateWorkStatus({ location: e.target.value })}
                placeholder={
                  workStatus.type === 'travel' ? 'e.g., London, UK' :
                  workStatus.type === 'office' ? 'e.g., Main Office, Branch Office' :
                  workStatus.type === 'client_site' ? 'e.g., Client Company Name' :
                  'Work location'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Travel Details (if travel type) */}
            {workStatus.type === 'travel' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-blue-900 flex items-center gap-2">
                  <Plane className="w-4 h-4" />
                  Travel Details
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Departure Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={workStatus.travelDetails?.departureTime || ''}
                      onChange={(e) => updateTravelDetails({ departureTime: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-700 mb-1">
                      Return Time (Optional)
                    </label>
                    <input
                      type="time"
                      value={workStatus.travelDetails?.returnTime || ''}
                      onChange={(e) => updateTravelDetails({ returnTime: e.target.value })}
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-2">
                    Transportation
                  </label>
                  <div className="flex space-x-2">
                    {Object.entries(transportationIcons).map(([transport, icon]) => (
                      <button
                        key={transport}
                        type="button"
                        onClick={() => updateTravelDetails({
                          transportation: transport as "car" | "train" | "flight" | "other"
                        })}
                        className={`p-2 rounded-lg border transition-colors ${
                          workStatus.travelDetails?.transportation === transport
                            ? 'border-blue-500 bg-blue-100 text-blue-700'
                            : 'border-blue-300 hover:bg-blue-50'
                        }`}
                        title={transport.charAt(0).toUpperCase() + transport.slice(1)}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Pickup Impact */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <h3 className="font-medium text-yellow-900">Pickup Time Impact</h3>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={workStatus.affectsPickup}
                    onChange={(e) => updateWorkStatus({ affectsPickup: e.target.checked })}
                    className="rounded border-yellow-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-yellow-800">
                    This work arrangement affects pickup times
                  </span>
                </label>

                {workStatus.affectsPickup && (
                  <div>
                    <label className="block text-sm font-medium text-yellow-700 mb-1">
                      Pickup Time Adjustment (minutes)
                    </label>
                    <input
                      type="number"
                      value={workStatus.pickupTimeAdjustment || 0}
                      onChange={(e) => updateWorkStatus({
                        pickupTimeAdjustment: parseInt(e.target.value) || 0
                      })}
                      placeholder="e.g., 30 for 30 minutes later, -15 for 15 minutes earlier"
                      className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                    <p className="text-xs text-yellow-600 mt-1">
                      Positive numbers = later pickup, negative numbers = earlier pickup
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={workStatus.notes || ''}
                onChange={(e) => updateWorkStatus({ notes: e.target.value })}
                placeholder="Any additional details about this work arrangement..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Work Event</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default WorkStatusManager;