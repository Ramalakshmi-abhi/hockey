import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut, updateProfile, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import BottomNav from '../components/BottomNav';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Hockey Enthusiast');
  const [theme, setTheme] = useState('Light');

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setDisplayName(currentUser.displayName || currentUser.email.split('@')[0]);
        setEmail(currentUser.email || '');
        
        // Fetch additional user metadata from DB
        const userRef = ref(db, 'users/' + currentUser.uid);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
           const data = snapshot.val();
           if (data.phone) setPhone(data.phone);
           if (data.role) setRole(data.role);
           if (data.theme) setTheme(data.theme);
        }
      }
      setLoading(false);
    });

    return () => unsubAuth();
  }, []);

  const handleSave = async () => {
    if (!user) return;
    try {
      // 1. Update Profile Display Name
      if (displayName.trim() && displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      // 2. Change Password Logic
      if (isChangingPassword && oldPassword && newPassword) {
        const credential = EmailAuthProvider.credential(user.email, oldPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        setIsChangingPassword(false);
        setOldPassword('');
        setNewPassword('');
      }

      // 3. Save extra user details (Phone, Role, Theme) to Realtime DB
      await set(ref(db, 'users/' + user.uid), {
         phone,
         role,
         theme,
         updatedAt: Date.now()
      });

      alert("Settings Saved Successfully!");
    } catch (e) {
      console.error("Error updating profile", e);
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
         alert("Incorrect old password entered. Please try again.");
      } else {
         alert(e.message);
      }
    }
  };

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

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col pb-24">
        <div className="bg-white px-5 py-4 flex items-center shadow-sm border-b border-gray-100">
          <button onClick={() => navigate(-1)} className="mr-3">
             <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2.5" className="w-5 h-5"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h1 className="font-extrabold text-[#1A1A2E] tracking-tight text-lg">Login / Signup</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <h2 className="text-xl font-black text-[#1A1A2E] tracking-tight mb-2">Not Logged In</h2>
          <p className="text-[#8A8FA3] text-sm mb-6 max-w-[250px]">
            Please log in to manage your settings.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full bg-[#009270] py-4 rounded-xl text-sm font-black text-white shadow-lg shadow-[#009270]/20"
          >
            Log In / Sign Up
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-24 relative overflow-x-hidden">
      {/* Header */}
      <div className="bg-white px-5 py-4 flex items-center shadow-sm border-b border-gray-100 sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="mr-3 p-1">
           <svg viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2.5" className="w-6 h-6"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <h1 className="font-extrabold text-[#1A1A2E] tracking-tight text-[17px]">Profile Settings</h1>
        
        {/* Logout Option - replacing normal profile action */}
        <button onClick={() => signOut(auth)} className="ml-auto text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-lg">
          Logout
        </button>
      </div>

      <div className="px-5 pt-8 flex flex-col animate-fade-in w-full max-w-sm mx-auto">
        
        {/* Circular Avatar */}
        <div className="flex justify-center mb-8">
           <div className="relative">
             <div className="w-24 h-24 rounded-full border-[3px] border-[#009270] flex items-center justify-center bg-white p-1">
                <div className="w-full h-full bg-[#009270] rounded-full flex items-center justify-center text-white text-3xl font-black">
                   {getInitials(displayName)}
                </div>
             </div>
             <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#009270] border-2 border-white flex items-center justify-center text-white shadow-md hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 15.2a3.2 3.2 0 100-6.4 3.2 3.2 0 000 6.4z"/><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>
             </button>
           </div>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-extrabold text-[#1A1A2E] mb-2 block">Full Name</label>
            <input 
              type="text" 
              className="w-full border border-[#E8EAF0] rounded-xl px-4 py-3.5 text-sm font-bold text-[#1A1A2E] outline-none focus:border-[#009270] transition-colors"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-[#1A1A2E] mb-2 block">Email Address</label>
            <input 
              type="email" 
              className="w-full border border-[#E8EAF0] rounded-xl px-4 py-3.5 text-sm font-bold text-[#1A1A2E] outline-none focus:border-[#009270] transition-colors"
              placeholder="Enter email address"
              value={email}
              readOnly
            />
          </div>

          {isChangingPassword ? (
            <div className="bg-[#F4F6F9] p-4 rounded-xl border border-[#009270]/30 animate-fade-in shadow-inner">
              <div className="flex justify-between items-center mb-4">
                <label className="text-[11px] font-extrabold text-[#1A1A2E]">Change Password</label>
                <button 
                  onClick={() => {
                     setIsChangingPassword(false);
                     setOldPassword('');
                     setNewPassword('');
                  }} 
                  className="text-[10px] text-gray-500 font-bold uppercase tracking-widest hover:text-red-500 transition-colors bg-white px-2 py-1 rounded"
                >
                  Cancel
                </button>
              </div>
              
              <input 
                type="password" 
                className="w-full border border-[#E8EAF0] rounded-xl px-4 py-3 text-sm font-bold text-[#1A1A2E] outline-none focus:border-[#009270] mb-3 transition-colors"
                placeholder="Old Password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <input 
                type="password" 
                className="w-full border border-[#E8EAF0] rounded-xl px-4 py-3 text-sm font-bold text-[#1A1A2E] outline-none focus:border-[#009270] transition-colors"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <p className="text-[9px] text-[#8A8FA3] mt-3 leading-tight italic">
                Enter your current old password to verify it's you, then enter your desired new password. It will update when you click Save Changes.
              </p>
            </div>
          ) : (
            <div>
              <label className="text-[11px] font-extrabold text-[#1A1A2E] mb-2 block">Password</label>
              <button 
                onClick={() => setIsChangingPassword(true)}
                className="w-full border border-[#E8EAF0] rounded-xl px-4 py-3.5 text-sm font-bold text-[#8A8FA3] text-left bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors"
              >
                ••••••••
                <span className="text-[10px] text-[#009270] font-black uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md">Change</span>
              </button>
            </div>
          )}

          <div>
            <label className="text-[11px] font-extrabold text-[#1A1A2E] mb-2 block">Phone Number</label>
            <input 
              type="tel" 
              className="w-full border border-[#E8EAF0] rounded-xl px-4 py-3.5 text-sm font-bold text-[#1A1A2E] outline-none focus:border-[#009270] transition-colors"
              placeholder="Enter phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-[#1A1A2E] mb-2 block">Role</label>
            <select 
               className="w-full border border-[#E8EAF0] rounded-xl px-4 py-3.5 text-sm font-bold text-[#1A1A2E] outline-none focus:border-[#009270] transition-colors appearance-none bg-white"
               value={role}
               onChange={(e) => setRole(e.target.value)}
            >
               <option>Hockey Enthusiast</option>
               <option>Match Official</option>
               <option>Team Manager</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-extrabold text-[#1A1A2E] mb-2 block">App Theme</label>
            <div className="flex bg-[#F4F6F9] p-1.5 rounded-xl">
               <button 
                  onClick={() => setTheme('Light')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${theme === 'Light' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#8A8FA3]'}`}
               >
                  ⚙️ Light
               </button>
               <button 
                  onClick={() => setTheme('Dark')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${theme === 'Dark' ? 'bg-white text-[#1A1A2E] shadow-sm' : 'text-[#8A8FA3]'}`}
               >
                  🌙 Dark
               </button>
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-[#009270] text-white py-4 rounded-xl text-sm font-bold tracking-wide mt-8 shadow-lg shadow-[#009270]/20 hover:opacity-95 transition-opacity"
        >
          Save Changes
        </button>

      </div>

      <BottomNav />
    </div>
  );
}
