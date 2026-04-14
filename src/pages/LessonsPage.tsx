import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface DBCurriculum {
  id: string;
  subject_id: string;
  name: string;
  publisher: string | null;
}

interface DBLesson {
  id: string;
  title: string;
  description: string | null;
}

interface DBProgressItem {
  lesson_id: string;
  completed: boolean;
}

export default function LessonsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const [course, setCourse] = useState<DBCurriculum | null>(null);
  const [lessons, setLessons] = useState<DBLesson[]>([]);
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!courseId) return;
      setLoading(true);
      try {
        const [c, ls, progress] = await Promise.all([
          apiFetch<DBCurriculum>(`/curricula/${courseId}`),
          apiFetch<any[]>(`/lessons?curriculum_id=${encodeURIComponent(courseId)}`),
          user?.id
            ? apiFetch<DBProgressItem[]>(`/progress?student_id=${encodeURIComponent(user.id)}`)
            : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setCourse(c);
        setLessons((ls || []).map((l) => ({ id: l.id, title: l.title, description: l.description })));
        setCompletedSet(
          new Set((progress || []).filter((p) => p.completed).map((p) => p.lesson_id))
        );
      } catch {
        if (!cancelled) {
          setCourse(null);
          setLessons([]);
          setCompletedSet(new Set());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, user?.id]);

  const progress = useMemo(
    () => lessons.filter((l) => completedSet.has(l.id)).length,
    [lessons, completedSet]
  );
  const pct = lessons.length > 0 ? Math.round((progress / lessons.length) * 100) : 0;

  if (loading) return <div className="container py-10">Đang tải dữ liệu...</div>;
  if (!course) return <div className="container py-10">Không tìm thấy giáo trình.</div>;

  return (
    <div className="container max-w-2xl py-10">
      <Link to={`/subjects/${course.subject_id}`} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Quay lại
      </Link>

      <div className="mb-6 opacity-0 animate-fade-up">
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-2xl font-bold">{course.name}</h1>
          {course.publisher === "Tự tạo" && (
            <span className="rounded-md bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary">Tự tạo</span>
          )}
        </div>
        <p className="mt-1 text-muted-foreground">{course.publisher || "Giáo trình"}</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2.5 flex-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%`, animation: "progress-fill 1s ease-out" }} />
          </div>
          <span className="text-sm font-semibold text-muted-foreground">{pct}%</span>
        </div>
      </div>

      <div className="space-y-3">
        {lessons.map((lesson, i) => {
          const done = completedSet.has(lesson.id);
          return (
            <Link
              key={lesson.id}
              to={`/lessons/${lesson.id}`}
              className="group block opacity-0 animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`flex items-center gap-4 rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] ${done ? "bg-primary/5 border-2 border-primary/20" : "bg-card shadow-sm"}`}>
                {done ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-primary" />
                ) : (
                  <Circle className="h-6 w-6 shrink-0 text-muted-foreground/40" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold truncate">{lesson.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{lesson.description || ""}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
