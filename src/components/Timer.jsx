import { useState, useRef, useCallback, useEffect } from 'react';

export default function Timer({ onTimeUpdate }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const formatTime = useCallback((s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // Handle side effect for time updates separately
  useEffect(() => {
    if (onTimeUpdate) {
      onTimeUpdate(formatTime(seconds));
    }
  }, [seconds, onTimeUpdate, formatTime]);

  function start() { setRunning(true); }
  function pause() { setRunning(false); }
  function reset() {
    setRunning(false);
    setSeconds(0);
  }

  return (
    <div className="card p-5 text-center">
      {/* Time display */}
      <div className="text-5xl font-black tabular-nums text-[#1A1A2E] mb-4 tracking-tight">
        {formatTime(seconds)}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {!running ? (
          <button
            onClick={start}
            className="btn-teal px-6 py-2.5 rounded-xl text-sm tracking-wider flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M8 5v14l11-7z"/></svg>
            Start
          </button>
        ) : (
          <button
            onClick={pause}
            className="bg-[#F5A623] text-white px-6 py-2.5 rounded-xl text-sm font-semibold tracking-wider flex items-center gap-2 shadow-md hover:shadow-lg transition"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            Pause
          </button>
        )}
        <button
          onClick={reset}
          className="bg-white border border-[#E8EAF0] text-[#8A8FA3] px-6 py-2.5 rounded-xl text-sm font-semibold tracking-wider flex items-center gap-2 hover:bg-gray-50 transition"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          Reset
        </button>
      </div>
    </div>
  );
}
