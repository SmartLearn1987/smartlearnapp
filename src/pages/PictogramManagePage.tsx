import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Pencil, Trash2, ImageIcon, Loader2, X, AlertCircle, Upload, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { createPortal } from "react-dom";
import { toast } from "sonner";

type Level = "easy" | "medium" | "hard" | "extreme";

interface PictogramQuestion {
  id: string;
  image_url: string;
  answer: string;
  level: Level;
  authorName?: string;
  created_at: string;
}

const LEVELS: { value: Level; label: string; color: string; activeColor: string }[] = [
  { value: "easy",    label: "Dễ",        color: "bg-green-50 text-green-700 border-green-200", activeColor: "bg-green-100 border-green-500 text-green-800 ring-green-500/20" },
  { value: "medium",  label: "Trung bình", color: "bg-blue-50 text-blue-700 border-blue-200", activeColor: "bg-blue-100 border-blue-500 text-blue-800 ring-blue-500/20" },
  { value: "hard",    label: "Khó",        color: "bg-orange-50 text-orange-700 border-orange-200", activeColor: "bg-orange-100 border-orange-500 text-orange-800 ring-orange-500/20" },
  { value: "extreme", label: "Cực khó",    color: "bg-red-50 text-red-700 border-red-200", activeColor: "bg-red-100 border-red-500 text-red-800 ring-red-500/20" },
];

const getLevelInfo = (level: Level) =>
  LEVELS.find((l) => l.value === level) ?? LEVELS[1];

interface FormState {
  image_url: string;
  answer: string;
  level: Level;
}

const defaultForm: FormState = { image_url: "", answer: "", level: "medium" };

