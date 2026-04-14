import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Plus, Trash2, Pencil, Eye, EyeOff, X, ImagePlus, Upload, HelpCircle, Layers, FileText, CheckCircle2, Lightbulb, BookMarked, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import QuizRunner from "@/components/QuizRunner";
import FlashcardViewer from "@/components/FlashcardViewer";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import CurriculumCreateModal from "@/components/CurriculumCreateModal";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface QuizItem { id?: string; question: string; options: string[]; correctIndex: number; explanation: string }
interface FlashcardItem { id?: string; front: string; back: string }
interface LessonItem {
  id: string;
  title: string;
  description: string;
  summary?: string;
  content?: Array<{ type: string; text: string }>;
  key_points?: string[];
  quiz?: QuizItem[];
  flashcards?: FlashcardItem[];
  images?: any[];
}

interface SubjectData {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

interface CurriculumData {
  id: string;
  name: string;
  publisher?: string;
  lesson_count?: number;
  education_level?: string;
  is_public?: boolean;
  image_url?: string;
  created_by?: string;
}

export default function CoursesPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { user, isAdmin, isTeacher, isLoading: isAuthLoading } = useAuth();
  const [subject, setSubject] = useState<SubjectData | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [subjectCourses, setSubjectCourses] = useState<CurriculumData[]>([]);
  
  // Navigation & Management state
  const [view, setView] = useState<"list" | "lessons" | "lesson_form">("list");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState<CurriculumData | null>(null);
  const [editingCurriculum, setEditingCurriculum] = useState<CurriculumData | null>(null);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showImportFlashcard, setShowImportFlashcard] = useState(false);
  const [importFlashcardContent, setImportFlashcardContent] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  // New states for Tabs and Review
  const [lessonsSubView, setLessonsSubView] = useState<"manage" | "review">("manage");
  const [activeReviewLessonId, setActiveReviewLessonId] = useState<string | null>(null);
  const [reviewActiveTab, setReviewActiveTab] = useState<"content" | "quiz" | "flashcard" | "summary">("content");
  const [lessonProgress, setLessonProgress] = useState<Record<string, boolean>>({});
  const [activeLessonSlideIndex, setActiveLessonSlideIndex] = useState(0);

  const fetchCurricula = () => {
    setIsFetching(true);
    Promise.all([
      apiFetch<SubjectData>(`/subjects/${subjectId}`),
      apiFetch<CurriculumData[]>(`/curricula?subject_id=${encodeURIComponent(subjectId)}`),
    ])
      .then(([s, c]) => {
        setSubject(s);
        // Only show curricula created by the current user
        setSubjectCourses((c || []).filter((course) => course.created_by === user?.id));
      })
      .catch((err) => {
        console.error("Error fetching subject details:", err);
        setSubject(null);
        setSubjectCourses([]);
      })
      .finally(() => {
        setIsFetching(false);
      });
  };

  useEffect(() => {
    if (!isAuthLoading) {
      fetchCurricula();
    }
  }, [subjectId, user?.id, isAuthLoading, isAdmin, isTeacher]);

  const fetchLessons = async (curriculumId: string) => {
    try {
      const [lessonsData, progressData] = await Promise.all([
        apiFetch<LessonItem[]>(`/lessons?curriculum_id=${encodeURIComponent(curriculumId)}`),
        user?.id 
          ? apiFetch<any[]>(`/progress?student_id=${encodeURIComponent(user.id)}`)
          : Promise.resolve([])
      ]);
      
      setLessons(lessonsData || []);
      
      // Transform progress array into Record for O(1) lookups
      const progressMap: Record<string, boolean> = {};
      (progressData || []).forEach((p: any) => {
        if (p.completed) progressMap[p.lesson_id] = true;
      });
      setLessonProgress(progressMap);
    } catch (err) {
      console.error("Error fetching lessons or progress:", err);
      setLessons([]);
      setLessonProgress({});
    }
  };

  const handleDeleteCurriculum = async (curriculumId: string) => {
    const ok = window.confirm("Xóa giáo trình này? Toàn bộ bài học trong giáo trình sẽ bị xóa.");
    if (!ok) return;
    try {
      await apiFetch(`/curricula/${curriculumId}`, { method: "DELETE" });
      toast.success("Đã xóa giáo trình");
      fetchCurricula();
    } catch {
      toast.error("Không thể xóa giáo trình");
    }
  };

  const handleEditCurriculum = (curriculum: CurriculumData) => {
    setEditingCurriculum(curriculum);
    setShowCreateModal(true);
  };

  const viewLessons = (curriculum: CurriculumData) => {
    setSelectedCurriculum(curriculum);
    fetchLessons(curriculum.id);
    setView("lessons");
  };

  // ── lesson states ────────────────────────────────────────────────────────
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonSummary, setLessonSummary] = useState("");
  const [lessonKeyPoints, setLessonKeyPoints] = useState("");
  const [lessonError, setLessonError] = useState("");
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonQuiz, setLessonQuiz] = useState<QuizItem[]>([]);
  const [lessonFlashcards, setLessonFlashcards] = useState<FlashcardItem[]>([]);
  const [lessonImages, setLessonImages] = useState<any[]>([]);

  // ── lesson logic ────────────────────────────────────────────────────────
  const resetLessonForm = () => {
    setLessonTitle("");
    setLessonDescription("");
    setLessonContent("");
    setLessonSummary("");
    setLessonKeyPoints("");
    setLessonError("");
    setEditingLessonId(null);
    setLessonQuiz([]);
    setLessonFlashcards([]);
    setLessonImages([]);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!selectedCurriculum) return;
    const ok = window.confirm("Xóa bài học này? Mọi dữ liệu trắc nghiệm và flashcard liên quan sẽ bị xóa.");
    if (!ok) return;
    try {
      await apiFetch(`/lessons/${lessonId}`, { method: "DELETE" });
      toast.success("Đã xóa bài học");
      fetchLessons(selectedCurriculum.id);
      fetchCurricula();
    } catch {
      toast.error("Không thể xóa bài học");
    }
  };

  const handleSaveLesson = async () => {
    if (!selectedCurriculum) return;
    if (!lessonTitle.trim()) {
      setLessonError("Vui lòng nhập tên bài học");
      return;
    }
    try {
      const contentBlocks = lessonContent.trim()
        ? lessonContent
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((text) => ({ type: "paragraph", text }))
        : [];

      const keyPoints = lessonKeyPoints
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

      const lessonPayload = {
        curriculum_id: selectedCurriculum.id,
        title: lessonTitle.trim(),
        description: lessonDescription.trim() || null,
        content: contentBlocks,
        summary: lessonSummary.trim() || null,
        key_points: keyPoints,
        vocabulary: [],
        sort_order: lessons.length + 1,
      };

      const savedLesson = editingLessonId
        ? await apiFetch<{ id: string }>(`/lessons/${editingLessonId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lessonPayload),
        })
        : await apiFetch<{ id: string }>("/lessons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(lessonPayload),
        });

      const cleanedQuiz = lessonQuiz
        .map((q) => ({
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()).filter(Boolean),
          correctIndex: Number(q.correctIndex) || 0,
          explanation: q.explanation?.trim() || "",
        }))
        .filter((q) => q.question && q.options.length >= 2);

      const cleanedFlashcards = lessonFlashcards
        .map((f) => ({ front: f.front.trim(), back: f.back.trim() }))
        .filter((f) => f.front && f.back);

      await apiFetch(`/lessons/${savedLesson.id}/quiz-flashcards`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz: cleanedQuiz,
          flashcards: cleanedFlashcards,
        }),
      });

      toast.success("Đã lưu bài học thành công");
      await fetchLessons(selectedCurriculum.id);
      fetchCurricula();
      resetLessonForm();
      setView("lessons");
    } catch {
      setLessonError("Không thể lưu bài học. Vui lòng thử lại.");
    }
  };

  const handleEditLesson = async (lesson: LessonItem) => {
    setEditingLessonId(lesson.id);
    setLessonTitle(lesson.title || "");
    setLessonDescription(lesson.description || "");
    setLessonContent(
      Array.isArray(lesson.content)
        ? lesson.content.map((b) => b?.text || "").filter(Boolean).join("\n")
        : ""
    );
    setLessonSummary(lesson.summary || "");
    setLessonKeyPoints(Array.isArray(lesson.key_points) ? lesson.key_points.join("\n") : "");
    setLessonQuiz(Array.isArray(lesson.quiz) ? lesson.quiz : []);
    setLessonFlashcards(Array.isArray(lesson.flashcards) ? lesson.flashcards : []);
    
    // Tải hình ảnh của bài học từ server
    try {
      const imgs = await apiFetch<any[]>(`/lessons/${lesson.id}/images`);
      setLessonImages(imgs || []);
    } catch (err) {
      console.error("Error fetching lesson images:", err);
      setLessonImages([]);
    }
    
    setLessonError("");
    setView("lesson_form");
  };

  const addQuiz = () => setLessonQuiz([...lessonQuiz, { question: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }]);
  const removeQuiz = (idx: number) => setLessonQuiz(lessonQuiz.filter((_, i) => i !== idx));
  const updateQuiz = (idx: number, cb: (old: QuizItem) => QuizItem) => setLessonQuiz(lessonQuiz.map((q, i) => i === idx ? cb(q) : q));

  const addFlashcard = () => setLessonFlashcards([...lessonFlashcards, { front: "", back: "" }]);
  const removeFlashcard = (idx: number) => setLessonFlashcards(lessonFlashcards.filter((_, i) => i !== idx));
  const updateFlashcard = (idx: number, cb: (old: FlashcardItem) => FlashcardItem) => setLessonFlashcards(lessonFlashcards.map((f, i) => i === idx ? cb(f) : f));

  const handleImportFlashcards = () => {
    if (!importFlashcardContent.trim()) {
      setShowImportFlashcard(false);
      return;
    }
    
    const lines = importFlashcardContent.split("\n");
    const newCards = lines
      .map(line => {
        const [front, ...backParts] = line.split(",");
        const back = backParts.join(",").trim();
        return { front: front.trim(), back: back };
      })
      .filter(card => card.front && card.back);
      
    if (newCards.length > 0) {
      setLessonFlashcards(prev => [...prev, ...newCards]);
      toast.success(`Đã nhập ${newCards.length} thẻ`);
    }
    
    setImportFlashcardContent("");
    setShowImportFlashcard(false);
  };

  const handleUploadImages = async (files: FileList, lessonId: string) => {
    setUploadingImages(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("images", file));

      const newImages = await apiFetch<any[]>(`/lessons/${lessonId}/images`, {
        method: "POST",
        body: formData,
      });

      setLessonImages(prev => [...prev, ...newImages]);
      toast.success("Đã tải ảnh lên");
      
      if (selectedCurriculum) fetchLessons(selectedCurriculum.id);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Không thể tải ảnh lên");
    } finally {
      setUploadingImages(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async (imageId: string, lessonId: string) => {
    const ok = window.confirm("Xóa hình ảnh này?");
    if (!ok) return;
    try {
      await apiFetch(`/lessons/${lessonId}/images/${imageId}`, { method: "DELETE" });
      setLessonImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success("Đã xóa ảnh");
      if (selectedCurriculum) fetchLessons(selectedCurriculum.id);
    } catch {
      toast.error("Không thể xóa ảnh");
    }
  };

  if (isAuthLoading || (isFetching && !subject)) {
    return (
      <div className="container py-20 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="mt-4 text-muted-foreground font-medium animate-pulse">Đang tải thông tin môn học...</p>
      </div>
    );
  }

  if (!subject) return <div className="container py-10">Không tìm thấy môn học.</div>;

  const groupedCurricula = subjectCourses.reduce((acc, c) => {
    const level = c.education_level || "Chưa phân loại";
    if (!acc[level]) acc[level] = [];
    acc[level].push(c);
    return acc;
  }, {} as Record<string, CurriculumData[]>);

  const levelOrder = ["Tiểu học", "Trung học cơ sở", "Trung học Phổ Thông", "Đại Học / Cao Đẳng", "Khác", "Chưa phân loại"];
  const sortedLevels = Object.keys(groupedCurricula).sort((a, b) => {
    const idxA = levelOrder.indexOf(a);
    const idxB = levelOrder.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  return (
    <div className="container py-10">
      {view === "list" ? (
        <div className="animate-fade-in">
          <Link to="/subjects" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </Link>

          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-0 animate-fade-up">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{subject.icon}</span>
              <div>
                <h1 className="font-heading text-3xl font-bold">{subject.name}</h1>
                <p className="text-muted-foreground">{subject.description}</p>
              </div>
            </div>
            
            {user && (
              <Button 
                onClick={() => {
                  setEditingCurriculum(null);
                  setShowCreateModal(true);
                }}
                className="rounded-xl shadow-lg shadow-primary/20 bg-[#2D9B63] hover:bg-[#258a56] text-white font-bold h-11 px-6 active:scale-95 transition-all"
              >
                <Plus className="mr-2 h-5 w-5" /> Tạo giáo trình mới
              </Button>
            )}
          </div>

          <div className="space-y-12">
            {sortedLevels.map((level, levelIdx) => (
              <div key={level} className="space-y-6 opacity-0 animate-fade-up" style={{ animationDelay: `${levelIdx * 100}ms`, animationFillMode: "forwards" }}>
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <h2 className="font-heading text-xl font-bold text-foreground/80">{level}</h2>
                  <span className="ml-auto text-xs font-semibold text-muted-foreground uppercase tracking-wider">{groupedCurricula[level].length} giáo trình</span>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {groupedCurricula[level].map((course, i) => (
                    <div
                      key={course.id}
                      className="group flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-all hover:shadow-md hover:border-primary/20"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted overflow-hidden border relative">
                          {course.image_url ? (
                            <img src={course.image_url.startsWith("http") ? course.image_url : `${API_BASE_URL.replace("/api", "")}${course.image_url}`} alt={course.name} className="h-full w-full object-cover" />
                          ) : (
                            <BookOpen className="h-8 w-8 text-primary/50" />
                          )}
                          <div className="absolute top-0 left-0 bg-primary shadow-sm text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-br-lg rounded-tl-xl">{i + 1}</div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold truncate" title={course.name}>{course.name}</p>
                            {course.is_public ? (
                              <Eye className="h-4 w-4 shrink-0 text-blue-500" />
                            ) : (
                              <EyeOff className="h-4 w-4 shrink-0 text-amber-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 text-xs">
                             Lớp {course.grade || "Chưa phân loại"}<br/>
                             NXB: {course.publisher || "Không có"}
                          </p>
                          <div className="mt-2.5 inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-[#2D9B63] border border-[#2D9B63]/20">
                            {course.lesson_count || 0} bài học
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl h-9 flex-1 font-bold text-xs"
                          onClick={() => viewLessons(course)}
                        >
                          Quản lý bài học
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-primary/10"
                            onClick={() => handleEditCurriculum(course)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-xl hover:bg-destructive/10 text-destructive"
                            onClick={() => handleDeleteCurriculum(course.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {subjectCourses.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed p-10 text-center">
                 <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/30 mb-4" />
                 <p className="text-muted-foreground font-medium">Chưa có giáo trình nào do bạn tạo cho môn học này.</p>
              </div>
            )}
          </div>
        </div>
      ) : view === "lessons" ? (
        <div className="animate-fade-in space-y-6">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setView("list")}
                    className="rounded-xl p-2 hover:bg-muted transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">{selectedCurriculum?.name}</h2>
                      <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                        Môn: {subject?.name}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {lessonsSubView === "manage" ? "Quản lý bài học" : "Ôn tập nội dung"} ({lessons.length} bài)
                    </p>
                    {lessonsSubView === "manage" && (
                      <Button 
                        onClick={() => { 
                          resetLessonForm(); 
                          setView("lesson_form"); 
                        }}
                        variant="outline"
                        className="mt-3 rounded-full border-[#2D9B63] text-[#2D9B63] hover:bg-emerald-50 font-bold h-9 px-6 transition-all"
                      >
                        <Plus className="mr-2 h-4 w-4" /> Tạo ghi chú mới
                      </Button>
                    )}
                  </div>
                </div>

                {/* Tab Switcher - Integrated in header with 'Personal/Community' format */}
                <div className="flex rounded-full bg-muted/50 p-1 shadow-sm border border-white/40">
                  <button
                    onClick={() => setLessonsSubView("manage")}
                    className={`flex items-center justify-center rounded-full px-6 py-2 text-sm font-bold transition-all duration-300 ${
                      lessonsSubView === "manage"
                        ? "bg-[#2D9B63] text-white shadow-md scale-[1.02]"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/40"
                    }`}
                  >
                    Quản lý bài học
                  </button>
                  <button
                    onClick={() => setLessonsSubView("review")}
                    className={`flex items-center justify-center rounded-full px-6 py-2 text-sm font-bold transition-all duration-300 ${
                      lessonsSubView === "review"
                        ? "bg-[#2D9B63] text-white shadow-md scale-[1.02]"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/40"
                    }`}
                  >
                    Ôn tập
                  </button>
                </div>
              </div>
              
            </div>
          </div>

          {lessonsSubView === "manage" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lessons.length === 0 && (
                <div className="col-span-full rounded-2xl border-2 border-dashed p-10 text-center">
                  <p className="text-muted-foreground font-medium">Chưa có bài học nào cho giáo trình này.</p>
                </div>
              )}
              {lessons.map((lesson, i) => (
                <div key={lesson.id} className="flex flex-col rounded-2xl border bg-card p-5 group hover:shadow-lg transition-all border-white/50 shadow-sm">
                  <div className="flex-1 mb-4">
                    <p className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                      {i + 1}. {lesson.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {lesson.description || "Không có mô tả nội dung bài học..."}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-muted/50 mt-auto">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="rounded-xl h-9 px-4 hover:border-primary/30 hover:text-primary transition-all"
                      onClick={() => handleEditLesson(lesson)}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Sửa
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="rounded-xl h-9 px-4 shadow-sm shadow-red-100"
                      onClick={() => handleDeleteLesson(lesson.id)}
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Xóa
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Review Mode */
            <div className="animate-fade-in">
              {!activeReviewLessonId ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {lessons.map((lesson, i) => {
                    const isCompleted = !!lessonProgress[lesson.id];
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => {
                          setActiveReviewLessonId(lesson.id);
                          setReviewActiveTab("content");
                        }}
                        className={`group flex flex-col text-left rounded-2xl border p-5 transition-all hover:shadow-lg hover:border-primary/40 hover:-translate-y-1 ${
                          isCompleted ? 'bg-emerald-50/30 border-emerald-100' : 'bg-card border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                           <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold transition-colors ${
                              isCompleted 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white'
                           }`}>
                             {i + 1}
                           </div>
                           {isCompleted && (
                             <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-600 uppercase tracking-tight">
                               <CheckCircle2 className="h-3 w-3" />
                               Đã học
                             </div>
                           )}
                        </div>
                        <h3 className={`font-bold transition-colors mb-1 ${
                          isCompleted ? 'text-emerald-900' : 'text-foreground group-hover:text-primary'
                        }`}>
                          {lesson.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {lesson.description || "Nhấn để bắt đầu ôn tập"}
                        </p>
                        
                        <div className={`mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                          isCompleted ? 'text-emerald-500' : 'text-primary/70 opacity-0 group-hover:opacity-100'
                        }`}>
                          {isCompleted ? "Ôn tập lại" : "Học ngay"} <ArrowLeft className="h-3 w-3 rotate-180" />
                        </div>
                      </button>
                    );
                  })}
                  {lessons.length === 0 && (
                    <div className="col-span-full rounded-2xl border-2 border-dashed p-10 text-center">
                      <p className="text-muted-foreground">Bạn chưa có bài học nào để ôn tập.</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Full Study Interface */
                <LessonReviewMode 
                  lessonId={activeReviewLessonId} 
                  onBack={() => setActiveReviewLessonId(null)}
                  onProgressUpdate={(lessonId, completed) => {
                    setLessonProgress(prev => ({
                      ...prev,
                      [lessonId]: completed
                    }));
                  }}
                />
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
          <div className="space-y-1 ml-10">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-primary/70">{selectedCurriculum?.name}</span>
              <span className="text-xs text-muted-foreground">/</span>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{subject?.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-1">
            <button
              onClick={() => setView("lessons")}
              className="rounded-xl p-2 hover:bg-muted transition-colors -ml-12"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-2xl font-bold">{editingLessonId ? "Sửa bài học" : "Tạo bài học mới"}</h2>
          </div>
          
          <div className="space-y-6 rounded-3xl border bg-card/50 p-8 shadow-sm">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold ml-1 text-foreground/70">Tên bài học</label>
                  <input
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className="w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="VD: Bài 1: Danh từ"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold ml-1 text-foreground/70">Mô tả ngắn</label>
                  <input
                    value={lessonDescription}
                    onChange={(e) => setLessonDescription(e.target.value)}
                    className="w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Mô tả cho giáo trình"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold ml-1 text-foreground/70">Nội dung bài học (mỗi dòng là một đoạn)</label>
                <textarea
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  rows={8}
                  className="w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  placeholder="Nhập kiến thức trọng tâm..."
                />
              </div>

              {/* ── Lesson Images ── */}
              <div className="space-y-3 rounded-2xl border bg-muted/5 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImagePlus className="h-5 w-5 text-primary" />
                    <h3 className="font-bold text-sm text-foreground/70 tracking-tight">Hình ảnh bài học</h3>
                  </div>
                  {editingLessonId ? (
                    <div>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0 && editingLessonId) {
                            handleUploadImages(e.target.files, editingLessonId);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl h-9 px-4 border-primary/20 text-primary hover:bg-primary/5"
                        disabled={uploadingImages}
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <Upload className="mr-1.5 h-4 w-4" />
                        {uploadingImages ? "Đang tải..." : "Thêm ảnh"}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">Lưu bài học trước để thêm ảnh</p>
                  )}
                </div>
                
                {lessonImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                    {lessonImages.map((img) => {
                      const src = img.file_url.startsWith("http")
                        ? img.file_url
                        : `${API_BASE_URL.replace("/api", "")}${img.file_url}`;
                      return (
                        <div key={img.id} className="group relative rounded-xl overflow-hidden border bg-background aspect-video shadow-sm">
                          <img
                            src={src}
                            alt={img.caption || "Hình ảnh bài học"}
                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => editingLessonId && handleDeleteImage(img.id, editingLessonId)}
                              className="rounded-full bg-destructive p-2 text-white hover:bg-destructive/80 transition-colors shadow-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {lessonImages.length === 0 && editingLessonId && (
                  <div className="py-8 text-center border-2 border-dashed rounded-xl bg-background/50">
                    <p className="text-xs text-muted-foreground font-medium">Chưa có hình ảnh nào. Nhấn "Thêm ảnh" để tải lên.</p>
                  </div>
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold ml-1 text-foreground/70">Tóm tắt bài học</label>
                  <textarea
                    value={lessonSummary}
                    onChange={(e) => setLessonSummary(e.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                    placeholder="Ghi nhận xét ngắn gọn..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold ml-1 text-foreground/70">Các ý chính (mỗi dòng một ý)</label>
                  <textarea
                    value={lessonKeyPoints}
                    onChange={(e) => setLessonKeyPoints(e.target.value)}
                    rows={4}
                    className="w-full rounded-2xl border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                    placeholder="Ý chính 1&#10;Ý chính 2"
                  />
                </div>
              </div>

              {/* Quiz Section */}
              <div className="pt-6 border-t mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
                    Trắc nghiệm
                  </h3>
                  <Button onClick={addQuiz} variant="outline" size="sm" className="rounded-xl border-primary/20 text-primary hover:bg-primary/5">
                    + Thêm câu hỏi
                  </Button>
                </div>
                <div className="space-y-5">
                  {lessonQuiz.map((q, qi) => (
                    <div key={qi} className="p-5 rounded-2xl border bg-muted/20 space-y-4 relative group">
                      <button 
                        onClick={() => removeQuiz(qi)}
                        className="absolute top-4 right-4 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div>
                        <label className="text-xs font-bold text-muted-foreground uppercase mb-1 block">Câu {qi + 1}</label>
                        <input
                          value={q.question}
                          onChange={(e) => updateQuiz(qi, old => ({ ...old, question: e.target.value }))}
                          placeholder="Nhập câu hỏi..."
                          className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none"
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="relative">
                            <input
                              value={opt}
                              onChange={(e) => updateQuiz(qi, old => ({
                                ...old,
                                options: old.options.map((v, i) => i === oi ? e.target.value : v)
                              }))}
                              placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`}
                              className={`w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none ${q.correctIndex === oi ? 'border-primary ring-1 ring-primary/20' : ''}`}
                            />
                            {q.correctIndex === oi && <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-primary text-white text-[8px] flex items-center justify-center rounded-full font-bold shadow-sm">✓</div>}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-4 items-center">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-muted-foreground/60 uppercase ml-1 block mb-1">Giải thích (không bắt buộc)</label>
                          <input
                            value={q.explanation}
                            onChange={(e) => updateQuiz(qi, old => ({ ...old, explanation: e.target.value }))}
                            placeholder="VD: Vì sao đây là đáp án đúng?"
                            className="w-full rounded-xl border bg-background px-4 py-2 text-xs outline-none"
                          />
                        </div>
                        <div className="w-32">
                          <label className="text-[10px] font-bold text-muted-foreground/60 uppercase ml-1 block mb-1">Đáp án đúng</label>
                          <select
                            value={q.correctIndex}
                            onChange={(e) => updateQuiz(qi, old => ({ ...old, correctIndex: Number(e.target.value) }))}
                            className="w-full rounded-xl border bg-background px-3 py-2 text-xs outline-none"
                          >
                            <option value={0}>Câu A</option>
                            <option value={1}>Câu B</option>
                            <option value={2}>Câu C</option>
                            <option value={3}>Câu D</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Flashcard Section */}
              <div className="pt-6 border-t mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-foreground/70">
                    Flashcards
                  </h3>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setShowImportFlashcard(true)} 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50"
                    >
                      Nhập
                    </Button>
                    <Button 
                      onClick={addFlashcard} 
                      variant="outline" 
                      size="sm" 
                      className="rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50"
                    >
                      <Plus className="mr-1 h-4 w-4" /> Thẻ
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3">
                  {lessonFlashcards.map((f, fi) => (
                    <div key={fi} className="p-4 rounded-2xl border bg-muted/5 space-y-3 relative group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Thẻ {fi + 1}</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFlashcard(fi)}
                          className="h-8 px-3 rounded-xl shadow-sm"
                        >
                          Xóa
                        </Button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-orange-400 uppercase ml-1">Mặt trước</label>
                          <input
                            value={f.front}
                            onChange={(e) => updateFlashcard(fi, old => ({ ...old, front: e.target.value }))}
                            placeholder="Câu hỏi/Từ vựng..."
                            className="w-full rounded-xl border-orange-100 bg-white px-3 py-2.5 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-500/10"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-orange-400 uppercase ml-1">Mặt sau</label>
                          <input
                            value={f.back}
                            onChange={(e) => updateFlashcard(fi, old => ({ ...old, back: e.target.value }))}
                            placeholder="Đáp án/Định nghĩa..."
                            className="w-full rounded-xl border-orange-100 bg-white px-3 py-2.5 text-sm outline-none shadow-sm focus:ring-2 focus:ring-orange-500/10"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 flex justify-end gap-3 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setView("lessons")}
                  className="rounded-xl h-11 px-8 font-bold border-muted-foreground/20"
                >
                  Hủy
                </Button>
                <Button 
                  onClick={handleSaveLesson}
                  className="rounded-xl h-11 px-10 font-bold bg-[#2D9B63] hover:bg-[#258a56] shadow-lg shadow-emerald-500/20"
                >
                  {editingLessonId ? "Cập nhật bài học" : "Lưu bài học"}
                </Button>
              </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CurriculumCreateModal
          onCancel={() => setShowCreateModal(false)}
          curriculum={editingCurriculum || undefined}
          subjectId={subjectId || ""}
          subjectName={subject?.name || ""}
          subjectIcon={subject?.icon}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchCurricula();
          }}
        />
      )}

      <Dialog open={showImportFlashcard} onOpenChange={setShowImportFlashcard}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-orange-600">Nhập Flashcards</DialogTitle>
            <DialogDescription className="text-sm italic">
              Nhập danh sách thẻ theo định dạng: <b className="text-foreground">Mặt trước, Mặt sau</b> (mỗi thẻ 1 dòng)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="VD:&#10;Quả táo, Apple&#10;Quả chuối, Banana"
              value={importFlashcardContent}
              onChange={(e) => setImportFlashcardContent(e.target.value)}
              className="min-h-[200px] rounded-2xl border-orange-100 focus:ring-orange-500/20 resize-none p-4 text-sm"
            />
          </div>
          <DialogFooter className="sm:justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setShowImportFlashcard(false)} className="rounded-xl h-11 px-6">
              Hủy
            </Button>
            <Button onClick={handleImportFlashcards} className="rounded-xl h-11 px-6 bg-orange-500 hover:bg-orange-600 border-none text-white font-bold shadow-lg shadow-orange-500/20">
              Nhập ngay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ──── Sub-components for Review Mode ────

function ContentRenderer({ blocks }: { blocks: any[] }) {
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            if (block.level === 1) return <h1 key={i} className="font-heading text-2xl font-bold mt-0 mb-2">{block.text}</h1>;
            return <h2 key={i} className="font-heading text-xl font-bold mt-6 mb-2">{block.text}</h2>;
          case "paragraph":
            return <p key={i} className="leading-relaxed text-foreground/90">{block.text}</p>;
          case "quote":
            return (
              <blockquote key={i} className="border-l-4 border-primary/30 bg-primary/5 rounded-r-xl pl-5 pr-4 py-3 italic text-foreground/80">
                {block.text}
              </blockquote>
            );
          case "divider":
            return <hr key={i} className="my-6 border-border" />;
          default:
            return <p key={i}>{block.text}</p>;
        }
      })}
    </div>
  );
}

function LessonReviewMode({ 
  lessonId, 
  onBack,
  onProgressUpdate 
}: { 
  lessonId: string; 
  onBack: () => void;
  onProgressUpdate: (id: string, done: boolean) => void;
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"content" | "quiz" | "flashcard" | "summary">("content");
  const [lesson, setLesson] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDone, setIsDone] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [slideIndex, setSlideIndex] = useState(0);

  const tabs = [
    { id: "content", label: "Nội dung", icon: BookOpen },
    { id: "quiz", label: "Trắc nghiệm", icon: HelpCircle },
    { id: "flashcard", label: "Flashcard", icon: Layers },
    { id: "summary", label: "Tổng kết", icon: FileText },
  ] as const;

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [lessonRes, progress] = await Promise.all([
          apiFetch<any>(`/lessons/${lessonId}`),
          user?.id
            ? apiFetch<Array<{ lesson_id: string; completed: boolean }>>(`/progress?student_id=${encodeURIComponent(user.id)}`)
            : Promise.resolve([]),
        ]);
        
        setLesson({
          ...lessonRes,
          content: Array.isArray(lessonRes.content) ? lessonRes.content : [],
          quiz: Array.isArray(lessonRes.quiz) ? lessonRes.quiz : [],
          flashcards: Array.isArray(lessonRes.flashcards) ? lessonRes.flashcards : [],
          keyPoints: Array.isArray(lessonRes.key_points) ? lessonRes.key_points : [],
          vocabulary: Array.isArray(lessonRes.vocabulary) ? lessonRes.vocabulary : [],
        });
        
        setIsDone(Boolean((progress || []).find((p: any) => p.lesson_id === lessonId)?.completed));

        // Fetch images
        const imgs = await apiFetch<any[]>(`/lessons/${lessonId}/images`);
        setImages(imgs || []);
        setSlideIndex(0);
      } catch (err) {
        console.error("Error loading lesson details:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lessonId, user?.id]);

  const handleToggleDone = async () => {
    if (!user?.id || !lessonId) return;
    const next = !isDone;
    setIsDone(next);
    try {
      await apiFetch(`/progress/${lessonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: user.id,
          completed: next,
        }),
      });
      onProgressUpdate(lessonId, next);
      toast.success(next ? "Đã đánh dấu hoàn thành" : "Đã bỏ đánh dấu");
    } catch {
      setIsDone(!next);
      toast.error("Không thể cập nhật tiến độ");
    }
  };

  if (loading) return (
    <div className="py-20 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="mt-4 text-muted-foreground">Đang tải nội dung bài học...</p>
    </div>
  );

  if (!lesson) return <div className="py-20 text-center">Không tìm thấy bài học.</div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      {/* Centered Header */}
      <div className="relative text-center px-12 py-4">
        <button
          onClick={onBack}
          className="absolute left-0 top-1/2 -translate-y-1/2 group flex items-center justify-center h-10 w-10 rounded-full border bg-white/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all shadow-sm"
          title="Quay lại danh sách"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{lesson.title}</h1>
          <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">{lesson.description}</p>
        </div>

        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <Button
            variant={isDone ? "default" : "outline"}
            size="sm"
            onClick={handleToggleDone}
            className={`rounded-2xl h-11 px-6 font-bold shadow-sm transition-all duration-300 ${
              isDone 
                ? 'bg-emerald-500 hover:bg-emerald-600 border-none text-white' 
                : 'hover:border-primary/30'
            }`}
          >
            <CheckCircle2 className={`mr-2 h-4 w-4 ${isDone ? 'animate-bounce' : ''}`} />
            {isDone ? "Đã học" : "Đánh dấu học"}
          </Button>
        </div>
      </div>

      {/* Internal Navigation Tabs - Centered & Refined */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 overflow-x-auto rounded-2xl bg-muted/40 p-1.5 border border-white shadow-inner">
          {tabs.map((tab) => {
             const isActive = activeTab === tab.id;
             return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2.5 whitespace-nowrap rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${
                  isActive
                    ? "bg-white text-primary shadow-sm scale-[1.03]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/40"
                }`}
              >
                <tab.icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`} />
                {tab.label}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full shadow-sm shadow-primary/20" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="animate-fade-in">
        {activeTab === "content" && (
          <div className="space-y-6">
            {images.length > 0 && (
              <div className="rounded-3xl bg-card shadow-lg border-2 border-primary/5 overflow-hidden transition-all hover:shadow-xl">
                <div className="flex items-center justify-between px-8 py-5 border-b bg-primary/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                      <ImageIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold uppercase tracking-widest text-primary/70">Hình ảnh bài học</span>
                      <span className="text-[10px] text-muted-foreground font-medium">Trực quan hóa nội dung</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-white text-[10px] font-bold text-primary shadow-sm border border-primary/10">
                      {slideIndex + 1} / {images.length}
                    </div>
                  </div>
                </div>
                <div className="relative group bg-muted/5 p-6">
                  <div className="aspect-[16/10] flex items-center justify-center bg-white rounded-2xl shadow-inner border border-muted/20 overflow-hidden">
                     <img
                       src={(() => {
                         const url = images[slideIndex]?.file_url || "";
                         return url.startsWith("http") ? url : `${API_BASE_URL.replace("/api", "")}${url}`;
                       })()}
                       alt={images[slideIndex]?.caption || ""}
                       className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                     />
                  </div>
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setSlideIndex((p) => (p - 1 + images.length) % images.length)}
                        className="absolute left-10 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center rounded-full bg-white/90 text-primary shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={() => setSlideIndex((p) => (p + 1) % images.length)}
                        className="absolute right-10 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center rounded-full bg-white/90 text-primary shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="rounded-3xl bg-card p-10 border shadow-md hover:shadow-lg transition-all">
              <ContentRenderer blocks={lesson.content} />
            </div>
            
            {lesson.vocabulary && lesson.vocabulary.length > 0 && (
              <div className="rounded-3xl bg-card p-8 border shadow-md">
                <h3 className="mb-6 flex items-center gap-3 font-bold text-xl text-secondary">
                  <div className="p-2 rounded-xl bg-secondary/10">
                    <BookMarked className="h-6 w-6" />
                  </div>
                  Danh sách từ ngữ
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {lesson.vocabulary.map((v: any, i: number) => (
                    <div key={i} className="flex flex-col gap-1 rounded-2xl bg-muted/20 p-5 border border-white transition-all hover:bg-white hover:shadow-md group">
                      <span className="font-bold text-secondary text-lg group-hover:text-primary transition-colors">{v.word}</span>
                      <span className="text-sm text-muted-foreground leading-relaxed italic">{v.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "quiz" && (
          <div className="rounded-2xl bg-card p-8 border shadow-sm">
            {lesson.quiz?.length > 0 ? (
              <QuizRunner questions={lesson.quiz} />
            ) : (
              <div className="text-center py-12">
                <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground font-medium">Chưa có trắc nghiệm cho bài học này.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "flashcard" && (
          <div className="rounded-2xl bg-card p-8 border shadow-sm">
            {lesson.flashcards?.length > 0 ? (
              <FlashcardViewer flashcards={lesson.flashcards} />
            ) : (
              <div className="text-center py-12">
                <Layers className="mx-auto h-12 w-12 text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground font-medium">Chưa có flashcards cho bài học này.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "summary" && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-card p-8 border shadow-sm">
              <h3 className="mb-4 font-bold text-xl flex items-center gap-2">
                📝 Tổng kết
              </h3>
              <p className="text-foreground/90 leading-relaxed">{lesson.summary || "Chưa có tóm tắt."}</p>
            </div>
            
            {lesson.keyPoints?.length > 0 && (
              <div className="rounded-2xl bg-primary/5 border-2 border-primary/10 p-6">
                <h3 className="mb-4 font-bold text-lg flex items-center gap-2 text-primary">
                  <Lightbulb className="h-5 w-5" /> Điểm cần nhớ
                </h3>
                <ul className="space-y-3">
                  {lesson.keyPoints.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-foreground/85">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
