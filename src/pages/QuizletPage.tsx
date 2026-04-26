import { useState, useEffect } from "react";
import { Plus, Search, Layers, MoreVertical, Eye, EyeOff, Trash2, Edit2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface QuizletSet {
  id: string;
  title: string;
  term_count: number;
  author_name: string | null;
  subject_name: string | null;
  education_level: string | null;
  is_public: boolean;
  created_at: string;
  user_id: string;
}

export default function QuizletPage() {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"personal" | "community">("community");
  const [quizlets, setQuizlets] = useState<QuizletSet[]>([]);
  const [subjects, setSubjects] = useState<{name: string}[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [quizletData, subjectData] = await Promise.all([
          apiFetch(`/quizlets?tab=${viewMode}`),
          apiFetch("/subjects")
        ]);
        setQuizlets(quizletData as QuizletSet[]);
        setSubjects(subjectData as {name: string}[]);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [viewMode]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa học phần này?")) return;
    try {
      await apiFetch(`/quizlets/${id}`, { method: "DELETE" });
      toast.success("Đã xóa học phần");
      setQuizlets(quizlets.filter(q => q.id !== id));
    } catch (err) {
      toast.error("Không thể xóa học phần");
    }
  };

  const filteredQuizlets = quizlets.filter(q => {
    return q.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // 1. Group by Education Level
  const nestedGroups = filteredQuizlets.reduce((acc, q) => {
    // Standardize level names for grouping to avoid duplicate sections with different casing
    const level = q.education_level?.trim() || "Chưa phân loại";
    const subject = q.subject_name || "Chưa phân loại môn học";
    
    if (!acc[level]) acc[level] = {};
    if (!acc[level][subject]) acc[level][subject] = [];
    
    acc[level][subject].push(q);
    return acc;
  }, {} as Record<string, Record<string, QuizletSet[]>>);

  // Sorting levels
  const levelOrder = ["Tiểu học", "Trung học cơ sở", "Trung học Phổ Thông", "Đại Học / Cao Đẳng", "Luyện thi chứng chỉ", "Chưa phân loại"];
  const sortedLevels = Object.keys(nestedGroups).sort((a, b) => {
    const idxA = levelOrder.indexOf(a);
    const idxB = levelOrder.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  return (
    <div className="container py-10 max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end justify-between border-b pb-6 border-gray-100">
        <div>
          <h1 className="font-heading text-3xl font-bold opacity-0 animate-fade-up">Quản lý Flashcard</h1>
          <p className="mt-1 text-muted-foreground opacity-0 animate-fade-up" style={{ animationDelay: "60ms" }}>
            Quản lý danh sách các bộ thẻ ghi nhớ (Flashcards) của bạn
          </p>
        </div>
      </div>

      <div className="mb-8 flex flex-col sm:flex-row items-center gap-4 opacity-0 animate-fade-up" style={{ animationDelay: "150ms" }}>
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm học phần..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-11 w-full rounded-xl border-2 border-input bg-background/50 px-10 py-2 text-sm font-medium transition-all focus:border-primary focus:outline-none focus:ring-0"
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-muted/50 p-1.5 rounded-2xl border-2 border-primary/10 shadow-inner">
          <button
            onClick={() => setViewMode("personal")}
            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              viewMode === "personal" 
                ? "bg-primary text-white shadow-lg shadow-primary/20 ring-1 ring-primary/20 scale-105" 
                : "text-muted-foreground hover:text-foreground hover:bg-white/50"
            }`}
          >
            Cá nhân
          </button>
          <button
            onClick={() => setViewMode("community")}
            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              viewMode === "community" 
                ? "bg-primary text-white shadow-lg shadow-primary/20 ring-1 ring-primary/20 scale-105" 
                : "text-muted-foreground hover:text-foreground hover:bg-white/50"
            }`}
          >
            Cộng đồng
          </button>
        </div>
      </div>

      {viewMode === "personal" && (
        <div className="mb-8 opacity-0 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <Button 
            variant="outline"
            onClick={() => navigate('/quizlet/create')}
            className="rounded-full h-10 px-6 font-bold border-primary text-primary hover:bg-primary/5 flex items-center gap-2 w-full sm:w-auto transition-all"
          >
            <Plus className="h-4 w-4" /> Tạo bài mới
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <p className="text-muted-foreground text-center">Đang tải...</p>
        </div>
      ) : sortedLevels.length > 0 ? (
        <div className="space-y-16">
          {sortedLevels.map((level, levelIndex) => (
            <div key={level} className="opacity-0 animate-fade-up" style={{ animationDelay: `${200 + levelIndex * 100}ms` }}>
              {/* Level Header (Main Section) */}
              <div className="flex items-center gap-3 mb-8 border-b-2 border-primary/20 pb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                   <Layers className="h-4 w-4" />
                </span>
                <h2 className="text-2xl font-bold font-heading text-primary">{level}</h2>
              </div>

              {/* Subject Groups within Level */}
              <div className="space-y-12 pl-4 border-l-2 border-gray-50">
                {Object.keys(nestedGroups[level]).sort((a, b) => {
                  const idxA = subjects.findIndex(s => s.name === a);
                  const idxB = subjects.findIndex(s => s.name === b);
                  if (idxA === -1 && idxB === -1) return a.localeCompare(b);
                  if (idxA === -1) return 1;
                  if (idxB === -1) return -1;
                  return idxA - idxB;
                }).map((subject, groupIndex) => (
                  <div key={subject} className="opacity-0 animate-fade-up" style={{ animationDelay: `${groupIndex * 50}ms` }}>
                    <div className="flex items-center gap-4 mb-6">
                      <h3 className="text-lg font-bold font-heading text-gray-700">{subject}</h3>
                      <div className="h-px bg-gray-100 flex-1" />
                      <span className="text-[10px] font-bold text-muted-foreground bg-gray-50 px-3 py-1 rounded-full border border-gray-100 uppercase tracking-[0.1em]">
                        {nestedGroups[level][subject].length} học phần
                      </span>
                    </div>
                    
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {nestedGroups[level][subject].map((quizlet) => (
                        <div 
                          key={quizlet.id} 
                          onClick={() => navigate(`/quizlet/${quizlet.id}`)}
                          className="group relative rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-lg hover:border-primary/20 cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-300">
                              <Layers className="h-5 w-5" />
                            </div>
                            
                            <div className="space-y-1 flex-1 text-left">
                                <h3 className="font-heading text-base font-semibold line-clamp-2 group-hover:text-primary transition-colors leading-tight min-h-[2.5rem]">{quizlet.title}</h3>
                                {viewMode === "community" && quizlet.user_id === currentUser?.id && (
                                  <div className="flex">
                                    <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 text-[10px] h-5 py-0 px-2 font-black uppercase tracking-wider">Của bạn</Badge>
                                  </div>
                                )}
                            </div>
                            
                            {/* Visibility Indicator & Action Menu */}
                            <div className="shrink-0 flex items-center gap-1">
                              {viewMode === "personal" && (
                                quizlet.is_public ? (
                                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shadow-sm transition-transform group-hover:scale-110 mr-1" title="Công khai">
                                    <Eye className="w-4 h-4" />
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-50 text-orange-600 border border-orange-200 shadow-sm transition-transform group-hover:scale-110 mr-1" title="Cá nhân">
                                    <EyeOff className="w-4 h-4" />
                                  </div>
                                )
                              )}

                              {viewMode === "personal" && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg relative z-10" onClick={(e) => e.stopPropagation()}>
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/quizlet/edit/${quizlet.id}`); }} className="cursor-pointer gap-2 font-medium">
                                      <Edit2 className="h-4 w-4" /> Chỉnh sửa
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(quizlet.id); }} className="cursor-pointer gap-2 font-medium text-destructive focus:bg-destructive/10 focus:text-destructive">
                                      <Trash2 className="h-4 w-4" /> Xóa học phần
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <div className="mt-2 flex items-center justify-between gap-2 text-sm text-muted-foreground border-t border-gray-50 pt-3">
                              <div className="flex items-center gap-2">
                                <span className="text-primary font-bold">{quizlet.term_count || 0}</span>
                                <span className="text-[11px] uppercase tracking-wider font-semibold opacity-70">thuật ngữ</span>
                              </div>
                              {quizlet.author_name && (
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                                    {quizlet.author_name.charAt(0)}
                                  </div>
                                  <span className="text-[11px] font-medium opacity-80">{quizlet.author_name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-100 rounded-3xl opacity-0 animate-fade-up" style={{ animationDelay: "200ms" }}>
          <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-muted-foreground/30">
             <Layers className="h-8 w-8" />
          </div>
          <p className="text-xl font-bold text-muted-foreground/50">
            {viewMode === "personal" 
              ? "Bạn chưa tạo học phần nào" 
              : "Chưa có học phần công khai nào"}
          </p>
          {viewMode === "personal" && (
            <Button variant="link" onClick={() => navigate('/quizlet/create')} className="mt-2 font-bold">
              Tạo học phần đầu tiên của bạn
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
