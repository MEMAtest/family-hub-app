'use client'

import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { useGoalsContext } from '@/contexts/familyHub/GoalsContext';

export const QuickActivityModal = () => {
  const {
    isQuickActivityFormOpen,
    closeQuickActivityForm,
    quickActivityForm,
    setQuickActivityForm,
    logActivity,
  } = useGoalsContext();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void logActivity();
  };

  return (
    <Dialog open={isQuickActivityFormOpen} onClose={closeQuickActivityForm} className="relative z-40">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900">Log Activity</Dialog.Title>
            <button onClick={closeQuickActivityForm} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Activity type</label>
              <select
                value={quickActivityForm.type}
                onChange={(event) => setQuickActivityForm({ ...quickActivityForm, type: event.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="gym">Gym Session</option>
                <option value="running">Running</option>
                <option value="swimming">Swimming</option>
                <option value="cycling">Cycling</option>
                <option value="yoga">Yoga</option>
                <option value="walking">Walking</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Duration (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={quickActivityForm.duration}
                  onChange={(event) => setQuickActivityForm({ ...quickActivityForm, duration: parseInt(event.target.value, 10) || 0 })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Intensity</label>
                <select
                  value={quickActivityForm.intensity}
                  onChange={(event) => setQuickActivityForm({ ...quickActivityForm, intensity: event.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea
                rows={3}
                value={quickActivityForm.notes}
                onChange={(event) => setQuickActivityForm({ ...quickActivityForm, notes: event.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeQuickActivityForm}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Log Activity
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
