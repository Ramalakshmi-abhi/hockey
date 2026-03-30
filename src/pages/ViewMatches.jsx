import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { ref, onValue } from 'firebase/database';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';

export default function ViewMatches() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [activeTab, setActiveTab] = useState('LIVE');

  // Get current user on mount
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user?.uid || null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    const matchesRef = ref(db, 'matches');
    const unsub = onValue(matchesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const matchesList = Object.entries(data).map(([id, val]) => ({
          id,
          ...val
        })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setMatches(matchesList);
      } else {
        setMatches([]);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Helper function to check if match is currently live
  const isMatchLive = (match) => {
    if (match.status === 'live') return true;
    if (!match.schedule) return false;

    const matchDate = match.schedule.matchDate; // Format: YYYY-MM-DD
    const matchTime = match.schedule.matchTime; // Format: HH:MM

    if (!matchDate || !matchTime) return false;

    const today = new Date();
    const todayDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Only consider today's matches
    if (matchDate !== todayDate) return false;

    // Parse match time and current time
    const [matchHours, matchMins] = matchTime.split(':').map(Number);
    const matchMinutesTotal = matchHours * 60 + matchMins;
    const currentMinutesTotal = today.getHours() * 60 + today.getMinutes();

    // Consider live if match time is within 30 minutes before or after current time
    return Math.abs(currentMinutesTotal - matchMinutesTotal) <= 30;
  };

  const filteredMatches = matches.filter(m => {
    // Only show matches created by the current user
    if (currentUserId && m.createdBy && m.createdBy !== currentUserId) {
      return false;
    }
    
    if (activeTab === 'LIVE') {
      return m.status === 'live' || (m.status === 'scheduled' && isMatchLive(m));
    }
    if (activeTab === 'FINISHED') return m.status === 'completed';
    if (activeTab === 'UPCOMING') {
      // Don't show in upcoming if it's live
      if (m.status === 'live' || (m.status === 'scheduled' && isMatchLive(m))) {
        return false;
      }
      return m.status === 'upcoming' || m.status === 'pending' || m.status === 'scheduled' || (!m.status && !m.teamA?.score && !m.teamB?.score);
    }
    return true;
  });

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '3/30/2026 • 09:18 AM'; // Placeholder if no timestamp
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' • ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-[#F9FBFC]">
      <Header />
      {/* Tab Header */}
      <div className="bg-white px-6 pt-6 pb-2 sticky top-[60px] z-20">
        <div className="flex items-center justify-center gap-3 mb-6">
          {['LIVE', 'UPCOMING', 'FINISHED'].map(tab => (
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
        <div className="h-[1px] bg-gray-100 -mx-6 mb-4" />
        <h2 className="text-[15px] font-black text-gray-800 tracking-tight">
          {activeTab === 'LIVE' ? 'Live Hockey Matches' : activeTab === 'UPCOMING' ? 'Upcoming Matches' : 'Finished Matches'}
        </h2>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-4 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="w-12 h-12 border-[3.5px] border-gray-100 border-t-[#009270] rounded-full animate-spin" />
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center opacity-40">
            <div className="text-5xl mb-4">🏒</div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">No {activeTab.toLowerCase()} matches</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {filteredMatches.map(m => (
              <div
                key={m.id}
                onClick={() => navigate(`/match/${m.id}`)}
                className="bg-white rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E8EAF0] cursor-pointer hover:shadow-lg transition-all relative overflow-hidden group w-full"
              >
                {/* Status Badge */}
                <div className={`absolute top-5 left-5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                  m.status === 'live' ? 'bg-[#FF4D4D] text-white shadow-sm' : 'bg-[#E0FBF5] text-[#00C9A7]'
                }`}>
                  {m.status === 'live' ? 'Live' : 'Scheduled'}
                </div>
                
                {/* Tournament Name Header */}
                <div className="text-[9px] font-black tracking-widest text-[#00C9A7] uppercase text-center mt-1 mb-6">
                  {m.schedule?.tournament || 'CUSTOM TOURNAMENT'}
                </div>

                {/* Team Logos and VS */}
                <div className="flex items-center justify-between mb-6 px-4 relative">
                  {/* Team A */}
                  <div className="flex flex-col items-center flex-1">
                    {m.teamA?.logoUrl ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden shadow-md group-hover:scale-105 transition-transform border border-gray-100">
                        <img src={m.teamA.logoUrl} alt={m.teamA.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#1E88E5] flex items-center justify-center text-white font-black text-xl shadow-md border-2 border-white group-hover:scale-105 transition-transform">
                        {m.teamA?.name?.substring(0, 2).toUpperCase() || 'T1'}
                      </div>
                    )}
                  </div>
                  
                  {/* VS and Ground Info */}
                  <div className="flex flex-col items-center absolute inset-x-0 mx-auto justify-center pointer-events-none">
                     <div className="text-[10px] font-bold text-[#8A8FA3] bg-[#F4F6F9] px-2.5 py-0.5 rounded-full mb-2">VS</div>
                     <div className="text-[8px] font-bold text-[#8A8FA3] uppercase tracking-widest text-center truncate max-w-[120px]">
                       {m.schedule?.venue || 'UNKNOWN GROUND'}
                     </div>
                     <div className="text-[8px] font-bold text-[#A0AEC0] mt-0.5 whitespace-nowrap">
                       {m.schedule?.matchDate || new Date(m.createdAt || Date.now()).toLocaleDateString()} • {m.schedule?.matchTime || '11:16 AM'}
                     </div>
                  </div>

                  {/* Team B */}
                  <div className="flex flex-col items-center flex-1">
                    {m.teamB?.logoUrl ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden shadow-md group-hover:scale-105 transition-transform border border-gray-100">
                        <img src={m.teamB.logoUrl} alt={m.teamB.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#1A1A2E] flex items-center justify-center text-white font-black text-xl shadow-md border-2 border-white group-hover:scale-105 transition-transform">
                        {m.teamB?.name?.substring(0, 2).toUpperCase() || 'T2'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Scores Footer */}
                <div className="flex items-center justify-between px-6">
                   <div className="flex flex-col items-center flex-1 text-center">
                      <span className="text-[11px] font-black text-[#1A1A2E] truncate w-24 uppercase mb-1">{m.teamA?.name}</span>
                      <span className="text-base font-black text-[#009270]">{m.teamA?.score || 0} <span className="text-[10px] text-gray-400 font-bold ml-0.5">({m.teamA?.score || 0})</span></span>
                   </div>
                   <div className="flex-1" />
                   <div className="flex flex-col items-center flex-1 text-center">
                      <span className="text-[11px] font-black text-[#1A1A2E] truncate w-24 uppercase mb-1">{m.teamB?.name}</span>
                      <span className="text-base font-black text-[#009270]">{m.teamB?.score || 0} <span className="text-[10px] text-gray-400 font-bold ml-0.5">({m.teamB?.score || 0})</span></span>
                   </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
