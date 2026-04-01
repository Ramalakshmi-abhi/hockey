import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import BottomNav from '../components/BottomNav';

export default function Tournaments() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');

  const getTeamsForTournament = (t) => {
    if (Array.isArray(t.teams) && t.teams.length > 0) return t.teams;
    if (!Array.isArray(t.groups)) return [];

    const names = [...new Set(
      t.groups.flatMap(group =>
        Array.isArray(group?.teams)
          ? group.teams.map(team => (team?.name || '').trim()).filter(Boolean)
          : []
      )
    )];

    return names.map(teamName => ({ name: teamName }));
  };

  useEffect(() => {
    const tRef = ref(db, 'tournaments');
    const unsub = onValue(tRef, (snap) => {
      setReadError('');
      const data = snap.val();
      if (data) {
        const tList = Object.entries(data).map(([id, val]) => ({
          id,
          ...val
        })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setTournaments(tList);
      } else {
        setTournaments([]);
      }
      setLoading(false);
    }, (err) => {
      console.error('Failed to load tournaments', err);
      setReadError(err?.message || 'Permission denied while loading tournaments.');
      setTournaments([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await push(ref(db, 'tournaments'), {
        name,
        location: location || 'TBD',
        startDate: startDate || new Date().toISOString().split('T')[0],
        status: 'upcoming',
        createdAt: serverTimestamp()
      });
      setShowCreate(false);
      setName('');
      setLocation('');
      setStartDate('');
    } catch (err) {
      console.error('Failed to create tournament', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-gray-100 transition">
            <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2.5" className="w-5 h-5">
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1 className="text-lg font-black tracking-widest text-[#1A1A2E] uppercase">Tournaments</h1>
        </div>
        <button 
          onClick={() => navigate('/create-tournament')} 
          className="w-8 h-8 rounded-full bg-[#00C9A7] text-white flex items-center justify-center font-bold shadow-sm"
        >
          +
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-3 border-[#00C9A7] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : readError ? (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm font-medium">
            {readError}
          </div>
        ) : tournaments.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="text-5xl mb-4 select-none opacity-50">🏆</div>
            <p className="text-[#1A1A2E] font-bold text-lg mb-2">No Tournaments</p>
            <p className="text-[#8A8FA3] text-sm mb-6">Create the first tournament to get started!</p>
            {!showCreate && (
              <button 
                onClick={() => setShowCreate(true)} 
                className="btn-teal px-6 py-2.5 rounded-xl text-sm font-bold"
              >
                Create Tournament
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {tournaments.map(t => {
              const tournamentTeams = getTeamsForTournament(t);
              const teamCount = tournamentTeams.length || t.teamCount || 0;

              return (
              <div
                key={t.id}
                onClick={() => navigate(`/tournaments/${t.id}`)}
                className="bg-white p-5 rounded-3xl shadow-sm border border-[#E8EAF0] relative overflow-hidden animate-slide-in cursor-pointer hover:shadow-lg transition-all"
              >
                <div className={`absolute top-0 left-0 w-1.5 h-full ${t.status === 'live' ? 'bg-[#E53E3E]' : 'bg-[#00C9A7]'}`} />
                
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-black text-[#1A1A2E] text-lg leading-tight uppercase tracking-tight mb-1">{t.name}</h3>
                    <p className="text-[10px] font-bold text-[#00C9A7] uppercase tracking-widest bg-[#E0FBF5] inline-block px-2 py-0.5 rounded-full">
                      {teamCount} Teams
                    </p>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl ${
                    t.status === 'live' ? 'bg-[#E53E3E] text-white shadow-lg' : 
                    t.status === 'completed' ? 'bg-gray-100 text-[#8A8FA3]' : 'bg-[#E0FBF5] text-[#00C9A7]'
                  }`}>
                    {t.status}
                  </span>
                </div>

                {/* Teams List Summary */}
                {tournamentTeams.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {tournamentTeams.map((team, idx) => (
                      <span key={idx} className="text-[10px] bg-gray-50 text-gray-500 px-3 py-1 rounded-lg border border-gray-100 font-bold uppercase transition-all hover:border-[#00C9A7]/30 hover:text-[#1A1A2E]">
                        {team.name || `Team ${idx + 1}`}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-3 border-t border-gray-50">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <div className="flex items-center gap-2 text-[#8A8FA3]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-[#00C9A7]"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {t.location || 'TBD'}
                    </div>
                    <div className="flex items-center gap-2 text-[#1A1A2E] tracking-widest uppercase">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 text-[#00C9A7]"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {t.startDate ? new Date(t.startDate).toLocaleDateString() : (t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A')}
                      <span className="text-[#D1D5DB] ml-1">
                        {t.createdAt ? new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
