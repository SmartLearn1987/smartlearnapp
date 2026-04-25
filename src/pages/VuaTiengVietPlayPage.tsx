import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Gamepad2, Timer, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, X, Home, RotateCcw, Trophy, Check, Loader2, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

interface Question {
  id: string;
  question: string;
  answer: string;
  hint: string;
  level: string;
}

interface ResultModalProps {
  score: number;
  total: number;
  onRetry: () => void;
  onHome: () => void;
  questions: Question[];
  userAnswers: string[];
}

function ResultOverlay({ score, total, onRetry, onHome, questions, userAnswers }: ResultModalProps) {
  const percentage = Math.round((score / total) * 100);
  
  return createPortal(
    <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md overflow-y-auto flex flex-col items-center justify-start sm:justify-center p-4 py-12">
      <div className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-[2.5rem] p-6 sm:p-10 space-y-8 animate-scale-in relative">
        {/* Header/Score */}
        <div className="text-center space-y-4">
          <div className="inline-flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <Trophy className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-black uppercase tracking-tight">Kết quả lượt chơi</h2>
          <div className="flex justify-center gap-3 sm:gap-4 font-mono">
            <div className="bg-muted/50 px-6 sm:px-8 py-3 sm:py-4 rounded-3xl border border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Chính xác</p>
              <p className="text-2xl sm:text-3xl font-black text-primary">{score}/{total}</p>
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
            const isCorrect = userAnswers[idx]?.trim().toLowerCase() === q.answer.trim().toLowerCase();
            return (
              <div key={idx} className={`flex items-center gap-4 p-5 rounded-3xl border transition-colors ${isCorrect ? 'border-emerald-100 bg-emerald-50/30' : 'border-red-100 bg-red-50/30'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black bg-white px-2 py-0.5 rounded-full border border-border/50 text-muted-foreground uppercase tracking-wider">Câu {idx + 1}</span>
                    <p className="font-bold text-sm line-clamp-1 text-slate-700">{q.question}</p>
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">BẠN CHỌN:</span>
                      <p className={`font-black uppercase tracking-wider ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                        {userAnswers[idx] || "(Bỏ trống)"}
                      </p>
                    </div>
                    {!isCorrect && (
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">ĐÁP ÁN:</span>
                        <p className="text-emerald-700 font-black uppercase tracking-wider">{q.answer}</p>
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
          <Button className="flex-1 h-14 rounded-2xl gap-2 font-black uppercase tracking-wider text-base shadow-xl shadow-primary/20 bg-emerald-600 hover:bg-emerald-700" onClick={onRetry}>
            <RotateCcw className="h-5 w-5" /> Chơi lại
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function VuaTiengVietPlayPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const level = searchParams.get("level") || "medium";
  const limit = searchParams.get("limit") || "10";
  const initialTime = parseInt(searchParams.get("time") || "300");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [checkedAnswers, setCheckedAnswers] = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Fetch Questions
  useEffect(() => {
    const fetchQs = async () => {
      try {
        const data = await apiFetch<Question[]>( `/vuatiengviet/play?level=${level}&limit=${limit}`);
        setQuestions(data);
        setUserAnswers(data.map(() => ""));
        setCheckedAnswers(data.map(() => false));
        setCurrentIdx(0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQs();
  }, [level, limit]);

  // Timer
  useEffect(() => {
    if (loading || isFinished || timeLeft <= 0) return;
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
  }, [loading, isFinished, timeLeft]);

  const handleFinish = () => {
    let s = 0;
    userAnswers.forEach((ua, idx) => {
      if (ua.trim().toLowerCase() === questions[idx].answer.trim().toLowerCase()) {
        s++;
      }
    });
    setScore(s);
    setIsFinished(true);
  };

  const handleInputChange = (val: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentIdx] = val;
    setUserAnswers(newAnswers);
  };

  const checkCurrentAnswer = () => {
    const newChecked = [...checkedAnswers];
    newChecked[currentIdx] = true;
    setCheckedAnswers(newChecked);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 animate-fade-in">
        <div className="relative">
           <div className="h-20 w-20 rounded-3xl border-4 border-primary/20 animate-pulse" />
           <Loader2 className="h-10 w-10 animate-spin text-primary absolute inset-0 m-auto" />
        </div>
        <p className="font-black text-muted-foreground uppercase tracking-[0.2em] animate-pulse">Vua Tiếng Việt đang tới...</p>
      </div>
    );
  }

  if (!questions.length) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
      <AlertCircle className="h-12 w-12 text-destructive" />
      <p className="font-bold">Không tìm thấy câu hỏi phù hợp.</p>
      <Button onClick={() => navigate("/")}>Về trang chủ</Button>
    </div>
  );

  const q = questions[currentIdx];
  const isCorrect = userAnswers[currentIdx].trim().toLowerCase() === q.answer.trim().toLowerCase();
  const hasChecked = checkedAnswers[currentIdx];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-[#FDFCFB]">
      {/* Header */}
      <div className="bg-white border-b border-border/50 px-4 sm:px-8 py-2 sm:py-3 flex flex-col sm:flex-row items-center gap-3 sm:gap-0 justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center justify-between w-full sm:w-auto">
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
                 <h1 className="font-heading text-base sm:text-lg font-black leading-none">Vua Tiếng Việt</h1>
                 <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                      Câu {currentIdx + 1} / {questions.length}
                    </p>
                    <div className="flex items-center gap-2 ml-2">
                       <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest shadow-sm">
                         Thử thách {currentIdx + 1}
                       </span>
                       <Info className="h-3 w-3 text-muted-foreground" />
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between w-full sm:w-auto gap-3 sm:gap-6">
           <div className={`flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl border-2 transition-all duration-500 flex-1 sm:flex-none justify-center
             ${timeLeft < 30 ? "border-red-200 bg-red-50 text-red-600 animate-pulse" : "border-border/50 bg-muted/30 text-muted-foreground"}`}
           >
             <Timer className="h-4 w-4 sm:h-5 sm:w-5" />
             <span className="font-mono text-lg sm:text-xl font-black tabular-nums">{formatTime(timeLeft)}</span>
           </div>

           <Button onClick={handleFinish} className="rounded-2xl h-10 sm:h-11 px-6 sm:px-8 font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex-1 sm:flex-none">
             Kết thúc
           </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-6 p-2 sm:p-8 min-h-0 container max-w-7xl mx-auto">
         {/* Main Game Area */}
         <div className="flex-1 flex flex-col gap-3 sm:gap-4 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-700 order-2 lg:order-1">
            {/* Question Card */}
            <div className="flex-1 min-h-0 bg-white rounded-3xl sm:rounded-[3rem] border-2 border-border/50 shadow-xl shadow-muted/50 flex flex-col relative overflow-hidden group">
               <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6">
                  <div className="w-full max-w-2xl text-center space-y-4 sm:space-y-6">
                     <div className="relative inline-block w-full">
                        <div className="absolute -inset-4 bg-emerald-500/5 blur-3xl rounded-full" />
                        <h2 className="relative font-heading text-2xl sm:text-5xl font-black text-slate-800 leading-tight px-2">
                           {q.question}
                        </h2>
                     </div>

                     {showHint && q.hint && (
                        <div className="py-2.5 px-6 bg-amber-50 rounded-[1.5rem] border-2 border-amber-100 flex items-center justify-center gap-4 animate-in zoom-in-95 duration-500 shadow-lg shadow-amber-100/10 max-w-lg mx-auto relative group/hint">
                           <div className="h-8 w-8 rounded-xl bg-white border-2 border-amber-200 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover/hint:rotate-12">
                              <span className="text-lg">💡</span>
                           </div>
                           <p className="text-sm font-bold text-amber-900 shadow-sm leading-relaxed text-center">
                              {q.hint ? String(q.hint) : "Không có gợi ý cho câu này."}
                           </p>
                           <button 
                             onClick={() => setShowHint(false)} 
                             className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border-2 border-amber-100 flex items-center justify-center shadow-md hover:bg-amber-100 transition-colors"
                           >
                              <X className="h-3 w-3 text-amber-700" />
                           </button>
                        </div>
                     )}
                     
                     <div className="relative pt-2 group/input">
                        <input
                          type="text"
                          value={userAnswers[currentIdx]}
                          onChange={(e) => handleInputChange(e.target.value)}
                          placeholder="Nhập câu trả lời..."
                          className={`w-full h-14 sm:h-18 px-4 sm:px-8 text-center text-xl sm:text-3xl font-black rounded-2xl sm:rounded-[2rem] border-2 sm:border-4 transition-all uppercase tracking-widest
                            ${hasChecked 
                                ? isCorrect 
                                  ? "border-emerald-500 bg-emerald-50/50 text-emerald-700" 
                                  : "border-red-500 bg-red-50/50 text-red-700"
                                : "border-border bg-muted/10 focus:border-emerald-500 focus:bg-white focus:ring-[12px] focus:ring-emerald-500/10"
                            }
                            placeholder:text-muted-foreground/30 focus:outline-none
                          `}
                          disabled={isFinished}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") checkCurrentAnswer();
                          }}
                        />
                        
                        <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 mt-4 sm:mt-6">
                           <Button 
                             onClick={checkCurrentAnswer}
                             disabled={!userAnswers[currentIdx].trim() || hasChecked}
                             className={`h-11 sm:h-12 px-6 sm:px-10 rounded-xl sm:rounded-2xl font-black uppercase tracking-wider transition-all flex-1 sm:flex-none
                               ${hasChecked 
                                 ? isCorrect 
                                   ? "bg-emerald-500 hover:bg-emerald-600" 
                                   : "bg-red-500 hover:bg-red-600"
                                 : "bg-slate-800 hover:bg-slate-900 shadow-xl shadow-slate-200"
                               }
                             `}
                           >
                              {hasChecked ? (isCorrect ? <CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> : <X className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />) : <Check className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />}
                              {hasChecked ? (isCorrect ? "Chính xác" : "Sai rồi") : "Kiểm tra"}
                           </Button>
                           
                           <Button 
                             variant={showHint ? "secondary" : "outline"} 
                             onClick={() => setShowHint(!showHint)}
                             disabled={!q.hint}
                             className={`h-11 sm:h-12 px-6 sm:px-8 rounded-xl sm:rounded-2xl border-2 font-black uppercase tracking-wider transition-all flex-1 sm:flex-none
                               ${showHint ? 'bg-amber-100 border-amber-200 text-amber-700 hover:bg-amber-200' : 'text-muted-foreground hover:bg-muted'}
                             `}
                           >
                              <Info className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                              Gợi ý
                           </Button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between px-4 shrink-0">
               <Button 
                 variant="ghost" 
                 disabled={currentIdx === 0} 
                 onClick={() => {
                   setCurrentIdx(prev => prev - 1);
                   setShowHint(false);
                 }}
                 className={cn(
                   "h-14 px-4 sm:px-8 rounded-2xl font-black uppercase tracking-widest gap-2 transition-all",
                   currentIdx === 0 
                    ? "text-gray-300 cursor-not-allowed" 
                    : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                 )}
               >
                 <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" /> Câu trước
               </Button>

               <div className="hidden sm:flex items-center gap-2">
                 {questions.map((_, idx) => (
                   <button
                     key={idx}
                     onClick={() => {
                       setCurrentIdx(idx);
                       setShowHint(false);
                     }}
                     className={`h-2.5 rounded-full transition-all duration-500 ${idx === currentIdx ? 'w-10 bg-emerald-500' : 'w-2.5 bg-border hover:bg-muted-foreground/30'}`}
                   />
                 ))}
               </div>

               <Button 
                 variant="ghost" 
                 disabled={currentIdx === questions.length - 1} 
                 onClick={() => {
                   setCurrentIdx(prev => prev + 1);
                   setShowHint(false);
                 }}
                 className={cn(
                   "h-14 px-4 sm:px-8 rounded-2xl font-black uppercase tracking-widest gap-2 transition-all",
                   currentIdx === questions.length - 1
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                 )}
               >
                 Câu sau <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
               </Button>
            </div>
         </div>

         {/* Sidebar */}
         <div className="w-full lg:w-[320px] shrink-0 flex flex-col gap-4 sm:gap-6 order-1 lg:order-2">
            <div className="bg-white border-2 border-border/50 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 shadow-xl shadow-muted/50 flex flex-col flex-1 min-h-0">
               <div className="space-y-1 mb-4 sm:mb-6">
                 <h3 className="font-heading text-base sm:text-lg font-black leading-none uppercase">Danh sách câu hỏi</h3>
                 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[.15em]">Tiến trình của bạn</p>
               </div>
               
               <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-4">
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Tiến độ hoàn thành</span>
                     <span className="text-sm font-black text-emerald-600">{Math.round((userAnswers.filter(a => a.trim() !== "").length / questions.length) * 100)}%</span>
                  </div>
                  <div className="h-3 w-full bg-muted rounded-full overflow-hidden border-2 border-white shadow-inner">
                     <div 
                       className="h-full bg-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                       style={{ width: `${(userAnswers.filter(a => a.trim() !== "").length / questions.length) * 100}%` }} 
                     />
                  </div>
               </div>
               
               <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-5 gap-3 overflow-y-auto pr-1 flex-1 content-start custom-scrollbar min-h-0">
                 {questions.map((_, idx) => {
                   const ans = userAnswers[idx];
                   const isAnswered = ans.trim() !== "";
                   const checked = checkedAnswers[idx];
                   const cor = ans.trim().toLowerCase() === questions[idx].answer.trim().toLowerCase();
                   const cur = idx === currentIdx;
                   
                   return (
                     <button
                       key={idx}
                       onClick={() => {
                         setCurrentIdx(idx);
                         setShowHint(false);
                       }}
                       className={`aspect-square h-11 rounded-full font-mono text-sm font-black transition-all flex items-center justify-center border-2 relative
                         ${cur ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20 z-10 scale-110' : 
                           checked 
                             ? cor 
                               ? 'border-emerald-200 bg-emerald-50 text-emerald-600' 
                               : 'border-red-200 bg-red-50 text-red-600'
                             : isAnswered 
                               ? 'border-slate-300 bg-slate-50 text-slate-800' 
                               : 'border-transparent bg-muted/40 text-muted-foreground hover:bg-muted'}
                       `}
                     >
                       {idx + 1}
                       {checked && (
                         <div className={`absolute -top-1 -right-1 h-4 w-4 rounded-full border-2 border-white flex items-center justify-center
                           ${cor ? 'bg-emerald-500' : 'bg-red-500'}`}
                         >
                           {cor ? <Check className="h-2 w-2 text-white" /> : <X className="h-2 w-2 text-white" />}
                         </div>
                       )}
                     </button>
                   );
                 })}
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

