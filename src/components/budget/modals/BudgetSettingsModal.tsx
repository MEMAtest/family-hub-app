'use client'

import React, { useEffect, useState } from 'react';
import { X, Settings, Palette, Bell, Plus, Trash2 } from 'lucide-react';

interface BudgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  familyId?: string | null;
}

type BudgetCategoryRow = {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  limit: number | null;
  isActive: boolean;
  sortOrder: number;
};

const BudgetSettingsModal: React.FC<BudgetSettingsModalProps> = ({ isOpen, onClose, onSave, familyId }) => {
  const [activeTab, setActiveTab] = useState('categories');

  const [categories, setCategories] = useState<BudgetCategoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'expense',
    color: '#6B7280',
    limit: '',
    isActive: true
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

  useEffect(() => {
    const loadCategories = async () => {
      if (!isOpen) return;
      if (!familyId) return;

      try {
        setLoading(true);
        setErrorMessage(null);

        const response = await fetch(`/api/families/${familyId}/budget/categories?includeInactive=true`);
        if (!response.ok) {
          throw new Error(`Failed to load categories (${response.status})`);
        }
        const payload = await response.json();
        const rows = Array.isArray(payload) ? payload : [];

        setCategories(rows.map((row: any): BudgetCategoryRow => ({
          id: String(row.id),
          name: String(row.categoryName ?? row.name ?? ''),
          type: row.categoryType === 'income' ? 'income' : 'expense',
          color: String(row.colorCode ?? row.color ?? '#6B7280'),
          limit: row.budgetLimit === null || row.budgetLimit === undefined ? null : Number(row.budgetLimit),
          isActive: Boolean(row.isActive ?? true),
          sortOrder: Number(row.sortOrder ?? 0),
        })));
      } catch (error) {
        console.error('Failed to load budget categories:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load categories');
      } finally {
        setLoading(false);
      }
    };

    void loadCategories();
  }, [familyId, isOpen]);

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) return;
    if (!familyId) {
      setErrorMessage('Family not loaded yet');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const response = await fetch(`/api/families/${familyId}/budget/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: newCategory.name,
          categoryType: newCategory.type,
          colorCode: newCategory.color,
          budgetLimit: newCategory.type === 'expense' && newCategory.limit ? parseFloat(newCategory.limit) : null,
          isActive: true,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error || `Failed to create category (${response.status})`);
      }

      const created = await response.json();
      setCategories((prev) => [
        ...prev,
        {
          id: String(created.id),
          name: String(created.categoryName),
          type: created.categoryType === 'income' ? 'income' : 'expense',
          color: String(created.colorCode ?? '#6B7280'),
          limit: created.budgetLimit === null || created.budgetLimit === undefined ? null : Number(created.budgetLimit),
          isActive: Boolean(created.isActive ?? true),
          sortOrder: Number(created.sortOrder ?? 0),
        },
      ]);

      setNewCategory({
        name: '',
        type: 'expense',
        color: '#6B7280',
        limit: '',
        isActive: true,
      });
    } catch (error) {
      console.error('Failed to create budget category:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCategory = async (id: string) => {
    if (!familyId) {
      setErrorMessage('Family not loaded yet');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const response = await fetch(`/api/families/${familyId}/budget/categories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error || `Failed to delete category (${response.status})`);
      }

      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    } catch (error) {
      console.error('Failed to delete budget category:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete category');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryUpdate = async (id: string, updates: Partial<BudgetCategoryRow>) => {
    if (!familyId) {
      setErrorMessage('Family not loaded yet');
      return;
    }

    setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat)));

    try {
      const response = await fetch(`/api/families/${familyId}/budget/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: updates.name,
          categoryType: updates.type,
          colorCode: updates.color,
          budgetLimit: updates.limit,
          isActive: updates.isActive,
          sortOrder: updates.sortOrder,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error || `Failed to update category (${response.status})`);
      }
    } catch (error) {
      console.error('Failed to update budget category:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update category');
    }
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
                  {errorMessage && (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {errorMessage}
                    </div>
                  )}

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
                        disabled={loading}
                        className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Categories List */}
                  <div className="space-y-3">
                    {loading && categories.length === 0 ? (
                      <div className="p-4 text-sm text-gray-600">Loading categories...</div>
                    ) : null}
                    {!loading && categories.length === 0 ? (
                      <div className="p-4 text-sm text-gray-600">No categories yet. Add one above.</div>
                    ) : null}
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
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                    Alerts settings persistence is coming soon.
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">General Preferences</h4>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                    Preferences persistence is coming soon.
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
