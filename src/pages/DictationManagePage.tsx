import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Pencil, Trash2, BookText, Loader2, X, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { createPortal } from "react-dom";

type Level = "easy" | "medium" | "hard" | "extreme";
type Language = "vi" | "en" | "ja";

interface DictationExercise {
  id: string;
  title: string;
  level: Level;
  language: Language;
  content: string;
  authorName?: string;
  created_at: string;
}

const LEVELS: { value: Level; label: string; color: string }[] = [
  { value: "easy",    label: "Dễ",        color: "bg-green-100 text-green-700 border-green-200" },
  { value: "medium",  label: "Trung bình", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "hard",    label: "Khó",        color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "extreme", label: "Cực khó",    color: "bg-red-100 text-red-700 border-red-200" },
];

const LANGUAGES: { value: Language; label: string; flag: string }[] = [
  { value: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { value: "en", label: "Tiếng Anh",   flag: "🇺🇸" },
  { value: "ja", label: "Tiếng Nhật",  flag: "🇯🇵" },
];

const getLevelInfo = (level: Level) =>
  LEVELS.find((l) => l.value === level) ?? LEVELS[1];

interface FormState {
  title: string;
  level: Level;
  language: Language;
  content: string;
}
const defaultForm: FormState = { title: "", level: "medium", language: "vi", content: "" };

// ── Modal ─────────────────────────────────────────────────────────────────────
function DictationModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: DictationExercise;
  onClose: () => void;
  onSave: (form: FormState) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? { title: initial.title, level: initial.level, language: initial.language ?? "vi", content: initial.content }
      : defaultForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError("Vui lòng điền đầy đủ Tiêu đề và Nội dung.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(form);
      onClose();
    } catch {
      setError("Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <BookText className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-heading text-lg font-bold">
              {initial ? "Chỉnh sửa bài chính tả" : "Tạo bài chính tả mới"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">
              Tiêu đề <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Nhập tiêu đề bài chính tả..."
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Level */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">
              Cấp độ <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {LEVELS.map((lv) => (
                <button
                  key={lv.value}
                  type="button"
                  onClick={() => setForm({ ...form, level: lv.value })}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all
                    ${form.level === lv.value
                      ? lv.color + " ring-2 ring-offset-1 ring-current"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                >
                  {lv.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">
              Ngôn ngữ <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => setForm({ ...form, language: lang.value })}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all flex items-center justify-center gap-1.5
                    ${
                      form.language === lang.value
                        ? "bg-primary/10 text-primary border-primary/40 ring-2 ring-offset-1 ring-primary/40"
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                >
                  <span className="text-sm">{lang.flag}</span> {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">
              Nội dung <span className="text-destructive">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              placeholder="Nhập đoạn văn học sinh sẽ phải chép lại..."
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Hủy
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Đang lưu...</>
              ) : (
                initial ? "Cập nhật" : "Tạo mới"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DictationManagePage() {
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<DictationExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<DictationExercise | null>(null);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<DictationExercise[]>("/dictation");
      setExercises(data || []);
    } catch {
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExercises(); }, []);

  const handleCreate = async (form: FormState) => {
    await apiFetch("/dictation", { method: "POST", body: JSON.stringify(form) });
    await fetchExercises();
  };

  const handleEdit = async (form: FormState) => {
    if (!editTarget) return;
    await apiFetch(`/dictation/${editTarget.id}`, {
      method: "PUT",
      body: JSON.stringify(form),
    });
    await fetchExercises();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa bài chính tả này?")) return;
    await apiFetch(`/dictation/${id}`, { method: "DELETE" });
    setExercises((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/games")}
          className="flex items-center justify-center h-9 w-9 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <BookText className="h-6 w-6 text-primary" />
            Chép chính tả
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {exercises.length} bài · Luyện nghe và viết tiếng Việt chuẩn xác
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Tạo bài mới
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3 border-2 border-dashed border-border rounded-2xl">
          <BookText className="h-12 w-12 text-muted-foreground/40" />
          <p className="font-semibold text-muted-foreground">Chưa có bài chính tả nào</p>
          <p className="text-sm text-muted-foreground/70">Nhấn "Tạo bài mới" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-8">
          {LANGUAGES.map((lang) => {
            const byLang = exercises.filter((e) => (e.language ?? "vi") === lang.value);
            if (byLang.length === 0) return null;
            return (
              <div key={lang.value}>
                {/* Language Header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{lang.flag}</span>
                  <h2 className="font-heading text-lg font-bold">{lang.label}</h2>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                    {byLang.length} bài
                  </span>
                </div>
                {/* Level sub-groups */}
                <div className="space-y-5 pl-2 border-l-2 border-border ml-4">
                  {LEVELS.map((lv) => {
                    const byLevel = byLang.filter((e) => e.level === lv.value);
                    if (byLevel.length === 0) return null;
                    return (
                      <div key={lv.value}>
                        <div className="flex items-center gap-2 mb-2 -ml-2">
                          <span className={`rounded-md border px-2.5 py-0.5 text-xs font-bold ${lv.color}`}>
                            {lv.label}
                          </span>
                          <span className="text-xs text-muted-foreground">{byLevel.length} bài</span>
                        </div>
                        <div className="space-y-2">
                          {byLevel.map((ex, i) => (
                            <div
                              key={ex.id}
                              className="flex items-start gap-4 rounded-2xl bg-card border border-border px-5 py-4 shadow-sm opacity-0 animate-fade-up"
                              style={{ animationDelay: `${i * 50}ms`, animationFillMode: "forwards" }}
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs">
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-sm">{ex.title}</span>
                                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                                  {ex.content}
                                </p>
                                <p className="text-xs text-muted-foreground/50 mt-1">
                                  {new Date(ex.created_at).toLocaleDateString("vi-VN")}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={() => setEditTarget(ex)}>
                                  <Pencil className="h-3.5 w-3.5" /> Sửa
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(ex.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <DictationModal onClose={() => setShowCreate(false)} onSave={handleCreate} />
      )}
      {editTarget && (
        <DictationModal
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  );
}
