import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import BottomNav from '../components/BottomNav';

export default function ScheduleMatch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form states
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState('');
  const [periods, setPeriods] = useState('4 Quarters');
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [matchTime, setMatchTime] = useState('10:00');
  const [venue, setVenue] = useState('');
  const [rules, setRules] = useState('');
  const [extras, setExtras] = useState({
    penaltyCorner: true,
    penaltyStroke: true,
    longCorner: true,
  });

  useEffect(() => {
    if (!id) return;
    const matchRef = ref(db, `matches/${id}`);
    const unsub = onValue(matchRef, (snap) => {
      const data = snap.val();
      if (data) {
        setMatch({ id: snap.key, ...data });
      } else {
        setError('Match not found.');
      }
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  async function handleConfirmMatch() {
    try {
      await update(ref(db, `matches/${id}`), {
        schedule: {
          tossWinner,
          tossDecision,
          periods,
          matchDate,
          matchTime,
          venue,
          rules,
          extras
        },
        status: 'scheduled'
      });
      alert('Match Scheduled Successfully!');
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      setError('Failed to update match schedule.');
    }
  }

  const handleCopy = () => {
    // Copy the FULL ID so the link works correctly
    navigator.clipboard.writeText(id).then(() => {
      alert('Match Code Copied! You can now share this with others.');
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  const handleShare = async () => {
    const code = id.substring(0, 10).toUpperCase();
    const shareData = {
      title: 'Hockey Live Match',
      text: `Join my Hockey Match! Code: ${code}`,
      url: window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        alert(`Join Match!\nCode: ${code}\nUrl: ${window.location.origin}`);
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
      <div className="w-10 h-10 border-3 border-[#00C9A7] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !match) return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center p-4 text-center">
      <div className="text-4xl mb-4">⚠️</div>
      <p className="text-[#1A1A2E] font-bold text-lg">{error || 'Match not found'}</p>
      <button onClick={() => navigate('/')} className="btn-teal mt-4 px-6 py-2 rounded-xl">Go Home</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/create')} className="p-2 rounded-xl hover:bg-gray-100 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2.5" className="w-5 h-5">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-lg font-black tracking-widest text-[#1A1A2E] uppercase flex-1">Match Schedule</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-32 pt-4">
        {/* Match Code Banner */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 text-center border border-[#00C9A7]/10">
          <p className="text-[10px] font-bold tracking-[0.2em] text-[#8A8FA3] uppercase mb-3">Match Code</p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-3xl font-black text-[#00C9A7] tracking-widest font-mono">
              {id.substring(0, 10).toUpperCase()}
            </span>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="p-2 bg-[#F4F6F9] rounded-lg hover:bg-gray-200 transition-colors shadow-sm">
                 <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2.5" className="w-4 h-4"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button onClick={handleShare} className="p-2 bg-[#F4F6F9] rounded-lg hover:bg-gray-200 transition-colors shadow-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2.5" className="w-4 h-4"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Form Sections */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#E8EAF0] mb-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider block mb-2">Toss Winner</label>
              <select 
                className="input-field py-2.5 text-sm"
                value={tossWinner}
                onChange={e => setTossWinner(e.target.value)}
              >
                <option value="">Select Winner</option>
                <option value={match.teamA.name}>{match.teamA.name}</option>
                <option value={match.teamB.name}>{match.teamB.name}</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider block mb-2">Toss Decision</label>
              <select 
                className="input-field py-2.5 text-sm"
                value={tossDecision}
                onChange={e => setTossDecision(e.target.value)}
              >
                <option value="">Select Decision</option>
                <option value="Start (Push-back)">Start (Push-back)</option>
                <option value="Side Choice">Side Choice</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider block mb-2">Match Format (Periods)</label>
            <select 
              className="input-field py-2.5 text-sm"
              value={periods}
              onChange={e => setPeriods(e.target.value)}
            >
              <option value="4 Quarters">4 Quarters (15m each)</option>
              <option value="2 Halves">2 Halves (35m each)</option>
              <option value="Full Time">Full Time (70m)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider block mb-2">Match Date</label>
              <input 
                type="date" 
                className="input-field py-2.5 text-sm"
                value={matchDate}
                onChange={e => setMatchDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider block mb-2">Match Time</label>
              <input 
                type="time" 
                className="input-field py-2.5 text-sm"
                value={matchTime}
                onChange={e => setMatchTime(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider block mb-2">Venue / Location</label>
            <input 
              type="text" 
              className="input-field py-2.5 text-sm"
              placeholder="e.g. National Stadium"
              value={venue}
              onChange={e => setVenue(e.target.value)}
            />
          </div>

          <div className="mb-6">
            <label className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider block mb-2">Match Extras (Selectable)</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'penaltyCorner', label: 'Penalty Corner (PC)' },
                { id: 'penaltyStroke', label: 'Penalty Stroke (PS)' },
                { id: 'longCorner', label: 'Long Corner (LC)' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setExtras(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                    extras[item.id] 
                      ? 'bg-[#00C9A7] border-[#00C9A7] text-white' 
                      : 'bg-white border-[#E8EAF0] text-[#8A8FA3]'
                  }`}
                >
                  {extras[item.id] ? '✓' : '↔'} {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider block mb-2">Match Rules</label>
            <textarea 
              className="input-field py-3 text-sm min-h-[100px]"
              placeholder="Type match specific rules here..."
              value={rules}
              onChange={e => setRules(e.target.value)}
            />
          </div>
        </div>

        {/* Verses Card Preview */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-[#00C9A7]/5 blur-3xl -z-10 rounded-full" />
          <div className="bg-white border-2 border-[#00C9A7]/20 rounded-3xl p-6 shadow-sm overflow-hidden flex items-center justify-between relative">
            <div className="text-center flex-1">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00C9A7] to-[#00A884] shadow-lg mx-auto flex items-center justify-center text-white font-black text-xl mb-2">
                {match.teamA.name.substring(0, 2).toUpperCase()}
              </div>
              <p className="text-xs font-black text-[#1A1A2E] uppercase tracking-tight truncate">{match.teamA.name}</p>
              <p className="text-[10px] font-bold text-[#00C9A7] mt-1">{match.teamA.players.length} Players</p>
            </div>
            
            <div className="px-4">
              <span className="text-xl font-black text-[#1A1A2E] italic opacity-20">VS</span>
            </div>

            <div className="text-center flex-1">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF4D4D] to-[#E53E3E] shadow-lg mx-auto flex items-center justify-center text-white font-black text-xl mb-2">
                {match.teamB.name.substring(0, 2).toUpperCase()}
              </div>
              <p className="text-xs font-black text-[#1A1A2E] uppercase tracking-tight truncate">{match.teamB.name}</p>
              <p className="text-[10px] font-bold text-[#E53E3E] mt-1">{match.teamB.players.length} Players</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleConfirmMatch}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm btn-teal py-4 rounded-2xl text-sm font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow-[0_10px_30px_-10px_rgba(0,201,167,0.5)] z-20"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Schedule Match
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
