import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const ACTIONS = [
  {
    id: 'start-match',
    title: 'Start Match',
    subtitle: 'Begin a new live hockey match with real-time scoring.',
    color: 'bg-[#00C9A7]/15 text-[#009270]',
    arrowColor: 'text-[#00C9A7]',
    to: '/create',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M8 5v14l11-7z" />
      </svg>
    )
  },
  {
    id: 'create-tournament',
    title: 'Create Tournament',
    subtitle: 'Organize a series of matches and manage standings.',
    color: 'bg-[#F5A623]/15 text-[#D9821A]',
    arrowColor: 'text-[#F5A623]',
    to: '/create-tournament',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M20.2 4H17V2H7v2H3.8C2.8 4 2 4.8 2 5.8v2.4c0 2.2 1.6 4.1 3.7 4.5 1 2.3 3.1 4 5.6 4.3v3H8v2h8v-2h-3.3v-3c2.5-.3 4.6-2 5.6-4.3 2.1-.4 3.7-2.3 3.7-4.5V5.8c0-1-.8-1.8-1.8-1.8zM5.5 8.4V6h1.5v3.4c-.7-.4-1.2-.7-1.5-1zm13 .4c-.3.3-.8.6-1.5.8V6h1.5v2.8z" />
      </svg>
    )
  }
];

export default function CreateMenu() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-24">
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2.5" className="w-5 h-5">
            <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-black tracking-widest text-[#1A1A2E] uppercase">Create & Manage</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6">
        <p className="text-[#1A1A2E] text-base font-black mb-4">Choose an action</p>

        <div className="space-y-4">
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => navigate(action.to)}
              className="w-full bg-white rounded-3xl border border-[#E8EAF0] p-5 flex items-center gap-4 text-left shadow-sm hover:shadow-md transition"
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${action.color}`}>
                {action.icon}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-[#1A1A2E] text-2xl font-black tracking-tight">{action.title}</h2>
                <p className="text-[#5E6B85] text-sm font-medium mt-1 leading-6">{action.subtitle}</p>
              </div>

              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`w-5 h-5 ${action.arrowColor}`}
              >
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
