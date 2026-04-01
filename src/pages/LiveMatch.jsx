import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { ref, onValue, update, get } from 'firebase/database';
import ScoreBoard from '../components/ScoreBoard';
import Timer from '../components/Timer';
import EventModal from '../components/EventModal';

const TABS = [
  { key: 'live', label: 'LIVE' },
  { key: 'scorecard', label: 'SCORECARD' },
  { key: 'summary', label: 'SUMMARY' },
  { key: 'squads', label: 'SQUADS' },
  { key: 'details', label: 'MATCH DETAILS' }
];

const EVENT_ICONS = {
  goal: 'GOAL',
  yellow_card: 'YC',
  red_card: 'RC',
  substitution: 'SUB'
};

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function buildNameKeys(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return [];

  const collapsed = raw.replace(/\s+/g, ' ');
  const compact = collapsed.replace(/[^a-z0-9]/g, '');
  return [collapsed, compact].filter(Boolean);
}

function normalizePlayersWithMeta(players) {
  const arr = Array.isArray(players)
    ? players
    : players && typeof players === 'object'
      ? Object.values(players)
      : [];

  return arr.map((player) => {
    if (typeof player === 'string') {
      return { name: player, phone: '', isScorer: false };
    }

    return {
      name: player?.name || player?.playerName || player?.fullName || '',
      phone: player?.phone || player?.phoneNumber || '',
      isScorer: Boolean(player?.isScorer)
    };
  });
}

