import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, AlertCircle, Check, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuizQuestion {
  id: string | number;
  question: string;
  type?: "single" | "multiple" | "text" | "ordering";
  options?: any[];
  correctIndex?: number;
  explanation?: string;
  content?: string; // Fallback for some structures
}

export default function QuizRunner({ questions }: { questions: QuizQuestion[] }) {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  
  // Interaction State
  const [checkStatus, setCheckStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [singleAns, setSingleAns] = useState<number | null>(null);
  const [multiAns, setMultiAns] = useState<number[]>([]);
  const [textAns, setTextAns] = useState("");
  const [orderAvailable, setOrderAvailable] = useState<{ id: string, word: string }[]>([]);
  const [orderSelected, setOrderSelected] = useState<{ id: string, word: string }[]>([]);

  const q = questions[current];

  // Initialize Ordering Words
  useEffect(() => {
    if (q?.type === "ordering") {
      const sentence = q.options?.[0]?.content || q.content || q.question || "";
      const words = sentence.trim().split(/\s+/);
      const wordObjs = words.map((w, i) => ({ id: `word-${i}-${w}`, word: w }));
      setOrderAvailable(wordObjs.sort(() => Math.random() - 0.5));
      setOrderSelected([]);
    } else {
      setSingleAns(null);
      setMultiAns([]);
      setTextAns("");
    }
    setCheckStatus("idle");
  }, [current, q]);

  const handleOrderClick = (item: any, from: "available" | "selected") => {
    if (checkStatus !== "idle") return; // disable clicks if already checked
    if (from === "available") {
      setOrderAvailable(prev => prev.filter(x => x.id !== item.id));
      setOrderSelected(prev => [...prev, item]);
    } else {
      setOrderAvailable(prev => [...prev, item]);
      setOrderSelected(prev => prev.filter(x => x.id !== item.id));
    }
  };

  const handleCheck = () => {
    let correct = false;

    if (q.type === "single" || !q.type) {
      const targetIdx = q.correctIndex ?? q.options?.findIndex(o => o.is_correct);
      correct = singleAns === targetIdx;
    } else if (q.type === "multiple") {
      const correctIndices = q.options?.map((o, i) => o.is_correct ? i : -1).filter(i => i !== -1) || [];
      correct = multiAns.length === correctIndices.length && multiAns.every(idx => correctIndices.includes(idx));
    } else if (q.type === "text") {
      const correctText = q.options?.[0]?.content || "";
      correct = textAns.trim().toLowerCase() === correctText.trim().toLowerCase();
    } else if (q.type === "ordering") {
      const originalSentence = q.options?.[0]?.content || q.content || "";
      const userSentence = orderSelected.map(x => x.word).join(" ");
      correct = userSentence.trim().toLowerCase() === originalSentence.trim().toLowerCase();
    }

    if (correct) {
      setCheckStatus("correct");
      setScore(s => s + 1);
    } else {
      setCheckStatus("incorrect");
    }
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent(c => c + 1);
    }
  };

  const restart = () => {
    setCurrent(0);
    setScore(0);
    setFinished(false);
    setCheckStatus("idle");
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center gap-6 rounded-[2.5rem] bg-white border border-gray-100 p-12 text-center shadow-xl shadow-gray-200/50 animate-scale-in">
        <div className="h-24 w-24 bg-emerald-50 rounded-full flex items-center justify-center text-5xl">
          {pct >= 80 ? "🎉" : pct >= 50 ? "⭐" : "💪"}
        </div>
        <div className="space-y-2">
          <h3 className="font-heading text-3xl font-black text-gray-800 uppercase tracking-tight">Hoàn thành bài tập!</h3>
          <p className="text-gray-500 font-medium">Bạn đã nỗ lực rất tuyệt vời rồi.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-emerald-50 px-8 py-4 rounded-3xl">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Chính xác</p>
            <p className="text-3xl font-black text-emerald-700">{score}/{questions.length}</p>
          </div>
          <div className="bg-blue-50 px-8 py-4 rounded-3xl">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Tỉ lệ</p>
            <p className="text-3xl font-black text-blue-700">{pct}%</p>
          </div>
        </div>
        <Button onClick={restart} variant="outline" className="mt-4 h-12 px-10 rounded-2xl font-bold border-2 hover:bg-emerald-50 hover:text-emerald-600 border-gray-100">
          <RotateCcw className="mr-2 h-4 w-4" /> Làm lại từ đầu
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Progress */}
      <div className="flex items-center gap-4">
        <div className="h-3 flex-1 rounded-full bg-gray-100 overflow-hidden shadow-inner">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700 ease-out" 
            style={{ width: `${((current + 1) / questions.length) * 100}%` }} 
          />
        </div>
        <span className="font-mono text-xs font-black text-gray-400">
          {current + 1} / {questions.length}
        </span>
      </div>

      {/* Question Header */}
      <div className="space-y-4 mb-8">
        {q.type === "ordering" && (
           <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black uppercase tracking-widest">
             <Gamepad2 className="h-3 w-3" /> Sắp xếp câu đúng
           </div>
        )}
        <h3 className="font-heading text-xl sm:text-2xl font-bold text-gray-800 leading-tight">
          {q.type === "ordering" ? "Sắp xếp lại theo thứ tự đúng của câu." : q.question}
        </h3>
        {q.type === "ordering" && (
          <div className="text-sm text-gray-400 flex items-center mt-3">
            <span className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full"><AlertCircle className="w-4 h-4" /> Click vào từng từ để chuyển xuống ô trống</span>
          </div>
        )}
      </div>

      {/* Question Content */}
      <div className="min-h-[240px] flex flex-col justify-center">
        {q.type === "ordering" ? (
          <div className="space-y-6 animate-fade-in">
            {/* Top list: Available Words */}
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 min-h-[60px]">
              {orderAvailable.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleOrderClick(item, "available")}
                  className="px-4 py-2 sm:px-6 sm:py-3 rounded-2xl border-2 shadow-sm font-heading text-base sm:text-lg font-bold transition-all border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105 active:scale-95"
                >
                  {item.word}
                </button>
              ))}
            </div>
            
            {/* Bottom list: Selected Words */}
            <div className={cn(
              "p-6 sm:p-8 rounded-[2rem] border-4 border-dashed transition-all duration-500 min-h-[160px] flex flex-wrap justify-center gap-3 sm:gap-4 items-center content-center",
              checkStatus === "correct" ? "bg-green-50 border-green-200" :
              checkStatus === "incorrect" ? "bg-red-50 border-red-200" :
              "bg-gray-50/50 border-gray-200"
            )}>
              {orderSelected.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleOrderClick(item, "selected")}
                  className={cn(
                    "px-4 py-2 sm:px-6 sm:py-3 rounded-2xl border-2 shadow-sm font-heading text-base sm:text-lg font-bold transition-all active:scale-95",
                    checkStatus === "correct" ? "border-green-500 bg-green-500 text-white" :
                    checkStatus === "incorrect" ? "border-red-500 bg-red-500 text-white" :
                    "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:border-red-200 hover:text-red-500"
                  )}
                >
                  {item.word}
                </button>
              ))}
            </div>
          </div>
        ) : q.type === "text" ? (
          <div className="max-w-md mx-auto w-full space-y-4">
            <input
              type="text"
              value={textAns}
              onChange={(e) => { setTextAns(e.target.value); setCheckStatus("idle"); }}
              placeholder="Nhập đáp án của bạn..."
              className={cn(
                "w-full h-16 px-6 rounded-2xl border-2 text-lg font-bold transition-all outline-none focus:ring-4 focus:ring-emerald-500/10",
                checkStatus === "correct" ? "bg-green-50 border-green-200 text-green-700" :
                checkStatus === "incorrect" ? "bg-red-50 border-red-200 text-red-700" :
                "bg-white border-gray-100 focus:border-emerald-500"
              )}
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(q.options || []).map((opt, idx) => {
              const content = typeof opt === "string" ? opt : opt.content;
              const isSelected = q.type === "multiple" ? multiAns.includes(idx) : singleAns === idx;
              
              let cls = "border-2 border-gray-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/30";
              if (isSelected) cls = "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20";
              
              if (checkStatus !== "idle") {
                 const isCorrect = typeof opt === "string" ? idx === q.correctIndex : opt.is_correct;
                 if (isCorrect) cls = "border-green-500 bg-green-50 text-green-700";
                 else if (isSelected) cls = "border-red-500 bg-red-50 text-red-700";
                 else cls = "opacity-50 grayscale border-gray-100";
              }

              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (checkStatus !== "idle") return;
                    if (q.type === "multiple") {
                      setMultiAns(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
                    } else {
                      setSingleAns(idx);
                    }
                  }}
                  disabled={checkStatus !== "idle"}
                  className={cn(
                    "group flex items-center gap-4 rounded-[1.5rem] p-5 text-left transition-all duration-300 active:scale-[0.98]",
                    cls
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-black text-sm transition-colors",
                    isSelected ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-400 group-hover:bg-emerald-100 group-hover:text-emerald-500"
                  )}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="font-bold text-lg">{content}</span>
                  {checkStatus !== "idle" && (typeof opt === "string" ? idx === q.correctIndex : opt.is_correct) && <CheckCircle2 className="ml-auto h-6 w-6 text-green-500" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Validation Feedback */}
      {checkStatus !== "idle" && (
        <div className={cn(
            "rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-fade-up border-2",
            checkStatus === "correct" ? "bg-green-50 border-green-100 text-green-800" : "bg-red-50 border-red-100 text-red-800"
        )}>
          <div className={cn(
              "p-2 rounded-2xl shrink-0",
              checkStatus === "correct" ? "bg-green-200/50" : "bg-red-200/50"
          )}>
            {checkStatus === "correct" ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
          </div>
          <div>
            <p className="font-black text-lg uppercase tracking-tight">
              {checkStatus === "correct" ? "Tuyệt vời! Chính xác." : "Chưa đúng rồi!"}
            </p>
            <p className="mt-1 text-sm font-medium opacity-80 leading-relaxed max-w-2xl">{q.explanation || "Hãy xem lại kiến thức và thử lại ở câu sau nhé!"}</p>
          </div>
          {checkStatus === "correct" && (
             <Button onClick={handleNext} className="ml-auto h-12 px-8 rounded-2xl bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20 font-bold shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
               {current + 1 >= questions.length ? "Xem kết quả" : "Tiếp tục"}
               <ArrowRight className="ml-2 h-4 w-4" />
             </Button>
          )}
          {checkStatus === "incorrect" && (
             <Button onClick={() => setCheckStatus("idle")} variant="ghost" className="ml-auto h-12 px-8 rounded-2xl font-bold text-red-700 hover:bg-red-100 shrink-0 w-full sm:w-auto mt-2 sm:mt-0">
               <RotateCcw className="mr-2 h-4 w-4" /> Thử lại
             </Button>
          )}
        </div>
      )}

      {/* Action Bar */}
      {checkStatus === "idle" && (
        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleCheck} 
            disabled={(q.type === "multiple" && multiAns.length === 0) || (q.type === "single" && singleAns === null) || (q.type === "text" && !textAns.trim())}
            size="lg" 
            className="h-16 px-16 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 font-black text-lg transition-all active:scale-95"
          >
            <Check className="mr-2 h-6 w-6" /> Kiểm tra đáp án
          </Button>
        </div>
      )}
    </div>
  );
}
