import { useState, useRef, useEffect } from 'react';

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

  const filteredOptions = options.filter(opt => {
    const s = String(opt || '');
    return s.toLowerCase().includes(value.toLowerCase());
  });

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        disabled={disabled}
        onKeyDown={onKeyDown}
        autoComplete="off"
      />
      {showDropdown && filteredOptions.length > 0 && !disabled && (
        <ul className="absolute z-50 w-full bg-white mt-1 border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filteredOptions.map((opt, idx) => (
            <li
              key={idx}
              className="px-4 py-2 hover:bg-[#E0FBF5] cursor-pointer text-sm text-[#1A1A2E] border-b last:border-0 border-gray-50 flex items-center justify-between group"
              onClick={() => {
                if (onSelect) onSelect(opt);
                else onChange(opt);
                setShowDropdown(false);
              }}
            >
              <span className="font-medium group-hover:text-[#00C9A7] transition-colors">{opt}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-[#00C9A7] opacity-0 group-hover:opacity-100 transition-opacity">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
