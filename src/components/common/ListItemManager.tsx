import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface ListItemManagerProps<T> {
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: T) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  addButtonLabel: string;
  label: string;
}

const ListItemManager = <T extends {}>({
  items,
  onAdd,
  onRemove,
  onUpdate,
  renderItem,
  addButtonLabel,
  label,
}: ListItemManagerProps<T>) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center space-x-1 text-blue-60 hover:text-blue-800 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{addButtonLabel}</span>
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            {renderItem(item, index)}
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
              disabled={items.length === 1}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ListItemManager;