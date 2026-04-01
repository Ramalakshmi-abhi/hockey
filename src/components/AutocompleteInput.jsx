import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function AutocompleteInput({
  value,
  onChange,
  onSelect,
  options = [],
  placeholder = '',
  className = '',
  disabled = false,
  onKeyDown
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const safeOptions = (Array.isArray(options) ? options : Object.values(options || {}))
    .map((opt) => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        const label = String(opt).trim();
        return label ? { label, value: label } : null;
      }

      if (opt && typeof opt === 'object') {
        const label = String(opt.label || opt.name || opt.value || '').trim();
        const value = String(opt.value || label).trim();
        return label ? { label, value } : null;
      }

      return null;
    })
    .filter(Boolean);
  const safeValue = typeof value === 'string' ? value : String(value || '');
  const query = safeValue.toLowerCase().trim();
  const dedupedOptions = Object.values(
    safeOptions.reduce((acc, opt) => {
      const key = opt.label.toLowerCase();
      if (!acc[key]) acc[key] = opt;
      return acc;
    }, {})
  );

  const filteredOptions = dedupedOptions
    .filter((opt) => opt.label.toLowerCase().includes(query))
    .sort((a, b) => {
      const aStarts = a.label.toLowerCase().startsWith(query) ? 0 : 1;
      const bStarts = b.label.toLowerCase().startsWith(query) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;

      if (query && a.label.length !== b.label.length) {
        return b.label.length - a.label.length;
      }

      return a.label.localeCompare(b.label);
    });

  useEffect(() => {
    function handleClickOutside(e) {
      const target = e.target;
      // If click is inside the input, keep open
      if (inputRef.current && inputRef.current.contains(target)) return;
      // If click is inside the original container, keep open
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;
      // If click is inside the portal dropdown, keep open
      if (target && target.closest && target.closest('[data-autocomplete-portal]')) return;

      setShowDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function updatePosition() {
      if (!inputRef.current || !showDropdown) return;
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        left: rect.left + 'px',
        top: rect.bottom + 'px',
        width: rect.width + 'px',
        zIndex: 2147483647
      });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showDropdown]);

  return (
    <div className="relative w-full z-[70]" ref={dropdownRef}>
      <input
        ref={inputRef}
        className={className}
        placeholder={placeholder}
        value={safeValue}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        disabled={disabled}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {showDropdown && filteredOptions.length > 0 && !disabled && dropdownStyle && createPortal(
        <ul data-autocomplete-portal="true" style={dropdownStyle} className="mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {filteredOptions.map((opt, idx) => (
            <li
              key={idx}
              className="px-4 py-2 hover:bg-[#E0FBF5] cursor-pointer text-sm text-[#1A1A2E] border-b last:border-0 border-gray-50 flex items-center justify-between group"
              onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const chosen = opt.label;
                  if (onSelect) onSelect(chosen);
                  else onChange(chosen);
                  setShowDropdown(false);
                }}
            >
              <span className="font-medium group-hover:text-[#00C9A7] transition-colors">{opt.label}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-[#00C9A7] opacity-0 group-hover:opacity-100 transition-opacity">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}
