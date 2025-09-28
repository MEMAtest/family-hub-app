'use client'

import React, { useState } from 'react';
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
import { ShoppingList, ShoppingItem, ShoppingListFormData, ShoppingItemFormData } from '../../types/shopping.types';

interface ShoppingListManagerProps {
  onClose?: () => void;
}

const ShoppingListManager: React.FC<ShoppingListManagerProps> = ({ onClose }) => {
  const [selectedList, setSelectedList] = useState<ShoppingList | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'archived'>('all');
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [showNewItemForm, setShowNewItemForm] = useState(false);

  // Mock data
  const mockLists: ShoppingList[] = [
    {
      id: '1',
      familyId: 'fam1',
      listName: 'Weekly Groceries',
      listType: 'grocery',
      storeId: 'store1',
      status: 'active',
      scheduledDate: new Date('2024-01-15'),
      sharedWith: ['john@example.com', 'jane@example.com'],
      estimatedTotal: 85.50,
      actualTotal: 78.90,
      createdBy: 'user1',
      createdAt: new Date('2024-01-10'),
      items: [
        {
          id: 'item1',
          listId: '1',
          itemName: 'Organic Bananas',
          brand: 'Fyffes',
          quantity: 6,
          unit: 'pieces',
          category: 'Fruit',
          estimatedPrice: 2.80,
          actualPrice: 2.50,
          priority: 'normal',
          notes: 'Not too ripe',
          isCompleted: true,
          completedAt: new Date('2024-01-14'),
          isRecurring: false,
          createdAt: new Date('2024-01-10')
        },
        {
          id: 'item2',
          listId: '1',
          itemName: 'Whole Milk',
          brand: 'Tesco',
          quantity: 2,
          unit: 'litres',
          category: 'Dairy',
          estimatedPrice: 3.20,
          priority: 'high',
          isCompleted: false,
          isRecurring: true,
          recurringFrequency: 'weekly',
          createdAt: new Date('2024-01-10')
        }
      ]
    },
    {
      id: '2',
      familyId: 'fam1',
      listName: 'Household Essentials',
      listType: 'household',
      status: 'active',
      scheduledDate: new Date('2024-01-16'),
      sharedWith: ['jane@example.com'],
      estimatedTotal: 45.20,
      createdAt: new Date('2024-01-12'),
      items: [
        {
          id: 'item3',
          listId: '2',
          itemName: 'Toilet Paper',
          quantity: 1,
          unit: 'pack',
          category: 'Bathroom',
          estimatedPrice: 12.99,
          priority: 'urgent',
          isCompleted: false,
          isRecurring: true,
          recurringFrequency: 'monthly',
          createdAt: new Date('2024-01-12')
        }
      ]
    }
  ];

  const [lists, setLists] = useState<ShoppingList[]>(mockLists);

  const filteredLists = lists.filter(list => {
    const matchesSearch = list.listName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || list.status === filterStatus;
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

  const toggleItemCompletion = (listId: string, itemId: string) => {
    setLists(prev => prev.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: list.items.map(item => {
            if (item.id === itemId) {
              return {
                ...item,
                isCompleted: !item.isCompleted,
                completedAt: !item.isCompleted ? new Date() : undefined
              };
            }
            return item;
          })
        };
      }
      return list;
    }));
  };

  const NewListForm = () => {
    const [formData, setFormData] = useState<ShoppingListFormData>({
      listName: '',
      listType: 'grocery',
      storeId: '',
      scheduledDate: undefined,
      sharedWith: []
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const newList: ShoppingList = {
        id: Date.now().toString(),
        familyId: 'fam1',
        listName: formData.listName,
        listType: formData.listType,
        storeId: formData.storeId,
        status: 'active',
        scheduledDate: formData.scheduledDate,
        sharedWith: formData.sharedWith,
        createdAt: new Date(),
        items: []
      };
      setLists(prev => [newList, ...prev]);
      setShowNewListForm(false);
      setFormData({
        listName: '',
        listType: 'grocery',
        storeId: '',
        scheduledDate: undefined,
        sharedWith: []
      });
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                List Type
              </label>
              <select
                value={formData.listType}
                onChange={(e) => setFormData(prev => ({ ...prev, listType: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="grocery">Grocery</option>
                <option value="household">Household</option>
                <option value="clothing">Clothing</option>
                <option value="school">School</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                value={formData.scheduledDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  scheduledDate: e.target.value ? new Date(e.target.value) : undefined
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowNewListForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create List
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const NewItemForm = () => {
    const [formData, setFormData] = useState<ShoppingItemFormData>({
      itemName: '',
      brand: '',
      quantity: 1,
      unit: '',
      category: '',
      estimatedPrice: undefined,
      priority: 'normal',
      notes: '',
      isRecurring: false,
      recurringFrequency: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedList) return;

      const newItem: ShoppingItem = {
        id: Date.now().toString(),
        listId: selectedList.id,
        itemName: formData.itemName,
        brand: formData.brand,
        quantity: formData.quantity,
        unit: formData.unit,
        category: formData.category,
        estimatedPrice: formData.estimatedPrice,
        priority: formData.priority,
        notes: formData.notes,
        isCompleted: false,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.recurringFrequency,
        createdAt: new Date()
      };

      setLists(prev => prev.map(list => {
        if (list.id === selectedList.id) {
          return {
            ...list,
            items: [...list.items, newItem]
          };
        }
        return list;
      }));

      setShowNewItemForm(false);
      setFormData({
        itemName: '',
        brand: '',
        quantity: 1,
        unit: '',
        category: '',
        estimatedPrice: undefined,
        priority: 'normal',
        notes: '',
        isRecurring: false,
        recurringFrequency: ''
      });
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
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., pieces, kg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Fruit, Dairy"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Price (£)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.estimatedPrice || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  estimatedPrice: e.target.value ? parseFloat(e.target.value) : undefined
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowNewItemForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Item
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ListDetailView = ({ list }: { list: ShoppingList }) => {
    const completedItems = list.items.filter(item => item.isCompleted).length;
    const totalItems = list.items.length;
    const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return (
      <div className="space-y-6">
        {/* List Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{list.listName}</h2>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(list.status)}`}>
                  {list.status}
                </span>
                <span className="capitalize">{list.listType}</span>
                {list.scheduledDate && (
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{list.scheduledDate.toLocaleDateString()}</span>
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedList(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-800">{completedItems}/{totalItems}</p>
              <p className="text-sm text-blue-600">Items Completed</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-800">£{list.estimatedTotal?.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-green-600">Estimated Total</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-800">{list.sharedWith.length}</p>
              <p className="text-sm text-purple-600">Shared With</p>
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
                    item.isCompleted
                      ? 'bg-green-50 border-green-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleItemCompletion(list.id, item.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        item.isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {item.isCompleted && <CheckCircle className="w-3 h-3" />}
                    </button>
                    <div className={item.isCompleted ? 'line-through text-gray-500' : ''}>
                      <h4 className="font-medium">{item.itemName}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>{item.quantity} {item.unit}</span>
                        <span>•</span>
                        <span>{item.category}</span>
                        {item.estimatedPrice && (
                          <>
                            <span>•</span>
                            <span>£{item.estimatedPrice.toFixed(2)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityColor(item.priority)}`}>
                      {item.priority}
                    </span>
                    {item.isRecurring && (
                      <Clock className="w-4 h-4 text-blue-500" title="Recurring item" />
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

      {/* Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLists.map((list) => {
          const completedItems = list.items.filter(item => item.isCompleted).length;
          const totalItems = list.items.length;
          const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

          return (
            <div
              key={list.id}
              className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedList(list)}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 truncate">{list.listName}</h3>
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(list.status)}`}>
                  {list.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{completedItems}/{totalItems} items</span>
                  {list.estimatedTotal && (
                    <span>£{list.estimatedTotal.toFixed(2)}</span>
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
                <span className="capitalize">{list.listType}</span>
                {list.scheduledDate && (
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{list.scheduledDate.toLocaleDateString()}</span>
                  </span>
                )}
              </div>

              {list.sharedWith.length > 0 && (
                <div className="flex items-center space-x-1 mt-2 text-xs text-gray-500">
                  <Users className="w-3 h-3" />
                  <span>Shared with {list.sharedWith.length} people</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredLists.length === 0 && (
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