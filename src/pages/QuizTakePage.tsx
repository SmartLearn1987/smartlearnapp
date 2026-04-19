import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, Send, ChevronLeft, ChevronRight, HelpCircle, Loader2, AlertTriangle, ShieldCheck, Check, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

interface Option {
  id: string;
  content: string;
}

interface Question {
  id: string;
  content: string;
  type: "single" | "multiple" | "text" | "ordering";
  options: Option[];
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
      className={cn(
        "px-4 py-2 sm:px-6 sm:py-3 rounded-2xl border-2 shadow-sm font-heading text-base sm:text-lg font-bold transition-all cursor-grab active:cursor-grabbing select-none",
        isDragging
          ? "border-primary bg-primary/5 text-primary shadow-xl scale-105 z-50"
          : "border-gray-200 bg-white hover:border-primary/20 text-gray-700"
      )}
    >
      {word}
    </div>
  );
}

export default function QuizTakePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number>(0); // seconds
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [currentIdx, setCurrentIdx] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadExam = async () => {
      try {
        const data = await apiFetch<any>(`/exams/${id}`);
        setExam(data);
        setTimeLeft((data.duration || 30) * 60);
      } catch (err) {
        toast.error("Không thể tải bài thi");
        navigate("/quizzes");
      } finally {
        setLoading(false);
      }
    };
    loadExam();
  }, [id, navigate]);

  // Initialize Ordering Answers if not already set
  useEffect(() => {
    if (!exam) return;
    const q = exam.questions[currentIdx];
    if (q.type === "ordering" && !userAnswers[q.id]) {
      const sentence = q.options?.[0]?.content || "";
      const words = sentence.trim().split(/\s+/).map((w, i) => ({ id: `w-${q.id}-${i}`, word: w }));
      // Shuffle once
      const shuffled = [...words].sort(() => Math.random() - 0.5);
      setUserAnswers(prev => ({ ...prev, [q.id]: shuffled }));
    }
  }, [currentIdx, exam]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const q = exam?.questions[currentIdx];
    if (!q) return;

    if (active.id !== over?.id) {
      const items = userAnswers[q.id] as { id: string, word: string }[];
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over?.id);
      
      setUserAnswers({
        ...userAnswers,
        [q.id]: arrayMove(items, oldIndex, newIndex)
      });
    }
  };

  const handleSubmit = useCallback(() => {
    if (!exam) return;
    
    // Normalize userAnswers for backend (for ordering, join with spaces)
    const normalizedAnswers = { ...userAnswers };
    exam.questions.forEach(q => {
      if (q.type === "ordering" && Array.isArray(normalizedAnswers[q.id])) {
        normalizedAnswers[q.id] = normalizedAnswers[q.id].map((x: any) => x.word).join(" ");
      }
    });

    navigate("/quizzes/result", { 
      state: { 
        exam, 
        userAnswers: normalizedAnswers,
        timeTaken: (exam.duration * 60) - timeLeft
      } 
    });
    toast.success("Đã nộp bài thành công");
  }, [exam, userAnswers, timeLeft, navigate]);

  useEffect(() => {
    if (loading || !exam || timeLeft <= 0) {
      if (timeLeft === 0 && exam) handleSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, exam, timeLeft, handleSubmit]);

  const getFormattedTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return {
      minutes: m.toString().padStart(2, "0"),
      seconds: s.toString().padStart(2, "0")
    };
  };

  const TimerCard = ({ value, isDanger }: { value: string, isDanger: boolean }) => (
    <div className={`flex items-center justify-center rounded-xl p-2 transition-all duration-300 ${
      isDanger ? "text-red-600 animate-pulse" : "text-gray-800"
    }`}>
      <span className="text-2xl sm:text-3xl font-black tabular-nums tracking-tighter">
        {value}
      </span>
    </div>
  );

  const handleAnswer = (qId: string, value: any) => {
    const q = exam?.questions.find(q => q.id === qId);
    if (!q) return;

    if (q.type === "multiple") {
      const current = (userAnswers[qId] || []) as string[];
      if (current.includes(value)) {
        setUserAnswers({ ...userAnswers, [qId]: current.filter(v => v !== value) });
      } else {
        setUserAnswers({ ...userAnswers, [qId]: [...current, value] });
      }
    } else {
      setUserAnswers({ ...userAnswers, [qId]: value });
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!exam) return null;

  const currentQuestion = exam.questions[currentIdx];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white px-4 py-3 shadow-sm">
        <div className="container max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold truncate max-w-[200px] sm:max-w-md">{exam.title}</h1>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Làm bài thi trắc nghiệm</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <TimerCard 
                value={getFormattedTime(timeLeft).minutes} 
                isDanger={timeLeft < 60} 
              />
              <div className={`text-2xl font-black mx-1 ${timeLeft < 60 ? "text-red-600" : "text-gray-400"}`}>:</div>
              <TimerCard 
                value={getFormattedTime(timeLeft).seconds} 
                isDanger={timeLeft < 60} 
              />
            </div>
            <Button onClick={handleSubmit} className="rounded-2xl h-11 px-6 text-sm font-bold flex items-center gap-2 shadow-xl shadow-primary/20 bg-primary hover:scale-105 transition-transform active:scale-95">
              <Send className="h-4 w-4" />
              Nộp bài
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl py-8 px-4 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 space-y-6 order-2 lg:order-1">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">Mục lục câu hỏi</h3>
            <div className="grid grid-cols-5 gap-2">
              {exam.questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-10 w-10 rounded-xl text-sm font-bold transition-all ${
                    idx === currentIdx 
                      ? "bg-primary text-white shadow-md shadow-primary/20 ring-4 ring-primary/5 scale-110" 
                      : userAnswers[q.id] !== undefined && (Array.isArray(userAnswers[q.id]) ? userAnswers[q.id].length > 0 : userAnswers[q.id] !== "") 
                        ? "bg-green-100 text-green-700 border border-green-200" 
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100 space-y-3">
            <div className="flex items-center gap-2 text-orange-700 font-bold text-sm">
              <AlertTriangle className="h-4 w-4" /> Lưu ý quan trọng
            </div>
            <p className="text-xs text-orange-600 leading-relaxed font-medium">
              Bạn không nên tải lại trang hoặc nhấn nút quay lại để tránh mất dữ liệu bài làm. Toàn bộ đáp án sẽ được nộp tự động khi hết giờ.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <section className="lg:col-span-3 space-y-6 order-1 lg:order-2 w-full overflow-hidden">
          <div className="bg-white rounded-2xl sm:rounded-[32px] p-5 sm:p-12 shadow-sm border border-gray-100 min-h-[400px] flex flex-col justify-between w-full">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">
                  Câu hỏi {currentIdx + 1}
                </span>
                {currentQuestion.type === "ordering" && (
                   <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
                     <Gamepad2 className="h-3 w-3" /> Sắp xếp câu
                   </div>
                )}
              </div>
              
              <h2 className="text-2xl font-bold leading-snug mb-10 text-gray-800">
                {currentQuestion.type === "ordering" ? "Sắp xếp lại theo thứ tự đúng của câu." : currentQuestion.content}
              </h2>

              <div className="space-y-4">
                {currentQuestion.type === "ordering" ? (
                  <div className="p-8 sm:p-12 rounded-[2rem] border-4 border-dashed bg-gray-50/50 border-gray-100 min-h-[200px] flex items-center justify-center">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={(userAnswers[currentQuestion.id] || []).map((x: any) => x.id)} strategy={horizontalListSortingStrategy}>
                        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                          {(userAnswers[currentQuestion.id] || []).map((item: any) => (
                            <SortableWord key={item.id} id={item.id} word={item.word} />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                ) : currentQuestion.type === "text" ? (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-muted-foreground mb-4 uppercase tracking-widest">Nhập đáp án của bạn:</p>
                    <textarea
                      placeholder="Nhập nội dung trả lời..."
                      value={userAnswers[currentQuestion.id] || ""}
                      onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                      className="w-full min-h-[150px] p-6 rounded-3xl border-2 border-gray-100 bg-gray-50/50 focus:border-primary/30 focus:bg-white focus:outline-none transition-all text-lg font-medium"
                    />
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {currentQuestion.options.map((option, oIdx) => {
                      const isSelected = currentQuestion.type === "multiple" 
                        ? (userAnswers[currentQuestion.id] || []).includes(option.id)
                        : userAnswers[currentQuestion.id] === option.id;
                      
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleAnswer(currentQuestion.id, option.id)}
                          className={`flex items-center gap-4 p-6 rounded-[24px] border-2 text-left transition-all ${
                            isSelected 
                              ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/5" 
                              : "border-gray-100 hover:border-gray-200 hover:bg-gray-50/30"
                          }`}
                        >
                          <div className={`flex h-6 w-6 items-center justify-center border-2 transition-all ${
                            currentQuestion.type === "single" ? "rounded-full" : "rounded-[6px]"
                          } ${
                            isSelected ? "bg-primary border-primary text-white" : "border-gray-300 bg-white"
                          }`}>
                            {isSelected && (
                              currentQuestion.type === "single" ? (
                                <div className="h-2 w-2 rounded-full bg-white" />
                              ) : (
                                <Check className="h-4 w-4" strokeWidth={3} />
                              )
                            )}
                          </div>
                          <span className={`text-lg font-semibold ${isSelected ? "text-primary" : "text-gray-700"}`}>
                            {option.content}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-8 mt-8 sm:pt-12 sm:mt-12 border-t">
              <Button
                variant="ghost"
                onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                disabled={currentIdx === 0}
                className="rounded-2xl h-10 sm:h-12 px-3 sm:px-6 font-bold flex items-center gap-1 sm:gap-2 text-xs sm:text-base"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" /> Câu trước
              </Button>
              
              <div className="text-xs sm:text-sm font-bold text-muted-foreground tabular-nums px-2">
                {currentIdx + 1} / {exam.questions.length}
              </div>

              {currentIdx < exam.questions.length - 1 ? (
                <Button
                  onClick={() => setCurrentIdx(prev => Math.max(0, prev + 1))}
                  className="rounded-2xl h-10 sm:h-12 px-3 sm:px-6 font-bold flex items-center gap-1 sm:gap-2 text-xs sm:text-base"
                >
                  Câu tiếp theo <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="rounded-2xl h-10 sm:h-12 px-4 sm:px-8 font-bold flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 text-xs sm:text-base"
                >
                  Nộp bài
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
