import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Gamepad2, Timer, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, X, Home, RotateCcw, Trophy, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { createPortal } from "react-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Question {
  id: string;
  content: string; // The proverb
  level: string;
}

interface ResultModalProps {
  score: number;
  total: number;
  onRetry: () => void;
  onHome: () => void;
  questions: Question[];
  userAnswers: string[][]; // Array of words for each question
}

function ResultOverlay({ score, total, onRetry, onHome, questions, userAnswers }: ResultModalProps) {
  const percentage = Math.round((score / total) * 100);
  
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-[2rem] p-8 space-y-8 animate-scale-in my-auto">
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

        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {questions.map((q, idx) => {
            const originalWords = q.content.trim().split(/\s+/);
            const userStr = userAnswers[idx].join(' ').trim();
            const correctStr = originalWords.join(' ').trim();
            const isCorrect = userStr.toLowerCase() === correctStr.toLowerCase();

            return (
              <div key={q.id} className={`flex items-center gap-4 p-4 rounded-2xl border ${isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Câu {idx + 1}</p>
                  <div className="flex flex-col gap-y-1">
                    <p className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                      {userStr || "(Bỏ trống)"}
                    </p>
                    {!isCorrect && (
                      <p className="text-xs text-muted-foreground italic">
                        Đáp án: <span className="text-green-700 font-bold">{correctStr}</span>
                      </p>
                    )}
                  </div>
                </div>
                {isCorrect ? <CheckCircle2 className="text-green-500 h-6 w-6 shrink-0" /> : <X className="text-red-500 h-6 w-6 shrink-0" />}
              </div>
            );
          })}
        </div>

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

// ── Sortable Word Component ──────────────────────────────────────────────────
function SortableWord({ id, word }: { id: string; word: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`px-4 py-2 sm:px-6 sm:py-3 rounded-2xl border-2 shadow-sm font-heading text-lg sm:text-2xl font-bold transition-colors cursor-grab active:cursor-grabbing
        ${isDragging 
          ? "border-primary bg-primary/10 text-primary shadow-xl shadow-primary/20 scale-105" 
          : "border-border bg-card hover:border-primary/40 text-foreground"
        }
      `}
    >
      {word}
    </div>
  );
}

export default function ProverbPlayPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const level = searchParams.get("level") || "medium";
  const limit = searchParams.get("limit") || "10";
  const initialTime = parseInt(searchParams.get("time") || "300");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ id: string, word: string }[][]>([]); 
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [checkStatus, setCheckStatus] = useState<"idle" | "correct" | "incorrect">("idle");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch Questions
  useEffect(() => {
    const fetchQs = async () => {
      try {
        const data = await apiFetch<Question[]>(`/proverbs/play?level=${level}&limit=${limit}`);
        setQuestions(data);
        
        // Split proverbs into Shuffled Word Arrays
        const initialAnswers = data.map(q => {
          const words = q.content.trim().split(/\s+/);
          // Create objects with unique ids for DndKit
          const wordObjs = words.map((w, i) => ({ id: `${i}-${w}`, word: w }));
          // Shuffle
          return wordObjs.sort(() => Math.random() - 0.5);
        });
        
        setUserAnswers(initialAnswers);
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

  // Handle Drag End
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setUserAnswers((answers) => {
        const curAns = answers[currentIdx];
        const oldIndex = curAns.findIndex(item => item.id === active.id);
        const newIndex = curAns.findIndex(item => item.id === over?.id);
        
        const newCurAns = arrayMove(curAns, oldIndex, newIndex);
        const newAnswers = [...answers];
        newAnswers[currentIdx] = newCurAns;
        return newAnswers;
      });
      // Reset check status when user changes something
      setCheckStatus("idle");
    }
  };

  const [finalResultAnswers, setFinalResultAnswers] = useState<string[][]>([]);

  const handleFinish = () => {
    let s = 0;
    const finalAnswers = userAnswers.map((ua, idx) => {
      const originalWords = questions[idx].content.trim().split(/\s+/);
      const correctStr = originalWords.join(' ').toLowerCase();
      const userStr = ua.map(x => x.word).join(' ').trim().toLowerCase();
      
      if (userStr === correctStr) {
        s++;
      }
      return ua.map(x => x.word);
    });
    setFinalResultAnswers(finalAnswers);
    setScore(s);
    setIsFinished(true);
  };

  const handleCheck = () => {
    if (!questions.length) return;
    const originalWords = questions[currentIdx].content.trim().split(/\s+/);
    const correctStr = originalWords.join(' ').toLowerCase();
    const userStr = userAnswers[currentIdx].map(x => x.word).join(' ').trim().toLowerCase();
    
    if (userStr === correctStr) {
      setCheckStatus("correct");
    } else {
      setCheckStatus("incorrect");
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
        <div className="animate-spin text-primary w-12 h-12">
            <Gamepad2 className="w-full h-full" />
        </div>
        <p className="font-bold text-muted-foreground animate-pulse">Đang chuẩn bị câu đố...</p>
      </div>
    );
  }

  if (!questions.length) return null;

  const currentAnswerState = userAnswers[currentIdx];

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden p-2 sm:p-6 sm:pt-4 bg-muted/20">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 bg-card border border-border p-2 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm z-40 mb-2 sm:mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Gamepad2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold leading-tight">Ca dao tục ngữ</h1>
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

        <Button onClick={handleFinish} className="rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20 bg-amber-600 hover:bg-amber-700">
          Hoàn thành
        </Button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-6 min-h-0">
        {/* Main Game Area */}
        <div className="flex-1 flex flex-col gap-2 sm:gap-4 min-h-0 animate-fade-in order-2 lg:order-1">
          {/* Game Canvas */}
          <div className="flex-1 min-h-[50vh] sm:min-h-0 relative bg-white/40 backdrop-blur-md rounded-[1.5rem] sm:rounded-[2.5rem] border-2 sm:border-4 border-dashed border-amber-200/50 shadow-inner flex flex-col items-center pt-16 p-4 sm:p-8">
            <div className="absolute top-6 border border-amber-200 bg-amber-50 text-amber-600 shadow-sm px-5 py-1.5 rounded-2xl text-xs font-black uppercase tracking-wider">
               Sắp xếp các từ để tạo thành câu đúng
            </div>

            <div className={`w-full max-w-4xl flex-1 flex items-center justify-center transition-colors duration-300 rounded-3xl p-4
                ${checkStatus === "correct" ? "bg-green-50 border-2 border-green-200 shadow-[0_0_40px_-10px_rgba(34,197,94,0.3)]" : 
                  checkStatus === "incorrect" ? "bg-red-50 border-2 border-red-200" : ""}
            `}>
                <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext 
                        items={currentAnswerState.map(x => x.id)}
                        strategy={horizontalListSortingStrategy}
                    >
                        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 items-center align-middle">
                            {currentAnswerState.map((item) => (
                                <SortableWord key={item.id} id={item.id} word={item.word} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            <div className="mt-8">
                <Button 
                    size="lg"
                    onClick={handleCheck}
                    className={`rounded-2xl h-14 px-10 font-bold text-lg transition-all duration-300 shadow-xl
                        ${checkStatus === "correct" ? "bg-green-600 hover:bg-green-700 shadow-green-600/20" : 
                          checkStatus === "incorrect" ? "bg-red-600 hover:bg-red-700 shadow-red-600/20" : 
                          "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"}
                    `}
                >
                    {checkStatus === "correct" ? <><CheckCircle2 className="mr-2 h-6 w-6"/> Chính xác!</> : 
                     checkStatus === "incorrect" ? <><AlertCircle className="mr-2 h-6 w-6"/> Chưa chính xác</> :
                     <><Check className="mr-2 h-6 w-6"/> Kiểm tra</>}
                </Button>
            </div>
          </div>


          {/* Nav Controls */}
          <div className="flex items-center justify-between px-4 pb-2 shrink-0">
             <Button 
               variant="ghost" 
               disabled={currentIdx === 0} 
               onClick={() => { setCurrentIdx(prev => prev - 1); setCheckStatus("idle"); }}
               className="gap-2 rounded-2xl h-10 px-4 font-bold"
             >
               <ChevronLeft className="h-5 w-5" /> Câu trước
             </Button>

             <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-center">
               {questions.map((_, idx) => (
                 <button
                   key={idx}
                   onClick={() => { setCurrentIdx(idx); setCheckStatus("idle"); }}
                   className={`h-2 rounded-full transition-all duration-300 ${idx === currentIdx ? 'w-6 bg-amber-500' : 'w-2 bg-muted hover:bg-muted-foreground/30'}`}
                 />
               ))}
             </div>

             <Button 
               variant="ghost" 
               disabled={currentIdx === questions.length - 1} 
               onClick={() => { setCurrentIdx(prev => prev + 1); setCheckStatus("idle"); }}
               className="gap-2 rounded-2xl h-10 px-4 font-bold"
             >
               Câu sau <ChevronRight className="h-5 w-5" />
             </Button>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="w-full lg:w-[300px] shrink-0 bg-card border border-border rounded-2xl sm:rounded-[2rem] p-3 sm:p-5 shadow-sm flex flex-col min-h-0 order-1 lg:order-2">
          <div className="space-y-1 mb-4">
            <h3 className="font-heading text-base font-bold leading-none">Danh sách câu hỏi</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nhấn để chuyển nhanh</p>
          </div>
          
          <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-5 gap-1.5 overflow-y-auto pr-1 flex-1 custom-scrollbar">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIdx;
              
              // We can determine if it's correct implicitly to show in sidebar
              const originalWords = q.content.trim().split(/\s+/);
              const correctStr = originalWords.join(' ').toLowerCase();
              const userStr = userAnswers[idx]?.map(x => x.word).join(' ').trim().toLowerCase();
              const isCorrect = userStr === correctStr;

              return (
                <button
                  key={idx}
                  onClick={() => { setCurrentIdx(idx); setCheckStatus("idle"); }}
                  className={`h-9 sm:h-10 rounded-xl font-mono text-xs sm:text-sm font-black transition-all flex items-center justify-center border-2
                    ${isCurrent ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20 z-10' : 
                      isCorrect ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'}
                  `}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="hidden sm:block pt-4 mt-4 border-t border-border shrink-0">
             <div className="bg-amber-50 rounded-2xl p-3 flex items-start gap-3">
               <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
               <p className="text-[10px] sm:text-xs text-amber-700 leading-relaxed font-medium">
                 Kéo thả các từ để ghép thành câu đúng. Bạn có thể kiểm tra từng câu và làm lại nếu sai.
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
