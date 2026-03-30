import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../firebase';
import { ref, push, onValue, set } from 'firebase/database';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import PlayerInput from '../components/PlayerInput';
import AutocompleteInput from '../components/AutocompleteInput';

const EMPTY_TEAM = { name: '', players: [], logoUrl: '' };
const MAX_PLAYERS = 11;
const MIN_PLAYERS = 7;

function SquadList({ players }) {
  const slots = Array.from({ length: MAX_PLAYERS });
  return (
    <div className="flex flex-col gap-2">
      {slots.map((_, i) => {
        const p = players[i];
        return (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm border transition-all ${
              p
                ? 'bg-[#E0FBF5] border-[#00C9A7]/30 text-[#1A1A2E]'
                : 'bg-white border-[#E8EAF0] text-[#8A8FA3]'
            }`}
          >
            <span className="font-semibold text-[#00C9A7] w-5 text-right">{i + 1}.</span>
            {p ? (
              <div className="flex-1 flex items-center gap-2">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs bg-white border border-[#00C9A7]/30 text-[#00C9A7] rounded-full px-2 py-0.5">{p.role}</span>
                {p.isScorer && (
                  <span className="text-xs bg-[#00C9A7] text-white rounded-full px-2 py-0.5">Scorer</span>
                )}
              </div>
            ) : (
              <span className="tracking-widest text-xs font-semibold uppercase">Empty Slot</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CreateTeam() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('A');
  const [teamA, setTeamA] = useState(() => {
    const saved = localStorage.getItem('teamA');
    return saved ? JSON.parse(saved) : { ...EMPTY_TEAM };
  });
  const [teamB, setTeamB] = useState(() => {
    const saved = localStorage.getItem('teamB');
    return saved ? JSON.parse(saved) : { ...EMPTY_TEAM };
  });
  const [logoFileA, setLogoFileA] = useState(null);
  const [logoFileB, setLogoFileB] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [savedTeams, setSavedTeams] = useState([]);
  const [savedPlayers, setSavedPlayers] = useState([]);
  const [teamSquads, setTeamSquads] = useState({});

  useEffect(() => {
    const teamsRef = ref(db, 'saved_teams');
    const playersRef = ref(db, 'saved_players');

    const unsubscribeTeams = onValue(teamsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const arr = Array.isArray(data) ? data : Object.values(data);
        setSavedTeams([...new Set(arr.map(t => typeof t === 'string' ? t : t.name))].filter(Boolean));
      }
    });

    const unsubscribePlayers = onValue(playersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const arr = Array.isArray(data) ? data : Object.values(data);
        setSavedPlayers([...new Set(arr.map(p => typeof p === 'string' ? p : p.name))].filter(Boolean));
      }
    });

    const teamSquadsRef = ref(db, 'team_squads');
    const unsubscribeSquads = onValue(teamSquadsRef, (snapshot) => {
      if (snapshot.exists()) {
        setTeamSquads(snapshot.val());
      } else {
        setTeamSquads({});
      }
    });

    return () => {
      unsubscribeTeams();
      unsubscribePlayers();
      unsubscribeSquads();
    };
  }, []);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('teamA', JSON.stringify(teamA));
  }, [teamA]);

  useEffect(() => {
    localStorage.setItem('teamB', JSON.stringify(teamB));
  }, [teamB]);

  const currentTeam = activeTab === 'A' ? teamA : teamB;
  const setCurrentTeam = activeTab === 'A' ? setTeamA : setTeamB;

  function handleNameChange(e) {
    setCurrentTeam(prev => ({ ...prev, name: e.target.value }));
  }

  function handleAddPlayer(player) {
    if (currentTeam.players.length >= MAX_PLAYERS) return;
    setCurrentTeam(prev => ({ ...prev, players: [...prev.players, player] }));
  }

  function handleRemovePlayer(idx) {
    setCurrentTeam(prev => ({
      ...prev,
      players: prev.players.filter((_, i) => i !== idx),
    }));
  }

  async function handleLogoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Simple preview for the UI
    const reader = new FileReader();
    reader.onloadend = () => {
      setCurrentTeam(prev => ({ ...prev, logoUrl: reader.result }));
    };
    reader.readAsDataURL(file);

    if (activeTab === 'A') setLogoFileA(file);
    else setLogoFileB(file);
  }

  async function uploadLogo(file, teamName) {
    if (!file) return null;
    try {
      const storageRef = sRef(storage, `logos/${teamName}_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      return await getDownloadURL(snapshot.ref);
    } catch (e) {
      console.error('Logo upload error:', e);
      return null;
    }
  }

  function validate() {
    if (!teamA.name.trim()) return 'Please enter a name for Team A.';
    if (!teamB.name.trim()) return 'Please enter a name for Team B.';
    if (teamA.players.length < MIN_PLAYERS)
      return `Team A needs at least ${MIN_PLAYERS} players. Currently has ${teamA.players.length}.`;
    if (teamB.players.length < MIN_PLAYERS)
      return `Team B needs at least ${MIN_PLAYERS} players. Currently has ${teamB.players.length}.`;
    if (!teamA.players.some(p => p.role === 'Goalkeeper'))
      return 'Team A must have at least one Goalkeeper.';
    if (!teamB.players.some(p => p.role === 'Goalkeeper'))
      return 'Team B must have at least one Goalkeeper.';
    return null;
  }

  async function handleStartMatch() {
    const err = validate();
    if (err) { 
      setError(err); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; 
    }
    setError('');
    setLoading(true);
    
    try {
      // Upload logos first
      const urlA = logoFileA ? await uploadLogo(logoFileA, teamA.name) : teamA.logoUrl;
      const urlB = logoFileB ? await uploadLogo(logoFileB, teamB.name) : teamB.logoUrl;

      const matchData = {
        teamA: { name: teamA.name, players: teamA.players, score: 0, logoUrl: urlA || '' },
        teamB: { name: teamB.name, players: teamB.players, score: 0, logoUrl: urlB || '' },
        status: 'pending',
        time: '00:00',
        events: [],
        createdAt: Date.now(),
        createdBy: auth.currentUser?.uid || 'guest',
      };
      
      const matchRef = push(ref(db, 'matches'), matchData);
      
      if (!matchRef.key) throw new Error('Failed to generate match key');
      
      const myMatches = JSON.parse(localStorage.getItem('myMatches') || '[]');
      if (!myMatches.includes(matchRef.key)) {
        myMatches.push(matchRef.key);
        localStorage.setItem('myMatches', JSON.stringify(myMatches));
      }
      
      const allNewTeams = [
        { name: teamA.name, logoUrl: urlA },
        { name: teamB.name, logoUrl: urlB }
      ].filter(t => t.name);

      const allNewPlayers = [...teamA.players, ...teamB.players].map(p => p.name).filter(Boolean);
      
      // Update saved teams with logos
      const existingTeams = Array.isArray(savedTeams) ? savedTeams : [];
      let updatedTeams = [...existingTeams];
      allNewTeams.forEach(nt => {
        const idx = updatedTeams.findIndex(t => t.name === nt.name);
        if (idx > -1) {
          updatedTeams[idx] = { ...updatedTeams[idx], logoUrl: nt.logoUrl || updatedTeams[idx].logoUrl };
        } else {
          updatedTeams.push(nt);
        }
      });

      const updatedPlayers = [...new Set([...savedPlayers, ...allNewPlayers])];
      
      const newSquads = { ...teamSquads };
      if (teamA.name && teamA.players.length > 0) {
        newSquads[teamA.name] = { players: teamA.players, logoUrl: urlA || '' };
      }
      if (teamB.name && teamB.players.length > 0) {
        newSquads[teamB.name] = { players: teamB.players, logoUrl: urlB || '' };
      }
      
      await set(ref(db, 'saved_teams'), updatedTeams);
      await set(ref(db, 'saved_players'), updatedPlayers);
      await set(ref(db, 'team_squads'), newSquads);

      localStorage.removeItem('teamA');
      localStorage.removeItem('teamB');
      navigate(`/schedule/${matchRef.key}`);
    } catch (e) {
      console.error('Match creation error:', e);
      setError(`Failed to create match: ${e.message}`);
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-lg font-black tracking-widest text-[#1A1A2E] uppercase">Create Teams</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-32 pt-4">
        {/* Team Tabs */}
        <div className="flex bg-white rounded-2xl p-1 shadow-sm mb-6">
          {['A', 'B'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold tracking-wider transition-all ${
                activeTab === tab
                  ? 'btn-teal text-white shadow-md'
                  : 'text-[#8A8FA3] hover:text-[#1A1A2E]'
              }`}
            >
              {activeTab === tab ? '🏒 ' : '🏒 '}TEAM {tab}
            </button>
          ))}
        </div>

        {/* Team Form */}
        <div className="card p-5 mb-5 slide-in">
          <p className="text-xs font-semibold tracking-widest text-[#8A8FA3] uppercase mb-3">
            Select Team
          </p>

          {/* Team Name */}
          <div className="flex items-center gap-3 mb-5">
            <div className="relative">
              <input
                type="file"
                id="logo-upload"
                className="hidden"
                accept="image/*"
                onChange={handleLogoChange}
              />
              <label
                htmlFor="logo-upload"
                className="w-14 h-14 rounded-2xl bg-[#F4F6F9] border-2 border-dashed border-[#00C9A7]/40 flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden hover:bg-[#E0FBF5] transition-colors"
              >
                {currentTeam.logoUrl ? (
                  <img src={currentTeam.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#8A8FA3" strokeWidth="1.5" className="w-6 h-6">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="13" r="4" strokeLinecap="round" />
                  </svg>
                )}
              </label>
            </div>
            <div className="flex-1">
              <label className="text-xs text-[#8A8FA3] font-medium uppercase tracking-wider block mb-1">
                Team Name
              </label>
              <AutocompleteInput
                className="input-field"
                placeholder="Search & select team..."
                value={currentTeam.name}
                onChange={(val) => setCurrentTeam(prev => ({ ...prev, name: val }))}
                onSelect={(val) => {
                  const entry = teamSquads[val];
                  if (entry) {
                    const players = Array.isArray(entry) ? entry : entry.players;
                    const logoUrl = entry.logoUrl || '';
                    setCurrentTeam({ 
                      name: val, 
                      players: players.map(p => typeof p === 'string' ? { name: p, role: 'Forward' } : p),
                      logoUrl
                    });
                  } else {
                    setCurrentTeam(prev => ({ ...prev, name: val }));
                  }
                }}
                options={[...new Set([...savedTeams.map(t => typeof t === 'string' ? t : t.name), teamA.name, teamB.name].filter(Boolean))]}
              />
            </div>
          </div>

          {/* Player Count Badge */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold tracking-widest text-[#8A8FA3] uppercase">
              Add Players
            </p>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              currentTeam.players.length >= MIN_PLAYERS
                ? 'bg-[#E0FBF5] text-[#00C9A7]'
                : 'bg-orange-50 text-orange-500'
            }`}>
              {currentTeam.players.length}/{MAX_PLAYERS}
            </span>
          </div>

          <PlayerInput
            onAdd={handleAddPlayer}
            disabled={currentTeam.players.length >= MAX_PLAYERS}
            savedPlayers={[
              ...new Set([
                ...(teamSquads[currentTeam.name]?.players 
                  ? teamSquads[currentTeam.name].players.map(p => p.name || p) 
                  : Array.isArray(teamSquads[currentTeam.name]) ? teamSquads[currentTeam.name].map(p => p.name || p) : []),
                ...teamA.players.map(p => p.name),
                ...teamB.players.map(p => p.name)
              ].filter(Boolean))
            ]}
          />
        </div>

        {/* Squad List */}
        <div className="card p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold tracking-widest text-[#8A8FA3] uppercase">
              Squad — Team {activeTab}
            </p>
            {currentTeam.players.length > 0 && (
              <button
                onClick={() => setCurrentTeam(p => ({ ...p, players: [] }))}
                className="text-xs text-red-400 hover:text-red-600 font-medium"
              >
                Clear all
              </button>
            )}
          </div>
          {/* Players with remove */}
          {currentTeam.players.map((p, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm border bg-[#E0FBF5] border-[#00C9A7]/30 text-[#1A1A2E] mb-2 slide-in">
              <span className="font-semibold text-[#00C9A7] w-5 text-right">{i + 1}.</span>
              <div className="flex-1 flex items-center gap-2">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs bg-white border border-[#00C9A7]/30 text-[#00C9A7] rounded-full px-2 py-0.5">{p.role}</span>
                {p.isScorer && <span className="text-xs bg-[#00C9A7] text-white rounded-full px-2 py-0.5">Scorer</span>}
              </div>
              <button onClick={() => handleRemovePlayer(i)} className="text-[#8A8FA3] hover:text-red-500 transition p-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
          {/* Empty slots */}
          {Array.from({ length: MAX_PLAYERS - currentTeam.players.length }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm border bg-white border-[#E8EAF0] text-[#8A8FA3] mb-2">
              <span className="font-semibold text-[#00C9A7] w-5 text-right">{currentTeam.players.length + i + 1}.</span>
              <span className="tracking-widest text-xs font-semibold uppercase">Empty Slot</span>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm font-medium slide-in">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Bottom Start Match Button */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-6 pt-4 bg-gradient-to-t from-[#F4F6F9] to-transparent z-10">
        <button
          onClick={handleStartMatch}
          disabled={loading}
          className="btn-teal w-full py-4 rounded-2xl text-sm font-bold tracking-widest uppercase flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creating Match...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M8 5v14l11-7z"/></svg>
              Start Match
            </>
          )}
        </button>
      </div>
    </div>
  );
}
