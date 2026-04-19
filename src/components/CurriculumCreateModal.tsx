import { useState } from "react";
import { Plus, ArrowLeft, Upload, ImagePlus, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

 interface CurriculumCreateModalProps {
   subjectId: string;
   subjectName: string;
   subjectIcon?: string;
   editingCurriculum?: any; // To avoid deep interface dependency issues
   onSuccess: () => void;
   onCancel: () => void;
 }

 export default function CurriculumCreateModal({ 
   subjectId, 
   subjectName, 
   subjectIcon, 
   editingCurriculum,
   onSuccess, 
   onCancel 
 }: CurriculumCreateModalProps) {
   const { user } = useAuth();
   const [step, setStep] = useState<"config" | "preview">("config");
   const [isLoading, setIsLoading] = useState(false);
 
   // Form state
   const [name, setName] = useState(editingCurriculum?.name || "");
   const [grade, setGrade] = useState(editingCurriculum?.grade || "");
   const [publisher, setPublisher] = useState(editingCurriculum?.publisher || "");
   const [educationLevel, setEducationLevel] = useState(editingCurriculum?.education_level || "");
   const [isPublic, setIsPublic] = useState(editingCurriculum?.is_public ?? false);
   const [lessonCount, setLessonCount] = useState(editingCurriculum?.lesson_count || 5);
   const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
   const [coverImageUrl, setCoverImageUrl] = useState<string | null>(editingCurriculum?.image_url || null);
   const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Vui lòng nhập tên giáo trình");
      setStep("config");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      let finalImageUrl = null;
      
      // 1. Upload cover image if exists
      if (coverImageFile) {
        const coverFormData = new FormData();
        coverFormData.append("file", coverImageFile);
        const uploadRes = await apiFetch<{ url: string }>("/upload", {
          method: "POST",
          body: coverFormData,
        });
        finalImageUrl = uploadRes.url;
      }

       // 2. Save curriculum
       if (editingCurriculum) {
         // Update existing
         await apiFetch(`/curricula/${editingCurriculum.id}`, {
           method: "PUT",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({
             name: name.trim(),
             grade: grade.trim(),
             education_level: educationLevel,
             is_public: isPublic,
             publisher: publisher.trim(),
             lesson_count: lessonCount,
             image_url: finalImageUrl || editingCurriculum.image_url,
           }),
         });
         toast.success("Đã cập nhật giáo trình thành công");
       } else {
         // Create new
         const formData = new FormData();
         formData.set("subject_id", subjectId);
         if (finalImageUrl) formData.set("image_url", finalImageUrl);
         formData.set("name", name.trim());
         formData.set("grade", grade.trim());
         formData.set("education_level", educationLevel);
         formData.set("is_public", String(isPublic));
         formData.set("publisher", publisher.trim());
         formData.set("lesson_count", String(lessonCount));
         formData.set("created_by", user?.id || "");
         
         await apiFetch("/curricula", {
           method: "POST",
           body: formData,
         });
         toast.success("Đã tạo giáo trình mới thành công");
       }
       onSuccess();
    } catch (err: any) {
      setError(err?.message || "Lỗi khi lưu giáo trình");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-h-[90dvh] w-[95vw] sm:w-full overflow-y-auto custom-scrollbar max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
             <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xl shadow-inner">
               {subjectIcon || "📖"}
             </div>
             <div>
               <DialogTitle className="text-xl font-bold">
                 {editingCurriculum ? "Chỉnh sửa giáo trình" : "Tạo giáo trình mới"}
               </DialogTitle>
               <DialogDescription className="text-xs font-semibold uppercase tracking-wider text-primary/70">
                 Môn học: {subjectName}
               </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        {/* Steps Indicator */}
        <div className="mb-6 flex items-center gap-2">
          {[
            { id: "config", label: "Cấu hình" },
            { id: "preview", label: "Xem trước" }
          ].map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <span className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-300 ${
                step === s.id 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {i + 1}. {s.label}
              </span>
              {i < 1 && <span className="text-muted-foreground/30 text-xs">─</span>}
            </div>
          ))}
        </div>

        {/* Step: Config */}
        {step === "config" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 ml-1">Chế độ hiển thị</label>
                <select 
                  value={isPublic ? "true" : "false"} 
                  onChange={e => setIsPublic(e.target.value === "true")}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                >
                  <option value="false">🔒 Không công khai (Cá nhân)</option>
                  <option value="true">🌍 Công khai (Mọi người)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 ml-1">Cấp độ</label>
                <select 
                  value={educationLevel} 
                  onChange={e => setEducationLevel(e.target.value)}
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                >
                  <option value="">Chọn cấp độ</option>
                  <option value="Tiểu học">🏫 Tiểu học</option>
                  <option value="Trung học cơ sở">🏫 Trung học cơ sở</option>
                  <option value="Trung học Phổ Thông">🏫 Trung học Phổ Thông</option>
                  <option value="Đại Học / Cao Đẳng">🎓 Đại Học / Cao Đẳng</option>
                  <option value="Luyện thi chứng chỉ">✨ Luyện thi chứng chỉ</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80 ml-1">Tên giáo trình</label>
              <input 
                value={name} 
                onChange={e => setName(e.target.value)}
                placeholder="VD: Tiếng Việt 4 - Kết nối tri thức"
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 ml-1">Lớp</label>
                <input 
                  value={grade} 
                  onChange={e => setGrade(e.target.value)} 
                  placeholder="VD: 4"
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground/80 ml-1">Nhà xuất bản</label>
                <input 
                  value={publisher} 
                  onChange={e => setPublisher(e.target.value)} 
                  placeholder="VD: NXB Giáo dục"
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80 ml-1">Số lượng bài học dự kiến</label>
              <input 
                type="number" 
                value={lessonCount} 
                onChange={e => setLessonCount(Math.max(1, parseInt(e.target.value) || 1))} 
                min={1} 
                max={100}
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground/80 ml-1 block mb-1">Ảnh bìa giáo trình</label>
              {!coverImageUrl ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer bg-muted/20 hover:bg-muted/40 hover:border-primary/50 transition-all duration-300">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImagePlus className="w-8 h-8 mb-2 text-primary/40" />
                    <p className="text-sm text-muted-foreground font-medium">Click để tải ảnh lên</p>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-1">Hỗ trợ JPG, PNG, WEBP</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const file = e.target.files[0];
                        setCoverImageFile(file);
                        setCoverImageUrl(URL.createObjectURL(file));
                      }
                    }} 
                  />
                </label>
              ) : (
                <div className="relative group rounded-2xl overflow-hidden border-2 border-primary/20 bg-muted/50 p-2 w-48 mx-auto">
                  <img src={coverImageUrl} alt="Preview" className="h-32 w-full object-cover rounded-xl shadow-sm" />
                  <button
                    onClick={() => {
                      setCoverImageFile(null);
                      setCoverImageUrl(null);
                    }}
                    className="absolute top-3 right-3 rounded-full bg-destructive shadow-lg p-1.5 text-white hover:scale-110 active:scale-95 transition-all"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive animate-in fade-in zoom-in duration-200">
                ⚠️ {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-6">
              <Button variant="outline" onClick={onCancel} className="w-full sm:flex-1 rounded-xl h-11 font-bold">Hủy</Button>
              <Button onClick={() => setStep("preview")} className="w-full sm:flex-1 rounded-xl h-11 font-bold shadow-lg shadow-primary/20">
                Tiếp tục: Xem trước →
              </Button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="rounded-2xl border bg-muted/30 p-6 space-y-4">
              <div className="flex items-start gap-5">
                <div className="h-24 w-24 shrink-0 rounded-2xl overflow-hidden border-2 border-primary/10 bg-muted shadow-sm">
                  {coverImageUrl ? (
                    <img src={coverImageUrl} alt="Cover" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/5 text-primary/30">
                      <BookOpen className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <h3 className="font-bold text-xl text-primary break-words">{name || "Chưa đặt tên"}</h3>
                  <p className="text-sm font-semibold text-muted-foreground">{publisher || "Chưa chọn NXB"}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary italic">
                      Lớp {grade || "?"}
                    </span>
                    <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600">
                      {educationLevel || "Chưa chọn cấp độ"}
                    </span>
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${isPublic ? "bg-sky-500/10 text-sky-600" : "bg-muted text-muted-foreground"}`}>
                      {isPublic ? "Công khai" : "Riêng tư"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Môn học</p>
                  <p className="text-sm font-bold">{subjectName}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Số bài học</p>
                  <p className="text-sm font-bold">{lessonCount} bài</p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive animate-in fade-in zoom-in duration-200">
                ⚠️ {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2 pb-6">
              <Button variant="ghost" onClick={() => setStep("config")} disabled={isLoading} className="w-full sm:w-auto rounded-xl h-11 font-bold">
                ← Quay lại sửa
              </Button>
              <Button onClick={handleSave} disabled={isLoading} className="flex-1 rounded-xl h-11 font-bold shadow-lg shadow-primary/20">
                {isLoading ? (
                  <div className="flex items-center gap-2 justify-center">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Đang lưu...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Upload className="h-4 w-4 mr-2" />
                    Xác nhận & Lưu giáo trình
                  </div>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
