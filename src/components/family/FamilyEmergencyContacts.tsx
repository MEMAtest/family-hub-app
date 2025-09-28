'use client';

import React, { useState } from 'react';
import { EmergencyContact, FamilyMember } from '@/types/family.types';
import {
  Shield,
  Phone,
  Mail,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Star,
  Users,
  AlertTriangle,
  Search,
  Filter,
  ExternalLink,
  Copy,
  Check,
  Clock,
  Heart
} from 'lucide-react';

interface FamilyEmergencyContactsProps {
  emergencyContacts: EmergencyContact[];
  familyMembers: FamilyMember[];
  onAddContact: (contact: Partial<EmergencyContact>) => void;
  onEditContact: (id: string, contact: Partial<EmergencyContact>) => void;
  onDeleteContact: (id: string) => void;
}

export const FamilyEmergencyContacts: React.FC<FamilyEmergencyContactsProps> = ({
  emergencyContacts: initialContacts,
  familyMembers,
  onAddContact,
  onEditContact,
  onDeleteContact
}) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>(
    initialContacts.length > 0 ? initialContacts : mockContacts
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const mockContacts: EmergencyContact[] = [
    {
      id: '1',
      name: 'Dr. Sarah Johnson',
      relationship: 'Family Doctor',
      phone: '(555) 123-4567',
      email: 'dr.johnson@atlantamedical.com',
      address: '1234 Medical Plaza Dr, Atlanta, GA 30309',
      isPrimary: true,
      category: 'medical',
      availability: '24/7 Emergency Line',
      notes: 'Primary care physician for the whole family. Emergency line available after hours.',
      lastContacted: '2024-01-10'
    },
    {
      id: '2',
      name: 'Atlanta Fire Department',
      relationship: 'Emergency Services',
      phone: '911',
      email: 'emergency@atlantafire.gov',
      address: 'Station 21, 5678 Peachtree St, Atlanta, GA 30309',
      isPrimary: true,
      category: 'emergency',
      availability: '24/7',
      notes: 'For fire, medical emergencies, and life-threatening situations.',
      lastContacted: null
    },
    {
      id: '3',
      name: 'Atlanta Police Department',
      relationship: 'Emergency Services',
      phone: '911',
      email: 'emergency@atlantapd.gov',
      address: 'Zone 2 Precinct, 9101 Security Blvd, Atlanta, GA 30309',
      isPrimary: true,
      category: 'emergency',
      availability: '24/7',
      notes: 'For crimes in progress, safety threats, and other police matters.',
      lastContacted: null
    },
    {
      id: '4',
      name: 'Mary Thompson',
      relationship: 'Grandmother (Angela\'s Mom)',
      phone: '(555) 987-6543',
      email: 'mary.thompson@email.com',
      address: '4567 Oak Street, Decatur, GA 30030',
      isPrimary: false,
      category: 'family',
      availability: 'Daily 7 AM - 10 PM',
      notes: 'Lives 15 minutes away. Has spare key to house. Great with kids.',
      lastContacted: '2024-01-12'
    },
    {
      id: '5',
      name: 'James Wilson',
      relationship: 'Neighbor & Close Friend',
      phone: '(555) 456-7890',
      email: 'james.wilson@email.com',
      address: '1235 Same Street, Atlanta, GA 30309',
      isPrimary: false,
      category: 'neighbor',
      availability: 'Evenings & Weekends',
      notes: 'Next door neighbor. Retired teacher. Very reliable and trustworthy.',
      lastContacted: '2024-01-08'
    },
    {
      id: '6',
      name: 'Children\'s Hospital of Atlanta',
      relationship: 'Pediatric Emergency',
      phone: '(404) 785-6000',
      email: 'emergency@choa.org',
      address: '1405 Clifton Rd NE, Atlanta, GA 30322',
      isPrimary: false,
      category: 'medical',
      availability: '24/7 Emergency Department',
      notes: 'Specialized pediatric care for Askia and Amari. Preferred emergency hospital for kids.',
      lastContacted: null
    },
    {
      id: '7',
      name: 'David Omosanya',
      relationship: 'Uncle (Ade\'s Brother)',
      phone: '(555) 321-9876',
      email: 'david.omosanya@email.com',
      address: '8901 Buckhead Ave, Atlanta, GA 30305',
      isPrimary: false,
      category: 'family',
      availability: 'Daily 6 AM - 11 PM',
      notes: 'Lives in Buckhead. Paramedic with medical training. Can help with emergencies.',
      lastContacted: '2024-01-15'
    },
    {
      id: '8',
      name: 'Askia\'s School Office',
      relationship: 'School Emergency Contact',
      phone: '(770) 555-0123',
      email: 'office@atlantaelementary.edu',
      address: '2468 Education Way, Atlanta, GA 30309',
      isPrimary: false,
      category: 'school',
      availability: 'School Hours: 7:30 AM - 3:30 PM',
      notes: 'Contact for school-related emergencies. Principal: Ms. Rodriguez.',
      lastContacted: '2024-01-09'
    },
    {
      id: '9',
      name: 'Amari\'s School Office',
      relationship: 'School Emergency Contact',
      phone: '(770) 555-0145',
      email: 'office@atlantamiddle.edu',
      address: '3579 Learning Blvd, Atlanta, GA 30309',
      isPrimary: false,
      category: 'school',
      availability: 'School Hours: 8:00 AM - 4:00 PM',
      notes: 'Contact for school-related emergencies. Principal: Mr. Davis.',
      lastContacted: '2024-01-11'
    },
    {
      id: '10',
      name: 'Poison Control Center',
      relationship: 'Emergency Hotline',
      phone: '1-800-222-1222',
      email: 'info@poison.org',
      address: 'National Poison Control Network',
      isPrimary: false,
      category: 'emergency',
      availability: '24/7 Hotline',
      notes: 'Free, confidential medical advice for poison emergencies. Keep this number handy.',
      lastContacted: null
    }
  ];

  const categoryConfig = {
    emergency: { icon: AlertTriangle, color: 'red', label: 'Emergency Services' },
    medical: { icon: Heart, color: 'blue', label: 'Medical' },
    family: { icon: Users, color: 'green', label: 'Family' },
    neighbor: { icon: MapPin, color: 'purple', label: 'Neighbors' },
    school: { icon: Users, color: 'yellow', label: 'School' },
    other: { icon: Shield, color: 'gray', label: 'Other' }
  };

  const filteredContacts = contacts.filter(contact => {
    if (selectedFilter !== 'all' && contact.category !== selectedFilter) return false;
    if (searchTerm && !contact.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !contact.relationship.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const primaryContacts = filteredContacts.filter(contact => contact.isPrimary);
  const otherContacts = filteredContacts.filter(contact => !contact.isPrimary);

  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(phone);
      setTimeout(() => setCopiedPhone(null), 2000);
    } catch (err) {
      console.error('Failed to copy phone number:', err);
    }
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, '_blank');
  };

  const ContactCard: React.FC<{ contact: EmergencyContact }> = ({ contact }) => {
    const config = categoryConfig[contact.category] || categoryConfig.other;
    const IconComponent = config.icon;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-${config.color}-100 rounded-lg`}>
              <IconComponent className={`w-5 h-5 text-${config.color}-600`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {contact.name}
                {contact.isPrimary && (
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                )}
              </h3>
              <p className="text-sm text-gray-600">{contact.relationship}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditingContact(contact)}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit contact"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDeleteContact(contact.id)}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete contact"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-900 font-mono">{contact.phone}</span>
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => handleCopyPhone(contact.phone)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Copy phone number"
              >
                {copiedPhone === contact.phone ? (
                  <Check className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
              <button
                onClick={() => handleCall(contact.phone)}
                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                title="Call"
              >
                <Phone className="w-3 h-3" />
              </button>
            </div>
          </div>

          {contact.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 flex-1 truncate">{contact.email}</span>
              <button
                onClick={() => handleEmail(contact.email!)}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Send email"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}

          {contact.address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
              <span className="text-sm text-gray-600 flex-1">{contact.address}</span>
            </div>
          )}

          {contact.availability && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{contact.availability}</span>
            </div>
          )}
        </div>

        {contact.notes && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{contact.notes}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className={`px-2 py-1 bg-${config.color}-100 text-${config.color}-800 text-xs font-medium rounded-full`}>
            {config.label}
          </span>
          {contact.lastContacted && (
            <span className="text-xs text-gray-500">
              Last contacted: {new Date(contact.lastContacted).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Emergency Contacts</h2>
              <p className="text-sm text-gray-600">
                {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''} available for emergencies
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {Object.entries(categoryConfig).map(([category, config]) => (
                <option key={category} value={category}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        {filteredContacts.length > 0 ? (
          <div className="space-y-6">
            {primaryContacts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  <h3 className="text-lg font-semibold text-gray-900">Primary Contacts</h3>
                  <span className="text-sm text-gray-500">
                    ({primaryContacts.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {primaryContacts.map(contact => (
                    <ContactCard key={contact.id} contact={contact} />
                  ))}
                </div>
              </div>
            )}

            {otherContacts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900">Other Contacts</h3>
                  <span className="text-sm text-gray-500">
                    ({otherContacts.length})
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {otherContacts.map(contact => (
                    <ContactCard key={contact.id} contact={contact} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Shield className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Emergency Contacts Found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedFilter !== 'all'
                ? 'Try adjusting your search or filter to see more contacts.'
                : 'Add emergency contacts to ensure your family can get help when needed.'}
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add First Contact
            </button>
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-yellow-50 border-t border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-800">Emergency Guidelines</h4>
            <ul className="mt-2 text-sm text-yellow-700 space-y-1">
              <li>• Call 911 for immediate life-threatening emergencies</li>
              <li>• Keep this list accessible to all family members</li>
              <li>• Update contact information regularly</li>
              <li>• Make sure emergency contacts know they're listed</li>
            </ul>
          </div>
        </div>
      </div>

      {(showAddForm || editingContact) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingContact(null);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    defaultValue={editingContact?.name || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter contact name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship *
                  </label>
                  <input
                    type="text"
                    defaultValue={editingContact?.relationship || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Family Doctor, Neighbor, etc."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      defaultValue={editingContact?.phone || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue={editingContact?.email || ''}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="contact@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    defaultValue={editingContact?.category || 'other'}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(categoryConfig).map(([category, config]) => (
                      <option key={category} value={category}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    rows={2}
                    defaultValue={editingContact?.address || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Street address, city, state, zip"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Availability
                  </label>
                  <input
                    type="text"
                    defaultValue={editingContact?.availability || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., 24/7, Business hours, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    defaultValue={editingContact?.notes || ''}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional information about this contact..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    defaultChecked={editingContact?.isPrimary || false}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <label htmlFor="isPrimary" className="text-sm text-gray-700">
                    Mark as primary emergency contact
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingContact(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {editingContact ? 'Update Contact' : 'Add Contact'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};