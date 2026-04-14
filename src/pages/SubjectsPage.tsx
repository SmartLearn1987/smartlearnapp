import { useEffect, useState } from "react";
import SubjectCard from "@/components/SubjectCard";
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
  const { user, isLoading: isAuthLoading } = useAuth();
  const [subjects, setSubjects] = useState<SubjectData[]>([]);

  useEffect(() => {
    if (isAuthLoading) return;

    const fetchData = async () => {
      try {
        const [subjectsData, curriculaData] = await Promise.all([
          apiFetch<SubjectData[]>("/subjects"),
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
        console.error("Error fetching personalized subject counts:", err);
        // Fallback to basic subject list if curricula fetch fails
        apiFetch<SubjectData[]>("/subjects")
          .then(data => setSubjects(data || []))
          .catch(() => setSubjects([]));
      }
    };

    fetchData();
  }, [user?.id, isAuthLoading]);

  return (
    <div className="container py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold opacity-0 animate-fade-up">Các môn học</h1>
          <p className="mt-1 text-muted-foreground opacity-0 animate-fade-up" style={{ animationDelay: "60ms" }}>
            Ghi chép, lưu trữ bài học của bạn, giúp ôn tập tốt hơn!
          </p>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {subjects.map((s, i) => (
          <SubjectCard key={s.id} subject={s} index={i} />
        ))}
      </div>
    </div>
  );
}
