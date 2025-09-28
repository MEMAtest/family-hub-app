'use client'

import React, { useState } from 'react';
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Bell,
  Star,
  MapPin,
  Calendar,
  DollarSign,
  Plus,
  X,
  AlertCircle,
  Target,
  BarChart3
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PriceAlert, PricePoint, StoreComparison } from '../../types/shopping.types';

interface PriceTrackerProps {
  onClose?: () => void;
}

const PriceTracker: React.FC<PriceTrackerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'alerts' | 'tracking' | 'comparison'>('alerts');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewAlertForm, setShowNewAlertForm] = useState(false);

  // Mock data
  const priceAlerts: PriceAlert[] = [
    {
      id: '1',
      itemName: 'Organic Bananas',
      targetPrice: 2.50,
      currentPrice: 2.80,
      storeId: 'store1',
      isActive: true,
      createdAt: new Date('2024-01-10')
    },
    {
      id: '2',
      itemName: 'Washing Powder 2kg',
      targetPrice: 7.50,
      currentPrice: 8.99,
      storeId: 'store2',
      isActive: true,
      createdAt: new Date('2024-01-12')
    },
    {
      id: '3',
      itemName: 'Olive Oil 500ml',
      targetPrice: 4.00,
      currentPrice: 3.85,
      isActive: false,
      createdAt: new Date('2024-01-08')
    }
  ];

  const priceHistory: PricePoint[] = [
    { date: new Date('2024-01-01'), price: 3.20, store: 'Tesco', isSale: false },
    { date: new Date('2024-01-03'), price: 2.99, store: 'Tesco', isSale: true },
    { date: new Date('2024-01-05'), price: 3.15, store: 'ASDA', isSale: false },
    { date: new Date('2024-01-07'), price: 2.85, store: 'Sainsbury\'s', isSale: true },
    { date: new Date('2024-01-10'), price: 3.10, store: 'Tesco', isSale: false },
    { date: new Date('2024-01-12'), price: 2.95, store: 'ASDA', isSale: false },
    { date: new Date('2024-01-14'), price: 2.80, store: 'Sainsbury\'s', isSale: false }
  ];

  const storeComparisons: StoreComparison[] = [
    {
      store: {
        id: 'store1',
        familyId: 'fam1',
        storeName: 'Tesco Extra',
        storeChain: 'Tesco',
        locationAddress: '123 High Street, London',
        preferredFor: ['grocery'],
        onlineOrdering: true,
        deliveryAvailable: true,
        createdAt: new Date()
      },
      price: 2.80,
      distance: 0.8,
      savings: 0,
      isAvailable: true
    },
    {
      store: {
        id: 'store2',
        familyId: 'fam1',
        storeName: 'ASDA Superstore',
        storeChain: 'ASDA',
        locationAddress: '456 Market Street, London',
        preferredFor: ['grocery'],
        onlineOrdering: true,
        deliveryAvailable: true,
        createdAt: new Date()
      },
      price: 2.65,
      distance: 1.2,
      savings: 0.15,
      isAvailable: true
    },
    {
      store: {
        id: 'store3',
        familyId: 'fam1',
        storeName: 'Sainsbury\'s',
        locationAddress: '789 Town Square, London',
        preferredFor: ['grocery'],
        onlineOrdering: true,
        deliveryAvailable: true,
        createdAt: new Date()
      },
      price: 2.55,
      distance: 2.1,
      savings: 0.25,
      isAvailable: true
    }
  ];

  const [alerts, setAlerts] = useState<PriceAlert[]>(priceAlerts);

  const chartData = priceHistory.map(point => ({
    date: point.date.toLocaleDateString(),
    price: point.price,
    store: point.store,
    isSale: point.isSale
  }));

  const filteredAlerts = alerts.filter(alert =>
    alert.itemName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const NewAlertForm = () => {
    const [formData, setFormData] = useState({
      itemName: '',
      targetPrice: '',
      storeId: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const newAlert: PriceAlert = {
        id: Date.now().toString(),
        itemName: formData.itemName,
        targetPrice: parseFloat(formData.targetPrice),
        currentPrice: 0,
        storeId: formData.storeId || undefined,
        isActive: true,
        createdAt: new Date()
      };
      setAlerts(prev => [newAlert, ...prev]);
      setShowNewAlertForm(false);
      setFormData({ itemName: '', targetPrice: '', storeId: '' });
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Create Price Alert</h3>
            <button
              onClick={() => setShowNewAlertForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Name
              </label>
              <input
                type="text"
                value={formData.itemName}
                onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Organic Bananas"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Price (£)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.targetPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, targetPrice: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Store (Optional)
              </label>
              <select
                value={formData.storeId}
                onChange={(e) => setFormData(prev => ({ ...prev, storeId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any store</option>
                <option value="store1">Tesco Extra</option>
                <option value="store2">ASDA Superstore</option>
                <option value="store3">Sainsbury's</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowNewAlertForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Alert
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderAlerts = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search alerts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowNewAlertForm(true)}
          className="ml-4 flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>New Alert</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAlerts.map((alert) => {
          const isTriggered = alert.currentPrice > 0 && alert.currentPrice <= alert.targetPrice;
          const priceDiff = alert.currentPrice - alert.targetPrice;

          return (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 ${
                isTriggered
                  ? 'bg-green-50 border-green-200'
                  : alert.isActive
                  ? 'bg-white border-gray-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">{alert.itemName}</h3>
                <div className="flex items-center space-x-2">
                  {isTriggered && (
                    <Bell className="w-4 h-4 text-green-500" />
                  )}
                  <button
                    onClick={() => setAlerts(prev => prev.map(a =>
                      a.id === alert.id ? { ...a, isActive: !a.isActive } : a
                    ))}
                    className={`w-4 h-4 rounded border-2 ${
                      alert.isActive
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Target Price:</span>
                  <span className="font-medium">£{alert.targetPrice.toFixed(2)}</span>
                </div>
                {alert.currentPrice > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Current Price:</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">£{alert.currentPrice.toFixed(2)}</span>
                      {priceDiff > 0 ? (
                        <TrendingUp className="w-3 h-3 text-red-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span>{alert.createdAt.toLocaleDateString()}</span>
                </div>
              </div>

              {isTriggered && (
                <div className="mt-3 p-2 bg-green-100 rounded text-xs text-green-800">
                  🎉 Alert triggered! Price is at or below your target.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12">
          <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No price alerts</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? 'No alerts match your search'
              : 'Create your first price alert to get notified when prices drop'}
          </p>
          <button
            onClick={() => setShowNewAlertForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Alert</span>
          </button>
        </div>
      )}
    </div>
  );

  const renderTracking = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Price History - Organic Bananas</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                domain={['dataMin - 0.1', 'dataMax + 0.1']}
                tickFormatter={(value) => `£${value.toFixed(2)}`}
              />
              <Tooltip
                formatter={(value: any, name: string) => [`£${Number(value).toFixed(2)}`, 'Price']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <TrendingDown className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-600">-8.5%</p>
          <p className="text-sm text-gray-600">Price change (30 days)</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-600">£2.95</p>
          <p className="text-sm text-gray-600">Average price</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-yellow-600">£2.55</p>
          <p className="text-sm text-gray-600">Best price found</p>
        </div>
      </div>
    </div>
  );

  const renderComparison = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Price Comparison - Organic Bananas</h3>

        <div className="space-y-4">
          {storeComparisons.map((comparison, index) => (
            <div key={comparison.store.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{comparison.store.storeName}</h4>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-3 h-3" />
                    <span>{comparison.distance} km away</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">£{comparison.price.toFixed(2)}</p>
                {comparison.savings > 0 && (
                  <p className="text-sm text-green-600">Save £{comparison.savings.toFixed(2)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Potential Savings</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={storeComparisons}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="store.storeName"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `£${value.toFixed(2)}`}
              />
              <Tooltip
                formatter={(value: any) => [`£${Number(value).toFixed(2)}`, 'Savings']}
              />
              <Bar dataKey="savings" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'alerts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Price Alerts
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tracking'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Price Tracking
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'comparison'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Store Comparison
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'alerts' && renderAlerts()}
      {activeTab === 'tracking' && renderTracking()}
      {activeTab === 'comparison' && renderComparison()}

      {showNewAlertForm && <NewAlertForm />}
    </div>
  );
};

export default PriceTracker;