import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Gamepad2, Timer, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, X, Home, RotateCcw, Trophy, Check, Loader2, Info, ArrowRight, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { createPortal } from "react-dom";
import { toast } from "sonner";

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  level: string;
}

interface ResultModalProps {
  score: number;
  total: number;
  onRetry: () => void;
  onHome: () => void;
  questions: Question[];
  userAnswers: number[]; // index of selected option
}

function ResultOverlay({ score, total, onRetry, onHome, questions, userAnswers }: ResultModalProps) {
  const percentage = Math.round((score / total) * 100);
  
  return createPortal(
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md overflow-y-auto flex flex-col items-center justify-start sm:justify-center p-4 py-12">
      <div className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-[2.5rem] p-6 sm:p-10 space-y-8 animate-scale-in relative">
        {/* Header/Score */}
        <div className="text-center space-y-4">
          <div className="inline-flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
            <Trophy className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase tracking-tight">KẾT QUẢ PHẢN XẠ</h2>
          <div className="flex justify-center gap-3 sm:gap-4 font-mono">
            <div className="bg-muted/50 px-6 sm:px-8 py-3 sm:py-4 rounded-3xl border border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Chính xác</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600">{score}/{total}</p>
            </div>
            <div className="bg-muted/50 px-6 sm:px-8 py-3 sm:py-4 rounded-3xl border border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Tỉ lệ</p>
              <p className="text-2xl sm:text-3xl font-black text-blue-600">{percentage}%</p>
            </div>
          </div>
        </div>

        {/* Detailed Review */}
        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar border-y border-border/40 py-4">
          {questions.map((q, idx) => {
            const userPick = userAnswers[idx];
            const isCorrect = userPick === q.correct_index;
            return (
              <div key={idx} className={`flex items-start gap-4 p-5 rounded-3xl border transition-colors ${isCorrect ? 'border-emerald-100 bg-emerald-50/30' : 'border-red-100 bg-red-50/30'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black bg-white px-2 py-0.5 rounded-full border border-border/50 text-muted-foreground uppercase tracking-wider">Câu {idx + 1}</span>
                    <p className="font-bold text-sm line-clamp-2 text-slate-700">{q.question}</p>
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">BẠN CHỌN:</span>
                      <p className={`font-black uppercase tracking-wider text-xs ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                        {userPick !== -1 ? q.options[userPick] : "(Bỏ trống)"}
                      </p>
                    </div>
                    {!isCorrect && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">ĐÁP ÁN:</span>
                        <p className="text-emerald-700 font-black uppercase tracking-wider text-xs">{q.options[q.correct_index]}</p>
                      </div>
                    )}
                    {q.explanation && (
                        <div className="mt-2 text-[11px] text-muted-foreground italic border-l-2 border-slate-200 pl-3">
                           {q.explanation}
                        </div>
                    )}
                  </div>
                </div>
                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {isCorrect ? <Check className="h-5 w-5 stroke-[4]" /> : <X className="h-5 w-5 stroke-[4]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <Button variant="outline" className="flex-1 h-14 rounded-2xl gap-2 font-black uppercase tracking-wider border-2 hover:bg-muted" onClick={onHome}>
            <Home className="h-5 w-5" /> Trang chủ
          </Button>
          <Button className="flex-1 h-14 rounded-2xl gap-2 font-black uppercase tracking-wider text-base shadow-xl shadow-emerald-200 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onRetry}>
            <RotateCcw className="h-5 w-5" /> Chơi lại
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function NhanhNhuChopPlayPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const level = searchParams.get("level") || "medium";
  const limit = searchParams.get("limit") || "10";
  const initialTime = parseInt(searchParams.get("time") || "300");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]); // indexes of selected options
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [shuffling, setShuffling] = useState(true);

  // Fetch Questions
  useEffect(() => {
    const fetchQs = async () => {
      try {
        setShuffling(true);
        const data = await apiFetch<Question[]>(`/nhanhnhuchop/play?level=${level}&limit=${limit}`);
        setQuestions(data);
        setUserAnswers(data.map(() => -1));
        // Simulate "Lightning" loading
        setTimeout(() => setShuffling(false), 1200);
      } catch (err) {
        console.error(err);
        toast.error("Không thể tải câu hỏi.");
      } finally {
        setLoading(false);
      }
    };
    fetchQs();
  }, [level, limit]);

  // Timer
  useEffect(() => {
    if (loading || shuffling || isFinished || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, shuffling, isFinished, timeLeft]);

  const handleFinish = () => {
    let s = 0;
    userAnswers.forEach((ua, idx) => {
      if (ua === questions[idx].correct_index) {
        s++;
      }
    });
    setScore(s);
    setIsFinished(true);
  };

  const handleSelectOption = (optIdx: number) => {
    if (isFinished) return;
    const newAnswers = [...userAnswers];
    newAnswers[currentIdx] = optIdx;
    setUserAnswers(newAnswers);

    // Auto-advance if not the last question? 
    // Usually in these games users click and go next immediately.
    if (currentIdx < questions.length - 1) {
        setTimeout(() => setCurrentIdx(prev => prev + 1), 300);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading || shuffling) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 animate-fade-in">
        <div className="relative">
           <div className="h-24 w-24 rounded-[2rem] border-4 border-emerald-500/20 animate-spin flex items-center justify-center">
             <Zap className="h-12 w-12 text-emerald-500 fill-emerald-500 animate-pulse" />
           </div>
        </div>
        <p className="font-black text-slate-800 uppercase tracking-[0.2em] animate-pulse">ĐANG KẾT NỐI TIA CHỚP...</p>
      </div>
    );
  }

  if (!questions.length) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <p className="font-bold text-slate-700">Không tìm thấy câu hỏi phù hợp.</p>
      <Button onClick={() => navigate("/")} className="rounded-2xl h-12 px-8 font-black bg-emerald-600 text-white">Về trang chủ</Button>
    </div>
  );

  const q = questions[currentIdx];
  const selectedIdx = userAnswers[currentIdx];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="bg-white border-b border-border/50 px-4 sm:px-8 py-3 flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-muted" onClick={() => navigate("/")}>
            <Home className="h-5 w-5 text-muted-foreground" />
          </Button>
          <div className="h-8 w-px bg-border/60 mx-1 hidden sm:block" />
          <div className="flex items-center gap-3">
             <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
               <Gamepad2 className="h-5 w-5" />
             </div>
             <div>
               <h1 className="font-heading text-lg font-black leading-none">Nhanh như chớp</h1>
               <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                    Thử thách {currentIdx + 1} / {questions.length}
                  </p>
               </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
           <div className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl border-2 transition-all duration-500
             ${timeLeft < 30 ? "border-red-200 bg-red-50 text-red-600 animate-pulse" : "border-border/50 bg-muted/30 text-muted-foreground"}`}
           >
             <Timer className="h-5 w-5" />
             <span className="font-mono text-xl font-black tabular-nums">{formatTime(timeLeft)}</span>
           </div>

           <Button onClick={handleFinish} className="rounded-2xl h-11 px-8 font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200">
             Kết thúc
           </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-8 min-h-0 container max-w-6xl mx-auto">
         {/* Main Game Area */}
         <div className="flex-1 flex flex-col gap-6 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Question Card */}
            <div className="flex-1 min-h-0 bg-slate-50 border-2 border-border/50 rounded-[3rem] shadow-xl shadow-muted/20 flex flex-col relative overflow-hidden group">
               <div className="absolute top-8 left-8 flex items-center gap-3 z-10">
                  <span className="px-4 py-1.5 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 flex items-center gap-2">
                    <Zap className="h-3 w-3 fill-current" /> Tia chớp {currentIdx + 1}
                  </span>
               </div>

               <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12">
                  <div className="w-full max-w-2xl text-center space-y-10">
                     <h2 className="relative font-heading text-3xl sm:text-5xl font-black text-slate-800 leading-tight">
                        {q.question}
                     </h2>

                     {/* Options Grid */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {q.options.map((option, idx) => (
                           <button
                             key={idx}
                             onClick={() => handleSelectOption(idx)}
                             className={`group/opt relative flex items-center gap-4 p-5 rounded-[2rem] border-4 text-left transition-all duration-300
                               ${selectedIdx === idx 
                                 ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-xl shadow-emerald-500/10 scale-[1.02]" 
                                 : "border-white bg-white hover:border-emerald-200 hover:bg-emerald-50/30 text-slate-600"}`}
                           >
                             <div className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center text-lg font-black transition-all
                               ${selectedIdx === idx 
                                 ? "bg-emerald-500 text-white shadow-lg" 
                                 : "bg-slate-100 text-slate-400 group-hover/opt:bg-emerald-100 group-hover/opt:text-emerald-600"}`}>
                               {String.fromCharCode(65 + idx)}
                             </div>
                             <span className="text-lg font-bold line-clamp-2 leading-tight">
                               {option}
                             </span>
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-4 shrink-0">
               <Button 
                 variant="ghost" 
                 disabled={currentIdx === 0} 
                 onClick={() => setCurrentIdx(prev => prev - 1)}
                 className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest hover:bg-muted gap-2 text-muted-foreground"
               >
                 <ChevronLeft className="h-6 w-6" /> Trước
               </Button>

               <div className="hidden sm:flex items-center gap-2 bg-slate-100/50 p-2 rounded-2xl border border-border/40">
                 {questions.map((_, idx) => (
                   <button
                     key={idx}
                     onClick={() => setCurrentIdx(idx)}
                     className={`h-2.5 rounded-full transition-all duration-500 
                       ${idx === currentIdx ? 'w-10 bg-emerald-500' : 'w-2.5 bg-slate-300 hover:bg-slate-400'}
                       ${userAnswers[idx] !== -1 ? 'bg-emerald-600/40' : ''}
                      `}
                   />
                 ))}
               </div>

               <Button 
                 variant="ghost" 
                 disabled={currentIdx === questions.length - 1} 
                 onClick={() => setCurrentIdx(prev => prev + 1)}
                 className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest hover:bg-muted gap-2 text-emerald-600"
               >
                 Tiếp <ChevronRight className="h-6 w-6" />
               </Button>
            </div>
         </div>

         {/* Sidebar - Progress Tracking */}
         <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-6">
            <div className="bg-slate-50 border-2 border-border/50 rounded-[2.5rem] p-6 shadow-xl shadow-muted/20 flex flex-col flex-1 min-h-0">
               <div className="space-y-1 mb-6">
                 <h3 className="font-heading text-lg font-black leading-none text-slate-800">Tiến trình tia chớp</h3>
                 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[.15em]">Phản xạ nhanh!</p>
               </div>
               
               <div className="mb-8 space-y-4">
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Hoàn thành</span>
                     <span className="text-sm font-black text-emerald-600">
                       {Math.round((userAnswers.filter(a => a !== -1).length / questions.length) * 100)}%
                     </span>
                  </div>
                  <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden border-2 border-white shadow-inner">
                     <div 
                       className="h-full bg-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                       style={{ width: `${(userAnswers.filter(a => a !== -1).length / questions.length) * 100}%` }} 
                     />
                  </div>
               </div>
               
               <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-5 gap-3 overflow-y-auto pr-1 flex-1 custom-scrollbar min-h-0">
                 {questions.map((_, idx) => {
                   const isAnswered = userAnswers[idx] !== -1;
                   const cur = idx === currentIdx;
                   
                   return (
                     <button
                       key={idx}
                       onClick={() => setCurrentIdx(idx)}
                       className={`h-11 rounded-2xl font-mono text-sm font-black transition-all flex items-center justify-center border-2 relative
                         ${cur ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-200 z-10 scale-110' : 
                           isAnswered 
                               ? 'border-emerald-100 bg-emerald-100/50 text-emerald-600' 
                               : 'border-white bg-white text-muted-foreground hover:bg-slate-100'}
                       `}
                     >
                       {idx + 1}
                       {isAnswered && !cur && (
                         <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full border-2 border-white bg-emerald-500 flex items-center justify-center shadow-sm">
                            <Check className="h-2.5 w-2.5 text-white stroke-[4]" />
                         </div>
                       )}
                     </button>
                   );
                 })}
               </div>

               <div className="mt-8 pt-6 border-t border-slate-200">
                  <Button 
                    variant="ghost" 
                    className="w-full h-14 rounded-[1.5rem] font-black uppercase text-slate-400 hover:text-red-500 hover:bg-red-50 gap-2 border-2 border-transparent hover:border-red-100 transition-all"
                    onClick={() => { if(confirm("Bạn có chắc muốn thoát lượt chơi?")) navigate("/") }}
                  >
                    <ArrowRight className="h-5 w-5 rotate-180" /> Bỏ cuộc
                  </Button>
               </div>
            </div>
         </div>
      </div>

      {isFinished && (
        <ResultOverlay 
          score={score} 
          total={questions.length} 
          questions={questions}
          userAnswers={userAnswers}
          onRetry={() => window.location.reload()}
          onHome={() => navigate("/")}
        />
      )}
    </div>
  );
}
