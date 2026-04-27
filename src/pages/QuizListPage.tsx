import { useState, useEffect } from "react";
import { Plus, Search, ClipboardList, MoreVertical, Trash2, Edit2, Clock, Trophy, Eye, EyeOff, Layers, AlertTriangle, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Exam {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  grade: string | null;
  education_level: string | null;
  is_public: boolean;
  question_count: number;
  subject_name: string | null;
  created_at: string;
  average_score: number | null;
  author_name: string | null;
  user_id: string; // Added user_id for ownership check
}

import { useAuth } from "@/context/AuthContext";

export default function QuizListPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"personal" | "community">("community");
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<{name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [examsData, subjectsData] = await Promise.all([
        apiFetch<Exam[]>(`/exams?tab=${viewMode}`),
        apiFetch<{name: string}[]>("/subjects")
      ]);
      setExams(examsData);
      setSubjects(subjectsData);
    } catch (err) {
      console.error("Failed to load data:", err);
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [viewMode]);

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài thi này?")) return;
    try {
      await apiFetch(`/exams/${id}`, { method: "DELETE" });
      toast.success("Đã xóa bài thi");
      setExams(exams.filter(e => e.id !== id));
    } catch (err) {
      toast.error("Không thể xóa bài thi");
    }
  };

  const filteredExams = exams.filter(e => {
    return e.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Grouping logic (Education Level -> Subject)
  const nestedGroups = filteredExams.reduce((acc, exam) => {
    const level = exam.education_level?.trim() || "Chưa phân loại";
    const subject = exam.subject_name || "Chưa phân loại môn học";
    
    if (!acc[level]) acc[level] = {};
    if (!acc[level][subject]) acc[level][subject] = [];
    
    acc[level][subject].push(exam);
    return acc;
  }, {} as Record<string, Record<string, Exam[]>>);

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
          <h1 className="font-heading text-3xl font-bold opacity-0 animate-fade-up">Quản lý Trắc nghiệm</h1>
          <p className="mt-1 text-muted-foreground opacity-0 animate-fade-up" style={{ animationDelay: "60ms" }}>
            Tạo và quản lý các bài kiểm tra, đánh giá định kỳ
          </p>
        </div>
      </div>

      <div className="mb-8 flex flex-col sm:flex-row items-center gap-4 opacity-0 animate-fade-up" style={{ animationDelay: "150ms" }}>
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm bài thi..."
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
            onClick={() => navigate('/quizzes/create')}
            className="rounded-full h-10 px-6 font-bold border-primary text-primary hover:bg-primary/5 flex items-center gap-2 w-full sm:w-auto transition-all"
          >
            <Plus className="h-4 w-4" /> Tạo bài mới
          </Button>
        </div>
      )}

      <div className="space-y-16">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : sortedLevels.length > 0 ? (
          sortedLevels.map((level, levelIndex) => (
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
                        {nestedGroups[level][subject].length} bài trắc nghiệm
                      </span>
                    </div>
                    
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {nestedGroups[level][subject].map((exam) => (
                        <div 
                          key={exam.id} 
                          className="group relative rounded-2xl border-2 border-transparent bg-card p-6 shadow-sm transition-all hover:border-primary/20 hover:shadow-md flex flex-col h-full"
                        >
                          <div className="flex items-start justify-between mb-4 gap-4">
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                                <ClipboardList className="h-6 w-6" />
                              </div>
                              <div className="space-y-1">
                                <h3 className="font-heading text-xl font-bold line-clamp-2 leading-tight">{exam.title}</h3>
                                {viewMode === "community" && exam.user_id === user?.id && (
                                  <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 text-[10px] h-5 py-0 px-2 font-black uppercase tracking-wider">Của bạn</Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="shrink-0 flex items-center gap-1">
                              {/* Visibility Icon - Only show in Personal mode */}
                              {viewMode === "personal" && (
                                exam.is_public ? (
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
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg">
                                      <MoreVertical className="h-5 w-5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                    <DropdownMenuItem onClick={() => navigate(`/quizzes/edit/${exam.id}`)} className="cursor-pointer gap-2 font-medium">
                                      <Edit2 className="h-4 w-4" /> Chỉnh sửa
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(exam.id)} className="cursor-pointer gap-2 font-medium text-destructive focus:bg-destructive/10 focus:text-destructive">
                                      <Trash2 className="h-4 w-4" /> Xóa bài thi
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex-1 flex flex-col">
                            {exam.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{exam.description}</p>
                            )}

                            {exam.average_score !== null && exam.average_score !== undefined && (
                              <div className="mt-2 inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider ring-1 ring-amber-500/20 shadow-sm animate-fade-in mb-4">
                                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                                <span>Điểm trung bình: {Math.round(Number(exam.average_score))}%</span>
                              </div>
                            )}
                            
                            <div className="mt-auto flex items-center justify-between gap-2 text-sm text-muted-foreground border-t border-gray-50 pt-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                                  <ClipboardList className="h-3 w-3" />
                                  <span>{exam.question_count} câu hỏi</span>
                                </div>
                                {exam.duration && (
                                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                                    <Clock className="h-3 w-3" />
                                    <span>{exam.duration} phút</span>
                                  </div>
                                )}
                              </div>

                              {exam.author_name && (
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                                    {exam.author_name.charAt(0)}
                                  </div>
                                  <span className="text-[11px] font-medium opacity-80">{exam.author_name}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-auto pt-6">
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if ((user?.role === 'user' || user?.role === 'teacher') && user?.planEndDate) {
                                  const now = new Date();
                                  const endDate = new Date(user.planEndDate);
                                  if (now > endDate) {
                                    setIsExpiredModalOpen(true);
                                    return;
                                  }
                                }
                                navigate(`/quizzes/${exam.id}/take`);
                              }}
                              className="w-full rounded-xl bg-primary/10 text-primary hover:bg-primary font-bold transition-all group-hover:bg-primary group-hover:text-primary-foreground"
                            >
                              Làm bài
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-3xl bg-muted/20">
            <ClipboardList className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-xl font-bold text-muted-foreground/50">
              {viewMode === "personal" 
                ? "Bạn chưa tạo bài trắc nghiệm nào" 
                : "Chưa có bài trắc nghiệm công khai nào"}
            </p>
            {viewMode === "personal" && (
              <Button variant="link" onClick={() => navigate('/quizzes/create')} className="mt-2 font-bold">
                Tạo bài thi đầu tiên của bạn
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={isExpiredModalOpen} onOpenChange={setIsExpiredModalOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-gradient-to-b from-green-50 to-white p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-6 relative">
                <div className="h-20 w-20 rounded-full bg-[#2D9B63]/10 flex items-center justify-center animate-pulse">
                  <AlertTriangle className="h-10 w-10 text-[#2D9B63]" />
                </div>
                <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-sm">
                  <div className="bg-[#2D9B63] rounded-full p-1">
                    <Crown className="h-3 w-3 text-white" />
                  </div>
                </div>
              </div>

              <DialogHeader className="space-y-3">
                <DialogTitle className="text-2xl font-bold text-gray-900 font-heading">
                  Hết hạn gói cước
                </DialogTitle>
                <DialogDescription className="text-gray-600 text-base leading-relaxed">
                  Gói thành viên của bạn đã hết hạn sử dụng. Hãy nâng cấp để tiếp tục học tập và sử dụng toàn bộ tính năng của Smart Learn.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-8 flex flex-col w-full gap-3">
                <Button 
                  onClick={() => navigate("/premium")}
                  className="w-full bg-[#2D9B63] hover:bg-[#2D9B63]/90 text-white font-bold h-12 rounded-2xl shadow-lg shadow-[#2D9B63]/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Crown className="h-5 w-5" />
                  Nâng cấp ngay
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setIsExpiredModalOpen(false)}
                  className="w-full h-12 rounded-2xl text-gray-500 font-medium hover:bg-gray-50 transition-all"
                >
                  Để sau
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
