import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  containerClassName?: string;
}

const Select: React.FC<SelectProps> = ({ label, error, options, containerClassName, className, ...props }) => {
  const baseClasses = "w-full px-3 py-2 border border-gray-30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
  const errorClasses = error ? "border-red-500" : "";
  const combinedClasses = `${baseClasses} ${errorClasses} ${className || ''}`;

  return (
    <div className={containerClassName}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select {...props} className={combinedClasses}>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default Select;