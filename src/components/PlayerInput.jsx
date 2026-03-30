import { useState } from 'react';
import AutocompleteInput from './AutocompleteInput';

const ROLES = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper'];

export default function PlayerInput({ onAdd, disabled, savedPlayers = [] }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Forward');
  const [isScorer, setIsScorer] = useState(false);

  function handleAdd() {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), phone, role, isScorer });
    setName('');
    setPhone('');
    setRole('Forward');
    setIsScorer(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Player name */}
      <AutocompleteInput
        className="input-field"
        placeholder="Search player name..."
        value={name}
        onChange={setName}
        onSelect={(val) => setName(val)}
        options={savedPlayers}
        disabled={disabled}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
      />
      {/* Phone + Role */}
      <div className="flex gap-2">
        <input
          className="input-field"
          placeholder="Phone (optional)"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          disabled={disabled}
        />
        <select
          className="input-field"
          value={role}
          onChange={e => setRole(e.target.value)}
          disabled={disabled}
        >
          {ROLES.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      {/* Assign scorer + Add button */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="#00C9A7" strokeWidth="2" className="w-4 h-4">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-sm text-[#8A8FA3] font-medium">Assign Scorer</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={isScorer}
              onChange={e => setIsScorer(e.target.checked)}
              disabled={disabled}
            />
            <span className="toggle-slider" />
          </label>
        </div>
        <button
          onClick={handleAdd}
          disabled={disabled || !name.trim()}
          className="btn-teal w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
