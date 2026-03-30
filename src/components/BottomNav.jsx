import { useNavigate, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useState, useEffect } from 'react';

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const [initials, setInitials] = useState('');

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        const name = user.displayName || user.email || '';
        if (user.displayName) {
          const parts = name.trim().split(/\s+/);
          setInitials(parts.map(p => p[0]).join('').toUpperCase().slice(0, 2));
        } else {
          setInitials(name.slice(0, 2).toUpperCase());
        }
      } else {
        setInitials('GU');
      }
    });
    return () => unsub();
  }, []);

  const isActive = (paths) => paths.some(p => path.includes(p));

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.08)] border-t border-[#E8EAF0] z-50">
      <div className="px-6 py-3 flex items-center justify-between">
        
        {/* Home */}
        <button 
          onClick={() => { window.scrollTo(0,0); navigate('/dashboard'); }} 
          className={`p-2 transition-colors ${path === '/dashboard' ? 'text-[#009270]' : 'text-[#A0AEC0] hover:text-[#1A1A2E]'}`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-[28px] h-[28px]">
            <path d="M12 3l9 7v11h-6v-7h-6v7H3V10l9-7z" />
          </svg>
        </button>

        {/* Calendar (Matches) */}
        <button 
          onClick={() => navigate('/matches')} 
          className={`p-2 transition-colors ${isActive(['/schedule', '/matches']) ? 'text-[#009270]' : 'text-[#A0AEC0] hover:text-[#1A1A2E]'}`}
        >
          <svg viewBox="0 0 32 32" fill="currentColor" className="w-[26px] h-[26px]">
            <path d="M26 4h-2V2h-3v2H11V2H8v2H6C4.3 4 3 5.3 3 7v19c0 1.7 1.3 3 3 3h20c1.7 0 3-1.3 3-3V7c0-1.7-1.3-3-3-3zm0 22H6V12h20v14zm0-17H6V7h20v2z" />
            <path d="M10 16h3v3h-3zm5 0h3v3h-3zm5 0h3v3h-3zm-10 5h3v3h-3zm5 0h3v3h-3zm5 0h3v3h-3z" />
          </svg>
        </button>

        {/* Create (+) Squircle FAB */}
        <div className="flex justify-center items-center px-2">
          <button 
            onClick={() => navigate('/create')} 
            className="w-[52px] h-[52px] bg-[#009270] rounded-[18px] flex items-center justify-center text-white shadow-lg shadow-[#009270]/20 hover:scale-105 active:scale-95 transition-transform"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {/* Trophy (Tournaments) */}
        <button 
          onClick={() => navigate('/tournaments')} 
          className={`p-2 transition-colors ${path === '/tournaments' ? 'text-[#009270]' : 'text-[#A0AEC0] hover:text-[#1A1A2E]'}`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-[26px] h-[26px]">
            <path d="M20.2 4H17V2H7v2H3.8c-1 0-1.8.8-1.8 1.8v2.4c0 2.2 1.6 4.1 3.7 4.5 1 2.3 3.1 4 5.6 4.3v3H8v2h8v-2h-3.3v-3c2.5-.3 4.6-2 5.6-4.3 2.1-.4 3.7-2.3 3.7-4.5V5.8c0-1-.8-1.8-1.8-1.8zM5.5 8.4V6h1.5v3.4C6.3 9 5.8 8.7 5.5 8.4zm13 .4c-.3.4-.8.6-1.5.8V6h1.5v2.8z" />
          </svg>
        </button>

        {/* Profile */}
        <button 
          onClick={() => navigate('/profile')} 
          className="p-2 transition-transform hover:scale-105"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-black tracking-widest shadow-sm ${path === '/profile' ? 'bg-[#1A1A2E]' : 'bg-[#009270]'}`}>
            {initials}
          </div>
        </button>

      </div>
    </div>
  );
}
