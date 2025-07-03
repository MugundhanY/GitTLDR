'use client';

import { useState, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ModernSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
}

export default function ModernSearchBar({ 
  value, 
  onChange, 
  placeholder = "Search...", 
  className = "",
  onClear 
}: ModernSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={`relative group ${className}`}>
      <div className={`
        relative overflow-hidden rounded-2xl border-2 transition-all duration-300
        ${isFocused 
          ? 'border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/10' 
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
        }
        bg-white dark:bg-slate-900
      `}>
        {/* Animated gradient border */}
        <div className={`
          absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 transition-opacity duration-300
          ${isFocused ? 'opacity-100' : 'group-hover:opacity-20'}
        `} />
        
        <div className="relative bg-white dark:bg-slate-900 m-[2px] rounded-2xl">
          {/* Search icon */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <MagnifyingGlassIcon className={`
              w-5 h-5 transition-colors duration-300
              ${isFocused 
                ? 'text-blue-500 dark:text-blue-400' 
                : 'text-slate-400 dark:text-slate-500'
              }
            `} />
          </div>
          
          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="
              w-full pl-12 pr-12 py-4 
              bg-transparent 
              text-slate-900 dark:text-white 
              placeholder-slate-400 dark:placeholder-slate-500
              focus:outline-none 
              text-base font-medium
              rounded-2xl
            "
          />
          
          {/* Clear button */}
          {value && (
            <button
              onClick={handleClear}
              className="
                absolute right-4 top-1/2 transform -translate-y-1/2
                p-1 rounded-full
                text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300
                hover:bg-slate-100 dark:hover:bg-slate-800
                transition-all duration-200
              "
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Search suggestions or results count */}
      {value && (
        <div className="absolute top-full left-0 right-0 mt-2 z-10">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
            <div className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              Searching for "{value}"...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
