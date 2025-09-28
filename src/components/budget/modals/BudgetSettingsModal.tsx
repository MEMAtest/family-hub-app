'use client'

import React, { useState } from 'react';
import { X, Settings, Palette, Bell, DollarSign, Plus, Trash2 } from 'lucide-react';

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const BudgetSettingsModal: React.FC<BudgetSettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState('categories');

  // Mock categories data
  const [categories, setCategories] = useState([
    { id: '1', name: 'Housing', type: 'expense', color: '#374151', limit: 3500, isActive: true },
    { id: '2', name: 'Transportation', type: 'expense', color: '#6B7280', limit: 500, isActive: true },
    { id: '3', name: 'Food & Dining', type: 'expense', color: '#9CA3AF', limit: 400, isActive: true },
    { id: '4', name: 'Salary', type: 'income', color: '#10b981', limit: null, isActive: true },
    { id: '5', name: 'Freelance', type: 'income', color: '#059669', limit: null, isActive: true }
  ]);

  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'expense',
    color: '#6B7280',
    limit: '',
    isActive: true
  });

  // Mock alert settings
  const [alertSettings, setAlertSettings] = useState({
    budgetOverrun: true,
    goalProgress: true,
    recurringReminders: true,
    weeklyDigest: false,
    monthlyReport: true
  });

  const colorOptions = [
    '#374151', '#6B7280', '#9CA3AF', '#D1D5DB',
    '#10b981', '#059669', '#047857', '#065f46',
    '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af',
    '#ef4444', '#dc2626', '#b91c1c', '#991b1b',
    '#f59e0b', '#d97706', '#b45309', '#92400e',
    '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'
  ];

  const tabs = [
    { id: 'categories', label: 'Categories', icon: <Palette className="w-4 h-4" /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell className="w-4 h-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <Settings className="w-4 h-4" /> }
  ];

  const handleAddCategory = () => {
    if (!newCategory.name.trim()) return;

    const category = {
      id: Date.now().toString(),
      name: newCategory.name,
      type: newCategory.type,
      color: newCategory.color,
      limit: newCategory.type === 'expense' && newCategory.limit ? parseFloat(newCategory.limit) : null,
      isActive: true
    };

    setCategories([...categories, category]);
    setNewCategory({
      name: '',
      type: 'expense',
      color: '#6B7280',
      limit: '',
      isActive: true
    });
  };

  const handleRemoveCategory = (id: string) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  const handleCategoryUpdate = (id: string, updates: any) => {
    setCategories(categories.map(cat =>
      cat.id === id ? { ...cat, ...updates } : cat
    ));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg mr-3">
                <Settings className="w-6 h-6 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Budget Settings</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-96">
            {activeTab === 'categories' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Budget Categories</h4>
                  <p className="text-gray-600 mb-6">
                    Manage your income and expense categories. Set budget limits for expense categories.
                  </p>

                  {/* Add New Category */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h5 className="font-medium text-gray-900 mb-3">Add New Category</h5>
                    <div className="grid grid-cols-5 gap-4">
                      <input
                        type="text"
                        placeholder="Category name"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <select
                        value={newCategory.type}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, type: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="expense">Expense</option>
                        <option value="income">Income</option>
                      </select>
                      <select
                        value={newCategory.color}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, color: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        {colorOptions.map(color => (
                          <option key={color} value={color} style={{ backgroundColor: color }}>
                            {color}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder={newCategory.type === 'expense' ? "Budget limit" : "Not applicable"}
                        value={newCategory.limit}
                        onChange={(e) => setNewCategory(prev => ({ ...prev, limit: e.target.value }))}
                        disabled={newCategory.type === 'income'}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
                      />
                      <button
                        onClick={handleAddCategory}
                        className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Categories List */}
                  <div className="space-y-3">
                    {categories.map(category => (
                      <div key={category.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium text-gray-900">{category.name}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            category.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {category.type}
                          </span>
                          {category.limit && (
                            <span className="text-sm text-gray-600">
                              Limit: £{category.limit.toLocaleString()}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={category.isActive}
                              onChange={(e) => handleCategoryUpdate(category.id, { isActive: e.target.checked })}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Active</span>
                          </label>
                          <button
                            onClick={() => handleRemoveCategory(category.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Alert Preferences</h4>
                  <p className="text-gray-600 mb-6">
                    Configure when and how you receive budget-related notifications.
                  </p>

                  <div className="space-y-4">
                    {Object.entries(alertSettings).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h5 className="font-medium text-gray-900 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </h5>
                          <p className="text-sm text-gray-600">
                            {key === 'budgetOverrun' && 'Get notified when you exceed category budgets'}
                            {key === 'goalProgress' && 'Receive updates on savings goal milestones'}
                            {key === 'recurringReminders' && 'Reminders for upcoming recurring payments'}
                            {key === 'weeklyDigest' && 'Weekly summary of your spending'}
                            {key === 'monthlyReport' && 'Detailed monthly budget analysis'}
                          </p>
                        </div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => setAlertSettings(prev => ({
                              ...prev,
                              [key]: e.target.checked
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">General Preferences</h4>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">Currency</h5>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                        <option value="GBP">British Pound (£)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                      </select>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">Budget Cycle</h5>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                        <option value="monthly">Monthly</option>
                        <option value="weekly">Weekly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-900 mb-2">Date Format</h5>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetSettingsModal;