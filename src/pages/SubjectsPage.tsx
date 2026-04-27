import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SubjectCard from "@/components/SubjectCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Settings, AlertTriangle, Crown } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface CurriculumData {
  id: string;
  subject_id: string;
  created_by?: string;
}

interface SubjectData {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  curriculum_count?: number;
}

export default function SubjectsPage() {
  const { user, isAdmin, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpiredModalOpen, setIsExpiredModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [curricula, setCurricula] = useState<CurriculumData[]>([]);

  const fetchUserSubjects = async () => {
    try {
      const [userSubjectsData, curriculaData] = await Promise.all([
        apiFetch<SubjectData[]>("/user-subjects"),
        apiFetch<CurriculumData[]>("/curricula"),
      ]);

      const filteredCurricula = (curriculaData || []).filter(
        (c) => c.created_by === user?.id
      );

      setCurricula(filteredCurricula);

      const updatedSubjects = (userSubjectsData || []).map((s) => ({
        ...s,
        curriculum_count: filteredCurricula.filter((c) => c.subject_id === s.id).length,
      }));

      setSubjects(updatedSubjects);
    } catch (err) {
      console.error("Error fetching personalized subject counts:", err);
      setSubjects([]);
    }
  };

  useEffect(() => {
    if (isAuthLoading || !user) return;
    fetchUserSubjects();
  }, [user?.id, isAuthLoading]);

  const handleOpenSettings = async () => {
    setIsModalOpen(true);
    setSelectedIds(subjects.map(s => s.id));
    if (allSubjects.length === 0) {
      try {
        const fullList = await apiFetch<SubjectData[]>("/subjects");
        setAllSubjects(fullList || []);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiFetch("/user-subjects", {
        method: "POST",
        body: JSON.stringify({ subject_ids: selectedIds })
      });
      setIsModalOpen(false);
      
      const newSubjects = allSubjects
        .filter(s => selectedIds.includes(s.id))
        .map(s => ({
          ...s,
          curriculum_count: curricula.filter((c) => c.subject_id === s.id).length
        }));
      setSubjects(newSubjects);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubjectClick = (id: string) => {
    if (isAdmin) {
      navigate(`/subjects/${id}`);
      return;
    }

    // Role: User, Teacher
    if (user?.planEndDate) {
      const endDate = new Date(user.planEndDate);
      const now = new Date();
      if (now > endDate) {
        setIsExpiredModalOpen(true);
        return;
      }
    }

    navigate(`/subjects/${id}`);
  };

  return (
    <div className="container py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold opacity-0 animate-fade-up">Các môn học</h1>
          <p className="mt-1 text-muted-foreground opacity-0 animate-fade-up" style={{ animationDelay: "60ms" }}>
            Ghi chép, lưu trữ bài học của bạn, giúp ôn tập tốt hơn!
          </p>
        </div>
        <Button onClick={handleOpenSettings} className="opacity-0 animate-fade-up gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-sm font-semibold" style={{ animationDelay: "120ms" }}>
          <Settings className="w-4 h-4" />
          Thiết định môn học
        </Button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {subjects.length > 0 ? (
          subjects.map((s, i) => (
            <SubjectCard key={s.id} subject={s} index={i} onClick={handleSubjectClick} />
          ))
        ) : (
          <div className="col-span-full py-10 text-center text-muted-foreground animate-fade-up">
            Bạn chưa chọn môn học nào. Hãy bấm "Thiết định môn học" để lựa chọn.
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Thiết định môn học</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Chọn môn học đưa vào sổ tay</p>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto py-4 px-1">
            {allSubjects.length === 0 ? (
              <div className="text-center text-muted-foreground">Đang tải biểu mẫu hoặc chưa có môn học nào...</div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {allSubjects.map(subject => {
                  const isSelected = selectedIds.includes(subject.id);
                  return (
                    <div
                      key={subject.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedIds(prev => prev.filter(id => id !== subject.id));
                        } else {
                          setSelectedIds(prev => [...prev, subject.id]);
                        }
                      }}
                      className={`relative flex flex-col justify-between min-h-[90px] overflow-hidden rounded-xl border p-4 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                        isSelected 
                          ? 'border-primary ring-1 ring-primary bg-primary/5' 
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="absolute top-3 right-3 z-10 pointer-events-none">
                        <Checkbox checked={isSelected} />
                      </div>
                      <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary opacity-[0.05]`} />
                      
                      <span className="text-2xl mb-2">{subject.icon || "📚"}</span>
                      <span className="font-semibold text-sm tracking-tight">{subject.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="gap-3 sm:gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="h-11 rounded-xl border-gray-200 font-medium">Hủy</Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-[#2D9B63] hover:bg-[#2D9B63]/90 text-white font-bold h-11 px-8 rounded-xl shadow-lg shadow-[#2D9B63]/20 transition-all active:scale-95"
            >
              {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
