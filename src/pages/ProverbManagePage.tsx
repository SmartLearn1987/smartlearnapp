import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Pencil, Trash2, Quote, Loader2, X, AlertCircle, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { createPortal } from "react-dom";

interface Proverb {
  id: string;
  content: string;
  level: string;
  created_at: string;
}

const LEVELS = [
  { value: "easy", label: "Dễ", short: "D", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "medium", label: "Trung bình", short: "TB", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "hard", label: "Khó", short: "K", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "extreme", label: "Cực khó", short: "CK", color: "bg-red-100 text-red-700 border-red-200" },
];

const getLevelInfo = (level: string) =>
  LEVELS.find((l) => l.value === level) ?? LEVELS[0];

interface FormState {
  content: string;
  level: string;
}
const defaultForm: FormState = { content: "", level: "easy" };

// ── Single Entry Modal ────────────────────────────────────────────────────────
function ProverbModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Proverb;
  onClose: () => void;
  onSave: (form: FormState) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? { content: initial.content, level: initial.level }
      : defaultForm
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.content.trim()) {
      setError("Vui lòng nhập nội dung câu ca dao/tục ngữ.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(form);
      onClose();
    } catch {
      setError("Đã xảy ra lỗi khi lưu.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Quote className="h-5 w-5" />
            </div>
            <h2 className="font-heading text-lg font-bold">
              {initial ? "Chỉnh sửa câu" : "Thêm câu mới"}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Nội dung <span className="text-destructive">*</span></label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4}
              placeholder="Ví dụ: Bầu ơi thương lấy bí cùng, tuy rằng khác giống nhưng chung một giàn..."
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Cấp độ (Level)</label>
            <div className="grid grid-cols-4 gap-2">
              {LEVELS.map((lv) => (
                <button
                  key={lv.value}
                  type="button"
                  onClick={() => setForm({ ...form, level: lv.value })}
                  className={`rounded-xl border py-2 text-xs font-bold transition-all
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
            <Button type="submit" disabled={saving} className="bg-primary hover:brightness-110">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {initial ? "Cập nhật" : "Tạo mới"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Bulk Entry Modal ──────────────────────────────────────────────────────────
function ProverbBulkModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (content: string, level: string) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [level, setLevel] = useState("easy");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Vui lòng nhập danh sách câu.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(content, level);
      onClose();
    } catch {
      setError("Đã xảy ra lỗi khi lưu danh sách.");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="font-heading text-lg font-bold">Thêm theo danh sách</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Nhập danh sách (mỗi câu một dòng) <span className="text-destructive">*</span></label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              placeholder="Câu ca dao 1&#10;Câu tục ngữ 2&#10;..."
              className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Cấp độ áp dụng cho cả danh sách</label>
            <div className="grid grid-cols-4 gap-2">
              {LEVELS.map((lv) => (
                <button
                  key={lv.value}
                  type="button"
                  onClick={() => setLevel(lv.value)}
                  className={`rounded-xl border py-2 text-xs font-bold transition-all
                    ${level === lv.value
                      ? lv.color + " ring-2 ring-offset-1 ring-current"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                >
                  {lv.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Hủy</Button>
            <Button type="submit" disabled={saving} className="bg-primary hover:brightness-110">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Thêm vào hệ thống
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ProverbManagePage() {
  const navigate = useNavigate();
  const [proverbs, setProverbs] = useState<Proverb[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editTarget, setEditTarget] = useState<Proverb | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleFilterChange = (val: string | null) => {
    setSelectedFilter(val);
    setCurrentPage(1);
  };

  const fetchProverbs = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Proverb[]>("/proverbs");
      setProverbs(data || []);
    } catch {
      setProverbs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProverbs(); }, []);

  const handleCreate = async (form: FormState) => {
    await apiFetch("/proverbs", { method: "POST", body: JSON.stringify(form) });
    await fetchProverbs();
  };

  const handleBulk = async (content: string, level: string) => {
    await apiFetch("/proverbs/bulk", {
      method: "POST",
      body: JSON.stringify({ content, level }),
    });
    await fetchProverbs();
  };

  const handleEdit = async (form: FormState) => {
    if (!editTarget) return;
    await apiFetch(`/proverbs/${editTarget.id}`, {
      method: "PUT",
      body: JSON.stringify(form),
    });
    await fetchProverbs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa câu này?")) return;
    try {
      await apiFetch(`/proverbs/${id}`, { method: "DELETE" });
      setProverbs((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert("Lỗi khi xóa.");
    }
  };

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button
          onClick={() => navigate("/games")}
          className="flex items-center justify-center h-10 w-10 rounded-xl bg-card border border-border hover:bg-muted transition-colors shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2 text-gray-900">
            <Quote className="h-7 w-7 text-primary" />
            Quản lý Ca dao tục ngữ
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {proverbs.length} câu trong hệ thống · Kho tàng trí tuệ dân gian
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowBulk(true)} className="rounded-xl border-primary/20 text-primary hover:bg-primary/5">
            <Layers className="h-4 w-4 mr-2" /> Thêm danh sách
          </Button>
          <Button onClick={() => setShowCreate(true)} className="rounded-xl bg-primary hover:brightness-110 shadow-lg shadow-primary/20 text-white">
            <Plus className="h-4 w-4 mr-2" /> Thêm một câu
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" /> Phân loại Cấp độ
            </h3>
            <div className="space-y-2">
              <div 
                className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${selectedFilter === null ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                onClick={() => handleFilterChange(null)}
              >
                <span className={`text-xs font-bold px-2 py-1 rounded-md border border-transparent ${selectedFilter === null ? 'text-primary' : 'text-foreground'}`}>
                  Tất cả
                </span>
                <span className="text-xs font-semibold text-muted-foreground">{proverbs.length} câu</span>
              </div>
              {LEVELS.map(lv => {
                const count = proverbs.filter(p => p.level === lv.value).length;
                return (
                  <div 
                    key={lv.value} 
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${selectedFilter === lv.value ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                    onClick={() => handleFilterChange(lv.value)}
                  >
                    <span className={`text-xs font-bold px-2 py-1 rounded-md border ${lv.color} ${selectedFilter === lv.value ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                      {lv.label}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">{count} câu</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Proverb List */}
        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-20 bg-card rounded-2xl border border-dashed border-border">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : proverbs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-3 border-2 border-dashed border-border rounded-2xl bg-muted/20">
              <Quote className="h-12 w-12 text-muted-foreground/30" />
              <p className="font-semibold text-muted-foreground">Chưa có câu nào được thêm</p>
              <p className="text-sm text-muted-foreground/60 max-w-[250px]">Bắt đầu bằng cách nhấn "Thêm một câu" hoặc "Thêm danh sách".</p>
            </div>
          ) : (() => {
              const ITEMS_PER_PAGE = 30;
              const filteredProverbs = selectedFilter ? proverbs.filter(p => p.level === selectedFilter) : proverbs;
              if (filteredProverbs.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 text-center gap-3 border-2 border-dashed border-border rounded-2xl bg-muted/20">
                      <Quote className="h-12 w-12 text-muted-foreground/30" />
                      <p className="font-semibold text-muted-foreground">Chưa có câu nào ở cấp độ này</p>
                    </div>
                  );
              }

              const totalPages = Math.ceil(filteredProverbs.length / ITEMS_PER_PAGE);
              const paginatedProverbs = filteredProverbs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

              return (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="px-4 py-4 font-semibold text-muted-foreground w-28">Cấp độ</th>
                          <th className="px-4 py-4 font-semibold text-muted-foreground min-w-[300px]">Nội dung câu</th>
                          <th className="px-4 py-4 font-semibold text-muted-foreground w-32">Ngày tạo</th>
                          <th className="px-4 py-4 text-right font-semibold text-muted-foreground w-24">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {paginatedProverbs.map((p) => {
                          const lv = getLevelInfo(p.level);
                          return (
                            <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${lv.color}`}>
                                  {lv.short} - {lv.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-base font-medium whitespace-normal leading-relaxed text-foreground">
                                {p.content}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground font-semibold">
                                {new Date(p.created_at).toLocaleDateString("vi-VN")}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditTarget(p)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-between items-center bg-card p-3 rounded-2xl border border-border mt-4">
                    <span className="text-sm font-semibold text-muted-foreground px-2">
                       Trang {currentPage} / {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="rounded-xl"
                      >
                        Trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="rounded-xl"
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              );
            })()
          }
        </div>
      </div>

      {/* Modals */}
      {showCreate && (
        <ProverbModal onClose={() => setShowCreate(false)} onSave={handleCreate} />
      )}
      {showBulk && (
        <ProverbBulkModal onClose={() => setShowBulk(false)} onSave={handleBulk} />
      )}
      {editTarget && (
        <ProverbModal
          initial={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  );
}
