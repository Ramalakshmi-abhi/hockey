import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import ScoreBoard from '../components/ScoreBoard';
import Timer from '../components/Timer';
import EventModal from '../components/EventModal';

const EVENT_ICONS = {
  goal: '⚽',
  yellow_card: '🟨',
  red_card: '🟥',
  substitution: '🔄',
};

export default function LiveMatch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isOfficial, setIsOfficial] = useState(false);

  useEffect(() => {
    if (id) {
      const myMatches = JSON.parse(localStorage.getItem('myMatches') || '[]');
      setIsOfficial(myMatches.includes(id));
    }
  }, [id]);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(id);
      } else {
        throw new Error('Clipboard API not available');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers or non-secure contexts
      try {
        const textArea = document.createElement("textarea");
        textArea.value = id;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error('Fallback copy failed:', e);
        alert('Failed to copy Match ID. Please select and copy manually.');
      }
    }
  };

  // Real-time listener
  useEffect(() => {
    if (!id) return;
    const matchRef = ref(db, `matches/${id}`);
    
    // 1. Try exact match first
    const unsub = onValue(matchRef, (snap) => {
      const data = snap.val();
      if (data) {
        setMatch({ id: snap.key, ...data });
        setLoading(false);
      } else {
        // 2. Fallback: Search for matches whose ID starts with the provided code
        // This is useful if the user types or copies a truncated ID
        const allMatchesRef = ref(db, 'matches');
        onValue(allMatchesRef, (matchesSnap) => {
          const allData = matchesSnap.val();
          if (allData) {
            // Find a match key that starts with our input code
            const foundId = Object.keys(allData).find(key => 
              key.toUpperCase().startsWith(id.toUpperCase())
            );
            if (foundId) {
              setMatch({ id: foundId, ...allData[foundId] });
              setError('');
            } else {
              setError('Match not found.');
            }
          } else {
            setError('No matches found in database.');
          }
          setLoading(false);
        }, { onlyOnce: true });
      }
    }, (err) => {
      console.error(err);
      setError('Failed to load match.');
      setLoading(false);
    });

    return () => unsub();
  }, [id]);

  const handleTimeUpdate = useCallback(async (time) => {
    if (!match?.id) return;
    try {
      await update(ref(db, `matches/${match.id}`), { time });
    } catch (e) {
      console.error('Failed to update time', e);
    }
  }, [match?.id]);

  async function handleEvent(event) {
    if (!match?.id) return;
    try {
      const matchRef = ref(db, `matches/${match.id}`);
      const currentEvents = match.events || [];
      const updates = {
        events: [...currentEvents, event]
      };
      
      // If goal, increment score
      if (event.type === 'goal') {
        if (event.team === 'A') {
          updates['teamA/score'] = (match.teamA.score || 0) + 1;
        } else {
          updates['teamB/score'] = (match.teamB.score || 0) + 1;
        }
      }
      
      await update(matchRef, updates);
      setShowModal(false);
    } catch (e) {
      console.error('Failed to add event', e);
    }
  }

  async function handleStartMatch() {
    try {
      await update(ref(db, `matches/${match.id}`), { status: 'live' });
    } catch (e) {
      console.error('Failed to start match', e);
    }
  }

  async function handleEndMatch() {
    try {
      await update(ref(db, `matches/${match.id}`), { status: 'ended' });
    } catch (e) {
      console.error('Failed to end match', e);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#00C9A7] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#8A8FA3] font-medium">Loading match...</p>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center px-4">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-[#1A1A2E] font-bold text-lg mb-2">Match Not Found</p>
        <p className="text-[#8A8FA3] text-sm mb-6">{error || 'This match does not exist.'}</p>
        <button onClick={() => navigate('/')} className="btn-teal px-6 py-2.5 rounded-xl text-sm">
          Go Home
        </button>
      </div>
    );
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
        <h1 className="text-lg font-black tracking-widest text-[#1A1A2E] uppercase flex-1">Live Match</h1>
        <span className="text-xs bg-[#E0FBF5] text-[#00C9A7] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
          {match.time || '00:00'}
        </span>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-8 pt-4">
        {/* Scoreboard */}
        <div className="mb-5">
          <ScoreBoard teamA={match.teamA} teamB={match.teamB} status={match.status} />
        </div>

        {/* Match ID */}
        <div className="card p-4 mb-5 flex items-center gap-3">
          <span className="text-xs text-[#8A8FA3] font-semibold uppercase tracking-wider">Match ID:</span>
          <code className="text-xs bg-[#F4F6F9] px-2 py-1 rounded font-mono text-[#1A1A2E] flex-1 truncate">{id}</code>
          <button
            onClick={handleCopy}
            className={`text-xs font-semibold transition-colors ${
              copied ? 'text-green-500' : 'text-[#00C9A7] hover:underline'
            }`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Timer */}
        {isOfficial ? (
          <div className="mb-5">
            <Timer onTimeUpdate={handleTimeUpdate} />
          </div>
        ) : (
          <div className="card p-5 text-center mb-5">
            <div className="text-5xl font-black tabular-nums text-[#1A1A2E] tracking-tight">
              {match.time || '00:00'}
            </div>
            <p className="text-xs font-semibold tracking-widest text-[#8A8FA3] uppercase mt-4">Match Time</p>
          </div>
        )}

        {/* Schedule Info */}
        {match.schedule && (
          <div className="bg-white border border-[#E8EAF0] rounded-[2rem] p-6 mb-5 shadow-sm">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-[#8A8FA3] uppercase tracking-widest">Toss Winner</span>
                <span className="text-sm font-black text-[#1A1A2E]">{match.schedule.tossWinner || 'N/A'}</span>
                <span className="text-[10px] text-[#00C9A7] font-bold uppercase">{match.schedule.tossDecision}</span>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[10px] font-black text-[#8A8FA3] uppercase tracking-widest">Venue</span>
                <span className="text-sm font-black text-[#1A1A2E] truncate">{match.schedule.venue || 'Stadium'}</span>
                <span className="text-[10px] text-[#00C9A7] font-bold uppercase">{match.schedule.matchTime}</span>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
               <div className="flex items-center gap-2">
                 <span className="text-lg">📅</span>
                 <span className="text-xs font-bold text-[#1A1A2E]">{match.schedule.matchDate}</span>
               </div>
               <div className="bg-[#F4F6F9] px-3 py-1 rounded-full text-[10px] font-black text-[#8A8FA3] uppercase tracking-widest">
                 {match.schedule.periods}
               </div>
            </div>
          </div>
        )}

        {/* Event Actions */}
        {isOfficial && (
          <div className="flex flex-col gap-3 mb-5">
            {match.status !== 'live' && match.status !== 'ended' ? (
              <button
                onClick={handleStartMatch}
                className="btn-teal py-4 rounded-xl text-sm font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8 5v14l11-7z"/></svg>
                Start Match
              </button>
            ) : match.status === 'live' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowModal(true)}
                    className="btn-teal py-4 rounded-xl text-sm font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg col-span-2"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                    Add Event
                  </button>
                  <button
                    onClick={handleEndMatch}
                    className="bg-[#E53E3E] text-white py-4 rounded-xl text-[10px] font-black tracking-widest uppercase hover:bg-red-600 transition shadow-md col-span-2 mt-2"
                  >
                    End Match
                  </button>
                </div>
              </>
            ) : (
                <div className="bg-gray-100 text-gray-500 py-4 rounded-xl text-center text-[10px] font-black uppercase tracking-widest">
                  Match Completed
                </div>
            )}
          </div>
        )}

        {/* Events Log */}
        <div className="card p-5">
          <h3 className="text-xs font-semibold tracking-widest text-[#8A8FA3] uppercase mb-4">
            Match Events
          </h3>
          {(!match.events || match.events.length === 0) ? (
            <p className="text-sm text-[#8A8FA3] text-center py-6">No events yet. Start the match and add events!</p>
          ) : (
            <div className="flex flex-col gap-2">
              {match.events.map((ev, i) => (
                <div key={i} className="flex items-center gap-3 border border-[#E8EAF0] rounded-xl px-4 py-3 slide-in">
                  <span className="text-lg">{EVENT_ICONS[ev.type] || '📋'}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-[#1A1A2E]">
                      {ev.player}
                      {ev.type === 'substitution' && ev.subPlayer && (
                        <span className="text-[#8A8FA3] font-normal"> → {ev.subPlayer}</span>
                      )}
                    </div>
                    <div className="text-xs text-[#8A8FA3]">
                      Team {ev.team} · {ev.type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      {showModal && (
        <EventModal
          teamA={match.teamA}
          teamB={match.teamB}
          onSubmit={handleEvent}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
