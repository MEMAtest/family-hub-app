'use client'

import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { useMealsContext } from '@/contexts/familyHub/MealsContext';

export const MealFormModal = () => {
  const {
    isMealFormOpen,
    closeMealForm,
    formState,
    setFormState,
    saveMeal,
    selectedDate,
  } = useMealsContext();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    saveMeal();
  };

  return (
    <Dialog open={isMealFormOpen} onClose={closeMealForm} className="relative z-40">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Plan Meal {selectedDate ? `• ${selectedDate}` : ''}
            </Dialog.Title>
            <button onClick={closeMealForm} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Protein</label>
                <input
                  type="text"
                  required
                  value={formState.protein}
                  onChange={(event) => setFormState({ ...formState, protein: event.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Carb</label>
                <input
                  type="text"
                  required
                  value={formState.carb}
                  onChange={(event) => setFormState({ ...formState, carb: event.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Vegetable</label>
              <input
                type="text"
                value={formState.veg}
                onChange={(event) => setFormState({ ...formState, veg: event.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Calories</label>
              <input
                type="number"
                min="0"
                value={formState.calories}
                onChange={(event) => setFormState({ ...formState, calories: event.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <textarea
                rows={3}
                value={formState.notes}
                onChange={(event) => setFormState({ ...formState, notes: event.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeMealForm}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Save Meal
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
