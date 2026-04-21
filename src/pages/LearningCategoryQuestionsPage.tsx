import { useEffect, useState, useRef } from "react";
import { 
  Plus, Trash2, Edit2, Loader2, Save, ImageIcon, 
  ArrowLeft, CheckCircle2, Upload, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LearningCategory {
  id: string;
  name: string;
  description: string | null;
  general_question: string;
}

interface LearningQuestion {
  id: string;
  category_id: string;
  image_url: string;
  answer: string;
  created_at: string;
}

export default function LearningCategoryQuestionsPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  
  const [category, setCategory] = useState<LearningCategory | null>(null);
  const [questions, setQuestions] = useState<LearningQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Question Form State
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState<LearningQuestion | null>(null);
  const [questAnswer, setQuestAnswer] = useState("");
  const [questImageUrl, setQuestImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [savingQuest, setSavingQuest] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const [catData, questData] = await Promise.all([
        apiFetch<LearningCategory>(`/learning/categories/${categoryId}`),
        apiFetch<LearningQuestion[]>(`/learning/categories/${categoryId}/questions`)
      ]);
      setCategory(catData);
      setQuestions(questData);
    } catch (err: any) {
      toast.error("Không thể tải dữ liệu.");
      navigate("/games/learning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoryId]);

  const openQuestionDialog = (q?: LearningQuestion) => {
    if (q) {
      setEditQuestion(q);
      setQuestAnswer(q.answer);
      setQuestImageUrl(q.image_url);
    } else {
      setEditQuestion(null);
      setQuestAnswer("");
      setQuestImageUrl("");
    }
    setIsQuestionModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const { url } = await apiFetch<{ url: string }>("/upload", {
        method: "POST",
        body: formData,
      });
      setQuestImageUrl(url);
    } catch (err) {
      toast.error("Không thể tải ảnh lên.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveQuestion = async () => {
    if (!categoryId || !questImageUrl || !questAnswer.trim()) return;
    setSavingQuest(true);
    try {
      const payload = { 
        category_id: categoryId,
        image_url: questImageUrl,
        answer: questAnswer.trim()
      };
      if (editQuestion) {
        await apiFetch(`/learning/questions/${editQuestion.id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        toast.success("Cập nhật thông tin thành công!");
      } else {
        await apiFetch("/learning/questions", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast.success("Thêm hình ảnh mới thành công!");
      }
      setIsQuestionModalOpen(false);
      // Refresh questions
      const data = await apiFetch<LearningQuestion[]>(`/learning/categories/${categoryId}/questions`);
      setQuestions(data);
    } catch (err: any) {
      toast.error("Lỗi khi lưu: " + err.message);
    } finally {
      setSavingQuest(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Xóa hình ảnh này?")) return;
    try {
      await apiFetch(`/learning/questions/${id}`, { method: "DELETE" });
      toast.success("Đã xóa.");
      setQuestions(prev => prev.filter(q => q.id !== id));
    } catch (err: any) {
      toast.error("Lỗi khi xóa.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!category) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <button
          onClick={() => navigate("/games/learning")}
          className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted hover:bg-muted/80 transition-all hover:scale-105 active:scale-95 group"
        >
          <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight">{category.name}</h1>
              <p className="text-muted-foreground text-sm flex items-center gap-2 mt-0.5">
                Chỉnh sửa danh sách hình ảnh ({questions.length})
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => openQuestionDialog()} className="h-12 px-6 rounded-2xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 font-bold gap-2">
          <Plus className="h-5 w-5" /> Thêm hình ảnh mới
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2rem] p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-primary shrink-0">
          <ImageIcon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-emerald-900">Câu hỏi chung cho bé:</p>
          <p className="text-primary font-medium italic">"{category.general_question}"</p>
        </div>
      </div>

      {/* Questions Grid */}
      <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {questions.map((q) => (
          <div key={q.id} className="group relative bg-card border border-border rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
              <img 
                src={q.image_url} 
                alt={q.answer} 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
              />
            </div>
            <div className="p-4 bg-card/90 backdrop-blur-sm border-t border-border flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-base truncate pr-2">{q.answer}</span>
                <div className="flex gap-1">
                  <button 
                    onClick={() => openQuestionDialog(q)} 
                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteQuestion(q.id)} 
                    className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {questions.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-4 border-dashed border-muted rounded-[3rem] text-center space-y-4">
            <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-10 w-10" />
            </div>
            <div>
              <p className="text-lg font-bold text-muted-foreground">Chưa có hình ảnh nào</p>
              <p className="text-muted-foreground/60 max-w-xs mx-auto">Vui lòng thêm các hình ảnh minh họa cho bé học nhận diện trong chủ đề này.</p>
            </div>
            <Button onClick={() => openQuestionDialog()} variant="outline" className="rounded-xl">Thêm hình ảnh đầu tiên</Button>
          </div>
        )}
      </div>

      {/* Question Modal */}
      <Dialog open={isQuestionModalOpen} onOpenChange={setIsQuestionModalOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-heading tracking-tight">
              {editQuestion ? "Chỉnh sửa hình ảnh" : "Thêm hình ảnh mới"}
            </DialogTitle>
            <DialogDescription>
              Tải lên hình ảnh và nhập đáp án đúng để bé học nhận diện.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Image Upload Area */}
            <div className="space-y-2">
              <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Hình ảnh minh họa <span className="text-red-500">*</span></Label>
              <div 
                className={`relative h-48 w-full rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden
                  ${questImageUrl ? "border-primary/20 bg-emerald-50/10" : "border-border hover:border-primary/40 hover:bg-muted/40"}
                `}
              >
                {questImageUrl ? (
                  <>
                    <img 
                      src={questImageUrl} 
                      alt="Preview" 
                      className="h-full w-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        className="rounded-xl border-0"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        Thay đổi
                      </Button>
                      <Button 
                        type="button" 
                        variant="destructive" 
                        size="sm" 
                        className="rounded-xl border-0"
                        onClick={() => setQuestImageUrl("")}
                      >
                        Xóa
                      </Button>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-3 text-muted-foreground hover:text-primary transition-colors w-full h-full"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                    ) : (
                      <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-1 transition-transform hover:scale-110">
                        <Upload className="h-6 w-6" />
                      </div>
                    )}
                    <div className="text-center">
                      <span className="text-xs font-bold block uppercase tracking-wide">Tải ảnh lên</span>
                      <span className="text-[10px] opacity-60">PNG, JPG, WEBP (Tỉ lệ 1:1 là tốt nhất)</span>
                    </div>
                  </button>
                )}
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quest-ans" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Đáp án đúng <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input 
                  id="quest-ans"
                  value={questAnswer}
                  onChange={(e) => setQuestAnswer(e.target.value)}
                  placeholder="VD: Con mèo"
                  className="h-12 rounded-2xl border-2 focus:ring-4 focus:ring-primary/10 focus:border-primary font-bold pr-10"
                />
                {questAnswer.trim().length > 0 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground ml-1 italic">Vui lòng nhập đáp án chính xác nhất để hệ thống kiểm tra.</p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" className="rounded-xl px-6" onClick={() => setIsQuestionModalOpen(false)}>Hủy</Button>
            <Button 
              className="bg-primary hover:bg-primary/90 rounded-2xl px-10 font-bold shadow-lg shadow-primary/10" 
              onClick={handleSaveQuestion}
              disabled={savingQuest || uploading || !questImageUrl || !questAnswer.trim()}
            >
              {savingQuest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editQuestion ? "Cập nhật" : "Thêm hình ảnh"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