export default function LiveMatch() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('live');
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserPhone, setCurrentUserPhone] = useState('');

  const matchId = match?.id || id;

  useEffect(() => {
    let mounted = true;
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (!mounted) return;
      setCurrentUser(user || null);

      if (!user) {
        setCurrentUserPhone('');
        return;
      }

      try {
        const snapshot = await get(ref(db, `users/${user.uid}`));
        if (!mounted) return;
        const dbPhone = snapshot.exists() ? snapshot.val()?.phone || '' : '';
        setCurrentUserPhone(dbPhone || user.phoneNumber || '');
      } catch (e) {
        if (!mounted) return;
        console.error('Failed to load user profile for scorer check', e);
        setCurrentUserPhone(user.phoneNumber || '');
      }
    });

    return () => {
      mounted = false;
      unsubAuth();
    };
  }, []);

  const handleCopy = async () => {
    try {
      const code = matchId;
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        throw new Error('Clipboard API not available');
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = matchId;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (e) {
        console.error('Fallback copy failed:', e);
        alert('Failed to copy Match ID. Please copy manually.');
      }
    }
  };

  useEffect(() => {
    if (!id) return;
    const matchRef = ref(db, `matches/${id}`);

    const unsub = onValue(
      matchRef,
      (snap) => {
        const data = snap.val();
        if (data) {
          setMatch({ id: snap.key, ...data });
          setError('');
          setLoading(false);
          return;
        }

        const allMatchesRef = ref(db, 'matches');
        get(allMatchesRef)
          .then((matchesSnap) => {
            const allData = matchesSnap.val();
            if (allData) {
              const foundId = Object.keys(allData).find((key) =>
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
          })
          .catch((e) => {
            console.error('Failed to load matches fallback', e);
            setError('Failed to load match.');
          })
          .finally(() => setLoading(false));
      },
      (err) => {
        console.error(err);
        setError('Failed to load match.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  async function handleTimeUpdate(time) {
    if (!match?.id || !canUpdateScoreboard) return;
    try {
      await update(ref(db, `matches/${match.id}`), { time });
    } catch (e) {
      console.error('Failed to update time', e);
    }
  }

  async function handleEvent(event) {
    if (!match?.id || !canUpdateScoreboard) return;
    try {
      const matchRef = ref(db, `matches/${match.id}`);
      const currentEvents = Array.isArray(match.events) ? match.events : [];
      const updates = {
        events: [...currentEvents, event]
      };

      if (event.type === 'goal') {
        if (event.team === 'A') {
          updates['teamA/score'] = (match.teamA?.score || 0) + 1;
        } else {
          updates['teamB/score'] = (match.teamB?.score || 0) + 1;
        }
      }

      await update(matchRef, updates);
      setShowModal(false);
    } catch (e) {
      console.error('Failed to add event', e);
    }
  }

  async function handleStartMatch() {
    if (!canUpdateScoreboard) return;
    try {
      await update(ref(db, `matches/${match.id}`), { status: 'live' });
    } catch (e) {
      console.error('Failed to start match', e);
    }
  }

  async function handleEndMatch() {
    if (!canUpdateScoreboard) return;
    try {
      await update(ref(db, `matches/${match.id}`), { status: 'ended' });
    } catch (e) {
      console.error('Failed to end match', e);
    }
  }

  const normalizePlayers = (players) => {
    const arr = Array.isArray(players)
      ? players
      : players && typeof players === 'object'
      ? Object.values(players)
      : [];

    return arr
      .map((p, i) => {
        if (typeof p === 'string') return { name: p, role: 'Player', index: i };
        return {
          name: p?.name || p?.playerName || p?.fullName || `Player ${i + 1}`,
          role: p?.role || p?.position || 'Player',
          index: i
        };
      })
      .filter((p) => p.name);
  };

  const teamAPlayers = useMemo(
    () => normalizePlayers(match?.teamA?.players),
    [match?.teamA?.players]
  );
  const teamBPlayers = useMemo(
    () => normalizePlayers(match?.teamB?.players),
    [match?.teamB?.players]
  );

  const scorerPlayers = useMemo(() => {
    return [...normalizePlayersWithMeta(match?.teamA?.players), ...normalizePlayersWithMeta(match?.teamB?.players)].filter(
      (player) => player.isScorer
    );
  }, [match?.teamA?.players, match?.teamB?.players]);

  const isCreatorUser = useMemo(() => {
    return Boolean(currentUser?.uid && match?.createdBy && currentUser.uid === match.createdBy);
  }, [currentUser?.uid, match?.createdBy]);

  const isScorerUser = useMemo(() => {
    if (!currentUser) return false;

    const nameKeySet = new Set([
      ...buildNameKeys(currentUser.displayName),
      ...buildNameKeys(currentUser.email ? currentUser.email.split('@')[0] : '')
    ]);
    const phoneKey = normalizePhone(currentUserPhone || currentUser.phoneNumber || '');

    return scorerPlayers.some((player) => {
      const scorerNameKeys = buildNameKeys(player.name);
      const scorerPhone = normalizePhone(player.phone);

      const nameMatched = scorerNameKeys.some((key) => nameKeySet.has(key));
      const phoneMatched = Boolean(phoneKey && scorerPhone && phoneKey === scorerPhone);
      return nameMatched || phoneMatched;
    });
  }, [currentUser, currentUserPhone, scorerPlayers]);

  const canUpdateScoreboard = isCreatorUser || isScorerUser;

  const events = useMemo(
    () => (Array.isArray(match?.events) ? [...match.events].reverse() : []),
    [match?.events]
  );

  const eventCounts = useMemo(() => {
    const list = Array.isArray(match?.events) ? match.events : [];
    return {
      goal: list.filter((e) => e.type === 'goal').length,
      yellow: list.filter((e) => e.type === 'yellow_card').length,
      red: list.filter((e) => e.type === 'red_card').length,
      sub: list.filter((e) => e.type === 'substitution').length
    };
  }, [match?.events]);

  const schedule = match?.schedule || {};
  const joinCode = String(matchId || '')
    .substring(0, 10)
    .toUpperCase();

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
        <div className="text-4xl mb-4">!</div>
        <p className="text-[#1A1A2E] font-bold text-lg mb-2">Match Not Found</p>
        <p className="text-[#8A8FA3] text-sm mb-6">{error || 'This match does not exist.'}</p>
        <button onClick={() => navigate('/')} className="btn-teal px-6 py-2.5 rounded-xl text-sm">
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-8">
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-20">
        <button onClick={() => navigate('/join')} className="p-2 rounded-xl hover:bg-gray-100 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2.5" className="w-5 h-5">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-black tracking-widest text-[#1A1A2E] uppercase flex-1">Match Details</h1>
        <button
          onClick={handleCopy}
          className="text-[10px] font-black uppercase tracking-widest bg-[#E0FBF5] text-[#00C9A7] px-3 py-1.5 rounded-xl"
        >
          {copied ? 'Copied' : 'Share'}
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                match.status === 'live' ? 'bg-[#FF4D4D] text-white' : 'bg-[#E0FBF5] text-[#00C9A7]'
              }`}
            >
              {match.status === 'live' ? 'Live' : 'Scheduled'}
            </span>
            <span className="text-[10px] font-black text-[#00C9A7] uppercase tracking-widest">
              {schedule.tournament || 'Custom Tournament'}
            </span>
          </div>
          <span className="text-[11px] font-bold text-[#1A1A2E]">{schedule.periods || '4 Quarters'}</span>
        </div>

        <div className="mb-4">
          <ScoreBoard teamA={match.teamA} teamB={match.teamB} status={match.status} />
        </div>

        {canUpdateScoreboard && (
          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-[#E53E3E] text-white py-3.5 rounded-2xl text-sm font-black tracking-widest uppercase mb-4"
          >
            Update Score Board
          </button>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[#00C9A7] text-white'
                  : 'bg-white border border-[#E8EAF0] text-[#8A8FA3] hover:text-[#1A1A2E]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'live' && (
          <div className="space-y-4">
            {canUpdateScoreboard ? (
              <div className="card p-5">
                <Timer onTimeUpdate={handleTimeUpdate} />
              </div>
            ) : (
              <div className="card p-5 text-center">
                <div className="text-5xl font-black tabular-nums text-[#1A1A2E] tracking-tight">
                  {match.time || '00:00'}
                </div>
                <p className="text-xs font-semibold tracking-widest text-[#8A8FA3] uppercase mt-4">Match Time</p>
              </div>
            )}

            {canUpdateScoreboard && (
              <div className="flex flex-col gap-3">
                {match.status !== 'live' && match.status !== 'ended' ? (
                  <button
                    onClick={handleStartMatch}
                    className="btn-teal py-4 rounded-xl text-sm font-black tracking-widest uppercase"
                  >
                    Start Match
                  </button>
                ) : match.status === 'live' ? (
                  <button
                    onClick={handleEndMatch}
                    className="bg-[#E53E3E] text-white py-4 rounded-xl text-sm font-black tracking-widest uppercase"
                  >
                    End Match
                  </button>
                ) : (
                  <div className="bg-gray-100 text-gray-500 py-4 rounded-xl text-center text-[11px] font-black uppercase tracking-widest">
                    Match Completed
                  </div>
                )}
              </div>
            )}

            <div className="card p-5">
              <h3 className="text-xs font-semibold tracking-widest text-[#8A8FA3] uppercase mb-4">Live Events</h3>
              {events.length === 0 ? (
                <p className="text-sm text-[#8A8FA3] text-center py-6">No events yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {events.slice(0, 10).map((ev, i) => (
                    <div key={i} className="flex items-center gap-3 border border-[#E8EAF0] rounded-xl px-4 py-3">
                      <span className="text-[10px] font-black text-[#00C9A7] bg-[#E0FBF5] px-2 py-1 rounded-md">
                        {EVENT_ICONS[ev.type] || 'EVT'}
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-[#1A1A2E]">
                          {ev.player}
                          {ev.type === 'substitution' && ev.subPlayer ? (
                            <span className="text-[#8A8FA3] font-normal">{' -> '} {ev.subPlayer}</span>
                          ) : null}
                        </div>
                        <div className="text-xs text-[#8A8FA3]">Team {ev.team} | {ev.type.replace('_', ' ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'scorecard' && (
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="text-xs font-semibold tracking-widest text-[#8A8FA3] uppercase mb-3">Team Scores</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F4F6F9] rounded-xl p-4">
                  <p className="text-[11px] font-black text-[#1A1A2E] uppercase truncate">{match.teamA?.name || 'Team A'}</p>
                  <p className="text-3xl font-black text-[#009270] mt-1">{match.teamA?.score ?? 0}</p>
                </div>
                <div className="bg-[#F4F6F9] rounded-xl p-4">
                  <p className="text-[11px] font-black text-[#1A1A2E] uppercase truncate">{match.teamB?.name || 'Team B'}</p>
                  <p className="text-3xl font-black text-[#009270] mt-1">{match.teamB?.score ?? 0}</p>
                </div>
              </div>
            </div>
            <div className="card p-5">
              <h3 className="text-xs font-semibold tracking-widest text-[#8A8FA3] uppercase mb-3">Event Counts</h3>
              <div className="grid grid-cols-2 gap-3 text-sm font-bold">
                <div className="bg-[#F4F6F9] rounded-xl p-3 text-[#1A1A2E]">Goals: {eventCounts.goal}</div>
                <div className="bg-[#F4F6F9] rounded-xl p-3 text-[#1A1A2E]">Yellow Cards: {eventCounts.yellow}</div>
                <div className="bg-[#F4F6F9] rounded-xl p-3 text-[#1A1A2E]">Red Cards: {eventCounts.red}</div>
                <div className="bg-[#F4F6F9] rounded-xl p-3 text-[#1A1A2E]">Substitutions: {eventCounts.sub}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-semibold tracking-widest text-[#8A8FA3] uppercase">Match Summary</h3>
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-[#8A8FA3]">Status</span>
              <span className="text-[#1A1A2E] uppercase">{match.status || 'pending'}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-[#8A8FA3]">Tournament</span>
              <span className="text-[#1A1A2E]">{schedule.tournament || 'Custom Tournament'}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-[#8A8FA3]">Venue</span>
              <span className="text-[#1A1A2E]">{schedule.venue || 'TBD'}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-[#8A8FA3]">Date / Time</span>
              <span className="text-[#1A1A2E]">{schedule.matchDate || 'N/A'} {schedule.matchTime || ''}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-[#8A8FA3]">Toss Winner</span>
              <span className="text-[#1A1A2E]">{schedule.tossWinner || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-[#8A8FA3]">Decision</span>
              <span className="text-[#1A1A2E]">{schedule.tossDecision || 'N/A'}</span>
            </div>
          </div>
        )}

        {activeTab === 'squads' && (
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="text-xs font-semibold tracking-widest text-[#8A8FA3] uppercase mb-3">{match.teamA?.name || 'Team A'} Squad</h3>
              {teamAPlayers.length === 0 ? (
                <p className="text-sm text-[#8A8FA3]">No players available.</p>
              ) : (
                <div className="space-y-2">
                  {teamAPlayers.map((p, idx) => (
                    <div key={idx} className="bg-[#F4F6F9] rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-[#1A1A2E]">{idx + 1}. {p.name}</span>
                      <span className="text-[10px] font-black text-[#00C9A7] uppercase">{p.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="text-xs font-semibold tracking-widest text-[#8A8FA3] uppercase mb-3">{match.teamB?.name || 'Team B'} Squad</h3>
              {teamBPlayers.length === 0 ? (
                <p className="text-sm text-[#8A8FA3]">No players available.</p>
              ) : (
                <div className="space-y-2">
                  {teamBPlayers.map((p, idx) => (
                    <div key={idx} className="bg-[#F4F6F9] rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-[#1A1A2E]">{idx + 1}. {p.name}</span>
                      <span className="text-[10px] font-black text-[#00C9A7] uppercase">{p.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'details' && (
          <div className="card p-5 space-y-4">
            <h3 className="text-xs font-semibold tracking-widest text-[#8A8FA3] uppercase">Match Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-black text-[#8A8FA3] uppercase">Scheduled Date</p>
                <p className="font-bold text-[#1A1A2E] mt-1">{schedule.matchDate || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-[#8A8FA3] uppercase">Starting Time</p>
                <p className="font-bold text-[#1A1A2E] mt-1">{schedule.matchTime || 'N/A'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-black text-[#8A8FA3] uppercase">Match Venue</p>
                <p className="font-bold text-[#1A1A2E] mt-1">{schedule.venue || 'TBD'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-black text-[#8A8FA3] uppercase">Join Code</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="bg-[#F4F6F9] px-3 py-2 rounded-xl font-mono text-[#1A1A2E] text-sm">{joinCode || 'N/A'}</code>
                  <button
                    onClick={handleCopy}
                    className="text-[11px] font-black uppercase tracking-widest bg-[#E0FBF5] text-[#00C9A7] px-3 py-2 rounded-xl"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModal && canUpdateScoreboard && (
        <EventModal teamA={match.teamA} teamB={match.teamB} onSubmit={handleEvent} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
