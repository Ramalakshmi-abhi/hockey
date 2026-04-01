import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { auth, db } from '../firebase';
import BottomNav from '../components/BottomNav';

function isMatchLive(match) {
  if (match.status === 'live') return true;
  if (!match.schedule) return false;

  const matchDate = match.schedule.matchDate;
  const matchTime = match.schedule.matchTime;
  if (!matchDate || !matchTime) return false;

  const today = new Date();
  const todayDate = today.toISOString().split('T')[0];
  if (matchDate !== todayDate) return false;

  const [matchHours, matchMins] = matchTime.split(':').map(Number);
  const matchMinutesTotal = matchHours * 60 + matchMins;
  const currentMinutesTotal = today.getHours() * 60 + today.getMinutes();
  return Math.abs(currentMinutesTotal - matchMinutesTotal) <= 30;
}

export default function MyCreatedMatches() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('LIVE');
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingMatches, setLoadingMatches] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user || null);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) {
      setMatches([]);
      setLoadingMatches(false);
      return;
    }

    setLoadingMatches(true);
    const matchesRef = ref(db, 'matches');

    const unsubscribe = onValue(
      matchesRef,
      (snapshot) => {
        const data = snapshot.val();
        if (!data) {
          setMatches([]);
          setLoadingMatches(false);
          return;
        }

        const myMatches = Object.entries(data)
          .map(([id, match]) => ({ id, ...match }))
          .filter((match) => match.createdBy === currentUser.uid)
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        setMatches(myMatches);
        setLoadingMatches(false);
      },
      (error) => {
        console.error('Failed to load created matches:', error);
        setLoadingMatches(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const liveNow = isMatchLive(match);

      if (activeTab === 'LIVE') {
        return match.status === 'live' || (match.status === 'scheduled' && liveNow);
      }
      if (activeTab === 'UPCOMING') {
        if (match.status === 'live' || (match.status === 'scheduled' && liveNow)) return false;
        return (
          match.status === 'scheduled' ||
          match.status === 'upcoming' ||
          match.status === 'pending' ||
          (!match.status && !match.teamA?.score && !match.teamB?.score)
        );
      }
      if (activeTab === 'FINISHED') {
        return match.status === 'completed';
      }

      return true;
    });
  }, [matches, activeTab]);

  const openMatch = (match) => {
    const targetRoute = match.status === 'scheduled' ? `/schedule/${match.id}` : `/match/${match.id}`;
    navigate(targetRoute);
  };

  const isLoading = loadingAuth || loadingMatches;

  return (
    <div className="min-h-screen bg-[#F9FBFC]">
      <div className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-30 shadow-sm border-b border-[#E8EAF0]">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2.5" className="w-5 h-5">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-black text-[#1A1A2E] uppercase tracking-wider">My Created Matches</h1>
      </div>

      {!isLoading && !currentUser ? (
        <div className="px-5 pt-8 pb-24">
          <div className="bg-white rounded-3xl border border-[#E8EAF0] p-8 text-center shadow-sm">
            <p className="text-sm font-bold text-[#1A1A2E]">Please log in to view your created matches.</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 bg-[#009270] text-white text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-xl"
            >
              Go To Login
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white px-6 pt-5 pb-2 sticky top-[68px] z-20 border-b border-[#EEF1F5]">
            <div className="flex items-center justify-center gap-3 mb-6">
              {['LIVE', 'UPCOMING', 'FINISHED'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 max-w-[120px] py-2.5 rounded-[14px] text-[11px] font-black tracking-wider transition-all duration-300 ${
                    activeTab === tab
                      ? 'bg-[#009270] text-white shadow-[0_4px_12px_rgba(0,146,112,0.3)]'
                      : 'bg-[#F2F5F8] text-[#8A8FA3] hover:bg-[#E8EDF2]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <h2 className="text-[15px] font-black text-gray-800 tracking-tight">
              {activeTab === 'LIVE'
                ? 'Live Hockey Matches'
                : activeTab === 'UPCOMING'
                  ? 'Upcoming Matches'
                  : 'Finished Matches'}
            </h2>
          </div>

          <div className="max-w-2xl mx-auto px-5 pt-4 pb-24">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-3">
                <div className="w-12 h-12 border-[3.5px] border-gray-100 border-t-[#009270] rounded-full animate-spin" />
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="flex flex-col items-center py-24 text-center opacity-40">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">
                  No {activeTab.toLowerCase()} matches
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {filteredMatches.map((match) => {
                  const liveNow = isMatchLive(match);
                  const badgeClass = liveNow
                    ? 'bg-[#FF4D4D] text-white shadow-sm'
                    : match.status === 'completed'
                      ? 'bg-[#EAF1FF] text-[#4169E1]'
                      : 'bg-[#E0FBF5] text-[#00C9A7]';
                  const badgeLabel = liveNow
                    ? 'Live'
                    : match.status === 'completed'
                      ? 'Finished'
                      : match.status === 'scheduled'
                        ? 'Scheduled'
                        : 'Pending';

                  return (
                    <div
                      key={match.id}
                      onClick={() => openMatch(match)}
                      className="bg-white rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E8EAF0] cursor-pointer hover:shadow-lg transition-all relative overflow-hidden group w-full"
                    >
                      <div
                        className={`absolute top-5 left-5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${badgeClass}`}
                      >
                        {badgeLabel}
                      </div>

                      <div className="text-[9px] font-black tracking-widest text-[#00C9A7] uppercase text-center mt-1 mb-6">
                        {match.schedule?.tournament || 'CUSTOM TOURNAMENT'}
                      </div>

                      <div className="flex items-center justify-between mb-6 px-4 relative">
                        <div className="flex flex-col items-center flex-1">
                          {match.teamA?.logoUrl ? (
                            <div className="w-16 h-16 rounded-full overflow-hidden shadow-md group-hover:scale-105 transition-transform border border-gray-100">
                              <img src={match.teamA.logoUrl} alt={match.teamA.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-[#1E88E5] flex items-center justify-center text-white font-black text-xl shadow-md border-2 border-white group-hover:scale-105 transition-transform">
                              {match.teamA?.name?.substring(0, 2).toUpperCase() || 'T1'}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-center absolute inset-x-0 mx-auto justify-center pointer-events-none">
                          <div className="text-[10px] font-bold text-[#8A8FA3] bg-[#F4F6F9] px-2.5 py-0.5 rounded-full mb-2">VS</div>
                          <div className="text-[8px] font-bold text-[#8A8FA3] uppercase tracking-widest text-center truncate max-w-[120px]">
                            {match.schedule?.venue || 'UNKNOWN GROUND'}
                          </div>
                          <div className="text-[8px] font-bold text-[#A0AEC0] mt-0.5 whitespace-nowrap">
                            {match.schedule?.matchDate || new Date(match.createdAt || Date.now()).toLocaleDateString()} - {match.schedule?.matchTime || '11:16'}
                          </div>
                        </div>

                        <div className="flex flex-col items-center flex-1">
                          {match.teamB?.logoUrl ? (
                            <div className="w-16 h-16 rounded-full overflow-hidden shadow-md group-hover:scale-105 transition-transform border border-gray-100">
                              <img src={match.teamB.logoUrl} alt={match.teamB.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-[#1A1A2E] flex items-center justify-center text-white font-black text-xl shadow-md border-2 border-white group-hover:scale-105 transition-transform">
                              {match.teamB?.name?.substring(0, 2).toUpperCase() || 'T2'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-6">
                        <div className="flex flex-col items-center flex-1 text-center">
                          <span className="text-[11px] font-black text-[#1A1A2E] truncate w-24 uppercase mb-1">
                            {match.teamA?.name}
                          </span>
                          <span className="text-base font-black text-[#009270]">
                            {match.teamA?.score || 0}{' '}
                            <span className="text-[10px] text-gray-400 font-bold ml-0.5">({match.teamA?.score || 0})</span>
                          </span>
                        </div>
                        <div className="flex-1" />
                        <div className="flex flex-col items-center flex-1 text-center">
                          <span className="text-[11px] font-black text-[#1A1A2E] truncate w-24 uppercase mb-1">
                            {match.teamB?.name}
                          </span>
                          <span className="text-base font-black text-[#009270]">
                            {match.teamB?.score || 0}{' '}
                            <span className="text-[10px] text-gray-400 font-bold ml-0.5">({match.teamB?.score || 0})</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
