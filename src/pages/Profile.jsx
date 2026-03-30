import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import BottomNav from '../components/BottomNav';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mapped Stats to exactly match screenshot
  const stats = { watched: 12, posts: 45, followers: '1.2k' };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const getInitials = (name) => {
    if (!name) return 'GU';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#009270] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-24 relative overflow-x-hidden">
        {/* Top Header Section */}
        <div className="bg-white pt-10 pb-8 rounded-b-xl shadow-sm mb-4 flex flex-col items-center">
            
            {/* Avatar block */}
            <div className="relative mb-3">
               <div className="w-20 h-20 rounded-full border-[3px] border-[#009270] bg-white p-[2px]">
                   <div className="w-full h-full rounded-full bg-[#009270] flex items-center justify-center text-white text-[28px] tracking-widest font-black">
                       {user ? getInitials(user.displayName || user.email) : 'GU'}
                   </div>
               </div>
               <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#009270] border-2 border-white flex items-center justify-center text-white">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-[12px] h-[12px]"><path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
               </div>
            </div>

            <h2 className="text-xl font-black text-[#1A1A2E] tracking-tight text-center">
               {user ? (user.displayName || user.email.split('@')[0]) : 'Guest'}
            </h2>
            <p className="text-[11px] font-bold text-[#8A8FA3] text-center mt-0.5 mb-6">
               {user ? user.email : 'Sign in or setup profile'}
            </p>

            <div className="flex items-center gap-8 mb-6">
                <div className="flex flex-col items-center">
                    <span className="text-base font-black text-[#1A1A2E]">{stats.watched}</span>
                    <span className="text-[8px] font-black text-[#8A8FA3] uppercase tracking-widest mt-0.5">WATCHED</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-base font-black text-[#1A1A2E]">{stats.posts}</span>
                    <span className="text-[8px] font-black text-[#8A8FA3] uppercase tracking-widest mt-0.5">POSTS</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-base font-black text-[#1A1A2E]">{stats.followers}</span>
                    <span className="text-[8px] font-black text-[#8A8FA3] uppercase tracking-widest mt-0.5">FOLLOWERS</span>
                </div>
            </div>

            <div className="flex items-center gap-3">
               <button className="bg-[#009270] text-white px-6 py-2 rounded-full text-[11px] font-black tracking-wide shadow-md shadow-[#009270]/20">
                   Follow
               </button>
               <button className="w-[32px] h-[32px] border border-[#E8EAF0] rounded-full flex items-center justify-center text-[#1A1A2E] bg-white shadow-sm">
                   <svg viewBox="0 0 24 24" fill="currentColor" className="w-[12px] h-[12px]"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
               </button>
            </div>
        </div>

        {/* Menu Items */}
        <div className="bg-white flex flex-col items-stretch divide-y divide-[#E8EAF0]/50 shadow-sm border-t border-b border-[#E8EAF0]">
            
            <button className="w-full bg-white px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <span className="text-[#FF4D4D]"><svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></span>
                <span className="text-xs font-bold text-[#1A1A2E]">Favorite Teams</span>
            </button>

            <button className="w-full bg-white px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <span className="text-[#A0AEC0]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-[18px] h-[18px]"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></span>
                <span className="text-xs font-bold text-[#1A1A2E]">Match History</span>
            </button>

            <button onClick={() => navigate('/settings')} className="w-full bg-white px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <span className="text-[#A0AEC0]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-[18px] h-[18px]"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></span>
                <span className="text-xs font-bold text-[#1A1A2E]">Settings</span>
            </button>

            <button onClick={() => navigate('/matches')} className="w-full bg-white px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <span className="text-[#F6B93B]"><svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" /></svg></span>
                <span className="text-xs font-bold text-[#1A1A2E]">My Created Matches</span>
            </button>

            <button onClick={() => user ? signOut(auth) : navigate('/login')} className="w-full bg-white px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <span className="text-[#FF4D4D]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-[18px] h-[18px]"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></span>
                <span className="text-xs font-bold text-[#FF4D4D]">{user ? 'Log Out' : 'Go to Login'}</span>
            </button>

        </div>

        <BottomNav />
    </div>
  );
}
