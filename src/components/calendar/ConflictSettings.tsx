'use client'

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Toggle,
  Clock,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle,
  Info,
  Save,
  RotateCcw
} from 'lucide-react';
import { ConflictRule } from '@/services/conflictDetectionService';

interface ConflictSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  rules: ConflictRule[];
  onUpdateRule: (ruleId: string, updates: Partial<ConflictRule>) => void;
  onSave: () => void;
}

const ConflictSettings: React.FC<ConflictSettingsProps> = ({
  isOpen,
  onClose,
  rules,
  onUpdateRule,
  onSave
}) => {
  const [localRules, setLocalRules] = useState<ConflictRule[]>(rules);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalRules(rules);
    setHasChanges(false);
  }, [rules]);

  const handleRuleUpdate = (ruleId: string, updates: Partial<ConflictRule>) => {
    setLocalRules(prev => prev.map(rule =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    localRules.forEach(rule => {
      const originalRule = rules.find(r => r.id === rule.id);
      if (originalRule && JSON.stringify(rule) !== JSON.stringify(originalRule)) {
        onUpdateRule(rule.id, rule);
      }
    });
    onSave();
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalRules(rules);
    setHasChanges(false);
  };

  const getRuleIcon = (type: string) => {
    switch (type) {
      case 'time_overlap': return <Clock className="w-5 h-5" />;
      case 'double_booking': return <AlertTriangle className="w-5 h-5" />;
      case 'location_conflict': return <MapPin className="w-5 h-5" />;
      case 'travel_time': return <MapPin className="w-5 h-5" />;
      case 'family_conflict': return <Users className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'major': return 'text-orange-600 bg-orange-100';
      case 'minor': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6" />
                <div>
                  <h2 className="text-xl font-bold">Conflict Detection Settings</h2>
                  <p className="text-blue-100">
                    Configure how conflicts are detected and handled
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <Shield className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[70vh]">
            {/* General Settings */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detection Rules</h3>
              <p className="text-gray-600 mb-6">
                Enable or disable specific conflict detection rules and adjust their severity levels.
              </p>

              <div className="space-y-4">
                {localRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="p-2 bg-white rounded-lg border border-gray-200">
                          {getRuleIcon(rule.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{rule.name}</h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${getSeverityColor(rule.severity)}`}>
                                {rule.severity}
                              </span>
                              <button
                                onClick={() => handleRuleUpdate(rule.id, { enabled: !rule.enabled })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  rule.enabled ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    rule.enabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{rule.description}</p>

                          {/* Severity Selection */}
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-700">Severity:</span>
                            <div className="flex space-x-1">
                              {['minor', 'major', 'critical'].map((severity) => (
                                <button
                                  key={severity}
                                  onClick={() => handleRuleUpdate(rule.id, { severity: severity as any })}
                                  disabled={!rule.enabled}
                                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                                    rule.severity === severity
                                      ? getSeverityColor(severity)
                                      : rule.enabled
                                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                  }`}
                                >
                                  {severity}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Options</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <h4 className="font-medium text-gray-900">Default Travel Time</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Estimated time between different locations (minutes)
                  </p>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="15">15 minutes</option>
                    <option value="20" selected>20 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                  </select>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-gray-600" />
                    <h4 className="font-medium text-gray-900">Auto-Resolve Minor Conflicts</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Automatically suggest resolutions for minor conflicts
                  </p>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      defaultChecked
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable auto-suggestions</span>
                  </label>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Users className="w-4 h-4 text-gray-600" />
                    <h4 className="font-medium text-gray-900">Family Priority</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    How to handle conflicts with family-wide events
                  </p>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="family-first" selected>Family events take priority</option>
                    <option value="case-by-case">Case by case basis</option>
                    <option value="individual-first">Individual events take priority</option>
                  </select>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className="w-4 h-4 text-gray-600" />
                    <h4 className="font-medium text-gray-900">Notification Method</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    How to notify when conflicts are detected
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        defaultChecked
                      />
                      <span className="ml-2 text-sm text-gray-700">In-app notifications</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        defaultChecked
                      />
                      <span className="ml-2 text-sm text-gray-700">Email alerts</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Browser notifications</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Rules Summary</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">
                    {localRules.filter(r => r.enabled).length} of {localRules.length} rules enabled
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {localRules.filter(r => r.enabled && r.severity === 'critical').length}
                    </div>
                    <div className="text-gray-600">Critical Rules</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {localRules.filter(r => r.enabled && r.severity === 'major').length}
                    </div>
                    <div className="text-gray-600">Major Rules</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {localRules.filter(r => r.enabled && r.severity === 'minor').length}
                    </div>
                    <div className="text-gray-600">Minor Rules</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {hasChanges && (
                  <div className="flex items-center space-x-2 text-sm text-amber-600">
                    <Info className="w-4 h-4" />
                    <span>You have unsaved changes</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleReset}
                  disabled={!hasChanges}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm rounded-md transition-colors ${
                    hasChanges
                      ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm rounded-md transition-colors ${
                    hasChanges
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictSettings;