import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, RefreshCw, Loader2, BookText, AlertCircle, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

interface DictationExercise {
  id: string;
  title: string;
  level: string;
  language: string;
  content: string;
}

const LEVEL_LABELS: Record<string, { label: string; color: string }> = {
  easy:    { label: "Dễ",        color: "bg-green-100 text-green-700 border-green-200" },
  medium:  { label: "Trung bình", color: "bg-blue-100 text-blue-700 border-blue-200" },
  hard:    { label: "Khó",        color: "bg-orange-100 text-orange-700 border-orange-200" },
  extreme: { label: "Cực khó",    color: "bg-red-100 text-red-700 border-red-200" },
};

const LANG_FLAGS: Record<string, string> = { vi: "🇻🇳", en: "🇺🇸", ja: "🇯🇵" };

// ── Scoring ────────────────────────────────────────────────────────────────────
function scoreText(original: string, userInput: string): {
  score: number;
  totalWords: number;
  correctWords: number;
  highlights: { word: string; correct: boolean }[];
} {
  const normalize = (s: string) => s.trim().toLowerCase().replace(/[.,!?;:'"()]/g, "");
  const origWords = original.trim().split(/\s+/);
  const userWords = userInput.trim().split(/\s+/);
  let correct = 0;
  const highlights = origWords.map((word, i) => {
    const match = normalize(word) === normalize(userWords[i] ?? "");
    if (match) correct++;
    return { word, correct: match };
  });
  return {
    score: origWords.length === 0 ? 0 : Math.round((correct / origWords.length) * 100),
    totalWords: origWords.length,
    correctWords: correct,
    highlights,
  };
}

// ── Score Badge ────────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? "text-green-600 bg-green-50 border-green-200" :
    score >= 70 ? "text-blue-600 bg-blue-50 border-blue-200" :
    score >= 50 ? "text-orange-600 bg-orange-50 border-orange-200" :
                  "text-red-600 bg-red-50 border-red-200";
  const msg =
    score === 100 ? "Hoàn hảo! 🎉" :
    score >= 90  ? "Xuất sắc! 🌟" :
    score >= 70  ? "Khá tốt! 👍" :
    score >= 50  ? "Cố lên! 💪" :
                   "Cần luyện thêm 📚";
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border-2 p-6 ${color}`}>
      <Trophy className="h-8 w-8 mb-2" />
      <div className="text-5xl font-black">{score}%</div>
      <div className="text-base font-semibold mt-1">{msg}</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DictationPlayPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const level = params.get("level") ?? "";
  const language = params.get("language") ?? "vi";

  const [exercise, setExercise] = useState<DictationExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState<ReturnType<typeof scoreText> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);      // seconds
  const [timerActive, setTimerActive] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setElapsed(0);
    setTimerActive(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    setTimerActive(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, "0");
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const fetchExercise = async () => {
    stopTimer();
    setLoading(true);
    setNotFound(false);
    setUserInput("");
    setResult(null);
    setElapsed(0);
    try {
      const qs = new URLSearchParams();
      if (level)    qs.set("level", level);
      if (language) qs.set("language", language);
      const data = await apiFetch<DictationExercise>(`/dictation/random?${qs}`);
      setExercise(data);
      startTimer();
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExercise(); }, []);

  const handleCheck = () => {
    if (!exercise) return;
    stopTimer();
    setResult(scoreText(exercise.content, userInput));
  };

  const handleRetry = () => {
    setResult(null);
    setUserInput("");
    startTimer();
    textareaRef.current?.focus();
  };

  const lvlInfo = LEVEL_LABELS[exercise?.level ?? ""] ?? LEVEL_LABELS.medium;

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center h-9 w-9 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="font-heading text-xl font-bold flex items-center gap-2">
            <BookText className="h-5 w-5 text-primary" />
            Chép chính tả
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            {exercise && (
              <>
                <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${lvlInfo.color}`}>
                  {lvlInfo.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {LANG_FLAGS[exercise.language]} {exercise.language === "vi" ? "Tiếng Việt" : exercise.language === "en" ? "Tiếng Anh" : "Tiếng Nhật"}
                </span>
              </>
            )}
          </div>
        </div>
        {/* Timer */}
        {exercise && (
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 font-mono text-base font-bold tabular-nums transition-colors
            ${result ? "bg-muted/50 text-muted-foreground border-border" : "bg-primary/5 text-primary border-primary/20"}`}>
            <Clock className="h-4 w-4" />
            {formatTime(elapsed)}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={fetchExercise} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Bài khác
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Not found */}
      {!loading && notFound && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl border-2 border-dashed border-border text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground/40" />
          <p className="font-semibold text-muted-foreground">Chưa có bài chính tả phù hợp</p>
          <p className="text-sm text-muted-foreground/70">Admin cần tạo bài với cấp độ và ngôn ngữ đã chọn</p>
          <Button variant="outline" onClick={() => navigate("/")}>Quay về trang chủ</Button>
        </div>
      )}

      {/* Exercise */}
      {!loading && exercise && (
        <div className="space-y-5 animate-fade-in">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tiêu đề</label>
            <div className="rounded-xl border border-input bg-muted/30 px-4 py-3 text-sm font-semibold">
              {exercise.title}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Nội dung</label>
            {result ? (
              /* Show highlighted result */
              <div className="rounded-xl border border-input bg-muted/20 px-4 py-3 text-sm leading-8 min-h-[100px] max-h-[220px] overflow-y-auto scrollbar-thin">
                {result.highlights.map((item, i) => (
                  <span key={i}>
                    <span className={`rounded px-0.5 font-medium ${item.correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {item.word}
                    </span>
                    {i < result.highlights.length - 1 ? " " : ""}
                  </span>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-input bg-muted/20 px-4 py-3 text-sm leading-7 min-h-[100px] max-h-[220px] overflow-y-auto text-foreground/80 select-none scrollbar-thin whitespace-pre-wrap">
                {exercise.content}
              </div>
            )}
          </div>

          {/* Dictation input */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">
              Chép chính tả <span className="text-destructive">*</span>
            </label>
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              disabled={!!result}
              rows={6}
              placeholder="Nhập lại đoạn văn ở trên..."
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Score result */}
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
              <ScoreBadge score={result.score} />
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <p className="font-semibold text-sm">Chi tiết kết quả</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tổng số từ</span>
                    <span className="font-semibold">{result.totalWords} từ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Từ đúng</span>
                    <span className="font-semibold text-green-600">{result.correctWords} từ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Từ sai</span>
                    <span className="font-semibold text-red-500">{result.totalWords - result.correctWords} từ</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Thời gian</span>
                    <span className="font-mono font-bold text-primary">{formatTime(elapsed)}</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 justify-end">
            {result ? (
              <>
                <Button variant="outline" onClick={handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Thử lại
                </Button>
                <Button onClick={fetchExercise}>
                  Bài mới
                </Button>
              </>
            ) : (
              <Button onClick={handleCheck} disabled={!userInput.trim()}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Kiểm tra
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
