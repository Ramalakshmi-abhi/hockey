import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { ref, push, onValue, set, serverTimestamp } from 'firebase/database';
import PlayerInput from '../components/PlayerInput';
import AutocompleteInput from '../components/AutocompleteInput';

export default function CreateTournament() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Setup Choice, 2: Basic Info, 3: Teams Entry
  const [loading, setLoading] = useState(false);

  // Tournament Data
  const [tourneyInfo, setTourneyInfo] = useState({
    name: '',
    location: '',
    teamCount: 2,
    groupCount: 2,
    type: 'teams' // or 'groups'
  });

  // Teams Data (Array of objects { name: '', players: [] })
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupSearch, setGroupSearch] = useState({}); // Tracking search input per group
  const [currentTeamIdx, setCurrentTeamIdx] = useState(0);
  const [currentGrpIdx, setCurrentGrpIdx] = useState(0);

  const [savedTeams, setSavedTeams] = useState([]);
  const [savedPlayers, setSavedPlayers] = useState([]);
  const [teamSquads, setTeamSquads] = useState({});

  const normalizePlayer = (player) => {
    if (typeof player === 'string') {
      return { name: player.trim(), role: 'Forward' };
    }
    if (!player || typeof player !== 'object') {
      return { name: '', role: 'Forward' };
    }

    const name =
      (player.name || player.playerName || player.fullName || player.player || '').toString().trim();
    const role =
      (player.role || player.position || player.playerRole || 'Forward').toString().trim() || 'Forward';

    return {
      ...player,
      name,
      role
    };
  };

  const normalizePlayers = (players) => {
    const arr = Array.isArray(players)
      ? players
      : (players && typeof players === 'object' ? Object.values(players) : []);

    return arr
      .map(normalizePlayer)
      .filter(p => p.name);
  };

  const buildPlayersByTeamMap = (squadsObj) => {
    const map = {};
    Object.entries(squadsObj || {}).forEach(([teamName, rawPlayers]) => {
      const name = (teamName || '').trim();
      if (!name) return;
      map[name] = normalizePlayers(rawPlayers).map(p => p.name);
    });
    return map;
  };

  useEffect(() => {
    const normalizeSquads = (squadsObj) => {
      if (!squadsObj || typeof squadsObj !== 'object') return {};
      return Object.fromEntries(
        Object.entries(squadsObj).map(([teamName, rawSquad]) => {
          const squadArray = Array.isArray(rawSquad)
            ? rawSquad
            : (rawSquad && typeof rawSquad === 'object' ? Object.values(rawSquad) : []);
          return [teamName, squadArray];
        })
      );
    };

    const teamsRef = ref(db, 'saved_teams');
    const unsubscribeTeams = onValue(teamsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const arr = Array.isArray(data) ? data : Object.values(data);
        setSavedTeams([...new Set(arr.map(t => typeof t === 'string' ? t : t.name))].filter(Boolean));
      }
    });

    const playersRef = ref(db, 'saved_players');
    const unsubscribePlayers = onValue(playersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const arr = Array.isArray(data) ? data : Object.values(data);
        setSavedPlayers([...new Set(arr.map(p => typeof p === 'string' ? p : p.name))].filter(Boolean));
      }
    });

    const squadsRef = ref(db, 'team_squads');
    const unsubscribeSquads = onValue(squadsRef, (snapshot) => {
      if (snapshot.exists()) {
        const normalized = normalizeSquads(snapshot.val());
        setTeamSquads(prev => ({ ...prev, ...normalized }));
      }
    });

    // SCAN MATCH HISTORY TO DISCOVER SQUADS (PICK UP EXISTING PLAYERS)
    const matchesRef = ref(db, 'matches');
    const unsubscribeMatches = onValue(matchesRef, (snapshot) => {
      if (snapshot.exists()) {
        const matchesData = snapshot.val();
        const discoveredSquads = {};
        
        Object.values(matchesData).forEach(m => {
          // Team A
          if (m.teamA?.name && m.teamA?.players?.length > 0) {
            discoveredSquads[m.teamA.name] = m.teamA.players;
          }
          // Team B
          if (m.teamB?.name && m.teamB?.players?.length > 0) {
            discoveredSquads[m.teamB.name] = m.teamB.players;
          }
        });
        
        const normalizedDiscovered = normalizeSquads(discoveredSquads);
        setTeamSquads(prev => ({ ...normalizedDiscovered, ...prev }));
      }
    });

    return () => {
      unsubscribeTeams();
      unsubscribePlayers();
      unsubscribeSquads();
      unsubscribeMatches();
    };
  }, []);

  const handleStartSetup = (type) => {
    setTourneyInfo(prev => ({ ...prev, type }));
    setStep(2);
  };

  const handleInfoNext = () => {
    if (!tourneyInfo.name) return;
    
    if (tourneyInfo.type === 'teams') {
      const initialTeams = Array.from({ length: tourneyInfo.teamCount }, () => ({
        name: '',
        shortName: '',
        players: []
      }));
      setTeams(initialTeams);
    } else {
      // Initialize groups
      const initialGroups = Array.from({ length: tourneyInfo.groupCount }, (_, i) => ({
        name: `Group ${String.fromCharCode(65 + i)}`,
        teams: []
      }));
      setGroups(initialGroups);
    }
    setStep(3);
  };

  const addTeamToGroup = (gIdx, teamName) => {
    const normalizedTeam = (teamName || '').trim();
    if (!normalizedTeam) return;

    setGroups(prevGroups => prevGroups.map((group, idx) => {
      if (idx !== gIdx) return group;

      const alreadyExists = group.teams.some(
        t => (t.name || '').trim().toLowerCase() === normalizedTeam.toLowerCase()
      );

      if (alreadyExists) return group;

      return {
        ...group,
        teams: [...group.teams, { name: normalizedTeam }]
      };
    }));
  };

  const handleAddPlayer = (player) => {
    const updatedTeams = [...teams];
    updatedTeams[currentTeamIdx].players.push(player);
    setTeams(updatedTeams);
  };

  const handleRemovePlayer = (playerIdx) => {
    const updatedTeams = [...teams];
    updatedTeams[currentTeamIdx].players = updatedTeams[currentTeamIdx].players.filter((_, i) => i !== playerIdx);
    setTeams(updatedTeams);
  };

  const loadSquadForTeam = (teamName, index) => {
    if (!teamName || !teamSquads) return;
    const name = teamName.trim();
    // Case-insensitive trimmed match
    const foundKey = Object.keys(teamSquads).find(k => k.trim().toLowerCase() === name.toLowerCase());
    
    if (foundKey) {
      const squad = normalizePlayers(teamSquads[foundKey]);
      
      if (Array.isArray(squad) && squad.length > 0) {
        setTeams(prev => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index] = {
              ...updated[index],
              players: squad
            };
            return updated;
          }
          return prev;
        });
      }
    }
  };

  const getSquadPlayerNames = (teamName) => {
    if (!teamName || !teamSquads) return [];
    return normalizePlayers(teamSquads[teamName]).map(p => p.name);
  };

  const getCurrentTeamPlayerNames = () => {
    return normalizePlayers(teams[currentTeamIdx]?.players).map(p => p.name);
  };

  const getCurrentTeamPlayers = () => {
    return normalizePlayers(teams[currentTeamIdx]?.players);
  };

  const updateTeamName = (val) => {
    const updatedTeams = [...teams];
    updatedTeams[currentTeamIdx].name = val;
    setTeams(updatedTeams);
    // Explicitly load squad on name change
    loadSquadForTeam(val, currentTeamIdx);
  };

  // Also try to load squad on index changes or step changes
  useEffect(() => {
    if (step === 3 && teams[currentTeamIdx]?.name) {
      loadSquadForTeam(teams[currentTeamIdx].name, currentTeamIdx);
    }
  }, [currentTeamIdx, step, teamSquads]);

  const updateTeamShortName = (val) => {
    const updatedTeams = [...teams];
    updatedTeams[currentTeamIdx].shortName = val;
    setTeams(updatedTeams);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const normalizedGroups = groups.map(group => ({
        ...group,
        teams: group.teams.filter(t => (t.name || '').trim())
      }));
      const allGroupTeams = [...new Set(
        normalizedGroups.flatMap(group => group.teams.map(t => t.name.trim()))
      )].map(name => ({ name }));

      await push(ref(db, 'tournaments'), {
        ...tourneyInfo,
        teams: tourneyInfo.type === 'groups' ? allGroupTeams : teams,
        groups: tourneyInfo.type === 'groups' ? normalizedGroups : [],
        teamCount: tourneyInfo.type === 'groups' ? allGroupTeams.length : teams.length,
        status: 'upcoming',
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || 'guest'
      });

      // Update team squads with full objects if they've changed
      const newSquads = { ...teamSquads };
      teams.forEach(t => {
        if (t.name && t.players.length > 0) {
          newSquads[t.name] = t.players;
        }
      });
      await set(ref(db, 'team_squads'), newSquads);
      await set(ref(db, 'saved_players_by_team'), buildPlayersByTeamMap(newSquads));
      
      navigate('/tournaments');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] animate-fade-in">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate('/tournaments')} className="p-2 rounded-xl hover:bg-gray-100 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2.5" className="w-5 h-5">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-lg font-black tracking-widest text-[#1A1A2E] uppercase">
          {step === 1 ? 'Tournament Setup' : 'Create Teams'}
        </h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-80 pt-8 transition-all">
        
        {/* Step 1: Choice */}
        {step === 1 && (
          <div className="flex flex-col items-center">
            <div className="mb-12 text-center">
              <div className="text-6xl mb-6 drop-shadow-lg">🏆</div>
              <h2 className="text-2xl font-black text-[#1A1A2E] tracking-tight uppercase mb-2">Tournament Setup</h2>
              <p className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-[0.2em]">Choose your configuration</p>
            </div>

            <div className="w-full space-y-4">
              <button 
                onClick={() => handleStartSetup('teams')}
                className="group w-full bg-white p-6 rounded-[2.5rem] border-2 border-transparent hover:border-[#3B82F6]/30 shadow-sm hover:shadow-xl transition-all flex items-center gap-6 text-left"
              >
                <div className="w-16 h-16 bg-[#3B82F6] rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1A1A2E] uppercase tracking-wider mb-1">Create Team</h3>
                  <p className="text-[10px] text-[#8A8FA3] font-medium leading-relaxed">Build and manage your hockey team</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="#E8EAF0" strokeWidth="3" className="w-4 h-4 ml-auto group-hover:stroke-[#3B82F6] transition-colors"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>

              <button 
                onClick={() => handleStartSetup('groups')}
                className="group w-full bg-white p-6 rounded-[2.5rem] border-2 border-transparent hover:border-[#10B981]/30 shadow-sm hover:shadow-xl transition-all flex items-center gap-6 text-left"
              >
                <div className="w-16 h-16 bg-[#10B981] rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1A1A2E] uppercase tracking-wider mb-1">Create Group</h3>
                  <p className="text-[10px] text-[#8A8FA3] font-medium leading-relaxed">Organize teams into groups for the tournament</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="#E8EAF0" strokeWidth="3" className="w-4 h-4 ml-auto group-hover:stroke-[#10B981] transition-colors"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Basic Info (Teams vs Groups) */}
        {step === 2 && (
          <div className="card p-8 slide-in">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-[#8A8FA3] uppercase tracking-[0.2em] block mb-3 items-center flex gap-2">
                  <span className="text-orange-400">🏆</span> {tourneyInfo.type === 'groups' ? 'Group Name' : 'Tournament Name'}
                </label>
                <input 
                  type="text" 
                  className="input-field py-4 text-sm font-bold bg-[#F4F6F9] border-none"
                  placeholder={tourneyInfo.type === 'groups' ? 'e.g. Royal Tournament' : 'e.g. Premier League'}
                  value={tourneyInfo.name}
                  onChange={(e) => setTourneyInfo(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-[#8A8FA3] uppercase tracking-[0.2em] block mb-3 items-center flex gap-2">
                  <span className="text-red-400">📍</span> Location
                </label>
                <input 
                  type="text" 
                  className="input-field py-4 text-sm font-bold bg-[#F4F6F9] border-none"
                  placeholder="e.g. Delhi"
                  value={tourneyInfo.location}
                  onChange={(e) => setTourneyInfo(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              {tourneyInfo.type === 'teams' ? (
                <div>
                  <label className="text-[10px] font-black text-[#8A8FA3] uppercase tracking-[0.2em] block mb-4 items-center flex gap-2">
                    <span className="text-blue-400">👥</span> Number of Teams
                  </label>
                  <div className="flex items-center gap-4 bg-[#F4F6F9] rounded-2xl p-2 animate-scale-up">
                     <button 
                       onClick={() => setTourneyInfo(p => ({ ...p, teamCount: Math.max(2, p.teamCount - 1) }))}
                       className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#1D4ED8] hover:bg-[#1D4ED8] hover:text-white transition-all font-black text-xl"
                     >-</button>
                     <div className="flex-1 text-center font-black text-lg text-[#1A1A2E]">{tourneyInfo.teamCount}</div>
                     <button 
                       onClick={() => setTourneyInfo(p => ({ ...p, teamCount: Math.min(16, p.teamCount + 1) }))}
                       className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#1D4ED8] hover:bg-[#1D4ED8] hover:text-white transition-all font-black text-xl"
                     >+</button>
                  </div>
                </div>
              ) : (
                <div>
                   <label className="text-[10px] font-black text-[#8A8FA3] uppercase tracking-[0.2em] block mb-4 items-center flex gap-2">
                    <span className="text-emerald-400">🔳</span> Number of Groups
                  </label>
                  <div className="flex items-center gap-4 bg-[#F4F6F9] rounded-2xl p-2 animate-scale-up">
                     <button 
                       onClick={() => setTourneyInfo(p => ({ ...p, groupCount: Math.max(2, p.groupCount - 1) }))}
                       className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white transition-all font-black text-xl"
                     >-</button>
                     <div className="flex-1 text-center font-black text-lg text-[#1A1A2E]">{tourneyInfo.groupCount}</div>
                     <button 
                       onClick={() => setTourneyInfo(p => ({ ...p, groupCount: Math.min(8, p.groupCount + 1) }))}
                       className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#2E7D32] hover:bg-[#2E7D32] hover:text-white transition-all font-black text-xl"
                     >+</button>
                  </div>
                </div>
              )}

              <button 
                onClick={handleInfoNext}
                disabled={!tourneyInfo.name}
                className={`w-full text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4 ${
                   tourneyInfo.type === 'groups' ? 'bg-[#2E7D32] hover:bg-[#1B5E20]' : 'bg-[#1D4ED8] hover:bg-[#1e40af]'
                }`}
              >
                {tourneyInfo.type === 'groups' ? 'Generate Groups' : 'Next'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-4 h-4"><path d="M13 5l7 7-7 7M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Teams Flow */}
        {step === 3 && tourneyInfo.type === 'teams' && (
          <div className="slide-in">
            {/* Team Tabs */}
            <div className="flex overflow-x-auto pb-2 mb-6 gap-2 no-scrollbar">
              {teams.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTeamIdx(i)}
                  className={`flex-shrink-0 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                    currentTeamIdx === i 
                      ? 'bg-[#00C9A7] text-white shadow-md' 
                      : 'bg-white text-[#8A8FA3] hover:text-[#1A1A2E]'
                  }`}
                >
                  Team {i + 1}
                </button>
              ))}
            </div>

            <div className="card p-6 mb-6">
               <div className="mb-6">
                  <label className="text-[10px] font-black text-[#8A8FA3] uppercase tracking-wider block mb-2">Select Team</label>
                  <AutocompleteInput 
                    className="input-field py-3 text-sm font-bold bg-[#F4F6F9] border-none"
                    placeholder="Search & select teams..."
                    options={savedTeams}
                    value={teams[currentTeamIdx]?.name}
                    onChange={(val) => updateTeamName(val)}
                  />
                  {teamSquads[teams[currentTeamIdx]?.name] && getCurrentTeamPlayers().length === 0 && (
                    <button 
                      onClick={() => loadSquadForTeam(teams[currentTeamIdx].name, currentTeamIdx)}
                      className="mt-3 text-[10px] font-bold text-[#00C9A7] flex items-center gap-1.5 animate-pulse"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Saved Squad Found! Click to Autofill
                    </button>
                  )}
               </div>

               <div className="flex items-center gap-4 mb-6">
                 <div className="w-16 h-16 bg-[#F4F6F9] rounded-[2rem] border-2 border-dashed border-[#00C9A7]/30 flex items-center justify-center text-[#8A8FA3]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                 </div>
                 <div className="flex-1">
                    <label className="text-[10px] font-black text-[#8A8FA3] uppercase tracking-wider block mb-2">Team Name</label>
                    <input 
                      className="input-field py-3 text-sm font-bold bg-[#F4F6F9] border-none"
                      placeholder="Enter Full Name"
                      value={teams[currentTeamIdx]?.name}
                      onChange={(e) => updateTeamName(e.target.value)}
                    />
                 </div>
               </div>

               <div className="mb-6">
                  <label className="text-[10px] font-black text-[#8A8FA3] uppercase tracking-wider block mb-2">Short Name</label>
                  <input 
                    className="input-field py-3 text-sm font-bold bg-[#F4F6F9] border-none"
                    placeholder="e.g. MI"
                    value={teams[currentTeamIdx]?.shortName}
                    onChange={(e) => updateTeamShortName(e.target.value)}
                  />
               </div>

               <p className="text-[10px] font-black text-[#1A1A2E] uppercase tracking-wider mb-4">Add Player to Squad</p>
               <PlayerInput 
                onAdd={handleAddPlayer} 
                savedPlayers={[...new Set([
                  // Ensure we ONLY pull the names string from the squad objects
                  ...getSquadPlayerNames(teams[currentTeamIdx]?.name),
                  ...savedPlayers,
                  ...getCurrentTeamPlayerNames()
                ].filter(Boolean))]}
               />
            </div>

            {/* Squad List for current team */}
            <div className="card p-6">
               <p className="text-[10px] font-black text-[#1A1A2E] uppercase tracking-wider mb-6 flex justify-between items-center">
                  Squad — Team {currentTeamIdx + 1}
                  <span className="text-[#00C9A7]">{getCurrentTeamPlayers().length}/11 Players</span>
               </p>
               
               <div className="space-y-3">
                 {getCurrentTeamPlayers().map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-[#F4F6F9] rounded-[1.5rem] text-sm animate-fade-in">
                       <span className="font-black text-[#00C9A7] w-4">{i + 1}.</span>
                       <div className="flex-1">
                          <p className="font-bold text-[#1A1A2E] leading-tight">{p.name}</p>
                          <p className="text-[10px] text-[#8A8FA3] font-bold uppercase tracking-widest">{p.role}</p>
                       </div>
                       <button onClick={() => handleRemovePlayer(i)} className="text-[#8A8FA3] hover:text-red-400 p-2">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                       </button>
                    </div>
                 ))}
                 {Array.from({ length: Math.max(0, 11 - getCurrentTeamPlayers().length) }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 border-2 border-dashed border-[#E8EAF0] rounded-[1.5rem] opacity-40">
                       <span className="font-black text-gray-300 w-4">{getCurrentTeamPlayers().length + i + 1}.</span>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Empty Slot</p>
                    </div>
                 ))}
               </div>
            </div>

            {/* Final Action */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-gradient-to-t from-[#F4F6F9] to-transparent">
               <button
                 onClick={handleFinish}
                 disabled={loading || teams.some(t => !t.name)}
                 className="btn-teal w-full py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3"
               >
                 {loading ? (
                   <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                 ) : (
                   <>
                     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-4 h-4"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                     Create Tournament
                   </>
                 )}
               </button>
            </div>
          </div>
        )}

        {/* Step 3: Groups Flow */}
        {step === 3 && tourneyInfo.type === 'groups' && (
          <div className="slide-in space-y-6 pb-28">
             {groups.map((group, gIdx) => (
                <div key={gIdx} className="card">
                   <div className="bg-white px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-[#1D4ED8] rounded-lg flex items-center justify-center text-white text-xs">
                             <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
                         </div>
                         <h3 className="font-black text-[#1A1A2E] tracking-tight uppercase">{group.name}</h3>
                      </div>
                      <span className="text-[10px] font-black text-[#3B82F6] uppercase bg-blue-50 px-2 py-0.5 rounded-full">
                         {group.teams.length} Teams
                      </span>
                   </div>

                   <div className="p-5 bg-gray-50/30">
                      <label className="text-[10px] font-black text-[#8A8FA3] uppercase tracking-wider block mb-3">Add Team to {group.name}</label>
                      <div className="flex gap-2 mb-4">
                         <div className="flex-1">
                            <AutocompleteInput 
                              className="input-field py-3 text-sm font-bold bg-white border-none shadow-sm"
                              placeholder="Select Team..."
                              options={savedTeams}
                              value={groupSearch[gIdx] || ''} 
                              onChange={(val) => setGroupSearch(prev => ({ ...prev, [gIdx]: val }))}
                              onSelect={(teamName) => {
                                addTeamToGroup(gIdx, teamName);
                                setGroupSearch(prev => ({ ...prev, [gIdx]: '' }));
                              }}
                            />
                         </div>
                         <button 
                            onClick={() => {
                              if (groupSearch[gIdx]) {
                                addTeamToGroup(gIdx, groupSearch[gIdx]);
                                setGroupSearch(prev => ({ ...prev, [gIdx]: '' }));
                              }
                            }}
                            className="bg-[#1D4ED8] text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-1 shadow-md hover:bg-[#1e40af] transition-colors"
                         >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-3 h-3"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/></svg>
                             Add
                         </button>
                      </div>

                      {/* Team Items */}
                      <div className="grid grid-cols-1 gap-2">
                        {group.teams.map((t, tIdx) => (
                          <div key={tIdx} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-100 shadow-sm animate-fade-in group">
                            <div className="w-8 h-8 rounded-lg bg-[#F4F6F9] flex items-center justify-center border border-gray-100">
                               <span className="text-[10px] font-black text-[#1D4ED8]">{t.name?.substring(0,2).toUpperCase()}</span>
                            </div>
                            <div className="flex-1">
                               <p className="text-[11px] font-black text-[#1A1A2E] uppercase truncate">{t.name}</p>
                            </div>
                            <button 
                              onClick={() => {
                                setGroups(prevGroups => prevGroups.map((group, idx) => {
                                  if (idx !== gIdx) return group;
                                  return {
                                    ...group,
                                    teams: group.teams.filter((_, idx2) => idx2 !== tIdx)
                                  };
                                }));
                              }}
                              className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                            >
                               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </button>
                          </div>
                        ))}
                        {group.teams.length === 0 && (
                          <div className="py-6 flex flex-col items-center justify-center opacity-30 select-none grayscale bg-gray-50 rounded-xl border border-dashed border-gray-200">
                             <span className="text-xl mb-1">👥</span>
                             <p className="text-[8px] font-black uppercase tracking-widest italic">Add teams to start</p>
                          </div>
                        )}
                      </div>
                   </div>
                </div>
             ))}

             <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-6 bg-gradient-to-t from-[#F4F6F9] to-transparent">
                <button
                  onClick={async () => {
                    await handleFinish();
                    alert('Groups Saved! Now please schedule your matches.');
                  }}
                  className="bg-[#009688] hover:bg-[#00796B] w-full py-5 rounded-2xl text-sm font-black uppercase tracking-widest text-white shadow-xl flex items-center justify-center gap-2"
                >
                  Save All Groups
                </button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
