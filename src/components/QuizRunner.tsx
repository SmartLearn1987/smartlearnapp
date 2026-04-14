import { useState } from "react";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuizQuestion } from "@/data/mockData";

export default function QuizRunner({ questions }: { questions: QuizQuestion[] }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[current];
  const isCorrect = selected === q?.correctIndex;

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.correctIndex) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  };

  const restart = () => {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-8 text-center shadow-sm animate-scale-in">
        <span className="text-5xl">{pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "💪"}</span>
        <h3 className="font-heading text-2xl font-bold">Kết quả</h3>
        <p className="text-lg">
          Bạn đạt <span className="font-bold text-primary">{score}/{questions.length}</span> câu đúng ({pct}%)
        </p>
        <Button onClick={restart} variant="outline" className="mt-2">
          <RotateCcw className="mr-2 h-4 w-4" /> Làm lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">Câu {current + 1}/{questions.length}</span>
        <div className="h-2 flex-1 mx-4 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <h3 className="font-heading text-lg font-bold">{q.question}</h3>

      <div className="grid gap-3">
        {q.options.map((opt, idx) => {
          let cls = "border-2 border-border bg-card hover:border-primary/40";
          if (selected !== null) {
            if (idx === q.correctIndex) cls = "border-2 border-success bg-success/10";
            else if (idx === selected) cls = "border-2 border-destructive bg-destructive/10";
          }
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={selected !== null}
              className={`flex items-center gap-3 rounded-xl p-4 text-left text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${cls}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted font-bold">
                {String.fromCharCode(65 + idx)}
              </span>
              {opt}
              {selected !== null && idx === q.correctIndex && <CheckCircle2 className="ml-auto h-5 w-5 text-success" />}
              {selected !== null && idx === selected && idx !== q.correctIndex && <XCircle className="ml-auto h-5 w-5 text-destructive" />}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="rounded-xl bg-muted p-4 text-sm animate-fade-up">
          <p className="font-semibold">{isCorrect ? "✅ Chính xác!" : "❌ Chưa đúng!"}</p>
          <p className="mt-1 text-muted-foreground">{q.explanation}</p>
        </div>
      )}

      {selected !== null && (
        <Button onClick={handleNext} className="w-full">
          {current + 1 >= questions.length ? "Xem kết quả" : "Câu tiếp theo"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
