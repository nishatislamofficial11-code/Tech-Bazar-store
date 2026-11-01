import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface SelectItemType {
  id: string | number;
  label: string;
  supportingText?: string;
  isDisabled?: boolean;
  icon?: React.ReactNode;
  avatarUrl?: string;
  [key: string]: any;
}

interface SelectProps {
  items: SelectItemType[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  label?: string;
  hint?: string;
  error?: string;
  tooltip?: string;
  placeholder?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  children?: (item: SelectItemType) => React.ReactNode;
}

// A sub-component to closely match the API provided by the user
export const SelectItem = ({ 
  children, 
  supportingText, 
  isDisabled, 
  icon, 
  avatarUrl,
  isSelected
}: any) => {
  return (
    <div className={`flex items-center gap-3 w-full ${isDisabled ? 'opacity-50' : ''}`}>
      {avatarUrl && (
        <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
      )}
      {icon && (
        <div className="shrink-0 text-slate-400">
          {icon}
        </div>
      )}
      <div className="flex flex-col text-left">
        <span className={`block truncate ${isSelected ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
          {children}
        </span>
        {supportingText && (
          <span className="block truncate text-sm text-slate-500">
            {supportingText}
          </span>
        )}
      </div>
    </div>
  );
};

export function Select({
  items,
  value,
  onChange,
  label,
  hint,
  error,
  placeholder = "Select an option",
  isRequired,
  isDisabled,
  className = '',
  icon,
  children
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find(item => item.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: SelectItemType) => {
    if (item.isDisabled) return;
    onChange?.(item.id);
    setIsOpen(false);
  };

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
      )}

      <button
        type="button"
        disabled={isDisabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white text-left
          border rounded-lg shadow-sm transition-all focus:outline-none focus:ring-4
          ${isDisabled ? 'bg-slate-50 cursor-not-allowed opacity-70' : 'cursor-default hover:bg-slate-50'}
          ${error 
            ? 'border-red-300 focus:border-red-300 focus:ring-red-100' 
            : 'border-slate-200 focus:border-slate-300 focus:ring-slate-50'}
        `}
      >
        <div className="flex-1 truncate flex items-center gap-2">
          {icon && <span className="text-slate-400 flex-shrink-0">{icon}</span>}
          <div className="flex-1 truncate">
            {selectedItem ? (
              children ? children(selectedItem) : (
                <SelectItem {...selectedItem} isSelected>
                  {selectedItem.label}
                </SelectItem>
              )
            ) : (
              <span className="text-slate-500">{placeholder}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {error && <AlertCircle className="w-4 h-4 text-red-500" />}
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 w-full mt-1 top-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
              {items.length === 0 ? (
                <div className="p-3 text-sm text-slate-500 text-center">No options available</div>
              ) : (
                items.map((item) => {
                  const isSelected = value === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={item.isDisabled}
                      onClick={() => handleSelect(item)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors
                        ${item.isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-default hover:bg-slate-50'}
                        ${isSelected ? 'bg-slate-50' : ''}
                      `}
                    >
                      <div className="flex-1 truncate">
                        {children ? children(item) : (
                          <SelectItem {...item} isSelected={isSelected}>
                            {item.label}
                          </SelectItem>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-slate-900 shrink-0 ml-3" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(hint || error) && (
        <p className={`text-sm ${error ? 'text-red-500' : 'text-slate-500'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

Select.Item = SelectItem;
