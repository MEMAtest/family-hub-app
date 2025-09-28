'use client'

import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  ArrowRight,
  Zap,
  Shield,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { CalendarEvent, Person } from '@/types/calendar.types';
import { DetectedConflict, ConflictResolution } from '@/services/conflictDetectionService';

interface ConflictDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: DetectedConflict[];
  onResolveConflict: (conflictId: string, resolution: ConflictResolution) => void;
  onIgnoreConflict: (conflictId: string) => void;
  people: Person[];
  suggestedTimes?: Date[];
  onRequestSuggestions?: (event: CalendarEvent) => void;
}

const ConflictDetectionModal: React.FC<ConflictDetectionModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  onResolveConflict,
  onIgnoreConflict,
  people,
  suggestedTimes = [],
  onRequestSuggestions
}) => {
  const [selectedConflict, setSelectedConflict] = useState<DetectedConflict | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (conflicts.length > 0 && !selectedConflict) {
      setSelectedConflict(conflicts[0]);
    }
  }, [conflicts, selectedConflict]);

  if (!isOpen || conflicts.length === 0) return null;

  const getSeverityColor = (severity: 'minor' | 'major' | 'critical') => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'major': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'minor': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: 'minor' | 'major' | 'critical') => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4" />;
      case 'major': return <AlertTriangle className="w-4 h-4" />;
      case 'minor': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getConflictTypeLabel = (type: string) => {
    const labels = {
      'time_overlap': 'Time Overlap',
      'double_booking': 'Double Booking',
      'location_conflict': 'Location Conflict',
      'travel_time': 'Travel Time Issue',
      'family_conflict': 'Family Event Conflict'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getPersonName = (personId: string) => {
    if (personId === 'all') return 'All Family';
    const person = people.find(p => p.id === personId);
    return person?.name || personId;
  };

  const getPersonColor = (personId: string) => {
    if (personId === 'all') return '#6b7280';
    const person = people.find(p => p.id === personId);
    return person?.color || '#6b7280';
  };

  const handleResolve = () => {
    if (selectedConflict && selectedResolution) {
      onResolveConflict(selectedConflict.id, selectedResolution);
      setSelectedResolution(null);

      // Move to next conflict or close
      const currentIndex = conflicts.findIndex(c => c.id === selectedConflict.id);
      if (currentIndex < conflicts.length - 1) {
        setSelectedConflict(conflicts[currentIndex + 1]);
      } else {
        onClose();
      }
    }
  };

  const handleIgnore = () => {
    if (selectedConflict) {
      onIgnoreConflict(selectedConflict.id);

      // Move to next conflict or close
      const currentIndex = conflicts.findIndex(c => c.id === selectedConflict.id);
      if (currentIndex < conflicts.length - 1) {
        setSelectedConflict(conflicts[currentIndex + 1]);
      } else {
        onClose();
      }
    }
  };

  const formatEventTime = (event: CalendarEvent) => {
    const date = new Date(`${event.date}T${event.time}`);
    const endTime = new Date(date.getTime() + (event.duration * 60000));
    return `${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const formatSuggestionTime = (date: Date) => {
    return date.toLocaleString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-bold">Conflict Detection</h2>
                  <p className="text-red-100">
                    {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} detected
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex h-[70vh]">
            {/* Conflict List */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-medium text-gray-900">Detected Conflicts</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {conflicts.map((conflict, index) => (
                  <div
                    key={conflict.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConflict?.id === conflict.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedConflict(conflict)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg border ${getSeverityColor(conflict.severity)}`}>
                        {getSeverityIcon(conflict.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 truncate">
                            {getConflictTypeLabel(conflict.conflictType)}
                          </h4>
                          <span className="text-xs text-gray-500">#{index + 1}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          {conflict.newEvent.title}
                        </p>
                        <div className="flex items-center mt-2 space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getSeverityColor(conflict.severity)}`}>
                            {conflict.severity}
                          </span>
                          <span className="text-xs text-gray-500">
                            Priority: {conflict.priority}/10
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conflict Details */}
            <div className="flex-1 overflow-y-auto">
              {selectedConflict && (
                <div className="p-6">
                  {/* Conflict Overview */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-3 rounded-lg border ${getSeverityColor(selectedConflict.severity)}`}>
                          {getSeverityIcon(selectedConflict.severity)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {getConflictTypeLabel(selectedConflict.conflictType)}
                          </h3>
                          <p className="text-gray-600">
                            Detected at {selectedConflict.detectedAt.toLocaleTimeString('en-GB')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(selectedConflict.severity)}`}>
                          {selectedConflict.severity.toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Priority: {selectedConflict.priority}/10
                        </div>
                      </div>
                    </div>

                    {/* Affected People */}
                    <div className="flex items-center space-x-2 mb-4">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Affected:</span>
                      <div className="flex space-x-2">
                        {selectedConflict.affectedPeople.map(personId => (
                          <div
                            key={personId}
                            className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-full text-xs"
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getPersonColor(personId) }}
                            />
                            <span>{getPersonName(personId)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Events in Conflict */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Events in Conflict</h4>
                    <div className="space-y-3">
                      {/* New Event */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-blue-900">New Event</span>
                          </div>
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: getPersonColor(selectedConflict.newEvent.person) }}
                          />
                        </div>
                        <h5 className="font-semibold text-gray-900">{selectedConflict.newEvent.title}</h5>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatEventTime(selectedConflict.newEvent)}</span>
                          </div>
                          {selectedConflict.newEvent.location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3" />
                              <span>{selectedConflict.newEvent.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Conflicting Events */}
                      {selectedConflict.conflictingEvents.map((event, index) => (
                        <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <AlertTriangle className="w-4 h-4 text-red-600" />
                              <span className="font-medium text-red-900">Conflicting Event</span>
                            </div>
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getPersonColor(event.person) }}
                            />
                          </div>
                          <h5 className="font-semibold text-gray-900">{event.title}</h5>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatEventTime(event)}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3" />
                                <span>{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resolution Options */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Resolution Options</h4>
                      {onRequestSuggestions && (
                        <button
                          onClick={() => {
                            onRequestSuggestions(selectedConflict.newEvent);
                            setShowSuggestions(true);
                          }}
                          className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Get Suggestions</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {selectedConflict.resolutions.map((resolution) => (
                        <div
                          key={resolution.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                            selectedResolution?.id === resolution.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200'
                          }`}
                          onClick={() => setSelectedResolution(resolution)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                {resolution.automated && (
                                  <Zap className="w-4 h-4 text-yellow-500" />
                                )}
                                <span className="font-medium text-gray-900">
                                  {resolution.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                resolution.impact === 'low' ? 'bg-green-100 text-green-800' :
                                resolution.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {resolution.impact} impact
                              </span>
                            </div>
                            {selectedResolution?.id === resolution.id && (
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{resolution.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Times */}
                  {showSuggestions && suggestedTimes.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">Suggested Alternative Times</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {suggestedTimes.slice(0, 6).map((time, index) => (
                          <div
                            key={index}
                            className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                            onClick={() => {
                              // Handle suggestion selection
                              console.log('Selected suggestion:', time);
                            }}
                          >
                            <div className="text-sm font-medium text-gray-900">
                              {formatSuggestionTime(time)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Available slot
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleIgnore}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      Ignore Conflict
                    </button>
                    <button
                      onClick={handleResolve}
                      disabled={!selectedResolution}
                      className={`flex items-center space-x-2 px-4 py-2 text-sm rounded-md transition-colors ${
                        selectedResolution
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <span>Apply Resolution</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictDetectionModal;