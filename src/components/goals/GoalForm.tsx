'use client'

import React, { useState } from 'react';
import {
  X,
  Target,
  Users,
  User,
  Calendar,
  Tag,
  Flag,
  Plus,
  Minus,
  Clock,
  Star,
  AlertTriangle
} from 'lucide-react';
import { GoalFormData, MilestoneFormData } from '../../types/goals.types';

interface GoalFormProps {
  goal?: any;
  onClose: () => void;
  onSave: (goalData: GoalFormData) => void;
  familyMembers: Array<{ id: string; name: string; color: string; avatar: string }>;
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
}

const GoalForm: React.FC<GoalFormProps> = ({
  goal,
  onClose,
  onSave,
  familyMembers,
  categories
}) => {
  const [formData, setFormData] = useState<GoalFormData>({
    title: goal?.title || '',
    description: goal?.description || '',
    category: goal?.category || categories[0]?.id || '',
    type: goal?.type || 'individual',
    assignedTo: goal?.assignedTo || familyMembers[0]?.id,
    participants: goal?.participants || [],
    priority: goal?.priority || 'medium',
    targetType: goal?.target?.type || 'numeric',
    targetValue: goal?.target?.value || '',
    targetUnit: goal?.target?.unit || '',
    frequency: goal?.target?.frequency || 'total',
    startDate: goal?.startDate ? new Date(goal.startDate) : new Date(),
    targetDate: goal?.targetDate ? new Date(goal.targetDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    milestones: goal?.milestones?.map((m: any) => m.title) || [],
    tags: goal?.tags || [],
    notes: goal?.notes || '',
    isPublic: goal?.isPublic || true
  });

  const [milestones, setMilestones] = useState<MilestoneFormData[]>(
    goal?.milestones?.map((m: any) => ({
      title: m.title,
      description: m.description || '',
      targetValue: m.targetValue,
      targetDate: m.targetDate ? new Date(m.targetDate) : undefined
    })) || []
  );

  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Goal title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Goal description is required';
    }

    if (formData.type === 'individual' && !formData.assignedTo) {
      newErrors.assignedTo = 'Please assign this goal to a family member';
    }

    if (formData.participants.length === 0) {
      newErrors.participants = 'At least one participant is required';
    }

    if (formData.targetType === 'numeric' && (!formData.targetValue || isNaN(Number(formData.targetValue)))) {
      newErrors.targetValue = 'Please enter a valid target value';
    }

    if (formData.startDate >= formData.targetDate) {
      newErrors.targetDate = 'Target date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const goalData: GoalFormData = {
      ...formData,
      milestones: milestones.map(m => m.title)
    };

    onSave(goalData);
  };

  const handleParticipantToggle = (personId: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.includes(personId)
        ? prev.participants.filter(id => id !== personId)
        : [...prev.participants, personId]
    }));
  };

  const addMilestone = () => {
    setMilestones(prev => [...prev, {
      title: '',
      description: '',
      targetValue: '',
      targetDate: undefined
    }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(prev => prev.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: keyof MilestoneFormData, value: any) => {
    setMilestones(prev => prev.map((milestone, i) =>
      i === index ? { ...milestone, [field]: value } : milestone
    ));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const selectedCategory = categories.find(c => c.id === formData.category);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {goal ? 'Edit Goal' : 'Create New Goal'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <Target className="w-5 h-5" />
              <span>Basic Information</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Run a 5K under 25 minutes"
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe your goal and what you want to achieve..."
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>
          </div>

          {/* Goal Type and Assignment */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Assignment & Participants</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Type
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="individual"
                      checked={formData.type === 'individual'}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'individual' | 'family' }))}
                      className="mr-2"
                    />
                    <User className="w-4 h-4 mr-1" />
                    Individual
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="family"
                      checked={formData.type === 'family'}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'individual' | 'family' }))}
                      className="mr-2"
                    />
                    <Users className="w-4 h-4 mr-1" />
                    Family
                  </label>
                </div>
              </div>

              {formData.type === 'individual' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned To *
                  </label>
                  <select
                    value={formData.assignedTo || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.assignedTo ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a family member</option>
                    {familyMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.avatar} {member.name}
                      </option>
                    ))}
                  </select>
                  {errors.assignedTo && <p className="text-red-500 text-xs mt-1">{errors.assignedTo}</p>}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Participants *
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {familyMembers.map(member => (
                  <label
                    key={member.id}
                    className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.participants.includes(member.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.participants.includes(member.id)}
                      onChange={() => handleParticipantToggle(member.id)}
                      className="rounded"
                    />
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.avatar}
                    </div>
                    <span className="text-sm">{member.name}</span>
                  </label>
                ))}
              </div>
              {errors.participants && <p className="text-red-500 text-xs mt-1">{errors.participants}</p>}
            </div>
          </div>

          {/* Target and Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <Flag className="w-5 h-5" />
              <span>Target & Timeline</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Type
                </label>
                <select
                  value={formData.targetType}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetType: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="numeric">Numeric Target</option>
                  <option value="boolean">Yes/No Goal</option>
                  <option value="milestone">Milestone Goal</option>
                  <option value="habit">Habit Goal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Value *
                </label>
                {formData.targetType === 'boolean' ? (
                  <select
                    value={formData.targetValue.toString()}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetValue: e.target.value === 'true' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">Yes (Complete)</option>
                    <option value="false">No (Not Complete)</option>
                  </select>
                ) : (
                  <input
                    type={formData.targetType === 'numeric' ? 'number' : 'text'}
                    value={formData.targetValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetValue: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.targetValue ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder={formData.targetType === 'numeric' ? 'e.g., 25' : 'e.g., A2 Certificate'}
                  />
                )}
                {errors.targetValue && <p className="text-red-500 text-xs mt-1">{errors.targetValue}</p>}
              </div>

              {formData.targetType === 'numeric' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={formData.targetUnit}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetUnit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., minutes, kg, miles"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="total">One-time Goal</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate.toISOString().split('T')[0]}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: new Date(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date *
                </label>
                <input
                  type="date"
                  value={formData.targetDate.toISOString().split('T')[0]}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetDate: new Date(e.target.value) }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.targetDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.targetDate && <p className="text-red-500 text-xs mt-1">{errors.targetDate}</p>}
              </div>
            </div>
          </div>

          {/* Milestones */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                <Star className="w-5 h-5" />
                <span>Milestones</span>
              </h3>
              <button
                type="button"
                onClick={addMilestone}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-3 h-3" />
                <span>Add Milestone</span>
              </button>
            </div>

            {milestones.map((milestone, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                <div className="flex-1">
                  <input
                    type="text"
                    value={milestone.title}
                    onChange={(e) => updateMilestone(index, 'title', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Milestone title..."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeMilestone(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Priority and Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Priority & Settings</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority Level
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical Priority</option>
                </select>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm">Share with family</span>
                </label>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <Tag className="w-5 h-5" />
              <span>Tags</span>
            </h3>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a tag..."
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Add
              </button>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional information or motivation..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {goal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalForm;