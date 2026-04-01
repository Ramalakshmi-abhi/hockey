import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Login from './pages/Login';
import CreateTeam from './pages/CreateTeam';
import CreateMenu from './pages/CreateMenu';
import CreateTournament from './pages/CreateTournament';
import LiveMatch from './pages/LiveMatch';
import JoinMatch from './pages/JoinMatch';
import ViewMatches from './pages/ViewMatches';
import ScheduleMatch from './pages/ScheduleMatch';
import Tournaments from './pages/Tournaments';
import TournamentDetails from './pages/TournamentDetails';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import MyCreatedMatches from './pages/MyCreatedMatches';

export default function App() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#F4F6F9] relative shadow-2xl border-x border-[#E8EAF0] overflow-x-hidden">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Home />} />
          <Route path="/create-menu" element={<CreateMenu />} />
          <Route path="/create" element={<CreateTeam />} />
          <Route path="/create-tournament" element={<CreateTournament />} />
          <Route path="/create_tournament" element={<CreateTournament />} />
          <Route path="/match/:id" element={<LiveMatch />} />
          <Route path="/schedule/:id" element={<ScheduleMatch />} />
          <Route path="/join" element={<JoinMatch />} />
          <Route path="/matches" element={<ViewMatches />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<TournamentDetails />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-created-matches" element={<MyCreatedMatches />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}
