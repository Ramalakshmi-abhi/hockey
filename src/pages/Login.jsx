import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter both email and password.'); return; }
    setError(''); setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/profile');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('Email already in use. Please log in instead.');
      else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') setError('Invalid email or password.');
      else if (err.code === 'auth/weak-password') setError('Password should be at least 6 characters.');
      else { setError('Authentication failed. Please try again.'); console.error(err); }
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/profile');
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Please enter your email address first.'); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setMsg('Password reset email sent! Check your inbox.');
      setError('');
    } catch (err) {
      setError('Could not send reset email. Check the email address.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-8">

          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-[#E53E3E] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md mb-4">
              G
            </div>
            <h1 className="text-2xl font-black text-[#1A1A2E] tracking-tight text-center">
              {isLogin ? 'Welcome Back' : 'Create Profile'}
            </h1>
            <p className="text-[12px] text-[#8A8FA3] font-medium mt-1 text-center">
              {isLogin ? 'Log in to your Game On account' : 'Sign up and start scoring!'}
            </p>
          </div>

          {/* Error / Message */}
          {error && (
            <div className="bg-red-50 text-red-500 text-[11px] font-bold px-4 py-3 rounded-xl mb-4 border border-red-100 flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>
              {error}
            </div>
          )}
          {msg && (
            <div className="bg-green-50 text-green-600 text-[11px] font-bold px-4 py-3 rounded-xl mb-4 border border-green-100">
              {msg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label className="text-[11px] font-extrabold text-[#1A1A2E] mb-1.5 block">Email Address</label>
              <div className="flex items-center border border-[#E8EAF0] rounded-xl bg-white focus-within:border-[#009270] transition-colors">
                <span className="pl-4 text-[#A0AEC0]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </span>
                <input
                  type="email"
                  className="flex-1 bg-transparent px-3 py-3.5 text-sm font-semibold text-[#1A1A2E] outline-none placeholder:text-[#A0AEC0] placeholder:font-normal"
                  placeholder="john@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[11px] font-extrabold text-[#1A1A2E] mb-1.5 block">Password</label>
              <div className="flex items-center border border-[#E8EAF0] rounded-xl bg-white focus-within:border-[#009270] transition-colors">
                <span className="pl-4 text-[#A0AEC0]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="flex-1 bg-transparent px-3 py-3.5 text-sm font-semibold text-[#1A1A2E] outline-none placeholder:text-[#A0AEC0] placeholder:font-normal"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="pr-4 text-[#A0AEC0] hover:text-[#1A1A2E] transition-colors">
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>

              {isLogin && (
                <div className="flex justify-end mt-1.5">
                  <button type="button" onClick={handleForgotPassword} className="text-[11px] font-bold text-[#F6B93B] hover:underline">
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#F6B93B] hover:bg-[#f0ad30] active:scale-95 text-white py-3.5 rounded-xl text-sm font-black tracking-wide shadow-md shadow-[#F6B93B]/30 transition-all disabled:opacity-70 mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                  Loading...
                </span>
              ) : isLogin ? 'Sign In' : 'Create Profile'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#E8EAF0]" />
            <span className="text-[10px] font-bold text-[#A0AEC0] uppercase tracking-widest">Or continue with</span>
            <div className="flex-1 h-px bg-[#E8EAF0]" />
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full border border-[#E8EAF0] rounded-xl py-3 flex items-center justify-center gap-3 text-sm font-bold text-[#1A1A2E] hover:bg-gray-50 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign In with Google
          </button>

          {/* Toggle Sign In / Sign Up */}
          <p className="text-center text-[12px] text-[#8A8FA3] font-medium mt-6">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); setMsg(''); }}
              className="text-[#F6B93B] font-black hover:underline"
            >
              {isLogin ? 'Create Profile' : 'Sign In'}
            </button>
          </p>

          <button
            onClick={() => navigate('/')}
            className="mt-4 w-full text-center text-[11px] font-bold text-[#A0AEC0] hover:text-[#1A1A2E] transition-colors"
          >
            ← Back to Home
          </button>

        </div>
      </div>
    </div>
  );
}
