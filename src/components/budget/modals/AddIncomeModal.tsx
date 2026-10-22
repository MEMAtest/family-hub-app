'use client'

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, PoundSterling } from 'lucide-react';
import { IncomeFormData } from '@/types/budget.types';
import { useFamilyStore } from '@/store/familyStore';
import { londonCalendarDate } from '@/utils/dateUtils';

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: IncomeFormData) => Promise<void> | void;
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
  const [saving, setSaving] = useState(false);
  const newPlan = (): IncomeFormData => ({ incomeName: '', amount: 0, category: 'Salary', isRecurring: true, recurringFrequency: 'monthly', recurringStartDate: londonCalendarDate(), paymentDate: '', personId: '' });

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
      setFormData(newPlan());
    }
    setErrors({});
  }, [editData, isOpen]);

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

    if (!Number.isFinite(formData.amount) || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.isRecurring && !formData.recurringStartDate) newErrors.recurringStartDate = 'Choose the first payment date';
    if (!formData.isRecurring && !formData.paymentDate) newErrors.paymentDate = 'Choose the expected payment date';
    if (formData.isRecurring && formData.recurringEndDate && formData.recurringStartDate && formData.recurringEndDate < formData.recurringStartDate) newErrors.recurringEndDate = 'End date must not be before the start date';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !validateForm()) return;
    setSaving(true);
    try { await onSave(formData); }
    catch (error) { setErrors(prev => ({ ...prev, save: error instanceof Error ? error.message : 'Income could not be saved. Please try again.' })); }
    finally { setSaving(false); }
  };

  const resetForm = () => {
    setFormData(newPlan());
    setErrors({});
  };

  const handleClose = () => {
    if (saving) return;
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />

        <div role="dialog" aria-modal="true" aria-labelledby="income-plan-title" className="relative inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <PoundSterling className="w-6 h-6 text-green-600" />
              </div>
              <h3 id="income-plan-title" className="text-lg font-medium text-gray-900">{editData ? 'Edit income plan' : 'Plan income'}</h3>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close income plan"
              disabled={saving}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.save && <p role="alert" className="text-sm text-red-700">{errors.save}</p>}
            <fieldset disabled={saving} className="space-y-4">
            {/* Income Name */}
            <div>
              <label htmlFor="income-plan-name" className="block text-sm font-medium text-gray-700 mb-1">
                Income Name *
              </label>
              <input
                id="income-plan-name"
                maxLength={160}
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
              <label htmlFor="income-plan-amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount (£) *
              </label>
              <input
                id="income-plan-amount"
                min="0.01"
                max="1000000000"
                inputMode="decimal"
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
              <label htmlFor="income-plan-category" className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                id="income-plan-category"
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
              <label htmlFor="income-plan-person" className="block text-sm font-medium text-gray-700 mb-1">
                Family Member
              </label>
              <select
                id="income-plan-person"
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
                  <label htmlFor="income-plan-frequency" className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency *
                  </label>
                  <select
                    id="income-plan-frequency"
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
                  <label htmlFor="income-plan-start" className="block text-sm font-medium text-gray-700 mb-1">
                    First payment date *
                  </label>
                  <input
                    id="income-plan-start"
                    type="date"
                    value={formData.recurringStartDate || ''}
                    onChange={(e) => handleInputChange('recurringStartDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {errors.recurringStartDate && <p className="text-red-500 text-xs mt-1">{errors.recurringStartDate}</p>}
                </div>

                <div>
                  <label htmlFor="income-plan-end" className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-gray-500 text-xs">(leave blank for indefinite)</span>
                  </label>
                  <input
                    id="income-plan-end"
                    min={formData.recurringStartDate}
                    type="date"
                    value={formData.recurringEndDate || ''}
                    onChange={(e) => handleInputChange('recurringEndDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {errors.recurringEndDate && <p className="text-red-500 text-xs mt-1">{errors.recurringEndDate}</p>}
                </div>
              </>
            )}

            {/* Payment Date - Only show for one-time payments */}
            {!formData.isRecurring && (
              <div>
                <label htmlFor="income-plan-payment" className="block text-sm font-medium text-gray-700 mb-1">
                  Expected payment date *
                </label>
                <input
                  id="income-plan-payment"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {errors.paymentDate && <p className="text-red-500 text-xs mt-1">{errors.paymentDate}</p>}
              </div>
            )}

            </fieldset>
            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                {saving ? 'Saving...' : 'Save income plan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>, document.body
  );
};

export default AddIncomeModal;
