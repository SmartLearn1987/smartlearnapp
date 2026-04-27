import { useEffect, useState } from "react";
import { 
  Plus, Trash2, Edit2, Loader2, Save, ImageIcon, 
  ArrowLeft, LayoutGrid, ChevronRight, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
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
import { Textarea } from "@/components/ui/textarea";

interface LearningCategory {
  id: string;
  name: string;
  description: string | null;
  general_question: string;
  item_count?: number;
  created_at: string;
}

export default function LearningManagePage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<LearningCategory[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Category Form State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<LearningCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catGenQuest, setCatGenQuest] = useState("Mẹ đố bé đây là gì?");
  const [savingCat, setSavingCat] = useState(false);

  const fetchCategories = async () => {
    try {
      const data = await apiFetch<LearningCategory[]>("/learning/categories");
      setCategories(data);
    } catch (err: any) {
      toast.error("Không thể tải danh sách chủ đề.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSaveCategory = async () => {
    if (!catName.trim() || !catGenQuest.trim()) return;
    setSavingCat(true);
    try {
      const payload = { 
        name: catName, 
        description: catDesc, 
        general_question: catGenQuest 
      };
      if (editCategory) {
        await apiFetch(`/learning/categories/${editCategory.id}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        toast.success("Cập nhật chủ đề thành công!");
      } else {
        await apiFetch("/learning/categories", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast.success("Tạo chủ đề mới thành công!");
      }
      setIsCategoryModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error("Lỗi khi lưu chủ đề: " + err.message);
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa chủ đề này và tất cả các câu hỏi bên trong?")) return;
    try {
      await apiFetch(`/learning/categories/${id}`, { method: "DELETE" });
      toast.success("Đã xóa chủ đề.");
      fetchCategories();
    } catch (err: any) {
      toast.error("Lỗi khi xóa chủ đề.");
    }
  };

  const openCategoryDialog = (cat?: LearningCategory) => {
    if (cat) {
      setEditCategory(cat);
      setCatName(cat.name);
      setCatDesc(cat.description || "");
      setCatGenQuest(cat.general_question);
    } else {
      setEditCategory(null);
      setCatName("");
      setCatDesc("");
      setCatGenQuest("Mẹ đố bé đây là gì?");
    }
    setIsCategoryModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in pb-20">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight">Học cùng bé</h1>
              <p className="text-muted-foreground text-sm flex items-center gap-2 mt-0.5">
                Quản lý các chủ đề học tập và nhận diện hình ảnh cho bé
              </p>
            </div>
          </div>
        </div>
        <Button onClick={() => openCategoryDialog()} className="h-12 px-6 rounded-2xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 font-bold gap-2">
          <Plus className="h-5 w-5" /> Thêm chủ đề mới
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <div 
            key={cat.id}
            className="group relative bg-card border border-border rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            onClick={() => navigate(`/games/learning/${cat.id}`)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-primary group-hover:scale-110 transition-transform">
                <LayoutGrid className="h-6 w-6" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg hover:bg-emerald-100 hover:text-primary"
                  onClick={(e) => { e.stopPropagation(); openCategoryDialog(cat); }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg hover:bg-red-100 hover:text-red-700"
                  onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-heading text-xl font-bold group-hover:text-primary transition-colors">{cat.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">{cat.description || "Chưa có mô tả cho chủ đề này."}</p>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <ImageIcon className="h-3.5 w-3.5" />
                <span>{cat.item_count || 0} Hình ảnh</span>
              </div>
              <div className="flex items-center gap-1 text-primary text-sm font-bold opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                Chi tiết <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center border-4 border-dashed border-muted rounded-[3rem] text-center space-y-4">
            <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center text-muted-foreground">
              <LayoutGrid className="h-10 w-10" />
            </div>
            <div>
              <p className="text-lg font-bold text-muted-foreground">Chưa có chủ đề nào</p>
              <p className="text-muted-foreground/60 max-w-xs mx-auto">Bắt đầu bằng cách thêm các chủ đề như Chữ cái, Con vật, Rau củ quả...</p>
            </div>
            <Button onClick={() => openCategoryDialog()} variant="outline" className="rounded-xl">Thêm chủ đề đầu tiên</Button>
          </div>
        )}
      </div>

      {/* Category Edit/Create Dialog */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-heading">
              {editCategory ? "Chỉnh sửa chủ đề" : "Chủ đề mới cho bé"}
            </DialogTitle>
            <DialogDescription>
              Thiết lập các thông tin cơ bản cho nhóm học tập này.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Tên chủ đề <span className="text-red-500">*</span></Label>
              <Input 
                id="cat-name"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="VD: Thế giới động vật"
                className="h-12 rounded-2xl border-2 focus:ring-4 focus:ring-primary/10 focus:border-primary font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-quest" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Câu hỏi chung <span className="text-red-500">*</span></Label>
              <Input 
                id="cat-quest"
                value={catGenQuest}
                onChange={(e) => setCatGenQuest(e.target.value)}
                placeholder="VD: Mẹ đố bé đây là gì?"
                className="h-12 rounded-2xl border-2 focus:ring-4 focus:ring-primary/10 focus:border-primary"
              />
              <p className="text-[10px] text-muted-foreground ml-1 italic">Đây là câu hỏi người dẫn (hoặc AI) sẽ hỏi bé cho mọi hình ảnh trong chủ đề này.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Mô tả thêm</Label>
              <Textarea 
                id="cat-desc"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Một vài dòng giới thiệu về chủ đề này..."
                className="rounded-2xl border-2 focus:ring-4 focus:ring-primary/10 focus:border-primary min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" className="rounded-xl px-6 border border-red-500 text-red-500 hover:bg-red-50 font-bold" onClick={() => setIsCategoryModalOpen(false)}>Hủy</Button>
            <Button 
              className="bg-primary hover:bg-primary/90 rounded-2xl px-8 font-bold shadow-lg shadow-primary/10" 
              onClick={handleSaveCategory}
              disabled={savingCat || !catName.trim() || !catGenQuest.trim()}
            >
              {savingCat ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {editCategory ? "Cập nhật" : "Tạo chủ đề"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
