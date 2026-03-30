import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function JoinMatch() {
  const navigate = useNavigate();
  const [matchId, setMatchId] = useState('');

  function handleJoin() {
    if (!matchId.trim()) return;
    navigate(`/match/${matchId.trim()}`);
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-gray-100 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2.5" className="w-5 h-5">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-lg font-black tracking-widest text-[#1A1A2E] uppercase">Join Match</h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-16 flex flex-col items-center">
        {/* Icon */}
        <div className="mb-6 select-none" style={{ fontSize: 64 }}>🏒</div>

        <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">Join a Live Match</h2>
        <p className="text-sm text-[#8A8FA3] mb-8 text-center">
          Enter the match ID shared by the match creator to watch or follow along in real-time.
        </p>

        {/* Input */}
        <div className="w-full card p-5 mb-6">
          <label className="text-xs font-semibold text-[#8A8FA3] uppercase tracking-wider block mb-2">
            Match ID
          </label>
          <input
            className="input-field text-center font-mono tracking-wider"
            placeholder="Paste match ID here..."
            value={matchId}
            onChange={e => setMatchId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
        </div>

        <button
          onClick={handleJoin}
          disabled={!matchId.trim()}
          className="btn-teal w-full max-w-md py-4 rounded-2xl text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M8 5v14l11-7z"/></svg>
          Join Match
        </button>
      </div>
    </div>
  );
}
