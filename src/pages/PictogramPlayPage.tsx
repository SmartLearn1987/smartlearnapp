import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Gamepad2, Timer, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, X, Home, RotateCcw, Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { createPortal } from "react-dom";

interface Question {
  id: string;
  image_url: string;
  answer: string;
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-[2rem] p-8 space-y-8 animate-scale-in my-auto">
        {/* Header/Score */}
        <div className="text-center space-y-4">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
            <Trophy className="h-12 w-12" />
          </div>
          <h2 className="font-heading text-3xl font-black uppercase tracking-tight">Kết quả lượt chơi</h2>
          <div className="flex justify-center gap-4">
            <div className="bg-muted px-6 py-3 rounded-2xl">
              <p className="text-xs font-bold text-muted-foreground uppercase">Chính xác</p>
              <p className="text-2xl font-black text-primary">{score}/{total}</p>
            </div>
            <div className="bg-muted px-6 py-3 rounded-2xl">
              <p className="text-xs font-bold text-muted-foreground uppercase">Tỉ lệ</p>
              <p className="text-2xl font-black text-blue-600">{percentage}%</p>
            </div>
          </div>
        </div>

        {/* Detailed Review */}
        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {questions.map((q, idx) => {
            const isCorrect = userAnswers[idx].replace(/\s+/g, '') === q.answer.replace(/\s+/g, '');
            return (
              <div key={q.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                <div className="h-16 w-16 rounded-xl bg-white border border-border overflow-hidden shrink-0">
                  <img src={q.image_url} alt="" className="h-full w-full object-contain p-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Câu {idx + 1}</p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1">
                    <p className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {userAnswers[idx] || "(Bỏ trống)"}
                    </p>
                    {!isCorrect && (
                      <p className="text-xs text-muted-foreground italic">
                        Đáp án: <span className="text-green-700 font-bold">{q.answer}</span>
                      </p>
                    )}
                  </div>
                </div>
                {isCorrect ? <CheckCircle2 className="text-green-500 h-6 w-6 shrink-0" /> : <X className="text-red-500 h-6 w-6 shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button variant="outline" className="flex-1 h-14 rounded-2xl gap-2 font-bold" onClick={onHome}>
            <Home className="h-5 w-5" /> Về trang chủ
          </Button>
          <Button className="flex-1 h-14 rounded-2xl gap-2 font-bold text-lg" onClick={onRetry}>
            <RotateCcw className="h-5 w-5" /> Chơi lại
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function PictogramPlayPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const level = searchParams.get("level") || "medium";
  const limit = searchParams.get("limit") || "10";
  const initialTime = parseInt(searchParams.get("time") || "300");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[][]>([]); // Array of character arrays
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  // Fetch Questions
  useEffect(() => {
    const fetchQs = async () => {
      try {
        const data = await apiFetch<Question[]>(`/pictogram/play?level=${level}&limit=${limit}`);
        setQuestions(data);
        setUserAnswers(data.map(q => Array(q.answer.length).fill("")));
        // Initialize refs matrix
        inputRefs.current = data.map(q => Array(q.answer.length).fill(null));
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

  const [finalResultAnswers, setFinalResultAnswers] = useState<string[]>([]);

  const handleFinish = () => {
    let s = 0;
    const finalAnswers = userAnswers.map((ua, idx) => {
      const original = questions[idx].answer;
      // Preserve spaces from original answer by checking the current character's index
      const userStr = ua.map((char, i) => original[i] === " " ? " " : char).join('').toUpperCase();
      const correctStr = original.toUpperCase();
      
      // Compare answers ignoring non-alphanumeric chars for robust scoring
      if (userStr.replace(/[^A-ZÀ-Ỹ0-9]/g, '') === correctStr.replace(/[^A-ZÀ-Ỹ0-9]/g, '')) {
        s++;
      }
      return userStr;
    });
    setFinalResultAnswers(finalAnswers);
    setScore(s);
    setIsFinished(true);
  };

  const [isComposing, setIsComposing] = useState(false);

  const handleInputChange = (val: string, charIdx: number, fromComposition = false) => {
    if (isFinished) return;
    
    // Prevent jumping if we are currently composing a character (e.g. Telex/VNI)
    // unless this call comes explicitly from onCompositionEnd
    const shouldSkipJump = isComposing && !fromComposition;

    const newAnswers = [...userAnswers];
    // Take the last character typed
    const char = val.slice(-1).toUpperCase();
    
    // Validate: only alphanumeric + Vietnamese characters (broadened regex)
    if (char && !/[A-Z0-9ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠƯÀẢÃÁẠĂẰẲẴẮẶÂẦẨẪẤẬÈẺẼÉẸÊỀỂỄẾỆÌỈĨÍỊÒỎÕÓỌÔỒỔỖỐỘƠỜỞỠỚỢÙỦŨÚỤƯỪỬỮỨỰỲỶỸÝỴ]/.test(char)) return;

    newAnswers[currentIdx][charIdx] = char;
    setUserAnswers(newAnswers);

    // Disable auto-focus next box as per user request
    /*
    if (!shouldSkipJump && char && charIdx < questions[currentIdx].answer.length - 1) {
      let next = charIdx + 1;
      while (next < questions[currentIdx].answer.length && questions[currentIdx].answer[next] === " ") {
        next++;
      }
      if (next < questions[currentIdx].answer.length) {
        setTimeout(() => {
          inputRefs.current[currentIdx][next]?.focus();
        }, 10);
      }
    }
    */
  };

  const handleKeyDown = (e: React.KeyboardEvent, charIdx: number) => {
    // Completely disable auto-jump on Backspace to solve IME issues for Vietnamese characters
    /*
    if (e.key === "Backspace" && !userAnswers[currentIdx][charIdx] && charIdx > 0) {
      // Find previous non-space box
      let prev = charIdx - 1;
      while (prev >= 0 && questions[currentIdx].answer[prev] === " ") {
        prev--;
      }
      if (prev >= 0) {
        inputRefs.current[currentIdx][prev]?.focus();
      }
    } else 
    */
    if (e.key === "ArrowLeft" && charIdx > 0) {
      let prev = charIdx - 1;
      while (prev >= 0 && questions[currentIdx].answer[prev] === " ") {
        prev--;
      }
      if (prev >= 0) {
        inputRefs.current[currentIdx][prev]?.focus();
      }
    } else if (e.key === "ArrowRight" && charIdx < questions[currentIdx].answer.length - 1) {
      let next = charIdx + 1;
      while (next < questions[currentIdx].answer.length && questions[currentIdx].answer[next] === " ") {
        next++;
      }
      if (next < questions[currentIdx].answer.length) {
        inputRefs.current[currentIdx][next]?.focus();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-bold text-muted-foreground animate-pulse">Đang chuẩn bị câu đố...</p>
      </div>
    );
  }

  if (!questions.length) return null;

  const currentQuestion = questions[currentIdx];
  const currentAnswerState = userAnswers[currentIdx];

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden p-2 sm:p-6 sm:pt-4 bg-muted/20">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 bg-card border border-border p-2 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm z-40 mb-2 sm:mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Gamepad2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold leading-tight">Đuổi hình bắt chữ</h1>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">
              Câu {currentIdx + 1} / {questions.length}
            </p>
          </div>
        </div>

        {/* Timer */}
        <div className={`flex items-center gap-3 px-6 py-2 rounded-2xl border-2 transition-colors duration-500
          ${timeLeft < 30 ? "border-red-200 bg-red-50 text-red-600 animate-pulse" : "border-primary/10 bg-primary/5 text-primary"}`}
        >
          <Timer className="h-5 w-5" />
          <span className="font-mono text-xl font-black">{formatTime(timeLeft)}</span>
        </div>

        <Button onClick={handleFinish} className="rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20">
          Hoàn thành
        </Button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-6 min-h-0">
        {/* Main Game Area */}
        <div className="flex-1 flex flex-col gap-2 sm:gap-4 min-h-0 animate-fade-in order-2 lg:order-1">
          {/* Image - Grows/Shrinks Flexibly */}
          <div className="flex-1 min-h-[180px] sm:min-h-0 relative bg-muted/30 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 sm:border-4 border-border/50 overflow-hidden shadow-inner flex items-center justify-center p-4 sm:p-8 group">
             <img 
               src={currentQuestion.image_url} 
               alt="Pictogram" 
               className="max-h-full max-w-full object-contain drop-shadow-2xl transition-transform duration-700 group-hover:scale-105"
             />
             <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md shadow-sm px-4 py-1.5 rounded-2xl text-xs font-black text-primary border border-primary/10">
               CÂU ĐỐ {currentIdx + 1}
             </div>
          </div>

          {/* Answer Boxes - Prominent & Large */}
          <div className="flex flex-wrap justify-center gap-x-2 sm:gap-x-4 gap-y-3 sm:gap-y-5 py-3 sm:py-6 px-4 bg-white/40 backdrop-blur-sm rounded-2xl sm:rounded-[2rem] border-2 border-dashed border-primary/20 shrink-0">
            {currentQuestion.answer.split("").map((char, charIdx) => {
              if (char === " ") {
                return <div key={charIdx} className="w-6 sm:w-10" />; // Spacer
              }
              return (
                <div key={charIdx} className="relative group scale-95 sm:scale-125 mx-0.5 sm:mx-1">
                   <input
                    ref={el => {
                      if (inputRefs.current[currentIdx]) {
                        inputRefs.current[currentIdx][charIdx] = el;
                      }
                    }}
                    type="text"
                    value={currentAnswerState[charIdx]}
                    onChange={(e) => handleInputChange(e.target.value, charIdx)}
                    onKeyDown={(e) => handleKeyDown(e, charIdx)}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={(e) => {
                      setIsComposing(false);
                      // Trigger state update after composition is done
                      handleInputChange(e.currentTarget.value, charIdx, true);
                    }}
                    disabled={isFinished}
                    className={`w-12 h-14 sm:w-14 sm:h-16 text-center rounded-2xl border-2 font-heading text-2xl sm:text-3xl font-black transition-all
                      ${currentAnswerState[charIdx] 
                        ? "border-primary bg-primary/10 text-primary shadow-xl shadow-primary/20 scale-105" 
                        : "border-border bg-card hover:border-primary/40 focus:border-primary focus:ring-8 focus:ring-primary/10"
                      }
                      focus:outline-none uppercase
                    `}
                  />
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-primary/20 rounded-full opacity-0 group-focus-within:opacity-100 transition-all blur-[1px]" />
                </div>
              );
            })}
          </div>

          {/* Nav Controls - More Compact */}
          <div className="flex items-center justify-between px-4 pb-2 shrink-0">
             <Button 
               variant="ghost" 
               disabled={currentIdx === 0} 
               onClick={() => setCurrentIdx(prev => prev - 1)}
               className="gap-2 rounded-2xl h-10 px-4 font-bold"
             >
               <ChevronLeft className="h-5 w-5" /> Câu trước
             </Button>

             <div className="hidden sm:flex items-center gap-1.5">
               {questions.map((_, idx) => (
                 <button
                   key={idx}
                   onClick={() => setCurrentIdx(idx)}
                   className={`h-2 rounded-full transition-all duration-300 ${idx === currentIdx ? 'w-6 bg-primary' : 'w-2 bg-muted hover:bg-muted-foreground/30'}`}
                 />
               ))}
             </div>

             <Button 
               variant="ghost" 
               disabled={currentIdx === questions.length - 1} 
               onClick={() => setCurrentIdx(prev => prev + 1)}
               className="gap-2 rounded-2xl h-10 px-4 font-bold"
             >
               Câu sau <ChevronRight className="h-5 w-5" />
             </Button>
          </div>
        </div>

        {/* Sidebar Navigation - Fits height */}
        <div className="w-full lg:w-[300px] shrink-0 bg-card border border-border rounded-2xl sm:rounded-[2rem] p-3 sm:p-5 shadow-sm flex flex-col min-h-0 order-1 lg:order-2">
          <div className="space-y-1 mb-4">
            <h3 className="font-heading text-base font-bold leading-none">Danh sách câu hỏi</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nhấn để chuyển nhanh</p>
          </div>
          
          <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-5 gap-1.5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
            {questions.map((_, idx) => {
              const isAnswered = userAnswers[idx]?.some(char => char !== "");
              const isCurrent = idx === currentIdx;
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-9 sm:h-10 rounded-xl font-mono text-xs sm:text-sm font-black transition-all flex items-center justify-center border-2
                    ${isCurrent ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 z-10' : 
                      isAnswered ? 'bg-primary/5 text-primary border-primary/20' : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'}
                  `}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:block pt-4 mt-4 border-t border-border shrink-0">
             <div className="bg-blue-50/50 rounded-2xl p-3 flex items-start gap-3">
               <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
               <p className="text-[10px] sm:text-xs text-blue-700 leading-relaxed font-medium">
                 Bạn có thể làm bất kỳ câu nào trước. Nhấn <b>Hoàn thành</b> để nộp bài.
               </p>
             </div>
          </div>
        </div>
      </div>

      {isFinished && (
        <ResultOverlay 
          score={score} 
          total={questions.length} 
          questions={questions}
          userAnswers={finalResultAnswers}
          onRetry={() => window.location.reload()}
          onHome={() => navigate("/")}
        />
      )}
    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(" ");
