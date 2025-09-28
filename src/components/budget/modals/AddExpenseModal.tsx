'use client'

import React, { useState } from 'react';
import { X, CreditCard, Calendar, User, Tag, Target } from 'lucide-react';
import { ExpenseFormData } from '@/types/budget.types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExpenseFormData) => void;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<ExpenseFormData>({
    expenseName: '',
    amount: 0,
    category: 'Housing',
    budgetLimit: undefined,
    isRecurring: true,
    paymentDate: '',
    personId: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const expenseCategories = [
    'Housing', 'Transportation', 'Food & Dining', 'Entertainment', 'Healthcare',
    'Childcare', 'Education', 'Utilities', 'Insurance', 'Clothing', 'Other'
  ];

  const familyMembers = [
    { id: 'ade', name: 'Ade' },
    { id: 'angela', name: 'Angela' },
    { id: 'amari', name: 'Amari' },
    { id: 'askia', name: 'Askia' },
    { id: 'all', name: 'Family' }
  ];

  const handleInputChange = (field: keyof ExpenseFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.expenseName.trim()) {
      newErrors.expenseName = 'Expense name is required';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.budgetLimit && formData.budgetLimit < formData.amount) {
      newErrors.budgetLimit = 'Budget limit cannot be less than expense amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
      setFormData({
        expenseName: '',
        amount: 0,
        category: 'Housing',
        budgetLimit: undefined,
        isRecurring: true,
        paymentDate: '',
        personId: ''
      });
      setErrors({});
    }
  };

  const resetForm = () => {
    setFormData({
      expenseName: '',
      amount: 0,
      category: 'Housing',
      budgetLimit: undefined,
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
              <div className="p-2 bg-red-100 rounded-lg mr-3">
                <CreditCard className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Add Expense</h3>
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
            {/* Expense Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expense Name *
              </label>
              <input
                type="text"
                value={formData.expenseName}
                onChange={(e) => handleInputChange('expenseName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  errors.expenseName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Mortgage, Groceries, Gas"
              />
              {errors.expenseName && (
                <p className="text-red-500 text-xs mt-1">{errors.expenseName}</p>
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
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent ${
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
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {expenseCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category}</p>
              )}
            </div>

            {/* Budget Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Budget Limit (£)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.budgetLimit || ''}
                onChange={(e) => handleInputChange('budgetLimit', parseFloat(e.target.value) || undefined)}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  errors.budgetLimit ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Optional budget limit"
              />
              {errors.budgetLimit && (
                <p className="text-red-500 text-xs mt-1">{errors.budgetLimit}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Set a monthly spending limit for this category
              </p>
            </div>

            {/* Family Member */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Family Member
              </label>
              <select
                value={formData.personId}
                onChange={(e) => handleInputChange('personId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Select family member</option>
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
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="ml-2 text-sm text-gray-700">Recurring expense</span>
              </label>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.isRecurring ? 'Next Payment Date' : 'Payment Date'}
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

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
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Add Expense
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddExpenseModal;