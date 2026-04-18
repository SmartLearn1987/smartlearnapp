import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, HelpCircle, Layers, FileText, CheckCircle2, Lightbulb, BookMarked, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuizRunner from "@/components/QuizRunner";
import FlashcardViewer from "@/components/FlashcardViewer";

import type { ContentBlock, Lesson } from "@/data/mockData";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface LessonImage {
  id: string;
  lesson_id: string;
  file_url: string;
  caption: string | null;
  sort_order: number;
}

const tabs = [
  { id: "content", label: "Nội dung", icon: BookOpen },
  { id: "quiz", label: "Trắc nghiệm", icon: HelpCircle },
  { id: "flashcard", label: "Flashcard", icon: Layers },
  { id: "summary", label: "Tổng kết", icon: FileText },
] as const;

type TabId = (typeof tabs)[number]["id"];

function ContentRenderer({ blocks }: { blocks: any[] }) {
  return (
    <div className="space-y-3">
      {(blocks || []).map((block, i) => {
        const style: React.CSSProperties = {
          fontSize: block.fontSize ? `${block.fontSize}px` : undefined,
          fontFamily: block.fontFamily && block.fontFamily !== "inherit" ? block.fontFamily : undefined,
          color: block.color || undefined,
          fontWeight: block.bold ? "bold" : undefined,
          fontStyle: block.italic ? "italic" : undefined,
          whiteSpace: "pre-wrap",
        };
        switch (block.type) {
          case "heading":
            return <h2 key={i} className="font-heading text-xl font-bold mt-4 mb-1" style={style}>{block.text}</h2>;
          case "list_item":
            return (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-1 text-primary font-bold shrink-0">•</span>
                <p className="leading-relaxed text-foreground/90" style={style}>{block.text}</p>
              </div>
            );
          case "numbered_item":
            return (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-1 font-bold text-primary min-w-[20px] shrink-0">{i + 1}.</span>
                <p className="leading-relaxed text-foreground/90" style={style}>{block.text}</p>
              </div>
            );
          case "paragraph":
          default:
            return <p key={i} className="leading-relaxed text-foreground/90" style={style}>{block.text}</p>;
        }
      })}
    </div>
  );
}

export default function LessonDetailPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("content");
  const [lesson, setLesson] = useState<Lesson | undefined>(undefined);
  const [course, setCourse] = useState<{ id: string; name: string } | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lessonImages, setLessonImages] = useState<LessonImage[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!lessonId) return;
      setLoading(true);
      try {
        const lessonRes = await apiFetch<any>(`/lessons/${lessonId}`);
        const [curriculumRes, progress] = await Promise.all([
          apiFetch<any>(`/curricula/${lessonRes.curriculum_id}`),
          user?.id
            ? apiFetch<Array<{ lesson_id: string; completed: boolean }>>(`/progress?student_id=${encodeURIComponent(user.id)}`)
            : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setLesson({
          id: lessonRes.id,
          title: lessonRes.title || "",
          description: lessonRes.description || "",
          completed: false,
          content: Array.isArray(lessonRes.content) ? lessonRes.content : [],
          quiz: Array.isArray(lessonRes.quiz) ? lessonRes.quiz : [],
          flashcards: Array.isArray(lessonRes.flashcards) ? lessonRes.flashcards : [],
          summary: lessonRes.summary || "",
          keyPoints: Array.isArray(lessonRes.key_points) ? lessonRes.key_points : [],
          vocabulary: Array.isArray(lessonRes.vocabulary) ? lessonRes.vocabulary : [],
        });
        setCourse({ id: curriculumRes.id, name: curriculumRes.name || "Giáo trình" });
        setIsDone(Boolean((progress || []).find((p) => p.lesson_id === lessonRes.id)?.completed));
        // Fetch lesson images
        try {
          const imgs = await apiFetch<LessonImage[]>(`/lessons/${lessonRes.id}/images`);
          if (!cancelled) {
            setLessonImages(imgs || []);
            setSlideIndex(0);
          }
        } catch {
          if (!cancelled) setLessonImages([]);
        }
      } catch {
        if (!cancelled) {
          setLesson(undefined);
          setCourse(null);
          setIsDone(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [lessonId, user?.id]);

  // Persist AI-generated quiz/flashcards back to the course
  const handleLessonUpdate = async (updated: Lesson) => {
    setLesson(updated);
    try {
      await apiFetch(`/lessons/${updated.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: updated.title,
          description: updated.description,
          content: updated.content,
          summary: updated.summary,
          key_points: updated.keyPoints,
          vocabulary: updated.vocabulary,
        }),
      });
      await apiFetch(`/lessons/${updated.id}/quiz-flashcards`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz: updated.quiz,
          flashcards: updated.flashcards,
        }),
      });
    } catch {
      // keep local state for UX even if save fails
    }
  };

  const canToggle = useMemo(() => Boolean(user?.id && lesson?.id), [user?.id, lesson?.id]);

  const handleToggle = async () => {
    if (!lesson || !user?.id) return;
    const next = !isDone;
    setIsDone(next);
    try {
      await apiFetch(`/progress/${lesson.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: user.id,
          completed: next,
        }),
      });
    } catch {
      setIsDone(!next);
    }
  };

  if (loading) return <div className="container py-10">Đang tải dữ liệu...</div>;
  if (!lesson || !course) return <div className="container py-10">Không tìm thấy bài học.</div>;

  return (
    <div className="container max-w-3xl py-10">
      <Link to={`/courses/${course.id}`} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> {course.name}
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4 opacity-0 animate-fade-up">
        <div>
          <h1 className="font-heading text-2xl font-bold">{lesson.title}</h1>
          <p className="mt-1 text-muted-foreground">{lesson.description}</p>
        </div>
        <Button
          variant={isDone ? "default" : "outline"}
          size="sm"
          onClick={handleToggle}
          disabled={!canToggle}
          className="shrink-0"
        >
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          {isDone ? "Đã học" : "Đánh dấu"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1 opacity-0 animate-fade-up" style={{ animationDelay: "80ms" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="opacity-0 animate-fade-up" style={{ animationDelay: "160ms" }}>
        {activeTab === "content" && (
          <div className="space-y-6">
            {/* Image Slideshow */}
            {lessonImages.length > 0 && (
              <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
                <div className="flex items-center gap-2 px-6 pt-5 pb-2">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <h3 className="font-heading text-lg font-bold">Hình ảnh bài học</h3>
                  <span className="ml-auto text-sm text-muted-foreground">{slideIndex + 1} / {lessonImages.length}</span>
                </div>
                <div className="relative group">
                  <div className="aspect-[16/9] w-full bg-muted/30 flex items-center justify-center">
                    <img
                      src={(() => {
                        const url = lessonImages[slideIndex]?.file_url || "";
                        return url.startsWith("http") ? url : `${API_BASE_URL.replace("/api", "")}${url}`;
                      })()}
                      alt={lessonImages[slideIndex]?.caption || `Hình ${slideIndex + 1}`}
                      className="max-h-full max-w-full object-contain transition-opacity duration-300"
                    />
                  </div>
                  {lessonImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setSlideIndex((p) => (p - 1 + lessonImages.length) % lessonImages.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 backdrop-blur-sm p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setSlideIndex((p) => (p + 1) % lessonImages.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 backdrop-blur-sm p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
                {/* Thumbnail strip */}
                {lessonImages.length > 1 && (
                  <div className="flex gap-2 px-5 py-3 overflow-x-auto">
                    {lessonImages.map((img, i) => {
                      const src = img.file_url.startsWith("http")
                        ? img.file_url
                        : `${API_BASE_URL.replace("/api", "")}${img.file_url}`;
                      return (
                        <button
                          key={img.id}
                          onClick={() => setSlideIndex(i)}
                          className={`shrink-0 h-14 w-20 rounded-lg overflow-hidden border-2 transition-all ${
                            i === slideIndex
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl bg-card p-8 shadow-sm">
              <ContentRenderer blocks={lesson.content} />
            </div>

            {/* Vocabulary */}
            {lesson.vocabulary && lesson.vocabulary.length > 0 && (
              <div className="rounded-2xl bg-card p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 font-heading text-lg font-bold">
                  <BookMarked className="h-5 w-5 text-secondary" />
                  Từ ngữ
                </h3>
                <div className="space-y-3">
                  {lesson.vocabulary.map((v, i) => (
                    <div key={i} className="flex gap-2 rounded-xl bg-secondary/5 border border-secondary/10 p-4">
                      <span className="font-bold text-secondary shrink-0">{v.word}:</span>
                      <span className="text-muted-foreground">{v.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "quiz" && (
          <div className="rounded-2xl bg-card p-8 shadow-sm space-y-6">

            {lesson.quiz.length > 0 ? (
              <QuizRunner questions={lesson.quiz} />
            ) : (
              <p className="text-center text-muted-foreground py-8 font-medium">Chưa có câu hỏi trắc nghiệm.</p>
            )}
          </div>
        )}

        {activeTab === "flashcard" && (
          <div className="rounded-2xl bg-card p-8 shadow-sm space-y-6">

            {lesson.flashcards.length > 0 ? (
              <>
                <h3 className="text-center font-heading text-lg font-bold">Nhấn vào thẻ để lật</h3>
                <FlashcardViewer flashcards={lesson.flashcards} />
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8 font-medium">Chưa có flashcard.</p>
            )}
          </div>
        )}

        {activeTab === "summary" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-card p-8 shadow-sm">
              <h3 className="mb-4 font-heading text-xl font-bold flex items-center gap-2">
                📝 Tổng kết bài học
              </h3>
              <p className="text-foreground/90 leading-relaxed">{lesson.summary}</p>
            </div>

            {/* Key Points */}
            {lesson.keyPoints && lesson.keyPoints.length > 0 && (
              <div className="rounded-2xl bg-primary/5 border-2 border-primary/10 p-6">
                <h3 className="mb-4 font-heading text-lg font-bold flex items-center gap-2 text-primary">
                  <Lightbulb className="h-5 w-5" />
                  Điểm cần nhớ
                </h3>
                <ul className="space-y-3">
                  {lesson.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-foreground/85 leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Vocabulary recap */}
            {lesson.vocabulary && lesson.vocabulary.length > 0 && (
              <div className="rounded-2xl bg-secondary/5 border-2 border-secondary/10 p-6">
                <h3 className="mb-3 font-heading text-lg font-bold flex items-center gap-2 text-secondary">
                  <BookMarked className="h-5 w-5" />
                  Từ vựng đã học
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lesson.vocabulary.map((v, i) => (
                    <span key={i} className="rounded-lg bg-card px-3 py-1.5 text-sm font-semibold shadow-sm">
                      {v.word}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}