import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const sportsCategories = [
    { name: 'Cricket', icon: '⚽' }, // Using generic icons since SVGs are complex here, wait, I'll use emojis
    { name: 'Football', icon: '⚽' },
    { name: 'Badminton', icon: '🏸' },
    { name: 'Tennis', icon: '🎾' },
    { name: 'Basketball', icon: '🏀' },
    { name: 'Hockey', icon: '🏒' },
  ];

  const others = [
    { name: 'Home', path: '/dashboard', icon: '🏠' },
    { name: 'Login / Signup', path: '/profile', icon: '👤' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />
      
      {/* Sidebar Content */}
      <div className="absolute top-0 right-0 w-[280px] h-full bg-white shadow-2xl flex flex-col animate-slide-in-right overflow-y-auto">
        {/* Teal Header */}
        <div className="bg-[#009270] p-5 flex items-center justify-between shadow-lg z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-white bg-[#E53E3E] flex items-center justify-center text-white font-black text-[11px] shadow-sm">
              GO
            </div>
            <h2 className="font-extrabold text-white tracking-tight text-lg">
              Game On
            </h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-4 h-4">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* SPORTS CATEGORIES */}
        <div className="py-4">
          <p className="text-[10px] font-black text-[#8A8FA3] uppercase tracking-wider pl-6 mb-2">Sports Categories</p>
          <div className="flex flex-col">
            {sportsCategories.map((sport) => (
              <button
                key={sport.name}
                className={`flex items-center gap-4 px-6 py-3.5 text-sm font-bold transition-all ${
                  sport.name === 'Cricket' 
                    ? 'border-l-[3px] border-[#009270] bg-[#E0FBF5]/30 text-[#009270]' 
                    : 'border-l-[3px] border-transparent text-[#1A1A2E] hover:bg-gray-50'
                }`}
              >
                <span className="text-gray-400 text-base grayscale">{sport.icon}</span>
                <span>{sport.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* OTHERS */}
        <div className="py-2 flex-1">
          <p className="text-[10px] font-black text-[#8A8FA3] uppercase tracking-wider pl-6 mb-2">Others</p>
          <div className="flex flex-col">
            {others.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  navigate(item.path);
                  onClose();
                }}
                className={`flex items-center gap-4 px-6 py-3.5 text-sm font-bold transition-all border-l-[3px] border-transparent text-[#1A1A2E] hover:bg-gray-50`}
              >
                <span className="text-gray-400 text-base grayscale">{item.icon}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 text-center">
          <p className="text-[10px] font-bold text-[#8A8FA3]">© 2026 Game On Live Score</p>
        </div>
      </div>
    </div>
  );
}
