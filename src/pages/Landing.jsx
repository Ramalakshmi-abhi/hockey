import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 pb-12 animate-fade-in relative overflow-hidden">
      {/* Back Button */}
      <button 
        onClick={() => window.history.back()}
        className="absolute top-6 left-6 px-4 py-2 border border-gray-200 rounded-xl text-gray-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3 h-3"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back
      </button>

      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Hockey Icon Container */}
        <div className="relative mb-8 group">
          <div className="w-24 h-24 bg-[#F4F6F9] rounded-[2rem] rotate-12 flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 group-hover:rotate-6 duration-300">
             <span className="text-5xl -rotate-12 translate-x-1 translate-y-1">🏒</span>
          </div>
          {/* Decorative elements */}
          <div className="absolute -top-4 -right-4 w-8 h-8 bg-[#E0FBF5] rounded-full blur-sm opacity-50"></div>
          <div className="absolute -bottom-2 -left-6 w-12 h-12 bg-gray-100 rounded-full blur-md opacity-40"></div>
        </div>

        {/* Branding */}
        <div className="text-center mb-12">
          <h1 className="text-2xl font-black text-[#1A1A2E] tracking-[0.3em] uppercase mb-2">Hockey</h1>
          <p className="text-[10px] font-bold text-[#8A8FA3] uppercase tracking-[0.2em]">Choose your game mode</p>
        </div>

        {/* Buttons List */}
        <div className="w-full flex flex-col gap-4">
          {/* Start Match */}
          <button 
            onClick={() => navigate('/create')}
            className="group flex items-center gap-5 p-5 bg-white border-2 border-gray-50 rounded-[2rem] hover:border-[#00C9A7]/20 hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 w-full"
          >
            <div className="w-14 h-14 bg-[#00C9A7]/10 text-[#00C9A7] rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <div className="text-left flex-1">
              <h3 className="text-sm font-black text-[#1A1A2E] uppercase tracking-wider">Start Match</h3>
              <p className="text-[10px] text-[#8A8FA3] font-medium">Begin a live match with real-time scoring</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="#E8EAF0" strokeWidth="3" className="w-4 h-4 group-hover:translate-x-1 group-hover:stroke-[#00C9A7] transition-all"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          {/* Start Tournament */}
          <button 
            onClick={() => navigate('/create-tournament')}
            className="group flex items-center gap-5 p-5 bg-white border-2 border-gray-50 rounded-[2rem] hover:border-[#F5A623]/20 hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 w-full"
          >
            <div className="w-14 h-14 bg-[#F5A623]/10 text-[#F5A623] rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2l2.4 7.2h7.6l-6.15 4.47 2.35 7.33-6.2-4.5-6.2 4.5 2.35-7.33-6.15-4.47h7.6z"/></svg>
            </div>
            <div className="text-left flex-1">
              <h3 className="text-sm font-black text-[#1A1A2E] uppercase tracking-wider">Start Tournament</h3>
              <p className="text-[10px] text-[#8A8FA3] font-medium">Organize a full tournament with standings</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="#E8EAF0" strokeWidth="3" className="w-4 h-4 group-hover:translate-x-1 group-hover:stroke-[#F5A623] transition-all"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          {/* Join Match */}
          <button 
            onClick={() => navigate('/join')}
            className="group flex items-center gap-5 p-5 bg-white border-2 border-gray-50 rounded-[2rem] hover:border-[#7B5EA7]/20 hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 w-full"
          >
            <div className="w-14 h-14 bg-[#7B5EA7]/10 text-[#7B5EA7] rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
               <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </div>
            <div className="text-left flex-1">
              <h3 className="text-sm font-black text-[#1A1A2E] uppercase tracking-wider">Join Match</h3>
              <p className="text-[10px] text-[#8A8FA3] font-medium">Watch or follow an existing live match</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="#E8EAF0" strokeWidth="3" className="w-4 h-4 group-hover:translate-x-1 group-hover:stroke-[#7B5EA7] transition-all"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        {/* Browse all matches */}
        <button 
          onClick={() => navigate('/matches')}
          className="mt-12 text-[10px] font-black text-[#8A8FA3]/50 hover:text-[#00C9A7] uppercase tracking-[0.3em] flex items-center gap-2 group transition-all"
        >
          <span className="border-b border-transparent group-hover:border-[#00C9A7] transition-colors">Or Browse all matches</span>
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-2.5 h-2.5 group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Background decoration blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#00C9A7]/5 blur-[120px] -z-10 rounded-full"></div>
    </div>
  );
}