// ── Modal ─────────────────────────────────────────────────────────────────────
function PictogramModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: PictogramQuestion;
  onClose: () => void;
  onSave: (form: FormState) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? { image_url: initial.image_url, answer: initial.answer, level: initial.level }
      : defaultForm
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
        // Don't set Content-Type header when sending FormData, the browser will set it with boundary
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setForm({ ...form, image_url: data.url });
    } catch (err) {
      setError("Không thể tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.image_url) {
      setError("Vui lòng tải lên hình ảnh.");
      return;
    }
    if (!form.answer.trim()) {
      setError("Vui lòng nhập đáp án.");
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
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-heading text-lg font-bold">
              {initial ? "Chỉnh sửa câu hỏi" : "Thêm câu hỏi mới"}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Level Selection */}
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Cấp độ <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {LEVELS.map((lv) => (
                <button
                  key={lv.value}
                  type="button"
                  onClick={() => setForm({ ...form, level: lv.value })}
                  className={`rounded-xl border-2 px-3 py-3 text-xs font-bold transition-all text-center
                    ${form.level === lv.value
                      ? lv.activeColor + " ring-4"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:border-muted-foreground/20"
                    }`}
                >
                  {lv.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Hình ảnh <span className="text-destructive">*</span>
            </label>
            <div 
              className={`relative h-48 w-full rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden
                ${form.image_url ? "border-primary/20 bg-muted/20" : "border-border hover:border-primary/40 hover:bg-muted/40"}
              `}
            >
              {form.image_url ? (
                <>
                  <img 
                    src={form.image_url} 
                    alt="Preview" 
                    className="h-full w-full object-contain p-2"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      Thay đổi
                    </Button>
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => setForm({ ...form, image_url: "" })}
                    >
                      Xóa
                    </Button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 text-muted-foreground"
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                  ) : (
                    <Upload className="h-10 w-10 text-muted-foreground/40" />
                  )}
                  <span className="text-xs font-medium">Click để tải lên hình ảnh (.jpg, .png, .webp)</span>
                </button>
              )}
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*.webp,image/jpeg,image/png" 
                className="hidden" 
                onChange={handleFileUpload}
              />
            </div>
          </div>

          {/* Answer */}
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Đáp án <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value.toUpperCase() })}
                placeholder="NHẬP ĐÁP ÁN..."
                className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-lg font-bold tracking-widest placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all uppercase"
              />
              {form.answer.trim().length > 0 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground ml-1">Hệ thống sẽ tự động chuyển về dạng viết hoa.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Hủy bỏ
            </Button>
            <Button type="submit" disabled={saving || uploading} className="px-8 flex gap-2">
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin text-white" />Đang lưu...</>
              ) : (
                initial ? "Cập nhật câu hỏi" : "Tạo câu hỏi"
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
export default function PictogramManagePage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<PictogramQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<PictogramQuestion | null>(null);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<PictogramQuestion[]>("/pictogram");
      setQuestions(data || []);
    } catch {
      setQuestions([]);
      toast.error("Không thể tải danh sách câu hỏi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuestions(); }, []);

  const handleCreate = async (form: FormState) => {
    await apiFetch("/pictogram", { method: "POST", body: JSON.stringify(form) });
    toast.success("Đã tạo câu hỏi thành công!");
    await fetchQuestions();
  };

  const handleEdit = async (form: FormState) => {
    if (!editTarget) return;
    await apiFetch(`/pictogram/${editTarget.id}`, {
      method: "PUT",
      body: JSON.stringify(form),
    });
    toast.success("Đã cập nhật câu hỏi!");
    await fetchQuestions();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) return;
    try {
      await apiFetch(`/pictogram/${id}`, { method: "DELETE" });
      toast.success("Đã xóa câu hỏi.");
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch {
      toast.error("Lỗi khi xóa câu hỏi.");
    }
  };

  const groupedByLevel = LEVELS.reduce((acc, lv) => {
    acc[lv.value] = questions.filter(q => q.level === lv.value);
    return acc;
  }, {} as Record<Level, PictogramQuestion[]>);

  return (
    <div className="container max-w-5xl py-8 space-y-8 min-h-screen pb-20">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <button
          onClick={() => navigate("/games")}
          className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted hover:bg-muted/80 transition-all hover:scale-105 active:scale-95 group"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight">
                Đuổi hình bắt chữ
              </h1>
              <p className="text-muted-foreground text-sm flex items-center gap-2 mt-0.5">
                Quản lý kho câu hỏi hình ảnh · <span className="font-bold text-primary">{questions.length}</span> câu hỏi
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)} className="h-12 px-6 rounded-2xl shadow-lg shadow-primary/20 flex gap-2 font-bold animate-fade-in group">
          <div className="bg-white/20 p-1 rounded-lg transition-transform group-hover:rotate-90">
            <Plus className="h-4 w-4" />
          </div>
          Thêm câu hỏi mới
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium animate-pulse">Đang tải kho câu hỏi...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-4 border-4 border-dashed border-muted rounded-3xl animate-in fade-in zoom-in duration-500">
          <div className="h-24 w-24 bg-muted/50 rounded-full flex items-center justify-center mb-2">
            <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-xl font-bold text-muted-foreground">Chưa có câu hỏi nào</p>
            <p className="text-muted-foreground/70 mt-1 max-w-xs mx-auto">Nhấn "Thêm câu hỏi mới" để bắt đầu xây dựng nội dung cho trò chơi Đuổi hình bắt chữ.</p>
          </div>
          <Button variant="outline" onClick={() => setShowCreate(true)} className="mt-2 rounded-xl">
            Bắt đầu tạo ngay
          </Button>
        </div>
      ) : (
        <div className="space-y-12">
          {LEVELS.map((levelInfo) => {
            const list = groupedByLevel[levelInfo.value];
            if (list.length === 0) return null;
            return (
              <div key={levelInfo.value} className="space-y-6">
                {/* Level Header */}
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm ${levelInfo.color}`}>
                    {levelInfo.label}
                  </div>
                  <div className="h-px bg-gradient-to-r from-muted to-transparent flex-1" />
                  <span className="text-xs font-bold text-muted-foreground/50">{list.length} CÂU HỎI</span>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((q, i) => (
                    <div
                      key={q.id}
                      className="group relative flex flex-col bg-card border-2 border-border rounded-3xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-xl hover:border-primary/20 hover:-translate-y-1"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      {/* Image Area */}
                      <div className="relative h-48 bg-muted/30 overflow-hidden flex items-center justify-center p-4">
                        <img
                          src={q.image_url}
                          alt={q.answer}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur shadow-sm px-2.5 py-1 rounded-lg text-[10px] font-bold text-gray-500 uppercase">
                          No. {i + 1}
                        </div>
                      </div>

                      {/* Content Area */}
                      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Đáp án</div>
                          <div className="font-heading text-lg font-black text-foreground tracking-widest uppercase truncate bg-muted/40 px-3 py-2 rounded-xl border border-border/10">
                            {q.answer}
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-medium">Người tạo</span>
                            <span className="text-xs font-bold">{q.authorName || "Hệ thống"}</span>
                          </div>
                          <div className="flex gap-1.5">
                            <Button
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl bg-muted/50 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              onClick={() => setEditTarget(q)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 rounded-xl bg-muted/50 hover:bg-red-50 hover:text-red-600 transition-colors text-muted-foreground"
                              onClick={() => handleDelete(q.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <PictogramModal onClose={() => setShowCreate(false)} onSave={handleCreate} />
      )}
      {editTarget && (
        <PictogramModal
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  );
}
