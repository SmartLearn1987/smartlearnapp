import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Upload, FileSpreadsheet, FileText, Download, CheckCircle2,
  AlertCircle, ArrowRight, RotateCcw, HelpCircle, Layers,
  X, BookOpen, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { parseImportFile, type ParsedImport } from "@/lib/importParser";
import { getAllCourses } from "@/lib/courseData";
import { saveCustomCourse, getCustomCourses } from "@/lib/courseStorage";
import type { Course } from "@/data/mockData";

type Step = "upload" | "assign" | "done";

// ── Mini preview tables ───────────────────────────────────────
function QuizPreview({ items }: { items: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, 3);
  return (
    <div className="space-y-2">
      {shown.map((q, i) => (
        <div key={i} className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-sm font-semibold">{i + 1}. {q.question}</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1">
            {q.options.map((opt: string, j: number) => (
              <span key={j} className={`rounded-lg px-2 py-1 text-xs ${j === q.correctIndex ? "bg-primary/15 font-bold text-primary" : "text-muted-foreground"}`}>
                {String.fromCharCode(65 + j)}. {opt}
              </span>
            ))}
          </div>
        </div>
      ))}
      {items.length > 3 && (
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          {expanded ? <><ChevronUp className="h-3 w-3" /> Ẩn bớt</> : <><ChevronDown className="h-3 w-3" /> Xem thêm {items.length - 3} câu</>}
        </button>
      )}
    </div>
  );
}

function FlashcardPreview({ items }: { items: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, 4);
  return (
    <div className="space-y-2">
      {shown.map((f, i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary/20 text-xs font-bold text-secondary">{i + 1}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{f.front}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{f.back}</p>
          </div>
        </div>
      ))}
      {items.length > 4 && (
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs font-semibold text-secondary hover:underline">
          {expanded ? <><ChevronUp className="h-3 w-3" /> Ẩn bớt</> : <><ChevronDown className="h-3 w-3" /> Xem thêm {items.length - 4} thẻ</>}
        </button>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ImportPage() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Assign targets
  const allCourses = getAllCourses();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [savedCount, setSavedCount] = useState({ quiz: 0, flashcards: 0 });

  const selectedCourse = allCourses.find((c) => c.id === selectedCourseId);
  const lessons = selectedCourse?.lessons ?? [];

  // ── File handling ─────────────────────────────────────────
  const processFile = async (file: File) => {
    setIsLoading(true);
    setFileName(file.name);
    try {
      const result = await parseImportFile(file);
      setParsed(result);

      if (result.quiz.length === 0 && result.flashcards.length === 0) {
        toast.error("Không tìm thấy dữ liệu hợp lệ trong file.");
      } else {
        const parts = [];
        if (result.quiz.length > 0) parts.push(`${result.quiz.length} câu hỏi`);
        if (result.flashcards.length > 0) parts.push(`${result.flashcards.length} flashcard`);
        toast.success(`Đọc được: ${parts.join(" và ")}`);
        setStep("assign");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Lỗi khi đọc file");
    } finally {
      setIsLoading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  // ── Save to lesson ────────────────────────────────────────
  const handleSave = () => {
    if (!selectedCourseId || !selectedLessonId || !parsed) {
      toast.error("Vui lòng chọn giáo trình và bài học");
      return;
    }

    const customs = getCustomCourses();
    const mockCourse = allCourses.find((c) => c.id === selectedCourseId);
    if (!mockCourse) return;

    // For mock (built-in) courses, we can't mutate them directly.
    // We snapshot the course into custom storage so the lesson can be updated.
    const isCustom = customs.some((c) => c.id === selectedCourseId);
    const baseCourse: Course = isCustom
      ? customs.find((c) => c.id === selectedCourseId)!
      : { ...mockCourse }; // clone

    const updatedLessons = baseCourse.lessons.map((l) => {
      if (l.id !== selectedLessonId) return l;
      return {
        ...l,
        quiz: parsed.quiz.length > 0 ? parsed.quiz : l.quiz,
        flashcards: parsed.flashcards.length > 0 ? parsed.flashcards : l.flashcards,
      };
    });

    saveCustomCourse({ ...baseCourse, lessons: updatedLessons });
    setSavedCount({ quiz: parsed.quiz.length, flashcards: parsed.flashcards.length });
    setStep("done");
    toast.success("Đã lưu thành công!");
  };

  // ── Reset ─────────────────────────────────────────────────
  const reset = () => {
    setStep("upload");
    setParsed(null);
    setFileName("");
    setSelectedCourseId("");
    setSelectedLessonId("");
  };

  // ─────────────────────────────────────────────────────────
  return (
    <div className="container max-w-2xl py-10">
      {/* Header */}
      <div className="mb-8 opacity-0 animate-fade-up">
        <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <Upload className="h-5 w-5 text-primary" />
          </span>
          Import Quiz & Flashcard
        </h1>
        <p className="mt-2 text-muted-foreground">Upload file Excel (.xlsx) hoặc CSV để thêm câu hỏi và thẻ ghi nhớ vào bài học</p>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2 opacity-0 animate-fade-up" style={{ animationDelay: "60ms" }}>
        {["Upload file", "Gán bài học", "Hoàn tất"].map((label, i) => {
          const currentIdx = step === "upload" ? 0 : step === "assign" ? 1 : 2;
          const isActive = i === currentIdx;
          const isDone = i < currentIdx;
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className={`h-0.5 w-8 rounded-full transition-colors ${isDone ? "bg-primary" : "bg-border"}`} />}
              <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold">
                  {isDone ? "✓" : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: UPLOAD ── */}
      {step === "upload" && (
        <div className="space-y-5 opacity-0 animate-fade-up" style={{ animationDelay: "120ms" }}>
          {/* Template download */}
          <div className="rounded-2xl border-2 border-dashed border-border bg-muted/20 p-5 space-y-3">
            <p className="text-sm font-bold flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" /> Tải file mẫu để bắt đầu
            </p>
            <div className="flex flex-wrap gap-2">
              {/* Excel – both sheets */}
              <a href="/templates/template-quiz-flashcard.xlsx" download
                className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">
                <FileSpreadsheet className="h-4 w-4" />
                Excel – Quiz + Flashcard
                <span className="rounded-md bg-emerald-200/60 px-1.5 py-0.5 text-xs">.xlsx</span>
              </a>
              {/* CSV Quiz */}
              <a href="/templates/template-quiz.csv" download
                className="inline-flex items-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                <FileText className="h-4 w-4" />
                CSV – Quiz
                <span className="rounded-md bg-blue-200/60 px-1.5 py-0.5 text-xs">.csv</span>
              </a>
              {/* CSV Flashcard */}
              <a href="/templates/template-flashcard.csv" download
                className="inline-flex items-center gap-2 rounded-xl border-2 border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-100 transition-colors">
                <FileText className="h-4 w-4" />
                CSV – Flashcard
                <span className="rounded-md bg-purple-200/60 px-1.5 py-0.5 text-xs">.csv</span>
              </a>
            </div>
            {/* Format hints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-xl bg-card p-3 text-xs space-y-1">
                <p className="font-bold text-primary flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5" /> Format Quiz (CSV/Excel)</p>
                <p className="font-mono text-muted-foreground">question, optionA, optionB, optionC, optionD, correctIndex, explanation</p>
                <p className="text-muted-foreground/80">correctIndex: 0=A, 1=B, 2=C, 3=D</p>
              </div>
              <div className="rounded-xl bg-card p-3 text-xs space-y-1">
                <p className="font-bold text-secondary flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> Format Flashcard (CSV/Excel)</p>
                <p className="font-mono text-muted-foreground">front, back</p>
                <p className="text-muted-foreground/80">front = mặt trước, back = mặt sau thẻ</p>
              </div>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !isLoading && inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 transition-all duration-200 ${
              dragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5"
            } ${isLoading ? "pointer-events-none opacity-60" : ""}`}
          >
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-transform ${dragging ? "scale-110" : ""}`}>
              {isLoading ? (
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
              ) : (
                <Upload className="h-7 w-7 text-primary" />
              )}
            </div>
            <div className="text-center">
              <p className="font-semibold">{isLoading ? "Đang đọc file…" : "Kéo thả hoặc nhấn để chọn file"}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Hỗ trợ <strong>.xlsx</strong> (Excel) và <strong>.csv</strong>
              </p>
            </div>
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onInputChange} />
          </div>
        </div>
      )}

      {/* ── STEP 2: PREVIEW + ASSIGN ── */}
      {step === "assign" && parsed && (
        <div className="space-y-5 opacity-0 animate-fade-up" style={{ animationDelay: "80ms" }}>
          {/* Summary bar */}
          <div className="rounded-2xl bg-card p-5 shadow-sm flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-sm flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" /> {fileName}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {parsed.quiz.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    <HelpCircle className="h-3.5 w-3.5" /> {parsed.quiz.length} câu hỏi
                  </span>
                )}
                {parsed.flashcards.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/10 px-3 py-1 text-xs font-bold text-secondary">
                    <Layers className="h-3.5 w-3.5" /> {parsed.flashcards.length} flashcard
                  </span>
                )}
              </div>
            </div>
            <button onClick={reset} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Errors */}
          {parsed.errors.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-1">
              <p className="text-sm font-semibold text-destructive flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Cảnh báo ({parsed.errors.length} dòng bị bỏ qua)</p>
              {parsed.errors.slice(0, 5).map((e, i) => <p key={i} className="text-xs text-destructive/80 pl-6">• {e}</p>)}
              {parsed.errors.length > 5 && <p className="text-xs text-muted-foreground pl-6">…và {parsed.errors.length - 5} lỗi khác</p>}
            </div>
          )}

          {/* Preview */}
          {parsed.quiz.length > 0 && (
            <div className="rounded-2xl bg-card p-5 shadow-sm space-y-3">
              <h3 className="font-heading font-bold flex items-center gap-2"><HelpCircle className="h-4 w-4 text-primary" /> Xem trước câu hỏi</h3>
              <QuizPreview items={parsed.quiz} />
            </div>
          )}
          {parsed.flashcards.length > 0 && (
            <div className="rounded-2xl bg-card p-5 shadow-sm space-y-3">
              <h3 className="font-heading font-bold flex items-center gap-2"><Layers className="h-4 w-4 text-secondary" /> Xem trước Flashcard</h3>
              <FlashcardPreview items={parsed.flashcards} />
            </div>
          )}

          {/* Assign to lesson */}
          <div className="rounded-2xl bg-card p-6 shadow-sm space-y-4">
            <h3 className="font-heading font-bold flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Gán vào bài học</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1.5">Giáo trình</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedLessonId(""); }}
                  className="w-full rounded-xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none"
                >
                  <option value="">-- Chọn giáo trình --</option>
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {selectedCourseId && (
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Bài học</label>
                  <select
                    value={selectedLessonId}
                    onChange={(e) => setSelectedLessonId(e.target.value)}
                    className="w-full rounded-xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none"
                  >
                    <option value="">-- Chọn bài học --</option>
                    {lessons.map((l) => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {selectedCourseId && !getCustomCourses().some((c) => c.id === selectedCourseId) && (
              <p className="rounded-xl bg-secondary/10 px-4 py-2.5 text-xs font-semibold text-secondary">
                ℹ️ Bài học trong sách mặc định sẽ được lưu riêng vào bộ nhớ trình duyệt sau khi import.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="mr-2 h-4 w-4" /> Làm lại
            </Button>
            <Button
              onClick={handleSave}
              disabled={!selectedCourseId || !selectedLessonId}
              className="flex-1"
            >
              Lưu vào bài học
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: DONE ── */}
      {step === "done" && (
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-card p-10 text-center shadow-sm opacity-0 animate-scale-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h2 className="font-heading text-2xl font-bold">Import thành công! 🎉</h2>
            <p className="mt-2 text-muted-foreground">
              Đã lưu
              {savedCount.quiz > 0 && <> <strong className="text-primary">{savedCount.quiz} câu hỏi</strong></>}
              {savedCount.quiz > 0 && savedCount.flashcards > 0 && " và"}
              {savedCount.flashcards > 0 && <> <strong className="text-secondary">{savedCount.flashcards} flashcard</strong></>}
              {" "}vào bài học.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>
              <Upload className="mr-2 h-4 w-4" /> Import thêm
            </Button>
            <Button onClick={() => navigate(`/lessons/${selectedLessonId}`)}>
              Xem bài học <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
