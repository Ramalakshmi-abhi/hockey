import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage, auth } from '../firebase';
import { ref, push, onValue, set, remove } from 'firebase/database';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import PlayerInput from '../components/PlayerInput';
import AutocompleteInput from '../components/AutocompleteInput';

const EMPTY_TEAM = { name: '', players: [], logoUrl: '' };
const MAX_PLAYERS = 11;
const MIN_PLAYERS = 7;
const TEAM_NAME_CACHE_KEY = 'teamNameOptionsCache';
const TEAM_SQUAD_CACHE_KEY = 'teamSquadsCache';
const TEAM_SQUAD_CACHE_VERSION_KEY = 'teamSquadsCacheVersion';
const TEAM_SQUAD_CACHE_VERSION = '2';

function getGuestDraftId() {
  const existing = localStorage.getItem('guestDraftId');
  if (existing) return existing;
  const id = `guest_${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem('guestDraftId', id);
  return id;
}

function normalizeTeamName(team) {
  if (!team) return '';
  if (typeof team === 'string' || typeof team === 'number') return String(team).trim();
  if (typeof team === 'object') return String(team.name || team.teamName || '').trim();
  return '';
}

function normalizeTeamLookupKey(team) {
  return normalizeTeamName(team).toLowerCase();
}

function isPermissionDeniedError(error) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return (
    code.includes('permission_denied') ||
    code.includes('permission-denied') ||
    message.includes('permission_denied') ||
    message.includes('permission-denied')
  );
}

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
  const [draftOwnerId, setDraftOwnerId] = useState(() => auth.currentUser?.uid || getGuestDraftId());
  const [draftReady, setDraftReady] = useState(false);
  const [draftSyncEnabled, setDraftSyncEnabled] = useState(true);
  const [metadataSyncEnabled, setMetadataSyncEnabled] = useState(true);
  
  const [savedTeams, setSavedTeams] = useState([]);
  const [savedPlayers, setSavedPlayers] = useState([]);
  const [teamSquads, setTeamSquads] = useState({});
  const [savedPlayersByTeam, setSavedPlayersByTeam] = useState({});
  const [localSquadCache, setLocalSquadCache] = useState(() => {
    try {
      const currentVersion = localStorage.getItem(TEAM_SQUAD_CACHE_VERSION_KEY);
      if (currentVersion !== TEAM_SQUAD_CACHE_VERSION) {
        localStorage.removeItem(TEAM_SQUAD_CACHE_KEY);
        localStorage.setItem(TEAM_SQUAD_CACHE_VERSION_KEY, TEAM_SQUAD_CACHE_VERSION);
        return {};
      }
      const raw = localStorage.getItem(TEAM_SQUAD_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  });
  const [matchDerivedSquads, setMatchDerivedSquads] = useState({});
  const [tournamentDerivedSquads, setTournamentDerivedSquads] = useState({});
  const [cachedTeamNames, setCachedTeamNames] = useState(() => {
    try {
      const raw = localStorage.getItem(TEAM_NAME_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(normalizeTeamName).filter(Boolean) : [];
    } catch {
      return [];
    }
  });

  const normalizePlayerName = (player) => {
    if (typeof player === 'string') return player.trim();
    if (!player || typeof player !== 'object') return '';
    return (player.name || player.playerName || player.fullName || player.player || '').toString().trim();
  };

  const normalizePlayerRecord = (player, index = 0) => {
    if (typeof player === 'string' || typeof player === 'number') {
      const name = String(player).trim();
      return name ? { name, role: 'Forward', isScorer: false } : null;
    }

    if (!player || typeof player !== 'object') return null;

    const name = normalizePlayerName(player) || `Player ${index + 1}`;
    const role =
      String(player.role || player.position || player.playerRole || player.type || 'Forward').trim() || 'Forward';

    return {
      ...player,
      name,
      role,
      isScorer: Boolean(player.isScorer)
    };
  };

  const extractPlayersForAutofill = (squadEntry) => {
    if (!squadEntry) return [];

    let players = [];
    if (Array.isArray(squadEntry)) {
      players = squadEntry;
    } else if (Array.isArray(squadEntry.players)) {
      players = squadEntry.players;
    } else if (squadEntry.players && typeof squadEntry.players === 'object') {
      players = Object.values(squadEntry.players);
    } else if (squadEntry && typeof squadEntry === 'object') {
      // Legacy shape: { "0": {...}, "1": {...} }
      const keys = Object.keys(squadEntry);
      const looksLikeIndexedPlayers = keys.length > 0 && keys.every((key) => /^\d+$/.test(key));
      if (looksLikeIndexedPlayers) {
        players = Object.values(squadEntry);
      } else {
        // Map shape: { "Tiger1": true, "Tiger2": true } or { "Tiger1": "Forward" }
        const values = Object.values(squadEntry);
        const primitiveMap =
          values.length > 0 &&
          values.every((value) => ['string', 'number', 'boolean'].includes(typeof value));

        if (primitiveMap) {
          const asKeyPlayers = keys
            .filter((key) => !['logoUrl', 'logo', 'updatedAt', 'teamName', 'name'].includes(key))
            .map((key) => {
              const maybeRole = squadEntry[key];
              if (typeof maybeRole === 'string' && maybeRole.trim()) {
                return { name: key, role: maybeRole };
              }
              return key;
            });
          players = asKeyPlayers;
        }
      }
    } else if (typeof squadEntry === 'string') {
      // CSV shape: "Tiger1,Tiger2,Tiger3"
      players = squadEntry
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean);
    }

    return players
      .map((player, index) => normalizePlayerRecord(player, index))
      .filter(Boolean);
  };

  const extractPlayerNames = (squadEntry) => {
    if (!squadEntry) return [];

    const players = Array.isArray(squadEntry)
      ? squadEntry
      : (Array.isArray(squadEntry.players) ? squadEntry.players : Object.values(squadEntry.players || {}));

    return [...new Set(players.map(normalizePlayerName).filter(Boolean))];
  };

  const extractLogoUrl = (squadEntry) => {
    if (!squadEntry || Array.isArray(squadEntry) || typeof squadEntry !== 'object') return '';
    return String(squadEntry.logoUrl || squadEntry.logo || '').trim();
  };

  const upsertSquadCacheEntry = (cacheObj, teamName, squadEntry, force = false) => {
    const normalizedName = normalizeTeamName(teamName);
    if (!normalizedName) return false;

    const players = extractPlayersForAutofill(squadEntry);
    if (players.length === 0) return false;

    const existingKey = Object.keys(cacheObj).find(
      (key) => normalizeTeamLookupKey(key) === normalizeTeamLookupKey(normalizedName)
    );
    const targetKey = existingKey || normalizedName;
    const existingEntry = cacheObj[targetKey];
    const existingPlayers = extractPlayersForAutofill(existingEntry);

    if (!force && existingPlayers.length > players.length) {
      return false;
    }

    const incomingLogo = extractLogoUrl(squadEntry);
    const existingLogo = extractLogoUrl(existingEntry);
    const nextEntry = {
      players,
      logoUrl: incomingLogo || existingLogo || ''
    };

    const isSamePlayersCount = existingPlayers.length === players.length;
    const isSameLogo = existingLogo === nextEntry.logoUrl;
    if (!force && isSamePlayersCount && isSameLogo && existingPlayers.length > 0) {
      return false;
    }

    cacheObj[targetKey] = nextEntry;
    return true;
  };

  const buildPlayersByTeamMap = (squadsObj) => {
    const map = {};
    Object.entries(squadsObj || {}).forEach(([teamName, squadEntry]) => {
      const name = (teamName || '').trim();
      if (!name) return;
      map[name] = extractPlayerNames(squadEntry);
    });
    return map;
  };

  useEffect(() => {
    const teamsRef = ref(db, 'saved_teams');
    const playersRef = ref(db, 'saved_players');

    const unsubscribeTeams = onValue(teamsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const arr = Array.isArray(data) ? data : Object.values(data);
        setSavedTeams([
          ...new Set(
            arr
              .map(normalizeTeamName)
              .filter(Boolean)
          )
        ]);
      } else {
        setSavedTeams([]);
      }
    }, () => setSavedTeams([]));

    const unsubscribePlayers = onValue(playersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const arr = Array.isArray(data) ? data : Object.values(data);
        setSavedPlayers([...new Set(arr.map(p => typeof p === 'string' ? p : p.name))].filter(Boolean));
      } else {
        setSavedPlayers([]);
      }
    }, () => setSavedPlayers([]));

    const teamSquadsRef = ref(db, 'team_squads');
    const unsubscribeSquads = onValue(teamSquadsRef, (snapshot) => {
      if (snapshot.exists()) {
        setTeamSquads(snapshot.val());
      } else {
        setTeamSquads({});
      }
    }, () => setTeamSquads({}));

    const playersByTeamRef = ref(db, 'saved_players_by_team');
    const unsubscribePlayersByTeam = onValue(playersByTeamRef, (snapshot) => {
      if (snapshot.exists()) {
        setSavedPlayersByTeam(snapshot.val() || {});
      } else {
        setSavedPlayersByTeam({});
      }
    }, () => setSavedPlayersByTeam({}));

    const matchesRef = ref(db, 'matches');
    const unsubscribeMatches = onValue(matchesRef, (snapshot) => {
      if (!snapshot.exists()) {
        setMatchDerivedSquads({});
        return;
      }

      const matchesData = snapshot.val();
      const discovered = {};

      Object.values(matchesData || {}).forEach((m) => {
        const candidates = [m?.teamA, m?.teamB];
        candidates.forEach((team) => {
          const teamName = normalizeTeamName(team?.name);
          if (!teamName) return;

          const existingKey = Object.keys(discovered).find(
            (key) => normalizeTeamLookupKey(key) === normalizeTeamLookupKey(teamName)
          );
          const targetKey = existingKey || teamName;
          const playersFromTeam = extractPlayersForAutofill(team);

          if (playersFromTeam.length > 0) {
            const currentEntry = discovered[targetKey];
            const currentPlayers = extractPlayersForAutofill(currentEntry);

            if (playersFromTeam.length >= currentPlayers.length) {
              discovered[targetKey] = {
                players: playersFromTeam,
                logoUrl:
                  String(team?.logoUrl || '') ||
                  (currentEntry && typeof currentEntry === 'object' && !Array.isArray(currentEntry)
                    ? String(currentEntry.logoUrl || '')
                    : '')
              };
            }
          } else if (!discovered[targetKey]) {
            discovered[targetKey] = [];
          }
        });
      });

      setMatchDerivedSquads(discovered);
    }, () => setMatchDerivedSquads({}));

    const tournamentsRef = ref(db, 'tournaments');
    const unsubscribeTournaments = onValue(tournamentsRef, (snapshot) => {
      if (!snapshot.exists()) {
        setTournamentDerivedSquads({});
        return;
      }

      const tournamentsData = snapshot.val();
      const discovered = {};

      Object.values(tournamentsData || {}).forEach((tournament) => {
        const teamsList = Array.isArray(tournament?.teams) ? tournament.teams : [];

        teamsList.forEach((team) => {
          const teamName = normalizeTeamName(team?.name || team?.teamName || team?.team || '');
          if (!teamName) return;

          const players = extractPlayersForAutofill(team?.players || team?.squad || team?.playerList || []);
          if (players.length === 0) return;

          const existingKey = Object.keys(discovered).find(
            (key) => normalizeTeamLookupKey(key) === normalizeTeamLookupKey(teamName)
          );
          const targetKey = existingKey || teamName;
          const existingPlayers = extractPlayersForAutofill(discovered[targetKey]);

          if (players.length >= existingPlayers.length) {
            discovered[targetKey] = {
              players,
              logoUrl: String(team?.logoUrl || team?.logo || '')
            };
          }
        });
      });

      setTournamentDerivedSquads(discovered);
    }, () => setTournamentDerivedSquads({}));

    return () => {
      unsubscribeTeams();
      unsubscribePlayers();
      unsubscribeSquads();
      unsubscribePlayersByTeam();
      unsubscribeMatches();
      unsubscribeTournaments();
    };
  }, []);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((user) => {
      setDraftOwnerId(user?.uid || getGuestDraftId());
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!draftOwnerId || !draftSyncEnabled) return;

    const hasLocalDraft = Boolean(localStorage.getItem('teamA') || localStorage.getItem('teamB'));
    const draftRef = ref(db, `drafts/create_team/${draftOwnerId}`);
    const unsubDraft = onValue(draftRef, (snapshot) => {
      if (snapshot.exists() && !hasLocalDraft) {
        const data = snapshot.val();
        if (data?.teamA) setTeamA(data.teamA);
        if (data?.teamB) setTeamB(data.teamB);
        if (data?.activeTab === 'A' || data?.activeTab === 'B') setActiveTab(data.activeTab);
      }
      setDraftReady(true);
    }, (err) => {
      if (isPermissionDeniedError(err)) {
        setDraftSyncEnabled(false);
      }
      setDraftReady(true);
    });

    return () => unsubDraft();
  }, [draftOwnerId, draftSyncEnabled]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('teamA', JSON.stringify(teamA));
  }, [teamA]);

  useEffect(() => {
    localStorage.setItem('teamB', JSON.stringify(teamB));
  }, [teamB]);

  useEffect(() => {
    if (!draftReady || !draftOwnerId || !draftSyncEnabled) return;

    const hasAnyData = Boolean(
      teamA.name?.trim() ||
      teamB.name?.trim() ||
      teamA.players?.length ||
      teamB.players?.length
    );

    const timer = setTimeout(async () => {
      const draftRef = ref(db, `drafts/create_team/${draftOwnerId}`);
      try {
        if (hasAnyData) {
          await set(draftRef, {
            teamA,
            teamB,
            activeTab,
            updatedAt: Date.now()
          });
        } else {
          await remove(draftRef);
        }
      } catch (e) {
        if (isPermissionDeniedError(e)) {
          setDraftSyncEnabled(false);
          return;
        }
        console.error('Draft autosave error:', e);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [teamA, teamB, activeTab, draftOwnerId, draftReady, draftSyncEnabled]);

  useEffect(() => {
    setLocalSquadCache((prevCache) => {
      const nextCache = { ...prevCache };
      let changed = false;

      const register = (teamName, entry, force = false) => {
        if (upsertSquadCacheEntry(nextCache, teamName, entry, force)) {
          changed = true;
        }
      };

      Object.entries(teamSquads || {}).forEach(([teamName, entry]) => {
        register(teamName, entry);
      });

      Object.entries(matchDerivedSquads || {}).forEach(([teamName, entry]) => {
        register(teamName, entry);
      });

      Object.entries(tournamentDerivedSquads || {}).forEach(([teamName, entry]) => {
        register(teamName, entry);
      });

      if (Array.isArray(savedPlayersByTeam)) {
        savedPlayersByTeam.forEach((record) => {
          if (!record || typeof record !== 'object') return;
          const teamName = normalizeTeamName(record.teamName || record.team || record.name || record.label || '');
          const entry = record.players || record.squad || record.playerNames || record.list || record;
          register(teamName, entry);
        });
      } else if (savedPlayersByTeam && typeof savedPlayersByTeam === 'object') {
        Object.entries(savedPlayersByTeam).forEach(([teamName, entry]) => {
          register(teamName, entry);

          if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
            const embeddedName = normalizeTeamName(entry.teamName || entry.team || entry.name || '');
            if (embeddedName) {
              const embeddedEntry = entry.players || entry.squad || entry.playerNames || entry.list || entry;
              register(embeddedName, embeddedEntry);
            }
          }
        });
      }

      if (!changed) return prevCache;

      localStorage.setItem(TEAM_SQUAD_CACHE_KEY, JSON.stringify(nextCache));
      return nextCache;
    });
  }, [
    teamSquads,
    matchDerivedSquads,
    tournamentDerivedSquads,
    savedPlayersByTeam
  ]);

  const currentTeam = activeTab === 'A' ? teamA : teamB;
  const setCurrentTeam = activeTab === 'A' ? setTeamA : setTeamB;
  const lastAutofilledTeamRef = useRef({ A: '', B: '' });
  const combinedSquads = useMemo(
    () => ({ ...localSquadCache, ...tournamentDerivedSquads, ...matchDerivedSquads, ...teamSquads }),
    [localSquadCache, tournamentDerivedSquads, matchDerivedSquads, teamSquads]
  );
  const teamNameOptions = useMemo(
    () => [
      ...new Set(
        [
          ...savedTeams,
          ...Object.keys(localSquadCache || {}),
          ...Object.keys(tournamentDerivedSquads || {}),
          ...Object.keys(teamSquads || {}),
          ...Object.keys(savedPlayersByTeam || {}),
          ...Object.keys(matchDerivedSquads || {}),
          ...cachedTeamNames
        ]
          .map(normalizeTeamName)
          .filter(Boolean)
      )
    ],
    [savedTeams, localSquadCache, tournamentDerivedSquads, teamSquads, savedPlayersByTeam, matchDerivedSquads, cachedTeamNames]
  );

  const resolveTeamEntry = (teamName) => {
    const normalizedTarget = normalizeTeamLookupKey(teamName);
    if (!normalizedTarget) return { matchedName: '', entry: null };

    // First try combined squads (map shape)
    const matchKey = Object.keys(combinedSquads || {}).find(
      (key) => normalizeTeamLookupKey(key) === normalizedTarget
    );
    if (matchKey) {
      return {
        matchedName: normalizeTeamName(matchKey),
        entry: combinedSquads[matchKey]
      };
    }

    // savedPlayersByTeam may be stored as an object map or an array of records.
    if (Array.isArray(savedPlayersByTeam)) {
      const record = savedPlayersByTeam.find((rec) => {
        if (!rec || typeof rec !== 'object') return false;
        const candidateName = normalizeTeamName(rec.teamName || rec.team || rec.name || rec.label || '');
        return normalizeTeamLookupKey(candidateName) === normalizedTarget;
      });
      if (record) {
        const candidateName = normalizeTeamName(record.teamName || record.team || record.name || record.label || '');
        const entry = record.players || record.squad || record.playerNames || record.list || record;
        return { matchedName: candidateName, entry };
      }
    } else {
      const fallbackKey = Object.keys(savedPlayersByTeam || {}).find(
        (key) => normalizeTeamLookupKey(key) === normalizedTarget
      );
      if (fallbackKey) {
        return {
          matchedName: normalizeTeamName(fallbackKey),
          entry: savedPlayersByTeam[fallbackKey]
        };
      }
    }

    return {
      matchedName: normalizeTeamName(teamName),
      entry: null
    };
  };

  const selectedTeamEntry = useMemo(
    () => resolveTeamEntry(currentTeam.name).entry,
    [currentTeam.name, combinedSquads, savedPlayersByTeam]
  );
  const selectedTeamAutofillPlayers = useMemo(
    () => extractPlayersForAutofill(selectedTeamEntry),
    [selectedTeamEntry]
  );
  const selectedTeamPlayerNames = useMemo(
    () => selectedTeamAutofillPlayers.map((player) => normalizePlayerName(player)).filter(Boolean),
    [selectedTeamAutofillPlayers]
  );

  const applyTeamSelection = (teamName, { force = false } = {}) => {
    const { matchedName, entry } = resolveTeamEntry(teamName);
    const resolvedName = matchedName || normalizeTeamName(teamName);
    const resolvedKey = normalizeTeamLookupKey(resolvedName);

    if (!entry) {
      if (force) {
        setCurrentTeam((prev) => ({ ...prev, name: resolvedName, players: [], logoUrl: '' }));
      }
      lastAutofilledTeamRef.current[activeTab] = '';
      return false;
    }

    const players = extractPlayersForAutofill(entry);
    if (players.length === 0) {
      if (force) {
        setCurrentTeam((prev) => ({ ...prev, name: resolvedName, players: [], logoUrl: '' }));
      }
      lastAutofilledTeamRef.current[activeTab] = '';
      return false;
    }

    const logoUrl =
      entry && typeof entry === 'object' && !Array.isArray(entry)
        ? String(entry.logoUrl || '')
        : '';

    const alreadyAutofilledForSameTeam = lastAutofilledTeamRef.current[activeTab] === resolvedKey;
    if (process.env.NODE_ENV === 'development') {
      try {
        // eslint-disable-next-line no-console
        console.debug('[applyTeamSelection] teamName=', teamName, 'resolvedName=', resolvedName, 'resolvedKey=', resolvedKey, 'playersCount=', Array.isArray(entry && entry.players ? entry.players : entry) ? (entry.players || entry).length : 0);
      } catch (e) {}
    }
    if (!force && alreadyAutofilledForSameTeam) return false;

    setCurrentTeam((prev) => {
      const prevResolvedName = normalizeTeamName(prev.name);
      const prevKey = normalizeTeamLookupKey(prevResolvedName);

      if (!force && prevKey === resolvedKey && prev.players.length > 0 && alreadyAutofilledForSameTeam) {
        return prev;
      }

      return {
        ...prev,
        name: resolvedName,
        players,
        logoUrl: logoUrl || prev.logoUrl || ''
      };
    });

    // store which team we autofilled for this tab
    lastAutofilledTeamRef.current[activeTab] = resolvedKey;
    return true;
  };

  useEffect(() => {
    if (teamNameOptions.length === 0) return;
    localStorage.setItem(TEAM_NAME_CACHE_KEY, JSON.stringify(teamNameOptions));
  }, [teamNameOptions]);

  useEffect(() => {
    const trimmed = normalizeTeamName(currentTeam.name);
    if (!trimmed) return;
    applyTeamSelection(trimmed);
  }, [currentTeam.name, activeTab, combinedSquads, savedPlayersByTeam]);

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

  function handleToggleScorer(idx) {
    setCurrentTeam(prev => ({
      ...prev,
      players: prev.players.map((p, i) => 
        i === idx ? { ...p, isScorer: !p.isScorer } : p
      ),
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

    const currentUser = auth.currentUser;
    if (!currentUser?.uid) {
      setError('Please log in first. Match creation is blocked for guest users.');
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
        createdBy: currentUser.uid,
        authorizedReaders: { [currentUser.uid]: true },
      };
      
      const matchRef = push(ref(db, 'matches'));
      await set(matchRef, matchData);
      
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
      const allNewTeamNames = allNewTeams
        .map((t) => normalizeTeamName(t.name))
        .filter(Boolean);
      if (allNewTeamNames.length > 0) {
        setCachedTeamNames((prev) => [...new Set([...prev, ...allNewTeamNames])]);
      }

      const allNewPlayers = [...teamA.players, ...teamB.players].map(p => p.name).filter(Boolean);
      
      // Update saved teams with logos
      const existingTeams = Array.isArray(savedTeams) ? savedTeams : [];
      const updatedTeams = [
        ...new Set(
          [...existingTeams, ...allNewTeams.map((t) => t.name)]
            .map(normalizeTeamName)
            .filter(Boolean)
        )
      ];

      const updatedPlayers = [...new Set([...savedPlayers, ...allNewPlayers])];
      
      const newSquads = { ...teamSquads };
      if (teamA.name && teamA.players.length > 0) {
        newSquads[teamA.name] = { players: teamA.players, logoUrl: urlA || '' };
      }
      if (teamB.name && teamB.players.length > 0) {
        newSquads[teamB.name] = { players: teamB.players, logoUrl: urlB || '' };
      }

      setLocalSquadCache((prevCache) => {
        const nextCache = { ...prevCache };
        let changed = false;

        Object.entries(newSquads).forEach(([teamName, entry]) => {
          if (upsertSquadCacheEntry(nextCache, teamName, entry, true)) {
            changed = true;
          }
        });

        if (!changed) return prevCache;
        localStorage.setItem(TEAM_SQUAD_CACHE_KEY, JSON.stringify(nextCache));
        return nextCache;
      });
      
      if (metadataSyncEnabled) {
        const metadataResults = await Promise.allSettled([
          set(ref(db, 'saved_teams'), updatedTeams),
          set(ref(db, 'saved_players'), updatedPlayers),
          set(ref(db, 'team_squads'), newSquads),
          set(ref(db, 'saved_players_by_team'), buildPlayersByTeamMap(newSquads))
        ]);

        const denied = metadataResults.some(
          (r) => r.status === 'rejected' && isPermissionDeniedError(r.reason)
        );
        const fatal = metadataResults.find(
          (r) => r.status === 'rejected' && !isPermissionDeniedError(r.reason)
        );

        if (fatal) {
          throw fatal.reason;
        }
        if (denied) {
          setMetadataSyncEnabled(false);
        }
      }
      if (draftSyncEnabled) {
        try {
          await remove(ref(db, `drafts/create_team/${draftOwnerId}`));
        } catch (e) {
          if (!isPermissionDeniedError(e)) {
            throw e;
          }
        }
      }

      localStorage.removeItem('teamA');
      localStorage.removeItem('teamB');
      navigate(`/schedule/${matchRef.key}`);
    } catch (e) {
      console.error('Match creation error:', e);
      if (isPermissionDeniedError(e)) {
        setError('Permission denied while creating match. Please check login session and Firebase rules for /matches write.');
      } else {
        setError(`Failed to create match: ${e.message}`);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <div className="card p-5 mb-5 slide-in overflow-visible relative z-20">
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
                onChange={(val) => {
                  const typedName = normalizeTeamName(val);
                  setCurrentTeam((prev) => {
                    const prevKey = normalizeTeamLookupKey(prev.name);
                    const nextKey = normalizeTeamLookupKey(typedName);

                    // When user changes team name, drop previous team's players to avoid stale squad mix.
                    if (!typedName) {
                      return { ...prev, name: '', players: [], logoUrl: '' };
                    }

                    if (prevKey && nextKey && prevKey === nextKey) {
                      return { ...prev, name: typedName };
                    }

                    return { ...prev, name: typedName, players: [], logoUrl: '' };
                  });
                  if (!typedName) {
                    lastAutofilledTeamRef.current[activeTab] = '';
                  } else if (normalizeTeamLookupKey(currentTeam.name) !== normalizeTeamLookupKey(typedName)) {
                    lastAutofilledTeamRef.current[activeTab] = '';
                  }
                }}
                onSelect={(val) => {
                  applyTeamSelection(val, { force: true });
                }}
                options={teamNameOptions}
              />
              {currentTeam.name && selectedTeamAutofillPlayers.length === 0 && (
                <p className="mt-2 text-[10px] font-bold text-[#8A8FA3] uppercase tracking-wider">
                  No saved squad found for this team yet.
                </p>
              )}
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
                ...selectedTeamPlayerNames,
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
              Squad - {currentTeam.name?.trim() || `Team ${activeTab}`}
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
              <button 
                onClick={() => handleToggleScorer(i)} 
                className={`text-xs font-semibold px-3 py-1 rounded-full transition ${
                  p.isScorer 
                    ? 'bg-[#00C9A7] text-white hover:bg-[#00a889]' 
                    : 'bg-white border border-[#00C9A7]/30 text-[#00C9A7] hover:bg-[#00C9A7]/10'
                }`}
              >
                {p.isScorer ? 'Remove' : 'Assign'}
              </button>
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

