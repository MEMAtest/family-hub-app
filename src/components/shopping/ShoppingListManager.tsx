'use client'

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  Clock,
  Star,
  Edit,
  Trash2,
  Copy,
  Share,
  ShoppingCart,
  AlertCircle,
  X
} from 'lucide-react';
import { useFamilyStore, ShoppingList as StoreShoppingList } from '@/store/familyStore';
import { useShoppingContext } from '@/contexts/familyHub/ShoppingContext';
import databaseService from '@/services/databaseService';
import { createId } from '@/utils/id';

interface ShoppingListManagerProps {
  onClose?: () => void;
}

type ShoppingItemView = {
  id: string;
  listId?: string;
  itemName?: string;
  name?: string;
  estimatedPrice?: number;
  price?: number;
  category: string;
  frequency?: string | null;
  personId?: string | null;
  person?: string | null;
  isCompleted?: boolean;
  completed?: boolean;
  completedAt?: Date | null;
  createdAt?: Date | string;
};

type ShoppingListView = StoreShoppingList & {
  listName?: string;
  storeChain?: string | null;
  customStore?: string | null;
  isActive?: boolean;
  createdAt?: Date | string;
  items: ShoppingItemView[];
};

const getListName = (list: ShoppingListView) => list.listName ?? list.name ?? 'Shopping List';
const getListActive = (list: ShoppingListView) => list.isActive ?? true;
const getItemName = (item: ShoppingItemView) => item.itemName ?? item.name ?? 'Item';
const getItemCompleted = (item: ShoppingItemView) => item.isCompleted ?? item.completed ?? false;
const getItemPrice = (item: ShoppingItemView) => Number(item.estimatedPrice ?? item.price ?? 0);

const mapApiList = (list: any): ShoppingListView => {
  const items = Array.isArray(list?.items) ? list.items : [];
  const mappedItems = items.map((item: any) => ({
    id: item?.id ?? createId('item'),
    listId: item?.listId,
    itemName: item?.itemName ?? item?.name ?? 'Item',
    name: item?.itemName ?? item?.name ?? 'Item',
    estimatedPrice: Number(item?.estimatedPrice ?? item?.price ?? 0),
    price: Number(item?.estimatedPrice ?? item?.price ?? 0),
    category: item?.category ?? 'General',
    frequency: item?.frequency ?? null,
    personId: item?.personId ?? null,
    isCompleted: Boolean(item?.isCompleted ?? item?.completed),
    completed: Boolean(item?.isCompleted ?? item?.completed),
    completedAt: item?.completedAt ?? null,
    createdAt: item?.createdAt ?? undefined,
  }));

  const estimatedTotal = mappedItems.reduce((sum: number, item: ShoppingItemView) => sum + getItemPrice(item), 0);
  const total = mappedItems
    .filter((item: ShoppingItemView) => getItemCompleted(item))
    .reduce((sum: number, item: ShoppingItemView) => sum + getItemPrice(item), 0);

  return {
    id: list?.id ?? createId('list'),
    name: list?.listName ?? list?.name ?? 'Shopping List',
    listName: list?.listName ?? list?.name ?? 'Shopping List',
    category: list?.category ?? 'General',
    items: mappedItems,
    total,
    estimatedTotal,
    lastWeekSpent: Number(list?.lastWeekSpent ?? 0),
    avgWeeklySpend: Number(list?.avgWeeklySpend ?? 0),
    storeChain: list?.storeChain ?? null,
    customStore: list?.customStore ?? null,
    isActive: list?.isActive ?? true,
    createdAt: list?.createdAt ?? undefined,
  };
};

