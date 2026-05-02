import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, BookOpen, FileText, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import FileUploadZone from "@/components/FileUploadZone";
import { parseUploadedFile } from "@/lib/fileParser";
import { saveCustomCourse, splitTextIntoLessons, generateId, getCustomCourses, deleteCustomCourse } from "@/lib/courseStorage";
import { subjects } from "@/data/mockData";
import type { Course, Lesson } from "@/data/mockData";

export default function UploadPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"upload" | "configure" | "preview">("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState("");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjectId, setSubjectId] = useState("tieng-viet");
  const [grade, setGrade] = useState(4);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const customCourses = getCustomCourses();

  const handleFileSelected = async (file: File) => {
    setIsLoading(true);
    setFileName(file.name);
    try {
      const text = await parseUploadedFile(file);
      if (!text.trim()) {
        toast.error("Không đọc được nội dung từ file. Hãy thử file khác.");
        setIsLoading(false);
        return;
      }
      setRawText(text);
      setTitle(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
      setStep("configure");
      toast.success(`Đã đọc ${text.length.toLocaleString()} ký tự từ "${file.name}"`);
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi đọc file");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateLessons = () => {
    const generated = splitTextIntoLessons(rawText, title);
    setLessons(generated);
    setStep("preview");
    toast.success(`Tạo được ${generated.length} bài học`);
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên giáo trình");
      return;
    }

    const course: Course = {
      id: generateId(),
      subjectId,
      title: title.trim(),
      description: description.trim() || `Giáo trình từ file: ${fileName}`,
      grade,
      semester: 1,
      publisher: "Tự tạo",
      lessons,
    };

    saveCustomCourse(course);
    toast.success("Đã lưu giáo trình thành công!");
    navigate(`/courses/${course.id}`);
  };

  const handleDeleteCourse = (courseId: string) => {
    deleteCustomCourse(courseId);
    toast.success("Đã xóa giáo trình");
    // Force re-render
    window.location.reload();
  };

  const handleRemoveLesson = (index: number) => {
    setLessons((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="container py-10">
      <Link to="/subjects" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </Link>

      <div className="mb-8 opacity-0 animate-fade-up">
        <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
          <Plus className="h-8 w-8 text-primary" />
          Tạo giáo trình mới
        </h1>
        <p className="mt-2 text-muted-foreground">Upload file PDF, Word hoặc TXT để tự động tạo bài học</p>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2 opacity-0 animate-fade-up" style={{ animationDelay: "60ms" }}>
        {["Upload file", "Cấu hình", "Xem trước"].map((label, i) => {
          const stepIdx = i;
          const currentIdx = step === "upload" ? 0 : step === "configure" ? 1 : 2;
          const isActive = stepIdx === currentIdx;
          const isDone = stepIdx < currentIdx;
          return (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className={`h-0.5 w-8 rounded-full ${isDone ? "bg-primary" : "bg-border"}`} />}
              <div className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current/10 text-xs font-bold">
                  {isDone ? "✓" : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <FileUploadZone onFileSelected={handleFileSelected} isLoading={isLoading} />

          <div className="rounded-xl bg-muted/50 p-5">
            <h3 className="font-semibold mb-2">📋 Hỗ trợ định dạng</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• <strong>PDF</strong> – Sách giáo khoa, tài liệu scan</li>
              <li>• <strong>DOCX/DOC</strong> – File Word</li>
              <li>• <strong>TXT</strong> – File văn bản thuần</li>
            </ul>
          </div>

          {/* Existing custom courses */}
          {customCourses.length > 0 && (
            <div>
              <h3 className="font-heading text-lg font-bold mb-3">Giáo trình đã tạo</h3>
              <div className="space-y-3">
                {customCourses.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Link to={`/courses/${c.id}`} className="font-semibold hover:text-primary transition-colors truncate block">{c.title}</Link>
                      <p className="text-xs text-muted-foreground">{c.lessons.length} bài học • {c.publisher}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteCourse(c.id)} className="shrink-0 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Configure */}
      {step === "configure" && (
        <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="rounded-2xl bg-card p-6 shadow-sm space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2">Tên giáo trình *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Tiếng Việt Lớp 4 Tập 2"
                className="w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-sm font-medium transition-colors focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Mô tả</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả ngắn về giáo trình..."
                rows={2}
                className="w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-sm transition-colors focus:border-primary focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Môn học</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-sm font-medium transition-colors focus:border-primary focus:outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Lớp</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-sm font-medium transition-colors focus:border-primary focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((g) => (
                    <option key={g} value={g}>Lớp {g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content preview */}
            <div>
              <label className="block text-sm font-semibold mb-2">Nội dung đã đọc ({rawText.length.toLocaleString()} ký tự)</label>
              <div className="max-h-40 overflow-y-auto rounded-xl bg-muted p-4 text-sm text-muted-foreground whitespace-pre-wrap">
                {rawText.slice(0, 2000)}
                {rawText.length > 2000 && "..."}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("upload")}>Quay lại</Button>
            <Button onClick={handleGenerateLessons} className="flex-1">
              <Sparkles className="mr-2 h-4 w-4" />
              Tạo bài học từ nội dung
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <div className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <div className="rounded-2xl bg-card p-6 shadow-sm">
            <h3 className="font-heading text-lg font-bold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{lessons.length} bài học được tạo</p>

            <div className="space-y-3">
              {lessons.map((lesson, i) => (
                <div key={lesson.id} className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground">{lesson.content.length} đoạn nội dung</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveLesson(i)} className="shrink-0">
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-secondary/5 border-2 border-secondary/10 p-5">
            <p className="text-sm font-semibold text-secondary">⚠️ Dữ liệu offline</p>
            <p className="mt-1 text-sm text-muted-foreground">Giáo trình sẽ được lưu trên trình duyệt. Dữ liệu sẽ mất nếu bạn xóa cache trình duyệt.</p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("configure")}>Quay lại</Button>
            <Button onClick={handleSave} className="flex-1" disabled={lessons.length === 0}>
              <BookOpen className="mr-2 h-4 w-4" />
              Lưu giáo trình ({lessons.length} bài)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
