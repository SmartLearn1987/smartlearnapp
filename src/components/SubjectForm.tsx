import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSubjectIcons } from "@/lib/subjectStorage";
import { apiFetch } from "@/lib/api";

type SubjectLike = {
  id?: string;
  name?: string;
  description?: string;
  icon?: string;
} | null;

interface SubjectFormProps {
  subject: SubjectLike;
  onSave: () => void;
  onCancel: () => void;
}

export default function SubjectForm({ subject, onSave, onCancel }: SubjectFormProps) {
  const [open, setOpen] = useState(true);
  const icons = useMemo(() => getSubjectIcons(), []);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState(icons[0] ?? "📖");
  const [error, setError] = useState<string>("");
  const isEditing = Boolean(subject?.id);

  useEffect(() => {
    setName(subject?.name ?? "");
    setDescription(subject?.description ?? "");
    setIcon(subject?.icon ?? icons[0] ?? "📖");
  }, [subject, icons]);

  const handleClose = () => {
    setOpen(false);
    onCancel();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      icon,
    };
    try {
      if (isEditing && subject?.id) {
        await apiFetch(`/subjects/${subject.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
    } catch (e: any) {
      setError(e?.message || "Không thể lưu môn học");
      return;
    }

    setOpen(false);
    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : handleClose())}>
      <DialogContent className="max-h-[85dvh] w-[95vw] sm:w-full overflow-y-auto custom-scrollbar pt-12 sm:pt-6 pb-8">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Chỉnh sửa môn học" : "Thêm môn học"}</DialogTitle>
          <DialogDescription>Điền thông tin môn học và chọn biểu tượng.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-semibold">Tên môn học</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
              placeholder="VD: Tiếng Việt"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold">Mô tả</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[90px] w-full resize-y rounded-xl border bg-background px-4 py-2.5 text-sm"
              placeholder="VD: Học đọc, viết và ngữ pháp..."
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">Biểu tượng</label>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
              {icons.map((it) => (
                <button
                  key={it}
                  type="button"
                  onClick={() => setIcon(it)}
                  className={`flex h-10 items-center justify-center rounded-xl border text-lg transition ${
                    icon === it ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/50"
                  }`}
                  aria-label={`Chọn biểu tượng ${it}`}
                >
                  {it}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:flex-1 h-11 rounded-xl font-semibold border-red-500 text-red-500 hover:bg-red-50">
              Hủy
            </Button>
            <Button type="submit" className="w-full sm:flex-1 h-11 rounded-xl font-semibold shadow-lg shadow-primary/20">
              {isEditing ? "Lưu thay đổi" : "Thêm môn học"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

