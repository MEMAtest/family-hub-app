'use client'

import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';
import { colorOptions, iconOptions } from '@/data/initialData';
import { useFamilyContext } from '@/contexts/familyHub/FamilyContext';

const roles: Array<{ value: 'Parent' | 'Student' | 'Family Member'; label: string }> = [
  { value: 'Parent', label: 'Parent' },
  { value: 'Student', label: 'Student' },
  { value: 'Family Member', label: 'Family Member' },
];

const ageGroups: Array<{ value: 'Toddler' | 'Preschool' | 'Child' | 'Teen' | 'Adult'; label: string }> = [
  { value: 'Toddler', label: 'Toddler' },
  { value: 'Preschool', label: 'Preschool' },
  { value: 'Child', label: 'Child' },
  { value: 'Teen', label: 'Teen' },
  { value: 'Adult', label: 'Adult' },
];

export const FamilyMemberModal = () => {
  const {
    isFormOpen,
    closeForm,
    formState,
    setFormState,
    saveMember,
    editingMember,
  } = useFamilyContext();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await saveMember();
  };

  return (
    <Dialog open={isFormOpen} onClose={closeForm} className="relative z-40">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              {editingMember ? 'Edit Family Member' : 'Add Family Member'}
            </Dialog.Title>
            <button onClick={closeForm} className="rounded-md p-2 text-gray-500 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Display name</label>
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
                <label className="text-sm font-medium text-gray-700">Role</label>
                <select
                  value={formState.role}
                  onChange={(event) => setFormState({ ...formState, role: event.target.value as any })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Age group</label>
                <select
                  value={formState.ageGroup}
                  onChange={(event) => setFormState({ ...formState, ageGroup: event.target.value as any })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {ageGroups.map((age) => (
                    <option key={age.value} value={age.value}>
                      {age.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Icon</label>
                <select
                  value={formState.icon}
                  onChange={(event) => setFormState({ ...formState, icon: event.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {iconOptions.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Colour</label>
                <select
                  value={formState.color}
                  onChange={(event) => setFormState({ ...formState, color: event.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {colorOptions.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
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
                Save Member
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
