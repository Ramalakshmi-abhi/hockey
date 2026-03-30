import { useState } from 'react';

const EVENT_TYPES = [
  { key: 'goal', label: '⚽ Goal', color: 'bg-[#00C9A7]' },
  { key: 'yellow_card', label: '🟨 Yellow Card', color: 'bg-[#F6C90E]' },
  { key: 'red_card', label: '🟥 Red Card', color: 'bg-[#E53E3E]' },
  { key: 'substitution', label: '🔄 Substitution', color: 'bg-[#7B5EA7]' },
];

export default function EventModal({ teamA, teamB, onSubmit, onClose }) {
  const [team, setTeam] = useState('A');
  const [eventType, setEventType] = useState('goal');
  const [playerIdx, setPlayerIdx] = useState(0);
  const [subPlayerIdx, setSubPlayerIdx] = useState(0);

  const players = team === 'A' ? (teamA?.players || []) : (teamB?.players || []);

  function handleSubmit() {
    const player = players[playerIdx];
    if (!player) return;
    const event = {
      type: eventType,
      team,
      player: player.name,
      timestamp: new Date().toISOString(),
    };
    if (eventType === 'substitution') {
      event.subPlayer = players[subPlayerIdx]?.name || '';
    }
    onSubmit(event);
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="card w-full max-w-md p-6 slide-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg text-[#1A1A2E]">Add Event</h3>
          <button onClick={onClose} className="text-[#8A8FA3] hover:text-[#1A1A2E] transition p-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Event type grid */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {EVENT_TYPES.map(et => (
            <button
              key={et.key}
              onClick={() => setEventType(et.key)}
              className={`py-3 px-3 rounded-xl text-sm font-semibold transition-all border-2 ${
                eventType === et.key
                  ? 'border-[#00C9A7] bg-[#E0FBF5] text-[#00C9A7]'
                  : 'border-[#E8EAF0] bg-white text-[#8A8FA3] hover:border-[#D1D5DB]'
              }`}
            >
              {et.label}
            </button>
          ))}
        </div>

        {/* Team selection */}
        <div className="flex gap-2 mb-4">
          {['A', 'B'].map(t => (
            <button
              key={t}
              onClick={() => { setTeam(t); setPlayerIdx(0); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                team === t
                  ? 'btn-teal text-white'
                  : 'bg-white border border-[#E8EAF0] text-[#8A8FA3] hover:border-[#D1D5DB]'
              }`}
            >
              {t === 'A' ? teamA?.name : teamB?.name} (Team {t})
            </button>
          ))}
        </div>

        {/* Player select */}
        <label className="text-xs font-semibold text-[#8A8FA3] uppercase tracking-wider block mb-1">
          Player
        </label>
        <select
          className="input-field mb-4"
          value={playerIdx}
          onChange={e => setPlayerIdx(Number(e.target.value))}
        >
          {players.map((p, i) => (
            <option key={i} value={i}>{p.name} ({p.role})</option>
          ))}
        </select>

        {/* Sub player for substitution */}
        {eventType === 'substitution' && (
          <>
            <label className="text-xs font-semibold text-[#8A8FA3] uppercase tracking-wider block mb-1">
              Substitute With
            </label>
            <select
              className="input-field mb-4"
              value={subPlayerIdx}
              onChange={e => setSubPlayerIdx(Number(e.target.value))}
            >
              {players.map((p, i) => (
                <option key={i} value={i}>{p.name} ({p.role})</option>
              ))}
            </select>
          </>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          className="btn-teal w-full py-3.5 rounded-xl text-sm font-bold tracking-wider uppercase"
        >
          Add Event
        </button>
      </div>
    </div>
  );
}