const ShoppingListManager: React.FC<ShoppingListManagerProps> = ({ onClose }) => {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('all');
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get familyId from store
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const setShoppingLists = useFamilyStore((state) => state.setShoppingLists);
  const {
    lists,
    addItem,
    toggleItem,
    addList,
  } = useShoppingContext();

  const viewLists = lists as ShoppingListView[];
  const selectedList = useMemo(
    () => viewLists.find((list) => list.id === selectedListId) ?? null,
    [selectedListId, viewLists]
  );

  useEffect(() => {
    if (selectedListId && !selectedList) {
      setSelectedListId(null);
    }
  }, [selectedList, selectedListId]);


  // Fetch shopping lists from API
  useEffect(() => {
    const fetchLists = async () => {
      try {
        const existingLists = useFamilyStore.getState().shoppingLists;
        if (!familyId) {
          if (!existingLists.length) {
            setError('No family ID available');
          }
          setLoading(false);
          return;
        }

        setLoading(true);
        const data = await databaseService.getShoppingLists();
        if (data.length > 0 || !existingLists.length) {
          const mappedLists = data.map(mapApiList);
          setShoppingLists(mappedLists);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching shopping lists:', err);
        setError(err instanceof Error ? err.message : 'Failed to load shopping lists');
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, [familyId, setShoppingLists]);

  const filteredLists = viewLists.filter(list => {
    const matchesSearch = getListName(list).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' ||
      (filterStatus === 'active' && getListActive(list)) ||
      (filterStatus === 'archived' && !getListActive(list));
    return matchesSearch && matchesFilter;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleItemCompletion = async (listId: string, itemId: string) => {
    try {
      await toggleItem(listId, itemId);
    } catch (err) {
      console.error('Error toggling item completion:', err);
      alert('Failed to update item. Please try again.');
    }
  };

  const NewListForm = () => {
    const [formData, setFormData] = useState({
      listName: '',
      category: 'General',
      storeChain: '',
      customStore: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      try {
        setSubmitting(true);
        const savedList = familyId
          ? await databaseService.createShoppingList({
              listName: formData.listName,
              category: formData.category,
              storeChain: formData.storeChain || undefined,
              customStore: formData.storeChain === 'Custom' ? formData.customStore : undefined,
            })
          : null;

        const newList = savedList
          ? mapApiList(savedList)
          : ({
              id: createId('list'),
              name: formData.listName,
              listName: formData.listName,
              category: formData.category,
              items: [],
              total: 0,
              estimatedTotal: 0,
              lastWeekSpent: 0,
              avgWeeklySpend: 0,
              storeChain: formData.storeChain || null,
              customStore: formData.storeChain === 'Custom' ? formData.customStore : null,
              isActive: true,
            } as ShoppingListView);

        addList(newList);
        setShowNewListForm(false);
        setFormData({
          listName: '',
          category: 'General',
          storeChain: '',
          customStore: ''
        });
      } catch (err) {
        console.error('Error creating shopping list:', err);
        alert('Failed to create shopping list. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Create New List</h3>
            <button
              onClick={() => setShowNewListForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                List Name
              </label>
              <input
                type="text"
                value={formData.listName}
                onChange={(e) => setFormData(prev => ({ ...prev, listName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Weekly Groceries"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              >
                <option value="General">General</option>
                <option value="Food">Food</option>
                <option value="Household">Household</option>
                <option value="Clothing">Clothing</option>
                <option value="Activities">Activities</option>
                <option value="School">School</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Store Chain (optional)
              </label>
              <select
                value={formData.storeChain}
                onChange={(e) => setFormData(prev => ({ ...prev, storeChain: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              >
                <option value="">Select a store</option>
                <option value="Tesco">Tesco</option>
                <option value="Morrisons">Morrisons</option>
                <option value="ASDA">ASDA</option>
                <option value="Sainsburys">Sainsbury's</option>
                <option value="Lidl">Lidl</option>
                <option value="Aldi">Aldi</option>
                <option value="Waitrose">Waitrose</option>
                <option value="Co-op">Co-op</option>
                <option value="Iceland">Iceland</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            {formData.storeChain === 'Custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custom Store Name
                </label>
                <input
                  type="text"
                  value={formData.customStore}
                  onChange={(e) => setFormData(prev => ({ ...prev, customStore: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter store name"
                  disabled={submitting}
                />
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowNewListForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create List'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const NewItemForm = () => {
    const [formData, setFormData] = useState({
      itemName: '',
      estimatedPrice: '',
      category: 'General',
      frequency: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedList) return;

      try {
        setSubmitting(true);
        await addItem(selectedList.id, {
          name: formData.itemName,
          price: formData.estimatedPrice ? parseFloat(formData.estimatedPrice) : 0,
          category: formData.category,
          frequency: formData.frequency || undefined,
        });

        setShowNewItemForm(false);
        setFormData({
          itemName: '',
          estimatedPrice: '',
          category: 'General',
          frequency: ''
        });
      } catch (err) {
        console.error('Error adding item:', err);
        alert('Failed to add item. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Add Item</h3>
            <button
              onClick={() => setShowNewItemForm(false)}
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
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              >
                <option value="General">General</option>
                <option value="Fruit">Fruit</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Dairy">Dairy</option>
                <option value="Meat">Meat</option>
                <option value="Bakery">Bakery</option>
                <option value="Household">Household</option>
                <option value="Personal Care">Personal Care</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Price (£)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.estimatedPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedPrice: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency (optional)
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              >
                <option value="">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowNewItemForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? 'Adding...' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ListDetailView = ({ list }: { list: ShoppingListView }) => {
    const completedItems = list.items.filter(item => getItemCompleted(item)).length;
    const totalItems = list.items.length;
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    const estimatedTotal = list.items.reduce((sum, item) => sum + getItemPrice(item), 0);

    return (
      <div className="space-y-6">
        {/* List Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{getListName(list)}</h2>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <span className={`px-2 py-1 rounded-full text-xs ${getListActive(list) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {getListActive(list) ? 'Active' : 'Archived'}
                </span>
                <span className="capitalize">{list.category}</span>
                {list.storeChain && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>{list.storeChain === 'Custom' && list.customStore ? list.customStore : list.storeChain}</span>
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedListId(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-800">{completedItems}/{totalItems}</p>
              <p className="text-sm text-blue-600">Items Completed</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-800">£{estimatedTotal.toFixed(2)}</p>
              <p className="text-sm text-green-600">Estimated Total</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Items</h3>
            <button
              onClick={() => setShowNewItemForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>

          {list.items.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No items added yet</p>
              <button
                onClick={() => setShowNewItemForm(true)}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Add your first item
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {list.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    getItemCompleted(item)
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleItemCompletion(list.id, item.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        getItemCompleted(item)
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {getItemCompleted(item) && <CheckCircle className="w-3 h-3" />}
                    </button>
                    <div className={getItemCompleted(item) ? 'line-through text-gray-500' : ''}>
                      <h4 className="font-medium">{getItemName(item)}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{item.category}</span>
                        {getItemPrice(item) > 0 && (
                          <>
                            <span>•</span>
                            <span>£{getItemPrice(item).toFixed(2)}</span>
                          </>
                        )}
                        {item.frequency && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{item.frequency}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {item.frequency && (
                      <span title={`${item.frequency} recurring`}>
                        <Clock className="w-4 h-4 text-blue-500" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (selectedList) {
    return (
      <div className="space-y-6">
        <ListDetailView list={selectedList} />
        {showNewItemForm && <NewItemForm />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search shopping lists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Lists</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <button
          onClick={() => setShowNewListForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          <span>New List</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading shopping lists...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading lists</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Lists Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLists.map((list) => {
            const completedItems = list.items.filter(item => getItemCompleted(item)).length;
            const totalItems = list.items.length;
            const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
            const estimatedTotal = list.items.reduce((sum, item) => sum + getItemPrice(item), 0);

            return (
              <div
                key={list.id}
                className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedListId(list.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 truncate">{getListName(list)}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${getListActive(list) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {getListActive(list) ? 'Active' : 'Archived'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>{completedItems}/{totalItems} items</span>
                    {estimatedTotal > 0 && (
                      <span>£{estimatedTotal.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="capitalize">{list.category}</span>
                  {list.storeChain && (
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{list.storeChain === 'Custom' && list.customStore ? list.customStore : list.storeChain}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && filteredLists.length === 0 && (
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No shopping lists found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first shopping list to get started'}
          </p>
          <button
            onClick={() => setShowNewListForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mx-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create List</span>
          </button>
        </div>
      )}

      {showNewListForm && <NewListForm />}
    </div>
  );
};

export default ShoppingListManager;
