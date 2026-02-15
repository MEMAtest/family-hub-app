'use client'

import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, User, Tag } from 'lucide-react';
import { IncomeFormData } from '@/types/budget.types';
import { useFamilyStore } from '@/store/familyStore';

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: IncomeFormData) => void;
  editData?: any;
  categories?: string[];
}

const AddIncomeModal: React.FC<AddIncomeModalProps> = ({ isOpen, onClose, onSave, editData, categories }) => {
  const familyMembersFromStore = useFamilyStore((state) => state.familyMembers);
  const peopleFromStore = useFamilyStore((state) => state.people);
  const familyMembers = familyMembersFromStore.length > 0 ? familyMembersFromStore : peopleFromStore;

  const [formData, setFormData] = useState<IncomeFormData>({
    incomeName: '',
    amount: 0,
    category: 'Salary',
    isRecurring: true,
    paymentDate: '',
    personId: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editData is provided
  useEffect(() => {
    if (editData) {
      const formatDate = (date: any) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };

      setFormData({
        incomeName: editData.incomeName || '',
        amount: editData.amount || 0,
        category: editData.category || 'Salary',
        isRecurring: editData.isRecurring ?? true,
        recurringFrequency: editData.recurringFrequency || 'monthly',
        recurringStartDate: formatDate(editData.recurringStartDate),
        recurringEndDate: formatDate(editData.recurringEndDate),
        paymentDate: formatDate(editData.paymentDate),
        personId: editData.personId || ''
      });
    } else {
      // Reset form for new income
      setFormData({
        incomeName: '',
        amount: 0,
        category: 'Salary',
        isRecurring: true,
        paymentDate: '',
        personId: ''
      });
    }
  }, [editData]);

  const incomeCategories = (categories && categories.length > 0)
    ? categories
    : ['Salary', 'Freelance', 'Investment', 'Rental', 'Business', 'Government Benefits', 'Other'];

  const handleInputChange = (field: keyof IncomeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.incomeName.trim()) {
      newErrors.incomeName = 'Income name is required';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
      setFormData({
        incomeName: '',
        amount: 0,
        category: 'Salary',
        isRecurring: true,
        paymentDate: '',
        personId: ''
      });
      setErrors({});
    }
  };

  const resetForm = () => {
    setFormData({
      incomeName: '',
      amount: 0,
      category: 'Salary',
      isRecurring: true,
      paymentDate: '',
      personId: ''
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />

        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">{editData ? 'Edit Income' : 'Add Income'}</h3>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Income Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Income Name *
              </label>
              <input
                type="text"
                value={formData.incomeName}
                onChange={(e) => handleInputChange('incomeName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.incomeName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Monthly Salary, Freelance Project"
              />
              {errors.incomeName && (
                <p className="text-red-500 text-xs mt-1">{errors.incomeName}</p>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (£) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {incomeCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category}</p>
              )}
            </div>

            {/* Family Member */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Family Member
              </label>
              <select
                value={formData.personId}
                onChange={(e) => handleInputChange('personId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select family member</option>
                <option value="all">Family (All Members)</option>
                {familyMembers.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>

            {/* Recurring */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="ml-2 text-sm text-gray-700">Recurring income</span>
              </label>
            </div>

            {/* Recurring Options - Show when isRecurring is true */}
            {formData.isRecurring && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={formData.recurringFrequency || 'monthly'}
                    onChange={(e) => handleInputChange('recurringFrequency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.recurringStartDate || ''}
                    onChange={(e) => handleInputChange('recurringStartDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-gray-500 text-xs">(leave blank for indefinite)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.recurringEndDate || ''}
                    onChange={(e) => handleInputChange('recurringEndDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* Payment Date - Only show for one-time payments */}
            {!formData.isRecurring && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                {editData ? 'Update Income' : 'Add Income'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddIncomeModal;
