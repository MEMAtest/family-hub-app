'use client'

import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { useShoppingContext } from '@/contexts/familyHub/ShoppingContext';

export const ShoppingItemModal = () => {
  const {
    isFormOpen,
    closeForm,
    formState,
    setFormState,
    lists,
    addItem,
  } = useShoppingContext();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formState.listId) return;

    addItem(formState.listId, {
      name: formState.name,
      price: parseFloat(formState.price) || 0,
      category: formState.category,
    });
  };

  return (
    <Dialog open={isFormOpen} onClose={closeForm} className="relative z-40">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900">Add Shopping Item</Dialog.Title>
            <button onClick={closeForm} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">List</label>
              <select
                required
                value={formState.listId}
                onChange={(event) => setFormState({ ...formState, listId: event.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Select list</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Item name</label>
              <input
                type="text"
                required
                value={formState.name}
                onChange={(event) => setFormState({ ...formState, name: event.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Price</label>
                <input
                  type="number"
                  min="0"
                  value={formState.price}
                  onChange={(event) => setFormState({ ...formState, price: event.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  value={formState.category}
                  onChange={(event) => setFormState({ ...formState, category: event.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add Item
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
