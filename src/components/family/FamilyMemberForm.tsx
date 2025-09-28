'use client';

import React, { useState, useEffect } from 'react';
import { FamilyMember, FamilyRole, MedicalInfo, ContactInfo, PersonalPreferences } from '@/types/family.types';
import { User, Mail, Phone, Calendar, Users, Shield, Heart, UserPlus, X, Save, Plus, Trash2 } from 'lucide-react';

interface FamilyMemberFormProps {
  member?: FamilyMember;
  onSave: (member: Partial<FamilyMember>) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export const FamilyMemberForm: React.FC<FamilyMemberFormProps> = ({
  member,
  onSave,
  onCancel,
  isEditing = false
}) => {
  const [formData, setFormData] = useState<Partial<FamilyMember>>({
    id: member?.id || '',
    firstName: member?.firstName || '',
    lastName: member?.lastName || '',
    email: member?.email || '',
    phoneNumber: member?.phoneNumber || '',
    dateOfBirth: member?.dateOfBirth || '',
    profilePicture: member?.profilePicture || '',
    role: member?.role || 'child',
    isActive: member?.isActive ?? true,
    joinDate: member?.joinDate || new Date().toISOString().split('T')[0],
    emergencyContacts: member?.emergencyContacts || [],
    medicalInfo: member?.medicalInfo || {
      allergies: [],
      medications: [],
      medicalConditions: [],
      bloodType: '',
      doctorContact: {
        name: '',
        phone: '',
        email: '',
        address: ''
      },
      insuranceInfo: {
        provider: '',
        policyNumber: '',
        groupNumber: ''
      }
    },
    preferences: member?.preferences || {
      notifications: {
        email: true,
        sms: false,
        push: true,
        reminders: true
      },
      privacy: {
        profileVisibility: 'family',
        locationSharing: false,
        activitySharing: true
      },
      communication: {
        preferredLanguage: 'en',
        timezone: 'America/New_York',
        communicationStyle: 'casual'
      }
    }
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleNestedChange = (path: string[], value: any) => {
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
      return newData;
    });
  };

  const addEmergencyContact = () => {
    const newContact = {
      id: Date.now().toString(),
      name: '',
      relationship: '',
      phone: '',
      email: '',
      isPrimary: false
    };

    setFormData(prev => ({
      ...prev,
      emergencyContacts: [...(prev.emergencyContacts || []), newContact]
    }));
  };

  const removeEmergencyContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts?.filter((_, i) => i !== index) || []
    }));
  };

  const addMedicalItem = (type: 'allergies' | 'medications' | 'medicalConditions', value: string) => {
    if (!value.trim()) return;

    setFormData(prev => ({
      ...prev,
      medicalInfo: {
        ...prev.medicalInfo!,
        [type]: [...(prev.medicalInfo?.[type] || []), value.trim()]
      }
    }));
  };

  const removeMedicalItem = (type: 'allergies' | 'medications' | 'medicalConditions', index: number) => {
    setFormData(prev => ({
      ...prev,
      medicalInfo: {
        ...prev.medicalInfo!,
        [type]: prev.medicalInfo?.[type]?.filter((_, i) => i !== index) || []
      }
    }));
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'emergency', label: 'Emergency', icon: Shield },
    { id: 'medical', label: 'Medical', icon: Heart },
    { id: 'preferences', label: 'Preferences', icon: Users }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-4xl mx-auto">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Edit Family Member' : 'Add New Family Member'}
              </h2>
              <p className="text-sm text-gray-600">
                {isEditing ? 'Update member information' : 'Add a new member to your family'}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
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

      <form onSubmit={handleSubmit} className="p-6">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName || ''}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.firstName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName || ''}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.lastName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.dateOfBirth ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.dateOfBirth && (
                  <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Family Role
                </label>
                <select
                  value={formData.role || 'child'}
                  onChange={(e) => handleInputChange('role', e.target.value as FamilyRole)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                  <option value="guardian">Guardian</option>
                  <option value="grandparent">Grandparent</option>
                  <option value="sibling">Sibling</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture URL
              </label>
              <input
                type="url"
                value={formData.profilePicture || ''}
                onChange={(e) => handleInputChange('profilePicture', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com/profile.jpg"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive ?? true}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active family member
              </label>
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="member@email.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber || ''}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'emergency' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Emergency Contacts</h3>
              <button
                type="button"
                onClick={addEmergencyContact}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Contact
              </button>
            </div>

            {formData.emergencyContacts?.map((contact, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Contact {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeEmergencyContact(index)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Contact name"
                    value={contact.name}
                    onChange={(e) => {
                      const updated = [...(formData.emergencyContacts || [])];
                      updated[index] = { ...updated[index], name: e.target.value };
                      handleInputChange('emergencyContacts', updated);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />

                  <input
                    type="text"
                    placeholder="Relationship"
                    value={contact.relationship}
                    onChange={(e) => {
                      const updated = [...(formData.emergencyContacts || [])];
                      updated[index] = { ...updated[index], relationship: e.target.value };
                      handleInputChange('emergencyContacts', updated);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />

                  <input
                    type="tel"
                    placeholder="Phone number"
                    value={contact.phone}
                    onChange={(e) => {
                      const updated = [...(formData.emergencyContacts || [])];
                      updated[index] = { ...updated[index], phone: e.target.value };
                      handleInputChange('emergencyContacts', updated);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />

                  <input
                    type="email"
                    placeholder="Email address"
                    value={contact.email}
                    onChange={(e) => {
                      const updated = [...(formData.emergencyContacts || [])];
                      updated[index] = { ...updated[index], email: e.target.value };
                      handleInputChange('emergencyContacts', updated);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="mt-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={contact.isPrimary}
                      onChange={(e) => {
                        const updated = [...(formData.emergencyContacts || [])];
                        updated[index] = { ...updated[index], isPrimary: e.target.checked };
                        handleInputChange('emergencyContacts', updated);
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Primary contact</span>
                  </label>
                </div>
              </div>
            )) || (
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No emergency contacts added yet</p>
                <p className="text-sm">Add contacts who can be reached in case of emergency</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'medical' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Blood Type
                </label>
                <select
                  value={formData.medicalInfo?.bloodType || ''}
                  onChange={(e) => handleNestedChange(['medicalInfo', 'bloodType'], e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select blood type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            {['allergies', 'medications', 'medicalConditions'].map((type) => (
              <div key={type}>
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                  {type.replace(/([A-Z])/g, ' $1').trim()}
                </label>

                <div className="space-y-2">
                  {(formData.medicalInfo?.[type as keyof MedicalInfo] as string[] || []).map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                        {item}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMedicalItem(type as any, index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Add ${type.slice(0, -1)}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.target as HTMLInputElement;
                          addMedicalItem(type as any, input.value);
                          input.value = '';
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                        addMedicalItem(type as any, input.value);
                        input.value = '';
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Doctor Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Doctor name"
                  value={formData.medicalInfo?.doctorContact?.name || ''}
                  onChange={(e) => handleNestedChange(['medicalInfo', 'doctorContact', 'name'], e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="tel"
                  placeholder="Doctor phone"
                  value={formData.medicalInfo?.doctorContact?.phone || ''}
                  onChange={(e) => handleNestedChange(['medicalInfo', 'doctorContact', 'phone'], e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="email"
                  placeholder="Doctor email"
                  value={formData.medicalInfo?.doctorContact?.email || ''}
                  onChange={(e) => handleNestedChange(['medicalInfo', 'doctorContact', 'email'], e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Doctor address"
                  value={formData.medicalInfo?.doctorContact?.address || ''}
                  onChange={(e) => handleNestedChange(['medicalInfo', 'doctorContact', 'address'], e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Insurance Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Insurance provider"
                  value={formData.medicalInfo?.insuranceInfo?.provider || ''}
                  onChange={(e) => handleNestedChange(['medicalInfo', 'insuranceInfo', 'provider'], e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Policy number"
                  value={formData.medicalInfo?.insuranceInfo?.policyNumber || ''}
                  onChange={(e) => handleNestedChange(['medicalInfo', 'insuranceInfo', 'policyNumber'], e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Group number"
                  value={formData.medicalInfo?.insuranceInfo?.groupNumber || ''}
                  onChange={(e) => handleNestedChange(['medicalInfo', 'insuranceInfo', 'groupNumber'], e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
              <div className="space-y-3">
                {[
                  { key: 'email', label: 'Email notifications' },
                  { key: 'sms', label: 'SMS notifications' },
                  { key: 'push', label: 'Push notifications' },
                  { key: 'reminders', label: 'Reminders' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.preferences?.notifications?.[key as keyof typeof formData.preferences.notifications] ?? false}
                      onChange={(e) => handleNestedChange(['preferences', 'notifications', key], e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Visibility
                  </label>
                  <select
                    value={formData.preferences?.privacy?.profileVisibility || 'family'}
                    onChange={(e) => handleNestedChange(['preferences', 'privacy', 'profileVisibility'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="family">Family only</option>
                    <option value="friends">Friends and family</option>
                    <option value="public">Public</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {[
                    { key: 'locationSharing', label: 'Enable location sharing' },
                    { key: 'activitySharing', label: 'Share activity updates' }
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.preferences?.privacy?.[key as keyof typeof formData.preferences.privacy] ?? false}
                        onChange={(e) => handleNestedChange(['preferences', 'privacy', key], e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Communication</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Language
                  </label>
                  <select
                    value={formData.preferences?.communication?.preferredLanguage || 'en'}
                    onChange={(e) => handleNestedChange(['preferences', 'communication', 'preferredLanguage'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={formData.preferences?.communication?.timezone || 'America/New_York'}
                    onChange={(e) => handleNestedChange(['preferences', 'communication', 'timezone'], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200 mt-8">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            {isEditing ? 'Update Member' : 'Add Member'}
          </button>
        </div>
      </form>
    </div>
  );
};