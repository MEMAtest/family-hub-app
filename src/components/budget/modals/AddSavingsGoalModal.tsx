'use client'

import React, { useState } from 'react';
import { X, Target, Calendar, TrendingUp } from 'lucide-react';
import { SavingsGoalFormData } from '@/types/budget.types';

interface AddSavingsGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SavingsGoalFormData) => void;
}

const AddSavingsGoalModal: React.FC<AddSavingsGoalModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<SavingsGoalFormData>({
    goalName: '',
    goalDescription: '',
    targetAmount: 0,
    targetDate: '',
    priority: 'medium',
    category: 'Emergency Fund',
    autoContribution: undefined,
    contributionFreq: undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const goalCategories = [
    'Emergency Fund', 'Vacation', 'Home Improvement', 'Car Purchase',
    'Education', 'Retirement', 'Investment', 'Other'
  ];

  const priorityOptions = [
    { value: 'high', label: 'High', color: 'text-red-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'low', label: 'Low', color: 'text-green-600' }
  ];

  const frequencyOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' }
  ];

  const handleInputChange = (field: keyof SavingsGoalFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.goalName.trim()) {
      newErrors.goalName = 'Goal name is required';
    }

    if (formData.targetAmount <= 0) {
      newErrors.targetAmount = 'Target amount must be greater than 0';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.autoContribution && !formData.contributionFreq) {
      newErrors.contributionFreq = 'Frequency is required for automatic contributions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      goalName: '',
      goalDescription: '',
      targetAmount: 0,
      targetDate: '',
      priority: 'medium',
      category: 'Emergency Fund',
      autoContribution: undefined,
      contributionFreq: undefined
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Calculate estimated completion date based on auto contribution
  const getEstimatedCompletion = () => {
    if (!formData.autoContribution || !formData.contributionFreq || formData.targetAmount <= 0) {
      return null;
    }

    const monthlyContribution = formData.contributionFreq === 'weekly'
      ? formData.autoContribution * 4.33
      : formData.contributionFreq === 'monthly'
        ? formData.autoContribution
        : formData.autoContribution / 12;

    const monthsToComplete = Math.ceil(formData.targetAmount / monthlyContribution);
    const completionDate = new Date();
    completionDate.setMonth(completionDate.getMonth() + monthsToComplete);

    return completionDate.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />

        <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Add Savings Goal</h3>
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
            {/* Goal Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goal Name *
              </label>
              <input
                type="text"
                value={formData.goalName}
                onChange={(e) => handleInputChange('goalName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.goalName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Emergency Fund, Holiday to Spain"
              />
              {errors.goalName && (
                <p className="text-red-500 text-xs mt-1">{errors.goalName}</p>
              )}
            </div>

            {/* Goal Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.goalDescription}
                onChange={(e) => handleInputChange('goalDescription', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional description of your savings goal"
              />
            </div>

            {/* Target Amount & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Amount (£) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.targetAmount || ''}
                  onChange={(e) => handleInputChange('targetAmount', parseFloat(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.targetAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.targetAmount && (
                  <p className="text-red-500 text-xs mt-1">{errors.targetAmount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {goalCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Date & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => handleInputChange('targetDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Auto Contribution */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-3">Automatic Contributions</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Contribution Amount (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.autoContribution || ''}
                    onChange={(e) => handleInputChange('autoContribution', parseFloat(e.target.value) || undefined)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">
                    Frequency
                  </label>
                  <select
                    value={formData.contributionFreq || ''}
                    onChange={(e) => handleInputChange('contributionFreq', e.target.value || undefined)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!formData.autoContribution}
                  >
                    <option value="">Select frequency</option>
                    {frequencyOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {errors.contributionFreq && (
                    <p className="text-red-500 text-xs mt-1">{errors.contributionFreq}</p>
                  )}
                </div>
              </div>

              {getEstimatedCompletion() && (
                <div className="mt-3 p-2 bg-green-100 rounded text-sm text-green-800">
                  <div className="flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Estimated completion: {getEstimatedCompletion()}
                  </div>
                </div>
              )}
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
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Create Goal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddSavingsGoalModal;