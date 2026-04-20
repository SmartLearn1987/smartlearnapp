import { useState, useEffect, useRef } from "react";
import { Maximize2, Minimize2, Play, Pause, RotateCcw, Clock as ClockIcon, Timer as StopwatchIcon, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "clock" | "stopwatch" | "timer";

export default function ClockTab() {
  const [mode, setMode] = useState<Mode>("clock");
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Clock state
  const [time, setTime] = useState(new Date());
  
  // Stopwatch state
  const [swRunning, setSwRunning] = useState(false);
  const [swTime, setSwTime] = useState(0);
  const swIntervalRef = useRef<number | null>(null);
  
  // Timer state
  const [tmRunning, setTmRunning] = useState(false);
  const [tmTimeLeft, setTmTimeLeft] = useState(300000); // 5 mins default
  const [tmInput, setTmInput] = useState(5);
  const tmIntervalRef = useRef<number | null>(null);
  
  // UI state for completion popup
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);

  // Update Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 10);
    return () => clearInterval(timer);
  }, []);

  // Stopwatch Logic
  const toggleStopwatch = () => {
    if (swRunning) {
      if (swIntervalRef.current) clearInterval(swIntervalRef.current);
    } else {
      const startTime = Date.now() - swTime;
      swIntervalRef.current = window.setInterval(() => {
        setSwTime(Date.now() - startTime);
      }, 10);
    }
    setSwRunning(!swRunning);
  };

  const resetStopwatch = () => {
    if (swIntervalRef.current) clearInterval(swIntervalRef.current);
    setSwRunning(false);
    setSwTime(0);
  };

  // Timer Logic
  const toggleTimer = () => {
    if (tmRunning) {
      if (tmIntervalRef.current) clearInterval(tmIntervalRef.current);
    } else {
      if (tmTimeLeft <= 0) setTmTimeLeft(tmInput * 60000);
      const endTime = Date.now() + tmTimeLeft;
      tmIntervalRef.current = window.setInterval(() => {
        const left = Math.max(0, endTime - Date.now());
        setTmTimeLeft(left);
        if (left <= 0) {
          if (tmIntervalRef.current) clearInterval(tmIntervalRef.current);
          setTmRunning(false);
          // Play notification sound
          try {
            const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
            audio.volume = 0.6;
            audio.play().catch(e => console.error("Audio play error:", e));
          } catch (e) {
            console.error("Audio initialization error:", e);
          }
          // Show custom popup instead of browser alert
          setShowCompletionPopup(true);
        }
      }, 10);
    }
    setTmRunning(!tmRunning);
  };

  const resetTimer = () => {
    if (tmIntervalRef.current) clearInterval(tmIntervalRef.current);
    setTmRunning(false);
    setTmTimeLeft(tmInput * 60000);
  };

  useEffect(() => {
    if (!tmRunning) setTmTimeLeft(tmInput * 60000);
  }, [tmInput, tmRunning]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const displayS = s % 60;
    const displayM = m % 60;
    const displayMs = Math.floor((ms % 1000) / 10);
    
    const base = `${String(h).padStart(2, "0")}:${String(displayM).padStart(2, "0")}:${String(displayS).padStart(2, "0")}`;
    return { base, ms: String(displayMs).padStart(2, "0") };
  };

  const toggleFS = () => {
    const doc = document as any;
    const element = document.documentElement as any;

    if (!isFullscreen) {
      // Attempt native fullscreen
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(() => {});
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      }
      // Always toggle internal state to support Fake Fullscreen on iPhone
      setIsFullscreen(true);
    } else {
      // Attempt to exit native fullscreen
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
      // Always toggle internal state
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as any;
      const isNativeFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
      
      // If native fullscreen was exited (e.g. via ESC key), sync our state
      if (!isNativeFs && isFullscreen) {
        // Only auto-exit if the browser actually supports the API (to avoid breaking iPhone fake FS)
        if (doc.fullscreenEnabled || doc.webkitFullscreenEnabled) {
          setIsFullscreen(false);
        }
      }
    };
    
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, [isFullscreen]);

  const days = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];

  return (
    <div className={cn(
      "relative flex flex-col items-center justify-center overflow-hidden rounded-3xl transition-all duration-500 shadow-2xl",
      isFullscreen ? "fixed inset-0 z-[100] h-screen w-screen rounded-none" : "h-[85vh] sm:h-[500px] max-h-[500px] w-full",
      "bg-gradient-to-r from-[#0b3d22] via-[#1a6e41] to-[#2d9b63] text-white font-['Share_Tech_Mono']"
    )}>
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-white/5 blur-[120px]" />
      <div className="pointer-events-none absolute -right-[10%] -bottom-[10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />

      {/* Navigation */}
      <div className="absolute top-6 z-10 flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1 font-['Rubik']">
        {[
          { id: "clock", label: "ĐỒNG HỒ", icon: ClockIcon },
          { id: "stopwatch", label: "BẤM GIỜ", icon: StopwatchIcon },
          { id: "timer", label: "POMODORO", icon: Hourglass },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setMode(item.id as Mode)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-xs transition-all duration-300",
              mode === item.id ? "bg-[#2D9B63] text-white shadow-[0_0_20px_rgba(45,155,99,0.6)]" : "text-[#bbfcce] hover:bg-white/10"
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="container relative z-1 flex flex-1 flex-col items-center justify-center pb-12 pt-24 text-center">
        {mode === "clock" && (
          <div className="animate-fade-in">
            <div className="mb-2 font-['Rubik'] text-lg font-medium tracking-[0.3em] text-[#bbfcce] md:text-2xl uppercase">
              {days[time.getDay()]} · {time.getDate()}/{time.getMonth() + 1}
            </div>
            <div className="flex items-baseline justify-center leading-none">
              <span className="text-[clamp(36px,12vw,240px)] font-bold tracking-tighter text-white drop-shadow-[0_0_60px_rgba(255,255,255,0.5)]">
                {String(time.getHours() % 12 || 12).padStart(2, "0")}
                <span className="animate-pulse text-[#4ade80]">:</span>
                {String(time.getMinutes()).padStart(2, "0")}
                <span className="animate-pulse text-[#4ade80]">:</span>
                {String(time.getSeconds()).padStart(2, "0")}
              </span>
              <span className="ml-1 sm:ml-4 w-[2ch] flex-shrink-0 text-left text-[clamp(16px,5vw,80px)] font-bold text-[#4ade80]">
                {String(Math.floor(time.getMilliseconds() / 10)).padStart(2, "0")}
              </span>
            </div>
          </div>
        )}

        {mode === "stopwatch" && (
          <div className="animate-fade-in">
            <div className="flex items-baseline justify-center leading-none">
              <span className="text-[clamp(38px,12vw,240px)] font-bold tracking-tighter text-white drop-shadow-[0_0_60px_rgba(255,255,255,0.5)]">
                {formatTime(swTime).base}
              </span>
              <span className="ml-1 sm:ml-4 w-[2ch] flex-shrink-0 text-left text-[clamp(16px,5vw,80px)] font-bold text-[#4ade80]">
                {formatTime(swTime).ms}
              </span>
            </div>
            <div className="mt-12 flex gap-4 font-['Rubik']">
              <button
                onClick={toggleStopwatch}
                className="min-w-[140px] rounded-full border border-[#2D9B63] bg-[#2D9B63]/20 px-8 py-3 text-lg transition-all active:scale-95 hover:bg-[#2D9B63]/40"
              >
                {swRunning ? "DỪNG" : swTime > 0 ? "TIẾP TỤC" : "BẤM GIỜ"}
              </button>
              <button
                onClick={resetStopwatch}
                className="min-w-[140px] rounded-full border border-white/20 bg-white/5 px-8 py-3 text-lg text-white/50 transition-all active:scale-95 hover:bg-white/10"
              >
                ĐẶT LẠI
              </button>
            </div>
          </div>
        )}

        {mode === "timer" && (
          <div className="animate-fade-in">
            <div className="flex items-baseline justify-center leading-none">
              <span className="text-[clamp(38px,12vw,240px)] font-bold tracking-tighter text-white drop-shadow-[0_0_60px_rgba(255,255,255,0.5)]">
                {formatTime(tmTimeLeft).base}
              </span>
              <span className="ml-1 sm:ml-4 w-[2ch] flex-shrink-0 text-left text-[clamp(16px,5vw,80px)] font-bold text-[#4ade80]">
                {formatTime(tmTimeLeft).ms}
              </span>
            </div>

            <div className="mt-14 flex flex-wrap items-center justify-center gap-4 font-['Rubik']">
              <button
                onClick={toggleTimer}
                className="w-[140px] rounded-full border border-[#2D9B63]/50 bg-[#2D9B63] px-6 py-3 text-lg font-bold text-white transition-all active:scale-95 hover:bg-[#227a4d] hover:shadow-[0_0_30px_rgba(45,155,99,0.6)]"
              >
                {tmRunning ? "DỪNG" : (tmTimeLeft < tmInput * 60000 ? "TIẾP TỤC" : "BẮT ĐẦU")}
              </button>
              <button
                onClick={resetTimer}
                className="w-[140px] rounded-full border border-white/30 bg-white/20 px-6 py-3 text-lg font-bold text-white transition-all active:scale-95 hover:bg-white/30 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                ĐẶT LẠI
              </button>

              {/* POMODORO Settings (Compact and in-line) */}
              {!tmRunning && tmTimeLeft === tmInput * 60000 && (
                <div className="flex w-[210px] items-center justify-center gap-3 rounded-full border border-[#C08447]/50 bg-[#C08447]/20 px-3 py-3 transition-colors hover:bg-[#C08447]/30">
                  <span className="text-[11px] font-bold tracking-widest text-white/90">CÀI ĐẶT</span>
                  <input
                    type="number"
                    value={tmInput}
                    onChange={(e) => setTmInput(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-14 rounded-md border border-[#C08447]/50 bg-black/40 py-1 text-center text-lg font-bold text-white outline-none focus:border-[#C08447]"
                  />
                  <span className="text-[11px] font-bold tracking-widest text-white/90">PHÚT</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Button */}
      <button
        onClick={toggleFS}
        className="absolute bottom-6 right-6 flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-[#bbfcce] font-medium transition-all hover:bg-white/10"
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        <span className="hidden sm:inline">FULLSCREEN</span>
      </button>

      {/* Completion Popup Overlay */}
      {showCompletionPopup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in p-6">
          <div className="relative flex max-w-sm flex-col items-center gap-6 rounded-[40px] border border-white/20 bg-gradient-to-br from-[#164e32] to-[#092b1a] p-10 text-center shadow-[0_0_50px_rgba(45,155,99,0.4)] animate-scale-in">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2D9B63]/30 text-[#4ade80] shadow-[0_0_20px_rgba(45,155,99,0.3)]">
              <Hourglass className="h-10 w-10 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="font-heading text-3xl font-bold tracking-tight text-white">XUẤT SẮC!</h2>
              <p className="font-['Rubik'] text-lg text-[#bbfcce]">POMODORO đã hoàn thành</p>
            </div>
            <button
              onClick={() => setShowCompletionPopup(false)}
              className="mt-4 min-w-[200px] rounded-full bg-[#2D9B63] px-8 py-4 text-xl font-bold text-white shadow-[0_10px_20px_rgba(45,155,99,0.4)] transition-all hover:bg-[#227a4d] hover:shadow-[0_15px_30px_rgba(45,155,99,0.6)] active:scale-95"
            >
              TIẾP TỤC
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
