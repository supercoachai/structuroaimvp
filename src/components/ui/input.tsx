import React from 'react';

interface InputProps {
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

export function Input({ 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  className = '',
  disabled = false,
  required = false
}: InputProps) {
  const baseClasses = 'w-full px-3 py-2.5 rounded-2xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-0 transition-all min-w-0 placeholder-gray-400';
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : '';

  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      className={`${baseClasses} ${disabledClasses} ${className}`}
    />
  );
}
