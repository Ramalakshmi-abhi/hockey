import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import BottomNav from '../components/BottomNav';
import Header from '../components/Header';

export default function Home() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const matchesRef = ref(db, 'matches');
    const postsRef = ref(db, 'posts');

    const unsubMatches = onValue(matchesRef, (snap) => {
      const data = snap.val();
      if (data) {
        // Convert object to array and sort by createdAt descending
        const matchesArray = Object.entries(data).map(([id, match]) => ({
          id,
          ...match
        }));
        // Filter out ended matches for the live feed, or just show scheduled/live
        const activeMatches = matchesArray.filter(m => m.status === 'live' || m.status === 'scheduled');
        activeMatches.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setMatches(activeMatches);
      } else {
        setMatches([]);
      }
      setLoading(false);
    });

    const unsubPosts = onValue(postsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const postsArray = Object.entries(data).map(([id, post]) => ({
          id,
          ...post
        })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setPosts(postsArray);
      } else {
        // Fallback default post
        setPosts([{
          id: 'default',
          title: 'Hockey World Cup 2026: Team prepares for the semi-final showdown',
          excerpt: "The national team's journey has been phenomenal this season. After navigating through the group stages with flying colors, they now face their toughest challenge yet...",
          image: 'https://images.unsplash.com/photo-1515523110800-9415d13b84a8?auto=format&fit=crop&q=80&w=1200&h=600'
        }]);
      }
    });

    return () => {
      unsubMatches();
      unsubPosts();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-24">
      {/* App Header */}
      <Header />

      <div className="px-4 pt-6">
        {/* Live Matches Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#1A1A2E]">Live Hockey Matches</h2>
          <button onClick={() => navigate('/matches')} className="bg-[#5C6BFF] text-white text-[10px] font-bold px-4 py-2 rounded-xl uppercase tracking-wider shadow-sm hover:shadow-md transition-shadow">
            View All
          </button>
        </div>

        {/* Horizontal Matches List */}
        <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
          {loading ? (
             <div className="flex-none w-[320px] h-56 bg-white rounded-[2rem] animate-pulse shadow-sm border border-[#E8EAF0]" />
          ) : matches.length === 0 ? (
            <div className="flex-none w-[320px] bg-white rounded-[2rem] p-8 text-center shadow-sm border border-[#E8EAF0]">
              <p className="text-[#8A8FA3] text-sm font-medium">No active matches found.</p>
              <button onClick={() => navigate('/create')} className="mt-4 text-[#00C9A7] font-semibold text-xs uppercase tracking-widest bg-[#E0FBF5] px-4 py-2 rounded-xl">
                + Start One
              </button>
            </div>
          ) : (
            matches.map((match) => (
              <div 
                key={match.id} 
                onClick={() => navigate(match.status === 'scheduled' ? `/schedule/${match.id}` : `/match/${match.id}`)}
                className="flex-none w-[320px] bg-white rounded-[2rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E8EAF0] snap-center cursor-pointer hover:shadow-lg transition-all relative overflow-hidden group"
              >
                {/* Status Badge */}
                <div className={`absolute top-5 left-5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${
                  match.status === 'live' ? 'bg-[#FF4D4D] text-white shadow-sm' : 'bg-[#E0FBF5] text-[#00C9A7]'
                }`}>
                  {match.status === 'live' ? 'Live' : 'Scheduled'}
                </div>
                
                {/* Tournament Name Header */}
                <div className="text-[9px] font-black tracking-widest text-[#00C9A7] uppercase text-center mt-1 mb-6">
                  {match.schedule?.tournament || 'CUSTOM TOURNAMENT'}
                </div>

                {/* Team Logos and VS */}
                <div className="flex items-center justify-between mb-6 px-1 relative">
                  {/* Team A */}
                  <div className="flex flex-col items-center flex-1">
                    {match.teamA?.logoUrl ? (
                      <div className="w-14 h-14 rounded-full overflow-hidden shadow-md group-hover:scale-105 transition-transform border border-gray-100">
                        <img src={match.teamA.logoUrl} alt={match.teamA.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#1E88E5] flex items-center justify-center text-white font-black shadow-md border-2 border-white group-hover:scale-105 transition-transform">
                        {match.teamA.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* VS and Ground Info */}
                  <div className="flex flex-col items-center absolute inset-x-0 mx-auto justify-center pointer-events-none">
                     <div className="text-[9px] font-bold text-[#8A8FA3] bg-[#F4F6F9] px-2 py-0.5 rounded-full mb-2">VS</div>
                     <div className="text-[8px] font-bold text-[#8A8FA3] uppercase tracking-widest text-center truncate max-w-[100px]">
                       {match.schedule?.venue || 'UNKNOWN GROUND'}
                     </div>
                     <div className="text-[8px] font-bold text-[#A0AEC0] mt-0.5 whitespace-nowrap">
                       {match.schedule?.matchDate || new Date(match.createdAt || Date.now()).toLocaleDateString()} • {match.schedule?.matchTime || '11:16 AM'}
                     </div>
                  </div>

                  {/* Team B */}
                  <div className="flex flex-col items-center flex-1">
                    {match.teamB?.logoUrl ? (
                      <div className="w-14 h-14 rounded-full overflow-hidden shadow-md group-hover:scale-105 transition-transform border border-gray-100">
                        <img src={match.teamB.logoUrl} alt={match.teamB.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#1A1A2E] flex items-center justify-center text-white font-black shadow-md border-2 border-white group-hover:scale-105 transition-transform">
                        {match.teamB.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Scores Footer */}
                <div className="flex items-center justify-between px-2">
                   <div className="flex flex-col items-center flex-1 text-center">
                      <span className="text-[10px] font-black text-[#1A1A2E] truncate w-20 uppercase mb-1">{match.teamA.name}</span>
                      <span className="text-sm font-black text-[#009270]">{match.teamA.score || 0} <span className="text-[10px] text-gray-400 font-bold ml-0.5">({match.teamA.score || 0})</span></span>
                   </div>
                   <div className="flex-1" />
                   <div className="flex flex-col items-center flex-1 text-center">
                      <span className="text-[10px] font-black text-[#1A1A2E] truncate w-20 uppercase mb-1">{match.teamB.name}</span>
                      <span className="text-sm font-black text-[#009270]">{match.teamB.score || 0} <span className="text-[10px] text-gray-400 font-bold ml-0.5">({match.teamB.score || 0})</span></span>
                   </div>
                </div>

              </div>
            ))
          )}
        </div>

        {/* Post Section */}
        <div className="mt-2 mb-6">
          <h2 className="text-sm font-bold text-[#1A1A2E] mb-4">Post</h2>
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E8EAF0]">
                {post.image && (
                  <div className="aspect-video w-full relative bg-gray-100">
                    <img 
                      src={post.image} 
                      alt={post.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-5 pb-6 bg-white">
                  <h3 className="font-extrabold text-[#1A1A2E] text-sm mb-2 leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs text-[#8A8FA3] line-clamp-2 mb-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <button className="text-[#009270] text-[10px] font-black uppercase tracking-[0.1em] hover:text-[#00795A] transition-colors float-right">
                    Read More
                  </button>
                  <div className="clear-both" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
