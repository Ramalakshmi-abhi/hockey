import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import Sidebar from './Sidebar';

export default function Header() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [allMatches, setAllMatches] = useState([]);
  const [allTeams, setAllTeams] = useState([]);

  // Load matches and teams for search
  useEffect(() => {
    const matchesRef = ref(db, 'matches');
    const teamsRef = ref(db, 'saved_teams');

    const unsubMatches = onValue(matchesRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const matchesList = Object.entries(data).map(([id, match]) => ({
          id,
          ...match,
          type: 'match'
        }));
        setAllMatches(matchesList);
      }
    });

    const unsubTeams = onValue(teamsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const teamsList = Array.isArray(data) ? data : Object.values(data);
        setAllTeams(teamsList.map(t => ({
          ...t,
          type: 'team'
        })));
      }
    });

    return () => {
      unsubMatches();
      unsubTeams();
    };
  }, []);

  // Load notifications
  useEffect(() => {
    const notificationsRef = ref(db, 'notifications');
    const unsub = onValue(notificationsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const notificationsList = Object.entries(data).map(([id, notif]) => ({
          id,
          ...notif
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setNotifications(notificationsList.slice(0, 10)); // Show last 10
      } else {
        // Default notifications for demo
        setNotifications([
          { id: 1, message: 'Your match is scheduled for today', type: 'info', timestamp: Date.now() },
          { id: 2, message: 'New player joined your team', type: 'success', timestamp: Date.now() - 3600000 },
          { id: 3, message: 'Tournament invitation received', type: 'info', timestamp: Date.now() - 7200000 },
        ]);
      }
    });

    return () => unsub();
  }, []);

  // Handle search
  const handleSearch = (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const matchesResults = allMatches.filter(m => 
      m.teamA?.name?.toLowerCase().includes(lowerQuery) ||
      m.teamB?.name?.toLowerCase().includes(lowerQuery) ||
      m.schedule?.venue?.toLowerCase().includes(lowerQuery)
    );

    const teamsResults = allTeams.filter(t => 
      (typeof t === 'string' ? t : t.name)?.toLowerCase().includes(lowerQuery)
    );

    setSearchResults([
      ...matchesResults.slice(0, 5).map(m => ({
        ...m,
        label: `${m.teamA?.name} vs ${m.teamB?.name}`,
        subtitle: m.schedule?.venue || 'Match'
      })),
      ...teamsResults.slice(0, 5).map(t => ({
        ...t,
        label: typeof t === 'string' ? t : t.name,
        subtitle: 'Team',
        type: 'team'
      }))
    ]);
  };

  return (
    <>
      <div className="bg-white px-5 py-3.5 flex items-center justify-between sticky top-0 z-40 shadow-sm border-b border-[#E8EAF0]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#E53E3E] flex items-center justify-center text-white font-black text-xs shadow-md">
            GO
          </div>
          <h1 className="font-extrabold text-[#1A1A2E] tracking-tight text-[17px]">Game On</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Search Button */}
          <button 
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 text-[#1A1A2E] hover:bg-[#F4F6F9] rounded-xl transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-[18px] h-[18px]">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Notification Button */}
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 text-[#1A1A2E] hover:bg-[#F4F6F9] rounded-xl transition-all relative"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-[18px] h-[18px]">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          {/* Menu Button */}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-[#1A1A2E] hover:bg-[#F4F6F9] rounded-xl transition-all ml-1"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start pt-18">
          <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl mt-4 mx-4">
            <div className="p-4 border-b border-[#E8EAF0]">
              <input
                autoFocus
                type="text"
                placeholder="Search matches, teams, venues..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[#E8EAF0] focus:outline-none focus:border-[#00C9A7] text-sm"
              />
            </div>
            <div className="max-h-96 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="divide-y">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="p-4 hover:bg-[#F4F6F9] cursor-pointer transition-colors"
                      onClick={() => {
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <p className="font-semibold text-[#1A1A2E] text-sm">{result.label}</p>
                      <p className="text-xs text-[#8A8FA3] mt-1">{result.subtitle}</p>
                    </div>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="p-8 text-center text-[#8A8FA3]">
                  <p className="text-sm">No results found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="p-8 text-center text-[#8A8FA3]">
                  <p className="text-sm">Start typing to search...</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsSearchOpen(false)}
              className="w-full p-3 text-[#8A8FA3] text-sm font-medium border-t border-[#E8EAF0] hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Notifications Panel */}
      {isNotificationsOpen && (
        <div className="absolute right-0 top-[56px] w-96 bg-white rounded-2xl shadow-xl border border-[#E8EAF0] max-h-96 overflow-y-auto z-50">
          <div className="p-4 border-b border-[#E8EAF0] flex items-center justify-between">
            <h3 className="font-bold text-[#1A1A2E]">Notifications</h3>
            {notifications.length > 0 && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-semibold">
                {notifications.length} new
              </span>
            )}
          </div>
          <div className="divide-y">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div key={notif.id} className="p-4 hover:bg-[#F4F6F9] transition-colors">
                  <p className="text-sm font-medium text-[#1A1A2E]">{notif.message}</p>
                  <p className="text-xs text-[#8A8FA3] mt-1">
                    {new Date(notif.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[#8A8FA3]">
                <p className="text-sm">No notifications</p>
              </div>
            )}
          </div>
        </div>
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}
