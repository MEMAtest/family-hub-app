'use client'

import React, { useState } from 'react';
import {
  Plus,
  Search,
  MapPin,
  Clock,
  Star,
  Edit,
  Trash2,
  Navigation,
  Phone,
  Globe,
  CreditCard,
  Truck,
  Store as StoreIcon,
  X,
  Check
} from 'lucide-react';
import { Store, StoreFormData, OpeningHours, DayHours } from '../../types/shopping.types';

interface StoreManagerProps {
  onClose?: () => void;
}

const StoreManager: React.FC<StoreManagerProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewStoreForm, setShowNewStoreForm] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  // Mock data
  const mockStores: Store[] = [
    {
      id: '1',
      familyId: 'fam1',
      storeName: 'Tesco Extra',
      storeChain: 'Tesco',
      locationAddress: '123 High Street, London, SW1A 1AA',
      locationCoords: { lat: 51.5074, lng: -0.1278 },
      preferredFor: ['grocery', 'household', 'clothing'],
      loyaltyCardNumber: '1234567890',
      onlineOrdering: true,
      deliveryAvailable: true,
      notes: 'Large store with good parking. Best prices on Tesco branded items.',
      openingHours: {
        monday: { open: '06:00', close: '00:00', is24Hours: false, isClosed: false },
        tuesday: { open: '06:00', close: '00:00', is24Hours: false, isClosed: false },
        wednesday: { open: '06:00', close: '00:00', is24Hours: false, isClosed: false },
        thursday: { open: '06:00', close: '00:00', is24Hours: false, isClosed: false },
        friday: { open: '06:00', close: '00:00', is24Hours: false, isClosed: false },
        saturday: { open: '06:00', close: '22:00', is24Hours: false, isClosed: false },
        sunday: { open: '10:00', close: '16:00', is24Hours: false, isClosed: false }
      },
      createdAt: new Date('2024-01-10')
    },
    {
      id: '2',
      familyId: 'fam1',
      storeName: 'ASDA Superstore',
      storeChain: 'ASDA',
      locationAddress: '456 Market Street, London, E1 6AN',
      locationCoords: { lat: 51.5155, lng: -0.0922 },
      preferredFor: ['grocery', 'household'],
      onlineOrdering: true,
      deliveryAvailable: true,
      notes: 'Good value for money, especially for bulk buying.',
      openingHours: {
        monday: { open: '07:00', close: '22:00', is24Hours: false, isClosed: false },
        tuesday: { open: '07:00', close: '22:00', is24Hours: false, isClosed: false },
        wednesday: { open: '07:00', close: '22:00', is24Hours: false, isClosed: false },
        thursday: { open: '07:00', close: '22:00', is24Hours: false, isClosed: false },
        friday: { open: '07:00', close: '22:00', is24Hours: false, isClosed: false },
        saturday: { open: '07:00', close: '22:00', is24Hours: false, isClosed: false },
        sunday: { open: '10:00', close: '16:00', is24Hours: false, isClosed: false }
      },
      createdAt: new Date('2024-01-12')
    },
    {
      id: '3',
      familyId: 'fam1',
      storeName: 'WHSmith',
      locationAddress: '789 Station Road, London, WC1E 7HT',
      locationCoords: { lat: 51.5200, lng: -0.1300 },
      preferredFor: ['school', 'office'],
      onlineOrdering: false,
      deliveryAvailable: false,
      notes: 'Convenient for school and office supplies.',
      openingHours: {
        monday: { open: '08:00', close: '18:00', is24Hours: false, isClosed: false },
        tuesday: { open: '08:00', close: '18:00', is24Hours: false, isClosed: false },
        wednesday: { open: '08:00', close: '18:00', is24Hours: false, isClosed: false },
        thursday: { open: '08:00', close: '18:00', is24Hours: false, isClosed: false },
        friday: { open: '08:00', close: '18:00', is24Hours: false, isClosed: false },
        saturday: { open: '09:00', close: '17:00', is24Hours: false, isClosed: false },
        sunday: { open: '00:00', close: '00:00', is24Hours: false, isClosed: true }
      },
      createdAt: new Date('2024-01-15')
    }
  ];

  const [stores, setStores] = useState<Store[]>(mockStores);

  const filteredStores = stores.filter(store =>
    store.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.storeChain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.locationAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'grocery': return 'bg-green-100 text-green-800';
      case 'household': return 'bg-blue-100 text-blue-800';
      case 'clothing': return 'bg-purple-100 text-purple-800';
      case 'school': return 'bg-yellow-100 text-yellow-800';
      case 'office': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatOpeningHours = (hours: OpeningHours) => {
    const today = new Date().toLocaleLowerCase().slice(0, 3) as keyof OpeningHours;
    const todayHours = hours[today === 'sun' ? 'sunday' :
                           today === 'mon' ? 'monday' :
                           today === 'tue' ? 'tuesday' :
                           today === 'wed' ? 'wednesday' :
                           today === 'thu' ? 'thursday' :
                           today === 'fri' ? 'friday' : 'saturday'];

    if (todayHours.isClosed) return 'Closed today';
    if (todayHours.is24Hours) return 'Open 24 hours';
    return `${todayHours.open} - ${todayHours.close}`;
  };

  const isStoreOpen = (hours: OpeningHours) => {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof OpeningHours;
    const dayHours = hours[currentDay];

    if (dayHours.isClosed) return false;
    if (dayHours.is24Hours) return true;

    const currentTime = now.toTimeString().slice(0, 5);
    return currentTime >= dayHours.open && currentTime <= dayHours.close;
  };

  const StoreForm = ({ store, onClose: closeForm }: { store?: Store; onClose: () => void }) => {
    const [formData, setFormData] = useState<StoreFormData>({
      storeName: store?.storeName || '',
      storeChain: store?.storeChain || '',
      locationAddress: store?.locationAddress || '',
      locationCoords: store?.locationCoords,
      preferredFor: store?.preferredFor || [],
      loyaltyCardNumber: store?.loyaltyCardNumber || '',
      onlineOrdering: store?.onlineOrdering || false,
      deliveryAvailable: store?.deliveryAvailable || false,
      notes: store?.notes || '',
      openingHours: store?.openingHours || {
        monday: { open: '09:00', close: '17:00', is24Hours: false, isClosed: false },
        tuesday: { open: '09:00', close: '17:00', is24Hours: false, isClosed: false },
        wednesday: { open: '09:00', close: '17:00', is24Hours: false, isClosed: false },
        thursday: { open: '09:00', close: '17:00', is24Hours: false, isClosed: false },
        friday: { open: '09:00', close: '17:00', is24Hours: false, isClosed: false },
        saturday: { open: '09:00', close: '17:00', is24Hours: false, isClosed: false },
        sunday: { open: '09:00', close: '17:00', is24Hours: false, isClosed: false }
      }
    });

    const handleCategoryToggle = (category: string) => {
      setFormData(prev => ({
        ...prev,
        preferredFor: prev.preferredFor.includes(category)
          ? prev.preferredFor.filter(c => c !== category)
          : [...prev.preferredFor, category]
      }));
    };

    const handleHoursChange = (day: keyof OpeningHours, field: keyof DayHours, value: string | boolean) => {
      setFormData(prev => ({
        ...prev,
        openingHours: {
          ...prev.openingHours!,
          [day]: {
            ...prev.openingHours![day],
            [field]: value
          }
        }
      }));
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();

      if (store) {
        setStores(prev => prev.map(s => s.id === store.id ? { ...store, ...formData } : s));
        setEditingStore(null);
      } else {
        const newStore: Store = {
          id: Date.now().toString(),
          familyId: 'fam1',
          ...formData,
          createdAt: new Date()
        };
        setStores(prev => [newStore, ...prev]);
        setShowNewStoreForm(false);
      }
      closeForm();
    };

    const categories = ['grocery', 'household', 'clothing', 'school', 'office', 'other'];
    const days: (keyof OpeningHours)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {store ? 'Edit Store' : 'Add New Store'}
            </h3>
            <button
              onClick={closeForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Name *
                  </label>
                  <input
                    type="text"
                    value={formData.storeName}
                    onChange={(e) => setFormData(prev => ({ ...prev, storeName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Tesco Extra"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store Chain
                  </label>
                  <input
                    type="text"
                    value={formData.storeChain}
                    onChange={(e) => setFormData(prev => ({ ...prev, storeChain: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Tesco"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.locationAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, locationAddress: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full address including postcode"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loyalty Card Number
                </label>
                <input
                  type="text"
                  value={formData.loyaltyCardNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, loyaltyCardNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your loyalty card number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any additional notes about this store"
                  rows={2}
                />
              </div>
            </div>

            {/* Categories */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Preferred Categories</h4>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryToggle(category)}
                    className={`px-3 py-2 rounded-full text-sm border transition-colors ${
                      formData.preferredFor.includes(category)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Features */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Features</h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.onlineOrdering}
                    onChange={(e) => setFormData(prev => ({ ...prev, onlineOrdering: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Online ordering available</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.deliveryAvailable}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryAvailable: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Delivery available</span>
                </label>
              </div>
            </div>

            {/* Opening Hours */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Opening Hours</h4>
              <div className="space-y-3">
                {days.map((day) => (
                  <div key={day} className="flex items-center space-x-3">
                    <div className="w-20 text-sm text-gray-700 capitalize">
                      {day}
                    </div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.openingHours![day].isClosed}
                        onChange={(e) => handleHoursChange(day, 'isClosed', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Closed</span>
                    </label>
                    {!formData.openingHours![day].isClosed && (
                      <>
                        <input
                          type="time"
                          value={formData.openingHours![day].open}
                          onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={formData.openingHours![day].close}
                          onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <label className="flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={formData.openingHours![day].is24Hours}
                            onChange={(e) => handleHoursChange(day, 'is24Hours', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-600">24h</span>
                        </label>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3 pt-6">
              <button
                type="button"
                onClick={closeForm}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {store ? 'Update Store' : 'Add Store'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search stores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowNewStoreForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Store</span>
        </button>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStores.map((store) => (
          <div
            key={store.id}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <StoreIcon className="w-5 h-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900">{store.storeName}</h3>
                  {isStoreOpen(store.openingHours!) && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                      Open
                    </span>
                  )}
                </div>
                {store.storeChain && (
                  <p className="text-sm text-gray-600 mb-2">{store.storeChain}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingStore(store)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setStores(prev => prev.filter(s => s.id !== store.id))}
                  className="text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {store.locationAddress && (
              <div className="flex items-start space-x-2 mb-3 text-sm text-gray-600">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{store.locationAddress}</span>
              </div>
            )}

            <div className="flex items-center space-x-2 mb-3 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>{formatOpeningHours(store.openingHours!)}</span>
            </div>

            <div className="flex flex-wrap gap-1 mb-4">
              {store.preferredFor.map((category) => (
                <span
                  key={category}
                  className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(category)}`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-sm text-gray-500">
                {store.onlineOrdering && (
                  <div className="flex items-center space-x-1" title="Online ordering">
                    <Globe className="w-4 h-4" />
                  </div>
                )}
                {store.deliveryAvailable && (
                  <div className="flex items-center space-x-1" title="Delivery available">
                    <Truck className="w-4 h-4" />
                  </div>
                )}
                {store.loyaltyCardNumber && (
                  <div className="flex items-center space-x-1" title="Loyalty card registered">
                    <CreditCard className="w-4 h-4" />
                  </div>
                )}
              </div>
              {store.locationCoords && (
                <button
                  onClick={() => {
                    const url = `https://maps.google.com?q=${store.locationCoords!.lat},${store.locationCoords!.lng}`;
                    window.open(url, '_blank');
                  }}
                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Directions</span>
                </button>
              )}
            </div>

            {store.notes && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600 line-clamp-2">{store.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredStores.length === 0 && (
        <div className="text-center py-12">
          <StoreIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No stores found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? 'Try adjusting your search criteria'
              : 'Add your first store to get started'}
          </p>
          <button
            onClick={() => setShowNewStoreForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Store</span>
          </button>
        </div>
      )}

      {showNewStoreForm && (
        <StoreForm onClose={() => setShowNewStoreForm(false)} />
      )}

      {editingStore && (
        <StoreForm
          store={editingStore}
          onClose={() => setEditingStore(null)}
        />
      )}
    </div>
  );
};

export default StoreManager;