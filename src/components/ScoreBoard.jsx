export default function ScoreBoard({ teamA, teamB, status }) {
  return (
    <div className="bg-gradient-to-br from-[#00C9A7] to-[#00A98F] rounded-3xl p-6 text-white shadow-xl shadow-teal-500/30">
      {/* Status badge */}
      <div className="flex justify-center mb-4">
        {status === 'live' ? (
          <span className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 bg-red-400 rounded-full live-dot" />
            Live
          </span>
        ) : (
          <span className="bg-white/20 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest">
            Final
          </span>
        )}
      </div>

      {/* Score row */}
      <div className="flex items-center justify-between">
        {/* Team A */}
        <div className="flex-1 flex flex-col items-center">
          {teamA?.logoUrl ? (
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 mb-2">
              <img src={teamA.logoUrl} alt={teamA.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-lg font-black mb-2">
              {teamA?.name?.charAt(0) || 'A'}
            </div>
          )}
          <div className="font-bold text-[10px] text-center text-white/90 uppercase tracking-widest leading-tight">
            {teamA?.name || 'Team A'}
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-3 mx-4">
          <span className="text-5xl font-black tabular-nums" id="score-a">{teamA?.score ?? 0}</span>
          <span className="text-2xl font-thin text-white/60">:</span>
          <span className="text-5xl font-black tabular-nums" id="score-b">{teamB?.score ?? 0}</span>
        </div>

        {/* Team B */}
        <div className="flex-1 flex flex-col items-center">
          {teamB?.logoUrl ? (
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 mb-2">
              <img src={teamB.logoUrl} alt={teamB.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-lg font-black mb-2">
              {teamB?.name?.charAt(0) || 'B'}
            </div>
          )}
          <div className="font-bold text-[10px] text-center text-white/90 uppercase tracking-widest leading-tight">
            {teamB?.name || 'Team B'}
          </div>
        </div>
      </div>
    </div>
  );
}
