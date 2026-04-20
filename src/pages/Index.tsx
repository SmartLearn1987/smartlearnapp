 import { useEffect, useState } from "react";
 import { Link } from "react-router-dom";
 import { BookOpen, Sparkles, Library, Gamepad2 } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import SubjectCard from "@/components/SubjectCard";
 import ClockTab from "@/components/ClockTab";
 import GameGrid from "@/components/GameGrid";
 import Footer from "@/components/Footer";
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

 export default function Index() {
   const { user, isLoading: isAuthLoading } = useAuth();
   const [subjects, setSubjects] = useState<SubjectData[]>([]);
   const [activeTab, setActiveTab] = useState<"subjects" | "clock" | "game">("subjects");
 
   useEffect(() => {
    if (isAuthLoading) return;

    const fetchData = async () => {
      try {
        const subjectsEndpoint = user ? "/user-subjects" : "/subjects";
        const [subjectsData, curriculaData] = await Promise.all([
          apiFetch<SubjectData[]>(subjectsEndpoint),
          apiFetch<CurriculumData[]>("/curricula"),
        ]);

        const filteredCurricula = (curriculaData || []).filter(
          (c) => c.created_by === user?.id
        );

        const updatedSubjects = (subjectsData || []).map((s) => ({
          ...s,
          curriculum_count: filteredCurricula.filter((c) => c.subject_id === s.id).length,
        }));

        setSubjects(updatedSubjects);
      } catch (err) {
        console.error("Error fetching personalized counts for home page:", err);
        if (user) {
          setSubjects([]);
        } else {
          apiFetch<SubjectData[]>("/subjects")
            .then(data => setSubjects(data || []))
            .catch(() => setSubjects([]));
        }
      }
    };

    fetchData();
  }, [user?.id, isAuthLoading]);
  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col overflow-x-hidden">
      {/* Hero */}
      <section className="relative overflow-hidden pt-2 pb-2">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container flex flex-col items-center text-center">
          <Library className="mb-2 h-8 w-8 sm:h-10 sm:w-10 text-[#C08447] opacity-0 animate-fade-up" style={{ animationDelay: "0ms" }} />
          <h1
            className="font-heading text-2xl font-bold leading-tight tracking-tight md:text-3xl lg:text-4xl text-balance text-[#2D9B63] opacity-0 animate-fade-up"
            style={{ animationDelay: "80ms" }}
          >
            Smart Learn
          </h1>
          <p
            className="mt-1 max-w-lg text-sm text-muted-foreground opacity-0 animate-fade-up"
            style={{ animationDelay: "160ms" }}
          >
            Nền tảng học tập thông minh thông qua ghi chú, trắc nghiệm và flashcard, kèm theo học qua game sinh động
          </p>
        </div>
      </section>

      {/* Tab Switcher */}
      <div className="container px-4 mb-8 flex justify-center opacity-0 animate-fade-up" style={{ animationDelay: "200ms" }}>
        <div className="flex sm:inline-flex items-center w-full sm:w-auto p-1.5 bg-white/80 backdrop-blur-md rounded-2xl border border-[#2D9B63]/10 shadow-xl shadow-[#2D9B63]/5 overflow-hidden">
          <button
            onClick={() => setActiveTab("subjects")}
            className={cn(
              "flex flex-1 flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-xl px-2 py-2.5 sm:px-8 sm:py-3 text-[10px] sm:text-sm font-semibold transition-all duration-300",
              activeTab === "subjects"
                ? "bg-[#2D9B63] text-white shadow-lg shadow-[#2D9B63]/30 scale-[1.02]"
                : "text-muted-foreground hover:bg-[#2D9B63]/5 hover:text-[#2D9B63]"
            )}
          >
            <BookOpen className={cn("h-5 w-5 sm:h-4 sm:w-4", activeTab === "subjects" ? "text-white" : "text-[#2D9B63]")} />
            <span className="text-center leading-tight">Sổ tay môn học</span>
          </button>
          <button
            onClick={() => setActiveTab("game")}
            className={cn(
              "flex flex-1 flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-xl px-2 py-2.5 sm:px-8 sm:py-3 text-[10px] sm:text-sm font-semibold transition-all duration-300 ml-1",
              activeTab === "game"
                ? "bg-[#2D9B63] text-white shadow-lg shadow-[#2D9B63]/30 scale-[1.02]"
                : "text-muted-foreground hover:bg-[#2D9B63]/5 hover:text-[#2D9B63]"
            )}
          >
            <Gamepad2 className={cn("h-5 w-5 sm:h-4 sm:w-4", activeTab === "game" ? "text-white" : "text-[#2D9B63]")} />
            <span className="text-center leading-tight">Game</span>
          </button>
          <button
            onClick={() => setActiveTab("clock")}
            className={cn(
              "flex flex-1 flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 rounded-xl px-2 py-2.5 sm:px-8 sm:py-3 text-[10px] sm:text-sm font-semibold transition-all duration-300 ml-1",
              activeTab === "clock"
                ? "bg-[#2D9B63] text-white shadow-lg shadow-[#2D9B63]/30 scale-[1.02]"
                : "text-muted-foreground hover:bg-[#2D9B63]/5 hover:text-[#2D9B63]"
            )}
          >
            <ClockIcon className={cn("h-5 w-5 sm:h-4 sm:w-4", activeTab === "clock" ? "text-white" : "text-[#2D9B63]")} />
            <span className="text-center leading-tight">Chuyên tâm</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <section className="pb-10 transition-all duration-300 flex-grow">
        <div className="container">
          {activeTab === "subjects" ? (
            <div className="animate-fade-in">
              <div className="mb-4 flex items-center gap-2 opacity-0 animate-fade-up" style={{ animationDelay: "100ms" }}>
                <Sparkles className="h-5 w-5 text-secondary" />
                <h2 className="font-heading text-2xl font-bold">Các môn học</h2>
              </div>
              <p className="mb-6 -mt-3 text-muted-foreground text-sm opacity-0 animate-fade-up" style={{ animationDelay: "150ms" }}>
                Lưu trữ thông minh – Ghi nhớ sâu
              </p>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {subjects.length > 0 ? (
                  subjects.map((s, i) => (
                    <SubjectCard key={s.id} subject={s} index={i} />
                  ))
                ) : (
                  <div className="col-span-full py-10 text-center text-muted-foreground animate-fade-up">
                    <p className="mb-2">Bạn chưa chọn môn học nào để đưa vào sổ tay.</p>
                    <Link to="/subjects" className="text-primary hover:underline font-medium">Bấm vào đây để cấu hình Thiết định môn học nhé</Link>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "clock" ? (
            <div className="animate-fade-in shadow-2xl rounded-3xl overflow-hidden">
              <ClockTab />
            </div>
          ) : (
            <div className="animate-fade-in pt-4">
              <div className="mb-6 flex items-center justify-between opacity-0 animate-fade-up" style={{ animationDelay: "100ms" }}>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-primary" />
                  <h2 className="font-heading text-2xl font-bold">Khu Vực Trò Chơi</h2>
                </div>
              </div>
              <GameGrid />
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}

// Minimal icons helper
const ClockIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
