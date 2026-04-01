import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import BottomNav from '../components/BottomNav';

export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState('');
  const [matchesReadBlocked, setMatchesReadBlocked] = useState(false);

  const getTeamsForTournament = (t) => {
    if (Array.isArray(t?.teams) && t.teams.length > 0) return t.teams;
    if (!Array.isArray(t?.groups)) return [];

    const names = [...new Set(
      t.groups.flatMap(group =>
        Array.isArray(group?.teams)
          ? group.teams.map(team => (team?.name || '').trim()).filter(Boolean)
          : []
      )
    )];

    return names.map(name => ({ name }));
  };

  useEffect(() => {
    if (!id) return;

    const tRef = ref(db, `tournaments/${id}`);
    const unsubTournament = onValue(tRef, (snap) => {
      setReadError('');
      const data = snap.val();
      setTournament(data ? { id: snap.key, ...data } : null);
      setLoading(false);
    }, (err) => {
      console.error('Failed to load tournament details', err);
      setReadError(err?.message || 'Permission denied while loading tournament details.');
      setLoading(false);
    });

    const mRef = ref(db, 'matches');
    const unsubMatches = onValue(mRef, (snap) => {
      setMatchesReadBlocked(false);
      const data = snap.val();
      if (!data) {
        setMatches([]);
        return;
      }
      const list = Object.entries(data).map(([matchId, val]) => ({ id: matchId, ...val }));
      setMatches(list);
    }, (err) => {
      console.error('Failed to read matches for tournament details', err);
      setMatches([]);
      setMatchesReadBlocked(true);
    });

    return () => {
      unsubTournament();
      unsubMatches();
    };
  }, [id]);

  const tournamentTeams = useMemo(() => getTeamsForTournament(tournament), [tournament]);

  const relatedMatches = useMemo(() => {
    if (!tournament) return [];

    const tournamentName = (tournament.name || '').trim().toLowerCase();
    const teamSet = new Set(
      tournamentTeams.map(t => (t?.name || '').trim().toLowerCase()).filter(Boolean)
    );

    return matches
      .filter(m => {
        if (m.tournamentId === tournament.id) return true;

        const scheduleTournament = (m.schedule?.tournament || '').trim().toLowerCase();
        if (scheduleTournament && tournamentName && scheduleTournament === tournamentName) return true;

        const teamA = (m.teamA?.name || '').trim().toLowerCase();
        const teamB = (m.teamB?.name || '').trim().toLowerCase();
        return teamSet.size > 1 && teamSet.has(teamA) && teamSet.has(teamB);
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [matches, tournament, tournamentTeams]);

  const formatDate = (value) => {
    if (!value) return 'N/A';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
  };

  const formatDateTime = (m) => {
    const matchDate = m?.schedule?.matchDate ? formatDate(m.schedule.matchDate) : formatDate(m.createdAt);
    const matchTime = m?.schedule?.matchTime || (m?.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--');
    return `${matchDate} • ${matchTime}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-[#00C9A7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center text-center p-6">
        <p className="text-lg font-black text-[#1A1A2E] mb-2">{readError ? 'Unable to open tournament' : 'Tournament not found'}</p>
        {readError && <p className="text-sm text-red-500 mb-3">{readError}</p>}
        <button onClick={() => navigate('/tournaments')} className="btn-teal px-5 py-2 rounded-xl text-sm font-bold">
          Back to Tournaments
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-24">
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/tournaments')} className="p-2 rounded-xl hover:bg-gray-100 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2.5" className="w-5 h-5">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-black tracking-widest text-[#1A1A2E] uppercase">Tournament Info</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#E8EAF0]">
          <div className="flex justify-between items-start mb-3">
            <h2 className="font-black text-[#1A1A2E] text-lg uppercase">{tournament.name || 'Tournament'}</h2>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-[#E0FBF5] text-[#00C9A7]">
              {tournament.status || 'upcoming'}
            </span>
          </div>
          <p className="text-[11px] font-bold text-[#8A8FA3] mb-1">Location: {tournament.location || 'TBD'}</p>
          <p className="text-[11px] font-bold text-[#8A8FA3] mb-3">Date: {formatDate(tournament.startDate || tournament.createdAt)}</p>
          <div className="flex flex-wrap gap-1.5">
            {tournamentTeams.length > 0 ? (
              tournamentTeams.map((team, idx) => (
                <span key={idx} className="text-[10px] bg-gray-50 text-gray-500 px-3 py-1 rounded-lg border border-gray-100 font-bold uppercase">
                  {team.name}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-[#8A8FA3] font-bold">No teams added yet</span>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#E8EAF0]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-[#1A1A2E] uppercase tracking-wider text-sm">Matches</h3>
            <span className="text-[10px] font-black text-[#00C9A7] uppercase tracking-wider">{relatedMatches.length} Total</span>
          </div>

          {matchesReadBlocked ? (
            <p className="text-[11px] text-red-500 font-bold">Matches are blocked by database rules for this user.</p>
          ) : relatedMatches.length === 0 ? (
            <p className="text-[11px] text-[#8A8FA3] font-bold">No matches linked to this tournament yet.</p>
          ) : (
            <div className="space-y-3">
              {relatedMatches.map(m => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/match/${m.id}`)}
                  className="w-full text-left rounded-2xl border border-[#E8EAF0] p-4 hover:border-[#00C9A7]/30 hover:bg-[#F9FEFD] transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[12px] font-black text-[#1A1A2E] uppercase truncate">
                      {(m.teamA?.name || 'Team A')} vs {(m.teamB?.name || 'Team B')}
                    </p>
                    <span className="text-[9px] font-black uppercase text-[#00C9A7]">{m.status || 'pending'}</span>
                  </div>
                  <p className="text-[10px] text-[#8A8FA3] font-bold mb-1">{formatDateTime(m)}</p>
                  <p className="text-[10px] text-[#8A8FA3] font-bold">Venue: {m.schedule?.venue || 'TBD'}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
