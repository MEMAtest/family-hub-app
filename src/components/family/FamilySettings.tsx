'use client';

import React, { useState } from 'react';
import { FamilySettings as FamilySettingsType, FamilyMember, FamilyRole } from '@/types/family.types';
import {
  Settings,
  Globe,
  Bell,
  Shield,
  Palette,
  Clock,
  MapPin,
  Heart,
  Save,
  Eye,
  EyeOff,
  Users,
  Lock,
  Smartphone,
  Mail,
  Calendar,
  Home,
  User,
  Camera
} from 'lucide-react';

interface FamilySettingsProps {
  settings: FamilySettingsType;
  onUpdateSettings: (settings: Partial<FamilySettingsType>) => void;
  familyMembers: FamilyMember[];
}

export const FamilySettings: React.FC<FamilySettingsProps> = ({
  settings,
  onUpdateSettings,
  familyMembers
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState<FamilySettingsType>(settings);
  const [showSaveButton, setShowSaveButton] = useState(false);

  const handleInputChange = (path: string[], value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      let current: any = newData;

      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }

      current[path[path.length - 1]] = value;
      setShowSaveButton(true);
      return newData;
    });
  };

  const handleSave = () => {
    onUpdateSettings(formData);
    setShowSaveButton(false);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'location', label: 'Location & Time', icon: MapPin },
    { id: 'family', label: 'Family Profile', icon: Users }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Family Settings</h2>
              <p className="text-sm text-gray-600">
                Configure your family's preferences and privacy settings
              </p>
            </div>
          </div>
          {showSaveButton && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-blue-600 bg-blue-50'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-6">
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Family Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Family Name
                  </label>
                  <input
                    type="text"
                    value={formData.general?.familyName || ''}
                    onChange={(e) => handleInputChange(['general', 'familyName'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter family name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Home Address
                  </label>
                  <input
                    type="text"
                    value={formData.homeAddress || ''}
                    onChange={(e) => handleInputChange(['homeAddress'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter home address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Language
                  </label>
                  <select
                    value={formData.defaultLanguage || 'en'}
                    onChange={(e) => handleInputChange(['defaultLanguage'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={formData.currency || 'USD'}
                    onChange={(e) => handleInputChange(['currency'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="GBP">British Pound (GBP)</option>
                    <option value="CAD">Canadian Dollar (CAD)</option>
                    <option value="AUD">Australian Dollar (AUD)</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Settings</h3>
              <div className="space-y-4">
                {[
                  { key: 'budgetTracking', label: 'Budget Tracking', description: 'Enable family budget management and expense tracking' },
                  { key: 'goalSharing', label: 'Goal Sharing', description: 'Allow family members to share and collaborate on goals' },
                  { key: 'locationSharing', label: 'Location Sharing', description: 'Enable real-time location sharing between family members' },
                  { key: 'photoSharing', label: 'Photo Sharing', description: 'Allow automatic photo sharing in family albums' },
                  { key: 'calendarSync', label: 'Calendar Sync', description: 'Sync family events with external calendar apps' }
                ].map(({ key, label, description }) => (
                  <div key={key} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      id={key}
                      checked={formData.features?.[key as keyof typeof formData.features] ?? false}
                      onChange={(e) => handleInputChange(['features', key], e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                    />
                    <div className="flex-1">
                      <label htmlFor={key} className="block font-medium text-gray-900 cursor-pointer">
                        {label}
                      </label>
                      <p className="text-sm text-gray-600 mt-1">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy Controls</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Sharing
                  </label>
                  <select
                    value={formData.privacy?.dataSharing || 'family_only'}
                    onChange={(e) => handleInputChange(['privacy', 'dataSharing'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="family_only">Family Members Only</option>
                    <option value="trusted_contacts">Family + Trusted Contacts</option>
                    <option value="limited_public">Limited Public Access</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Visibility
                  </label>
                  <select
                    value={formData.privacy?.profileVisibility || 'family'}
                    onChange={(e) => handleInputChange(['privacy', 'profileVisibility'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="family">Family Only</option>
                    <option value="friends">Friends and Family</option>
                    <option value="public">Public</option>
                  </select>
                </div>

                <div className="space-y-4">
                  {[
                    { key: 'allowGuestAccess', label: 'Guest Access', description: 'Allow temporary guest access to family information' },
                    { key: 'requireApproval', label: 'Require Approval for Changes', description: 'New family member additions require admin approval' },
                    { key: 'enableAuditLog', label: 'Activity Audit Log', description: 'Keep detailed logs of family member activities' },
                    { key: 'twoFactorAuth', label: 'Two-Factor Authentication', description: 'Require 2FA for all family members' }
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                      <input
                        type="checkbox"
                        id={key}
                        checked={formData.privacy?.[key as keyof typeof formData.privacy] ?? false}
                        onChange={(e) => handleInputChange(['privacy', key], e.target.checked)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                      />
                      <div className="flex-1">
                        <label htmlFor={key} className="block font-medium text-gray-900 cursor-pointer">
                          {label}
                        </label>
                        <p className="text-sm text-gray-600 mt-1">{description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Retention</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Activity History (months)
                  </label>
                  <select
                    value={formData.privacy?.dataRetentionPeriod || 12}
                    onChange={(e) => handleInputChange(['privacy', 'dataRetentionPeriod'], parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={3}>3 months</option>
                    <option value={6}>6 months</option>
                    <option value={12}>12 months</option>
                    <option value={24}>24 months</option>
                    <option value={-1}>Keep Forever</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photo Storage (months)
                  </label>
                  <select
                    value={formData.privacy?.photoRetention || 24}
                    onChange={(e) => handleInputChange(['privacy', 'photoRetention'], parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={6}>6 months</option>
                    <option value={12}>12 months</option>
                    <option value={24}>24 months</option>
                    <option value={60}>5 years</option>
                    <option value={-1}>Keep Forever</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>

              <div className="space-y-6">
                {[
                  {
                    title: 'Email Notifications',
                    icon: Mail,
                    items: [
                      { key: 'dailyDigest', label: 'Daily Family Digest', description: 'Summary of family activities and upcoming events' },
                      { key: 'goalReminders', label: 'Goal Reminders', description: 'Notifications about family goal progress and deadlines' },
                      { key: 'budgetAlerts', label: 'Budget Alerts', description: 'Alerts when budget limits are exceeded' },
                      { key: 'memberUpdates', label: 'Member Updates', description: 'When family members update their profiles or information' }
                    ]
                  },
                  {
                    title: 'Push Notifications',
                    icon: Smartphone,
                    items: [
                      { key: 'eventReminders', label: 'Event Reminders', description: 'Upcoming calendar events and appointments' },
                      { key: 'emergencyAlerts', label: 'Emergency Alerts', description: 'Urgent family emergency notifications' },
                      { key: 'locationUpdates', label: 'Location Updates', description: 'When family members arrive at important locations' },
                      { key: 'achievementBadges', label: 'Achievement Notifications', description: 'When family members reach goals or milestones' }
                    ]
                  }
                ].map(({ title, icon: IconComponent, items }) => (
                  <div key={title} className="border border-gray-200 rounded-lg">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-5 h-5 text-gray-600" />
                        <h4 className="font-medium text-gray-900">{title}</h4>
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      {items.map(({ key, label, description }) => (
                        <div key={key} className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id={key}
                            checked={formData.notifications?.[key as keyof typeof formData.notifications] ?? false}
                            onChange={(e) => handleInputChange(['notifications', key], e.target.checked)}
                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                          />
                          <div className="flex-1">
                            <label htmlFor={key} className="block font-medium text-gray-900 cursor-pointer">
                              {label}
                            </label>
                            <p className="text-sm text-gray-600 mt-1">{description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quiet Hours</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.notifications?.quietHours?.start || '22:00'}
                    onChange={(e) => handleInputChange(['notifications', 'quietHours', 'start'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.notifications?.quietHours?.end || '07:00'}
                    onChange={(e) => handleInputChange(['notifications', 'quietHours', 'end'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notifications?.quietHours?.enabled ?? false}
                    onChange={(e) => handleInputChange(['notifications', 'quietHours', 'enabled'], e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Enable quiet hours (no notifications during this period)</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Display Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select
                    value={formData.preferences?.theme || 'light'}
                    onChange={(e) => handleInputChange(['preferences', 'theme'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto">Auto (System)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Format
                  </label>
                  <select
                    value={formData.preferences?.dateFormat || 'MM/DD/YYYY'}
                    onChange={(e) => handleInputChange(['preferences', 'dateFormat'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="MMM DD, YYYY">MMM DD, YYYY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Format
                  </label>
                  <select
                    value={formData.preferences?.timeFormat || '12h'}
                    onChange={(e) => handleInputChange(['preferences', 'timeFormat'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="12h">12-hour (AM/PM)</option>
                    <option value="24h">24-hour</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Week Start
                  </label>
                  <select
                    value={formData.preferences?.weekStart || 'sunday'}
                    onChange={(e) => handleInputChange(['preferences', 'weekStart'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="sunday">Sunday</option>
                    <option value="monday">Monday</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Layout</h3>
              <div className="space-y-4">
                {[
                  { key: 'showWeather', label: 'Weather Widget', description: 'Display current weather conditions on dashboard' },
                  { key: 'showUpcomingEvents', label: 'Upcoming Events', description: 'Show next 3 upcoming family events' },
                  { key: 'showBudgetSummary', label: 'Budget Summary', description: 'Display monthly budget overview' },
                  { key: 'showGoalProgress', label: 'Goal Progress', description: 'Show active family goal progress bars' },
                  { key: 'showRecentPhotos', label: 'Recent Photos', description: 'Display latest family photos in dashboard' }
                ].map(({ key, label, description }) => (
                  <div key={key} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      id={key}
                      checked={formData.preferences?.dashboardWidgets?.[key as keyof typeof formData.preferences.dashboardWidgets] ?? true}
                      onChange={(e) => handleInputChange(['preferences', 'dashboardWidgets', key], e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                    />
                    <div className="flex-1">
                      <label htmlFor={key} className="block font-medium text-gray-900 cursor-pointer">
                        {label}
                      </label>
                      <p className="text-sm text-gray-600 mt-1">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'location' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Timezone
                  </label>
                  <select
                    value={formData.timezone || 'America/New_York'}
                    onChange={(e) => handleInputChange(['timezone'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/Anchorage">Alaska Time (AKT)</option>
                    <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country/Region
                  </label>
                  <select
                    value={formData.region || 'US'}
                    onChange={(e) => handleInputChange(['region'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Sharing</h3>
              <div className="space-y-4">
                {[
                  { key: 'enableLocationSharing', label: 'Enable Location Sharing', description: 'Allow family members to share their real-time location' },
                  { key: 'autoArrivalNotifications', label: 'Arrival Notifications', description: 'Notify when family members arrive at home, work, or school' },
                  { key: 'locationHistory', label: 'Location History', description: 'Keep a history of family member locations for safety' },
                  { key: 'geofenceAlerts', label: 'Geofence Alerts', description: 'Send alerts when family members enter or leave specific areas' }
                ].map(({ key, label, description }) => (
                  <div key={key} className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
                    <input
                      type="checkbox"
                      id={key}
                      checked={formData.locationSettings?.[key as keyof typeof formData.locationSettings] ?? false}
                      onChange={(e) => handleInputChange(['locationSettings', key], e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                    />
                    <div className="flex-1">
                      <label htmlFor={key} className="block font-medium text-gray-900 cursor-pointer">
                        {label}
                      </label>
                      <p className="text-sm text-gray-600 mt-1">{description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Important Locations</h3>
              <div className="space-y-3">
                {formData.importantLocations?.map((location, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{location.name}</p>
                      <p className="text-sm text-gray-600">{location.address}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      location.type === 'home' ? 'bg-blue-100 text-blue-800' :
                      location.type === 'work' ? 'bg-green-100 text-green-800' :
                      location.type === 'school' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {location.type}
                    </span>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No important locations added yet</p>
                    <p className="text-sm">Add locations like home, work, or school for better notifications</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'family' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Family Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Family Motto
                  </label>
                  <input
                    type="text"
                    value={formData.familyMotto || ''}
                    onChange={(e) => handleInputChange(['familyMotto'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter family motto or values"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Family Photo URL
                  </label>
                  <input
                    type="url"
                    value={formData.familyPhoto || ''}
                    onChange={(e) => handleInputChange(['familyPhoto'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/family-photo.jpg"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Family Description
                </label>
                <textarea
                  value={formData.familyDescription || ''}
                  onChange={(e) => handleInputChange(['familyDescription'], e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your family, traditions, and what makes you unique..."
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Family Members Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {familyMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                    {member.profilePicture ? (
                      <img
                        src={member.profilePicture}
                        alt={`${member.firstName} ${member.lastName}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-sm text-gray-600 capitalize">{member.role.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Family Traditions</h3>
              <div className="space-y-3">
                {formData.familyTraditions?.map((tradition, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Heart className="w-5 h-5 text-red-500" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{tradition.name}</p>
                      <p className="text-sm text-gray-600">{tradition.description}</p>
                    </div>
                    <span className="text-sm text-gray-500">{tradition.frequency}</span>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No family traditions added yet</p>
                    <p className="text-sm">Add your family's special traditions and celebrations</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};