import { useState } from 'react';
import Sidebar from './Sidebar';

export default function Header() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
          <button className="p-2 text-[#1A1A2E] hover:bg-[#F4F6F9] rounded-xl transition-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-[18px] h-[18px]">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <button className="p-2 text-[#1A1A2E] hover:bg-[#F4F6F9] rounded-xl transition-all relative">
            <svg viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-[18px] h-[18px]">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
          </button>

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

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}
