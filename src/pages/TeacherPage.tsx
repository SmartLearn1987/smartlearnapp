import { useState, useEffect, useRef, useCallback } from "react";
import RichTextEditor, { type RichBlock } from "@/components/RichTextEditor";
import { BookOpen, Plus, ArrowLeft, Upload, Trash2, Lock, ImagePlus, X, Globe, CheckCircle2, HelpCircle, Layers, FileText, Lightbulb, BookMarked, ChevronLeft, ChevronRight, ImageIcon, MoreVertical, Edit2 } from "lucide-react";
import QuizRunner from "@/components/QuizRunner";
import FlashcardViewer from "@/components/FlashcardViewer";
import ImageLightbox from "@/components/ImageLightbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import FileUploadZone from "@/components/FileUploadZone";
import SubjectForm from "../components/SubjectForm";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ── types ──────────────────────────────────────────────────────────────────
interface Subject { id: string; name: string; description: string; icon: string; curriculum_count: number }
interface Curriculum {
  id: string;
  subject_id: string;
  name: string;
  grade: string;
  publisher: string;
  lesson_count: number;
  education_level?: string | null;
  is_public?: boolean;
  file_url?: string | null;
  file_content?: string | null;
  image_url?: string | null;
  created_at?: string;
  created_by?: string;
  authorName?: string;
  authorAvatar?: string | null;
  authorRole?: string;
}
interface QuizItem { id?: string; question: string; options: string[]; correctIndex: number; explanation: string }
interface FlashcardItem { id?: string; front: string; back: string }
interface LessonImage { id: string; lesson_id: string; file_url: string; caption: string | null; sort_order: number }
interface LessonItem {
  id: string;
  title: string;
  description: string;
  summary?: string;
  content?: Array<{ type: string; text: string }>;
  key_points?: string[];
  quiz?: QuizItem[];
  flashcards?: FlashcardItem[];
}

// ── helpers ────────────────────────────────────────────────────────────────
const formatSize = (b: number) => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

// Các loại file có thể đọc dưới dạng text
const TEXT_TYPES = ["text/plain", "text/csv", "application/json"];

function SortableSubjectItem({ subject, onClick, onEdit, onDelete, isAdmin }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: subject.id, disabled: !isAdmin });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`group ${isAdmin ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} rounded-2xl border bg-card p-6 transition-all hover:shadow-md hover:border-primary/30 ${isDragging ? 'opacity-50 ring-2 ring-primary shadow-xl scale-105' : ''}`}
    >
      <div className="flex items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{subject.icon}</span>
          <div>
            <h3 className="font-bold">{subject.name}</h3>
            <p className="text-sm text-muted-foreground">{subject.curriculum_count} giáo trình</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2 pointer-events-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 rounded-lg hover:bg-primary/10"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 rounded-xl">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="cursor-pointer gap-2">
                  <Edit2 className="h-4 w-4" /> Chỉnh sửa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <Trash2 className="h-4 w-4" /> Xóa
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableCurriculumItem({ curriculum, onClick, onEdit, onDelete, isAdmin, viewLessons, index }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: curriculum.id, disabled: !isAdmin });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group flex flex-col gap-4 rounded-2xl border bg-card p-5 transition-all hover:shadow-md hover:border-primary/20 ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-50 ring-2 ring-primary shadow-xl scale-105' : ''}`}
    >
      <div className="flex items-start gap-4 pointer-events-none">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted overflow-hidden border relative">
          {curriculum.image_url ? (
            <img src={curriculum.image_url.startsWith("http") ? curriculum.image_url : `${API_BASE_URL.replace("/api", "")}${curriculum.image_url}`} alt={curriculum.name} className="h-full w-full object-cover" />
          ) : (
            <BookOpen className="h-8 w-8 text-primary/50" />
          )}
          <div className="absolute top-0 left-0 bg-primary shadow-sm text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-br-lg rounded-tl-xl">{index + 1}</div>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold truncate" title={curriculum.name}>{curriculum.name}</p>
            <div className="flex items-center gap-1 shrink-0">

              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10" onPointerDown={(e) => e.stopPropagation()}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-xl">
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onEdit(curriculum); }} 
                      className="cursor-pointer gap-2 font-medium"
                    >
                      <Edit2 className="h-4 w-4" /> Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={(e) => { e.stopPropagation(); onDelete(curriculum.id); }} 
                      className="cursor-pointer gap-2 font-medium text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" /> Xóa giáo trình
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Lớp {curriculum.grade || "Chưa phân loại"}<br/>
            NXB: {curriculum.publisher || "Không có"}
          </p>
          
          <div className="mt-2.5 flex flex-wrap gap-2">
            <div className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#2D9B63] border border-[#2D9B63]/10 uppercase tracking-tighter">
              {curriculum.lesson_count} bài học
            </div>
          </div>
          
          <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground/70">
              {curriculum.created_at ? new Date(curriculum.created_at).toLocaleDateString("vi-VN") : "---"}
            </span>

            {/* User Badge / Avatar */}
            <div className="flex items-center gap-2 rounded-full bg-muted/40 pl-1 pr-2.5 py-0.5 border border-border/30 shadow-sm">
              {curriculum.authorAvatar ? (
                <img 
                  src={curriculum.authorAvatar} 
                  alt={curriculum.authorName} 
                  className="h-5 w-5 rounded-full object-cover border border-white/60 shadow-sm" 
                />
              ) : (
                <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold shadow-sm ${
                  curriculum.authorRole === "admin" 
                    ? "bg-[#2D9B63] text-white" 
                    : curriculum.authorRole === "teacher" 
                    ? "bg-sky-500 text-white" 
                    : "bg-muted-foreground/30 text-muted-foreground"
                }`}>
                  {(curriculum.authorName || "Q").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[10px] font-bold text-foreground/70 truncate max-w-[90px]">
                {curriculum.authorName || (curriculum.authorRole === "admin" || curriculum.created_by === "admin" ? "Quản trị viên" : "Hệ thống")}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t pointer-events-auto">
        <Button
          variant="outline"
          className="w-full rounded-xl border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 font-semibold"
          onClick={(e) => { e.stopPropagation(); viewLessons(curriculum); }}
        >
          Quản lý bài học
        </Button>
      </div>
    </div>
  );
}

export default function TeacherPage() {
  const { user, isAdmin } = useAuth();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // navigation state
  const [view, setView] = useState<"subjects" | "curricula" | "upload" | "lessons" | "lesson_form">("subjects");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedCurriculum, setSelectedCurriculum] = useState<Curriculum | null>(null);

  // data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [lessonsSubView, setLessonsSubView] = useState<"manage" | "review">("manage");
  const [lessonProgress, setLessonProgress] = useState<Record<string, boolean>>({});
  const [activeReviewLessonId, setActiveReviewLessonId] = useState<string | null>(null);
  const [reviewActiveTab, setReviewActiveTab] = useState<"content" | "quiz" | "flashcard" | "summary">("content");
  const [activeLessonSlideIndex, setActiveLessonSlideIndex] = useState(0);

  // subject form
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [showCurriculumForm, setShowCurriculumForm] = useState(false);
  const [editingCurriculum, setEditingCurriculum] = useState<Curriculum | null>(null);
  const [curriculumError, setCurriculumError] = useState("");

  // upload wizard state
  const [uploadStep, setUploadStep] = useState<"config" | "preview">("config");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileError, setFileError] = useState<string>("");
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);

  // config
  const [curriculumName, setCurriculumName] = useState("");
  const [grade, setGrade] = useState("");
  const [publisher, setPublisher] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [lessonCount, setLessonCount] = useState(5);

  // lesson form
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonBlocks, setLessonBlocks] = useState<RichBlock[]>([]);
  const [lessonSummary, setLessonSummary] = useState("");
  const [lessonKeyPoints, setLessonKeyPoints] = useState("");
  const [lessonError, setLessonError] = useState("");
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonQuiz, setLessonQuiz] = useState<QuizItem[]>([]);
  const [lessonFlashcards, setLessonFlashcards] = useState<FlashcardItem[]>([]);
  const [showImportFlashcard, setShowImportFlashcard] = useState(false);
  const [importFlashcardContent, setImportFlashcardContent] = useState("");
  const [lessonImages, setLessonImages] = useState<LessonImage[]>([]);
  const [pendingImageFiles, setPendingImageFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── fetch subjects ─────────────────────────────────────────────────────
  useEffect(() => { fetchSubjects(); }, []);
  const fetchSubjects = async () => {
    try {
      const data = await apiFetch<Subject[]>("/subjects?mode=teacher");
      setSubjects(data || []);
    } catch {
      setSubjects([]);
    }
  };

  // ── fetch curricula ────────────────────────────────────────────────────
  const fetchCurricula = async (subjectId: string) => {
    try {
      let data = await apiFetch<Curriculum[]>(`/curricula?subject_id=${encodeURIComponent(subjectId)}`);
      
      // Filter based on role: Admin sees all, Teachers see only their own
      if (user && !isAdmin) {
        data = (data || []).filter(c => c.created_by === user.id);
      }
      
      setCurricula(data || []);
    } catch {
      setCurricula([]);
    }
  };

  const fetchLessons = async (curriculumId: string) => {
    try {
      const [lessonsData, progressData] = await Promise.all([
        apiFetch<LessonItem[]>(`/lessons?curriculum_id=${encodeURIComponent(curriculumId)}`),
        user?.id 
          ? apiFetch<any[]>(`/progress?student_id=${encodeURIComponent(user.id)}`)
          : Promise.resolve([])
      ]);
      
      setLessons(lessonsData || []);
      
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

  // ── handle file selected ───────────────────────────────────────────────
  // FIX: Không dùng readAsText() cho PDF/DOCX vì chúng là file nhị phân.
  // Chỉ đọc text với các file thuần text (.txt, .csv...).
  // PDF/DOCX sẽ được upload thẳng lên Supabase Storage và xử lý nội dung ở server.
  const handleFileSelected = async (file: File) => {
    setUploadedFile(file);
    setFileError("");
    setFileContent("");
    setCurriculumName(file.name.replace(/\.[^/.]+$/, ""));

    // Chỉ đọc nội dung nếu là file text thuần
    if (TEXT_TYPES.includes(file.type)) {
      setIsReadingFile(true);
      try {
        const text = await file.text();
        setFileContent(text);
      } catch {
        // Không phải lỗi nghiêm trọng, chỉ không có preview
        setFileContent("");
      } finally {
        setIsReadingFile(false);
      }
    }
    // PDF/DOCX: không đọc text, upload trực tiếp lên Storage là đủ
  };

  // ── save curriculum ────────────────────────────────────────────────────
  const handleSaveCurriculum = async () => {
    if (!selectedSubject) return;
    try {
      let finalImageUrl = coverImageUrl;
      if (coverImageFile) {
        const coverFormData = new FormData();
        coverFormData.append("file", coverImageFile);
        const uploadRes = await apiFetch<{ url: string }>("/upload", {
          method: "POST",
          body: coverFormData,
        });
        finalImageUrl = uploadRes.url;
      }

      const formData = new FormData();
      formData.set("subject_id", selectedSubject.id);
      if (finalImageUrl) formData.set("image_url", finalImageUrl);
      formData.set("name", curriculumName);
      formData.set("grade", grade);
      formData.set("education_level", educationLevel);
      formData.set("is_public", String(isPublic));
      formData.set("publisher", publisher);
      formData.set("lesson_count", String(lessonCount));
      formData.set("created_by", user?.id || "");
      formData.set("file_content", fileContent || "");
      if (uploadedFile) {
        formData.set("file", uploadedFile);
      }

      await apiFetch("/curricula", {
        method: "POST",
        body: formData,
      });
      await fetchCurricula(selectedSubject.id);
      setView("curricula");
    } catch (err) {
      setFileError("Lỗi khi lưu giáo trình");
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const ok = window.confirm("Xóa môn học này? Tất cả giáo trình và bài học liên quan sẽ bị xóa.");
    if (!ok) return;
    try {
      await apiFetch(`/subjects/${subjectId}`, { method: "DELETE" });
      if (selectedSubject?.id === subjectId) {
        setSelectedSubject(null);
        setCurricula([]);
        setLessons([]);
        setView("subjects");
      }
      await fetchSubjects();
    } catch {
      // no-op
    }
  };

  const handleDeleteCurriculum = async (curriculumId: string) => {
    if (!selectedSubject) return;
    const ok = window.confirm("Xóa giáo trình này? Toàn bộ bài học trong giáo trình sẽ bị xóa.");
    if (!ok) return;
    try {
      await apiFetch(`/curricula/${curriculumId}`, { method: "DELETE" });
      if (selectedCurriculum?.id === curriculumId) {
        setSelectedCurriculum(null);
        setLessons([]);
        setView("curricula");
      }
      await fetchCurricula(selectedSubject.id);
      await fetchSubjects();
    } catch {
      // no-op
    }
  };

  const handleDragEndCurricula = async (event: DragEndEvent, level: string, groupCurricula: Curriculum[]) => {
    const { active, over } = event;
    if (active.id !== over?.id && over) {
      const oldIndex = groupCurricula.findIndex((c) => c.id === active.id);
      const newIndex = groupCurricula.findIndex((c) => c.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newArray = arrayMove(groupCurricula, oldIndex, newIndex);
        
        // Optimistic UI update
        setCurricula(prev => {
          const others = prev.filter(c => (c.education_level || "Chưa phân loại") !== level);
          return [...others, ...newArray];
        });

        // Set backend
        try {
          await apiFetch("/curricula/reorder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: newArray.map(c => c.id) })
          });
          // re-fetch to ensure sync including sort_order (already optimistically grouped)
          if (selectedSubject) {
            fetchCurricula(selectedSubject.id);
          }
        } catch {
          // fetch old if error
          if (selectedSubject) {
            fetchCurricula(selectedSubject.id);
          }
        }
      }
    }
  };

  const handleSaveCurriculumMeta = async () => {
    if (!selectedSubject || !editingCurriculum) return;
    if (!curriculumName.trim()) {
      setCurriculumError("Vui lòng nhập tên giáo trình");
      return;
    }
    try {
      let finalImageUrl = coverImageUrl;
      if (coverImageFile) {
        const coverFormData = new FormData();
        coverFormData.append("file", coverImageFile);
        const uploadRes = await apiFetch<{ url: string }>("/upload", {
          method: "POST",
          body: coverFormData,
        });
        finalImageUrl = uploadRes.url;
      }

      await apiFetch(`/curricula/${editingCurriculum.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: curriculumName.trim(),
          grade: grade.trim() || null,
          education_level: educationLevel || null,
          is_public: isPublic,
          publisher: publisher.trim() || null,
          lesson_count: editingCurriculum.lesson_count || 0,
          file_url: editingCurriculum.file_url ?? null,
          file_content: editingCurriculum.file_content ?? null,
          image_url: finalImageUrl ?? null,
        }),
      });
      setShowCurriculumForm(false);
      setEditingCurriculum(null);
      setCurriculumError("");
      await fetchCurricula(selectedSubject.id);
      await fetchSubjects();
    } catch {
      setCurriculumError("Không thể lưu giáo trình");
    }
  };

  const resetLessonForm = () => {
    setLessonTitle("");
    setLessonDescription("");
    setLessonBlocks([]);
    setLessonSummary("");
    setLessonKeyPoints("");
    setLessonError("");
    setEditingLessonId(null);
    setLessonQuiz([]);
    setLessonFlashcards([]);
    setLessonImages([]);
    setPendingImageFiles([]);
  };

  const handleSaveLesson = async () => {
    if (!selectedCurriculum) return;
    if (!lessonTitle.trim()) {
      setLessonError("Vui lòng nhập tên bài học");
      return;
    }
    try {
      const keyPoints = lessonKeyPoints
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

      const lessonPayload = {
        curriculum_id: selectedCurriculum.id,
        title: lessonTitle.trim(),
        description: lessonDescription.trim() || null,
        content: lessonBlocks,
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
        body: JSON.stringify({ quiz: cleanedQuiz, flashcards: cleanedFlashcards }),
      });

      // Upload pending images for new lessons
      if (!editingLessonId && pendingImageFiles.length > 0) {
        const formData = new FormData();
        pendingImageFiles.forEach((file) => formData.append("images", file));
        try {
          await apiFetch(`/lessons/${savedLesson.id}/images`, { method: "POST", body: formData });
        } catch {
          // non-fatal
        }
      }

      await fetchLessons(selectedCurriculum.id);
      if (selectedSubject) await fetchCurricula(selectedSubject.id);
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
    setLessonBlocks(
      Array.isArray(lesson.content) && lesson.content.length > 0
        ? lesson.content.map((b: any) => ({
            type: b.type || "paragraph",
            text: b.text || "",
            fontSize: b.fontSize,
            fontFamily: b.fontFamily,
            color: b.color,
            bold: b.bold,
            italic: b.italic,
          }))
        : []
    );
    setLessonSummary(lesson.summary || "");
    setLessonKeyPoints(Array.isArray(lesson.key_points) ? lesson.key_points.join("\n") : "");
    setLessonQuiz(Array.isArray(lesson.quiz) ? lesson.quiz : []);
    setLessonFlashcards(Array.isArray(lesson.flashcards) ? lesson.flashcards : []);
    setPendingImageFiles([]);
    setLessonError("");
    // Load existing images
    try {
      const imgs = await apiFetch<LessonImage[]>(`/lessons/${lesson.id}/images`);
      setLessonImages(imgs || []);
    } catch {
      setLessonImages([]);
    }
    setView("lesson_form");
  };

  const handleUploadImages = async (files: FileList, lessonId: string) => {
    setUploadingImages(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("images", files[i]);
      }
      const newImages = await apiFetch<LessonImage[]>(`/lessons/${lessonId}/images`, {
        method: "POST",
        body: formData,
      });
      setLessonImages((prev) => [...prev, ...newImages]);
    } catch {
      setLessonError("Không thể upload ảnh. Vui lòng thử lại.");
    } finally {
      setUploadingImages(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async (imageId: string, lessonId: string) => {
    try {
      await apiFetch(`/lessons/${lessonId}/images/${imageId}`, { method: "DELETE" });
      setLessonImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch {
      setLessonError("Không thể xóa ảnh.");
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!selectedCurriculum) return;
    const ok = window.confirm("Bạn có chắc muốn xóa bài học này?");
    if (!ok) return;
    try {
      await apiFetch(`/lessons/${lessonId}`, { method: "DELETE" });
      await fetchLessons(selectedCurriculum.id);
      if (selectedSubject) await fetchCurricula(selectedSubject.id);
      if (editingLessonId === lessonId) resetLessonForm();
    } catch {
      setLessonError("Không thể xóa bài học.");
    }
  };

  const addQuiz = () => {
    setLessonQuiz((prev) => [...prev, { question: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" }]);
  };
  const updateQuiz = (index: number, updater: (q: QuizItem) => QuizItem) => {
    setLessonQuiz((prev) => prev.map((q, i) => (i === index ? updater(q) : q)));
  };
  const removeQuiz = (index: number) => {
    setLessonQuiz((prev) => prev.filter((_, i) => i !== index));
  };

  const addFlashcard = () => {
    setLessonFlashcards((prev) => [...prev, { front: "", back: "" }]);
  };
  const updateFlashcard = (index: number, updater: (f: FlashcardItem) => FlashcardItem) => {
    setLessonFlashcards((prev) => prev.map((f, i) => (i === index ? updater(f) : f)));
  };
  const removeFlashcard = (index: number) => {
    setLessonFlashcards((prev) => prev.filter((_, i) => i !== index));
  };

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
    }
    
    setImportFlashcardContent("");
    setShowImportFlashcard(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = subjects.findIndex((s) => s.id === active.id);
      const newIndex = subjects.findIndex((s) => s.id === over.id);
      
      const newSubjects = arrayMove(subjects, oldIndex, newIndex);
      setSubjects(newSubjects);

      try {
        const orders = newSubjects.map((s, index) => ({ id: s.id, sort_order: index }));
        await apiFetch("/subjects/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders }),
        });
      } catch (err) {
        console.error("Failed to update sort order:", err);
        // rollback
        fetchSubjects();
      }
    }
  };

  // ── UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">

        {/* ── SUBJECTS VIEW ── */}
        {view === "subjects" && (
          <div>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Khu vực Giáo viên</h1>
                <p className="text-muted-foreground">Quản lý môn học, giáo trình và nội dung bài học</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={subjects.map(s => s.id)}
                  strategy={rectSortingStrategy}
                >
                  {subjects.map(subject => (
                    <SortableSubjectItem 
                      key={subject.id}
                      subject={subject}
                      isAdmin={isAdmin}
                      onClick={() => { setSelectedSubject(subject); fetchCurricula(subject.id); setView("curricula"); }}
                      onEdit={() => {
                        setEditingSubject(subject);
                        setShowSubjectForm(true);
                      }}
                      onDelete={() => handleDeleteSubject(subject.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
              {isAdmin && (
                <button onClick={() => { setEditingSubject(null); setShowSubjectForm(true); }}
                  className="flex cursor-pointer items-center min-h-[105px] justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-6 transition hover:border-primary/40 hover:bg-muted/50">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                  <span className="font-semibold text-muted-foreground">Thêm môn học</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── CURRICULA VIEW ── */}
        {view === "curricula" && selectedSubject && (
          <div>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setView("subjects")} className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="Quay lại Danh sách môn học">
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <h1 className="font-heading text-3xl font-bold tracking-tight">Quản lý giáo trình</h1>
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600 uppercase tracking-wider border border-emerald-200 shadow-sm">
                      Môn: {selectedSubject.name}
                    </div>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => { 
                  setUploadStep("config"); 
                  setView("upload"); 
                  setUploadedFile(null);
                  setFileContent("");
                  setCoverImageFile(null);
                  setCoverImageUrl(null);
                  setCurriculumName("");
                  setGrade("");
                  setEducationLevel("");
                  setIsPublic(false);
                  setPublisher("");
                  setLessonCount(0);
                }}
                className="rounded-full h-10 px-6 font-bold bg-primary text-white hover:brightness-110 flex items-center justify-center gap-2 w-full sm:w-auto transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" /> Tạo giáo trình mới
              </Button>
            </div>

            <div className="space-y-12">
              {(() => {
                const groups = curricula.reduce((acc, c) => {
                  const level = c.education_level || "Chưa phân loại";
                  if (!acc[level]) acc[level] = [];
                  acc[level].push(c);
                  return acc;
                }, {} as Record<string, Curriculum[]>);

                const levelOrder = ["Tiểu học", "Trung học cơ sở", "Trung học Phổ Thông", "Đại Học / Cao Đẳng", "Luyện thi chứng chỉ", "Chưa phân loại"];
                const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
                  const idxA = levelOrder.indexOf(a);
                  const idxB = levelOrder.indexOf(b);
                  if (idxA === -1 && idxB === -1) return a.localeCompare(b);
                  if (idxA === -1) return 1;
                  if (idxB === -1) return -1;
                  return idxA - idxB;
                });

                return sortedGroupKeys.map(level => (
                  <div key={level} className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                       <div className="h-2 w-2 rounded-full bg-primary" />
                       <h3 className="font-bold text-lg text-primary/80">{level}</h3>
                       <span className="text-xs text-muted-foreground ml-auto">{groups[level].length} giáo trình</span>
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEndCurricula(event, level, groups[level])}
                    >
                      <SortableContext
                        items={groups[level].map(c => c.id)}
                        strategy={rectSortingStrategy}
                      >
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {groups[level].map((c, i) => (
                            <SortableCurriculumItem
                              key={c.id}
                              curriculum={c}
                              index={i}
                              isAdmin={isAdmin}
                              viewLessons={(curr: any) => {
                                setSelectedCurriculum(curr);
                                fetchLessons(curr.id);
                                setView("lessons");
                              }}
                              onEdit={(curr: any) => {
                                setEditingCurriculum(curr);
                                setCurriculumName(curr.name || "");
                                setGrade(curr.grade || "");
                                setEducationLevel(curr.education_level || "");
                                setIsPublic(curr.is_public ?? false);
                                setPublisher(curr.publisher || "");
                                setCoverImageUrl(curr.image_url ?? null);
                                setCoverImageFile(null);
                                setCurriculumError("");
                                setShowCurriculumForm(true);
                              }}
                              onDelete={(id: string) => handleDeleteCurriculum(id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* ── LESSONS VIEW ── */}
        {view === "lessons" && selectedSubject && selectedCurriculum && (
          <div className="animate-fade-in space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/50 p-6 sm:p-8 rounded-[40px] border border-white/60 shadow-sm backdrop-blur-sm">
              <div className="flex items-start gap-5">
                <button
                  onClick={() => {
                    setView("curricula");
                    resetLessonForm();
                  }}
                  className="group rounded-2xl bg-white/80 p-3 shadow-sm border border-white/60 hover:bg-white hover:shadow-md transition-all shrink-0"
                >
                  <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold tracking-tight text-[#112240]">{selectedCurriculum?.name}</h2>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary uppercase tracking-widest border border-primary/20 whitespace-nowrap">
                      Môn: {selectedSubject?.name}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    Quản lý bài học ({lessons.length} bài)
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button 
                      onClick={() => { resetLessonForm(); setView("lesson_form"); }} 
                      className="rounded-full h-10 px-6 font-bold bg-primary text-white hover:brightness-110 transition-all active:scale-95 shadow-lg shadow-primary/20"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Tạo mới
                    </Button>
                  </div>
                </div>
              </div>

              {/* Premium Tab Switcher - Centered like Personal/Community */}
              <div className="flex justify-center sm:justify-end">
                <div className="inline-flex rounded-full bg-muted/50 p-1.5 shadow-inner border border-white/60 backdrop-blur-sm">
                  <button
                    onClick={() => setLessonsSubView("manage")}
                    className={`flex items-center gap-2 rounded-full px-4 sm:px-8 py-2.5 text-xs sm:text-sm font-bold transition-all duration-400 ${
                      lessonsSubView === "manage"
                        ? "bg-[#2D9B63] text-white shadow-lg scale-[1.05]"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                    }`}
                  >
                    <Pencil className={`h-4 w-4 ${lessonsSubView === "manage" ? "text-white" : "text-muted-foreground"}`} />
                    Quản lý bài học
                  </button>
                  <button
                    onClick={() => setLessonsSubView("review")}
                    className={`flex items-center gap-2 rounded-full px-4 sm:px-8 py-2.5 text-xs sm:text-sm font-bold transition-all duration-400 ${
                      lessonsSubView === "review"
                        ? "bg-[#2D9B63] text-white shadow-lg scale-[1.05]"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/50"
                    }`}
                  >
                    <Eye className={`h-4 w-4 ${lessonsSubView === "review" ? "text-white" : "text-muted-foreground"}`} />
                    Ôn tập
                  </button>
                </div>
              </div>
            </div>

            {lessonsSubView === "manage" ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {lessons.length === 0 && (
                  <div className="col-span-full rounded-3xl border-2 border-dashed border-muted/30 p-16 text-center bg-white/20">
                    <BookOpen className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">Chưa có bài học nào cho giáo trình này.</p>
                    <Button 
                      variant="link" 
                      className="mt-2 text-primary font-bold"
                      onClick={() => { resetLessonForm(); setView("lesson_form"); }}
                    >
                      Bắt đầu tạo bài học đầu tiên
                    </Button>
                  </div>
                )}
                {lessons.map((lesson, i) => {
                  const isCompleted = !!lessonProgress[lesson.id];
                  return (
                    <div key={lesson.id} className="flex flex-col rounded-3xl border bg-white/70 p-6 group hover:shadow-2xl transition-all duration-300 border-white/60 shadow-sm hover:-translate-y-1">
                      <div className="flex-1 mb-6">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm">
                            {i + 1}
                          </div>
                          <div className="flex items-center gap-1">
                            {isCompleted && (
                              <div className="rounded-full bg-emerald-100 p-1 font-bold text-emerald-600">
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10 shrink-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                <DropdownMenuItem onClick={() => handleEditLesson(lesson)} className="cursor-pointer gap-2 font-medium">
                                  <Edit2 className="h-4 w-4" /> Chỉnh sửa
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteLesson(lesson.id)} className="cursor-pointer gap-2 font-medium text-destructive focus:bg-destructive/10 focus:text-destructive">
                                  <Trash2 className="h-4 w-4" /> Xóa bài học
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        <h3 className="font-bold text-xl leading-snug group-hover:text-primary transition-colors mb-2">
                          {lesson.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                          {lesson.description || "Chưa có mô tả nội dung chi tiết cho bài học này..."}
                        </p>
                      </div>
                      
                      <div className="pt-5 border-t border-muted/30">
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Review Mode / Preview */
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
        )}

        {/* ── LESSON_FORM VIEW ── */}
        {view === "lesson_form" && selectedSubject && selectedCurriculum && (
          <div className="space-y-8 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/50 p-6 sm:p-8 rounded-[40px] border border-white/60 shadow-sm backdrop-blur-sm mb-8 mt-4">
              <div className="flex items-start gap-5">
                <button
                  onClick={() => {
                    setView("lessons");
                    resetLessonForm();
                  }}
                  className="group rounded-2xl bg-white/80 p-3 shadow-sm border border-white/60 hover:bg-white hover:shadow-md transition-all shrink-0"
                >
                  <ArrowLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
                <div className="space-y-1 text-left">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold tracking-tight text-[#112240]">{selectedCurriculum?.name}</h2>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary uppercase tracking-widest border border-primary/20 whitespace-nowrap">
                      Môn: {selectedSubject?.name}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground font-bold">
                    {editingLessonId ? "Sửa bài học" : "Tạo bài học mới"}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4 rounded-2xl border bg-card p-5">
                <div>
                  <label className="text-sm font-semibold">Tên bài học</label>
                  <input
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                    placeholder="VD: Bài 1: Danh từ"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">Mô tả</label>
                  <input
                    value={lessonDescription}
                    onChange={(e) => setLessonDescription(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                    placeholder="Mô tả ngắn cho bài học"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Nội dung bài học</label>
                  <RichTextEditor value={lessonBlocks} onChange={setLessonBlocks} />
                </div>

                {/* ── Hình ảnh bài học ── */}
                <div className="space-y-3 rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Hình ảnh bài học</p>
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
                          disabled={uploadingImages}
                          onClick={() => imageInputRef.current?.click()}
                        >
                          <ImagePlus className="mr-1 h-4 w-4" />
                          {uploadingImages ? "Đang tải..." : "Thêm ảnh"}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              setPendingImageFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => imageInputRef.current?.click()}
                        >
                          <ImagePlus className="mr-1 h-4 w-4" />
                          Thêm ảnh
                        </Button>
                        {pendingImageFiles.length > 0 && (
                          <span className="text-xs text-muted-foreground">{pendingImageFiles.length} ảnh sẽ tải khi lưu</span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Pending images preview (new lesson) */}
                  {!editingLessonId && pendingImageFiles.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {pendingImageFiles.map((file, idx) => (
                        <div key={idx} className="group relative rounded-xl overflow-hidden border bg-muted aspect-video">
                          <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
                          <button
                            onClick={() => setPendingImageFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute top-1.5 right-1.5 rounded-full bg-destructive/90 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {lessonImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {lessonImages.map((img) => {
                        const src = img.file_url.startsWith("http")
                          ? img.file_url
                          : `${API_BASE_URL.replace("/api", "")}${img.file_url}`;
                        return (
                          <div key={img.id} className="group relative rounded-xl overflow-hidden border bg-muted aspect-video">
                            <img
                              src={src}
                              alt={img.caption || "Hình ảnh bài học"}
                              className="h-full w-full object-cover"
                            />
                            <button
                              onClick={() => editingLessonId && handleDeleteImage(img.id, editingLessonId)}
                              className="absolute top-1.5 right-1.5 rounded-full bg-destructive/90 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {lessonImages.length === 0 && editingLessonId && (
                    <p className="text-xs text-muted-foreground text-center py-4">Chưa có hình ảnh nào. Nhấn "Thêm ảnh" để tải lên.</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold">Tổng kết bài học</label>
                  <textarea
                    value={lessonSummary}
                    onChange={(e) => setLessonSummary(e.target.value)}
                    rows={3}
                    onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }}
                    ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                    className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm resize-none overflow-hidden"
                    placeholder="Tóm tắt ngắn bài học"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">Điểm cần nhớ (mỗi dòng 1 ý)</label>
                  <textarea
                    value={lessonKeyPoints}
                    onChange={(e) => setLessonKeyPoints(e.target.value)}
                    rows={3}
                    onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }}
                    ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                    className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm resize-none overflow-hidden"
                    placeholder="Ý 1&#10;Ý 2&#10;Ý 3"
                  />
                </div>

                <div className="space-y-3 rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Trắc nghiệm</p>
                    <Button size="sm" variant="outline" onClick={addQuiz}>+ Câu hỏi</Button>
                  </div>
                  {lessonQuiz.map((q, qi) => (
                    <div key={qi} className="space-y-2 rounded-xl border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Câu {qi + 1}</p>
                        <Button size="sm" variant="destructive" onClick={() => removeQuiz(qi)}>Xóa</Button>
                      </div>
                      <input
                        value={q.question}
                        onChange={(e) => updateQuiz(qi, (old) => ({ ...old, question: e.target.value }))}
                        className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                        placeholder="Nội dung câu hỏi"
                      />
                      {q.options.map((opt, oi) => (
                        <input
                          key={oi}
                          value={opt}
                          onChange={(e) =>
                            updateQuiz(qi, (old) => ({
                              ...old,
                              options: old.options.map((x, idx) => (idx === oi ? e.target.value : x)),
                            }))
                          }
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                          placeholder={`Đáp án ${String.fromCharCode(65 + oi)}`}
                        />
                      ))}
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={q.correctIndex}
                          onChange={(e) => updateQuiz(qi, (old) => ({ ...old, correctIndex: Number(e.target.value) }))}
                          className="rounded-xl border bg-background px-3 py-2 text-sm"
                        >
                          <option value={0}>Đáp án đúng: A</option>
                          <option value={1}>Đáp án đúng: B</option>
                          <option value={2}>Đáp án đúng: C</option>
                          <option value={3}>Đáp án đúng: D</option>
                        </select>
                        <input
                          value={q.explanation}
                          onChange={(e) => updateQuiz(qi, (old) => ({ ...old, explanation: e.target.value }))}
                          className="rounded-xl border bg-background px-3 py-2 text-sm"
                          placeholder="Giải thích"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 rounded-xl border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Flashcard</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowImportFlashcard(true)}>Nhập</Button>
                      <Button size="sm" variant="outline" onClick={addFlashcard}>+ Thẻ</Button>
                    </div>
                  </div>
                  {lessonFlashcards.map((f, fi) => (
                    <div key={fi} className="space-y-2 rounded-xl border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Thẻ {fi + 1}</p>
                        <Button size="sm" variant="destructive" onClick={() => removeFlashcard(fi)}>Xóa</Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={f.front}
                          onChange={(e) => updateFlashcard(fi, (old) => ({ ...old, front: e.target.value }))}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                          placeholder="Mặt trước"
                        />
                        <input
                          value={f.back}
                          onChange={(e) => updateFlashcard(fi, (old) => ({ ...old, back: e.target.value }))}
                          className="w-full rounded-xl border bg-background px-3 py-2 text-sm"
                          placeholder="Mặt sau"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {lessonError && (
                  <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{lessonError}</div>
                )}

                <div className="flex gap-2 mt-6">
                  {editingLessonId && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        resetLessonForm();
                        setView("lessons");
                      }}
                      className="w-full border-red-500 text-red-500 hover:bg-red-50 font-bold"
                    >
                      Hủy sửa
                    </Button>
                  )}
                  <Button onClick={handleSaveLesson} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> {editingLessonId ? "Lưu thay đổi" : "Tạo bài học"}
                  </Button>
                </div>
            </div>
          </div>
        )}

        {/* ── UPLOAD VIEW ── */}
        {view === "upload" && selectedSubject && (
          <div>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <button onClick={() => setView("curricula")} className="rounded-xl p-2 hover:bg-muted transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-2xl font-bold font-heading text-primary">Tạo giáo trình mới</h2>
              </div>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10 w-fit">
                <span className="text-xl">{selectedSubject.icon}</span>
                <span className="text-sm font-bold text-primary/80 uppercase tracking-wider">{selectedSubject.name}</span>
              </div>
            </div>

            {/* steps */}
            <div className="mb-8 flex items-center gap-2">
              {["config", "preview"].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <span className={`rounded-full px-4 py-1.5 text-sm font-semibold ${uploadStep === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {i + 1}. {["Cấu hình", "Xem trước"][i]}
                  </span>
                  {i < 1 && <span className="text-muted-foreground">─</span>}
                </div>
              ))}
            </div>

            {/* steps logic moved below */}

            {/* step: config */}
            {uploadStep === "config" && (
              <div className="space-y-6 pb-10">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold">Chế độ hiển thị</label>
                      <select 
                        value={isPublic ? "true" : "false"} 
                        onChange={e => setIsPublic(e.target.value === "true")}
                        className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                      >
                        <option value="false">🔒 Không công khai (Cá nhân)</option>
                        <option value="true">🌍 Công khai (Mọi người)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-semibold">Cấp độ</label>
                      <select 
                        value={educationLevel} 
                        onChange={e => setEducationLevel(e.target.value)}
                        className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                      >
                        <option value="">Chọn cấp độ</option>
                        <option value="Tiểu học">Tiểu học</option>
                        <option value="Trung học cơ sở">Trung học cơ sở</option>
                        <option value="Trung học Phổ Thông">Trung học Phổ Thông</option>
                        <option value="Đại Học / Cao Đẳng">Đại Học / Cao Đẳng</option>
                        <option value="Luyện thi chứng chỉ">Luyện thi chứng chỉ</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Tên giáo trình</label>
                    <input value={curriculumName} onChange={e => setCurriculumName(e.target.value)}
                      className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold">Lớp</label>
                      <input value={grade} onChange={e => setGrade(e.target.value)} placeholder="VD: 4"
                        className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-semibold">Nhà xuất bản</label>
                      <input value={publisher} onChange={e => setPublisher(e.target.value)} placeholder="VD: Kết nối tri thức"
                        className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Số bài học muốn tạo</label>
                    <input type="number" value={lessonCount} onChange={e => setLessonCount(+e.target.value)} min={1} max={50}
                      className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold mb-1 block">Ảnh giáo trình</label>
                    {!coverImageFile && !coverImageUrl ? (
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-background hover:bg-muted/50 transition-colors">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ImagePlus className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground"><span className="font-semibold">Tải ảnh lên</span> hoặc kéo thả</p>
                          </div>
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setCoverImageFile(e.target.files[0]);
                              setCoverImageUrl(URL.createObjectURL(e.target.files[0]));
                            }
                          }} />
                        </label>
                      </div>
                    ) : (
                      <div className="relative inline-block rounded-xl overflow-hidden border bg-muted/30 p-1">
                        <img src={coverImageUrl || ""} alt="Cover preview" className="h-32 w-auto max-w-full object-contain rounded-lg" />
                        <button
                          onClick={() => {
                            setCoverImageFile(null);
                            setCoverImageUrl(null);
                          }}
                          className="absolute top-2 right-2 rounded-full bg-destructive/90 p-1.5 text-white hover:bg-destructive transition-colors shadow-sm"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button variant="outline" onClick={() => setView("curricula")} className="w-full sm:w-auto border-red-500 text-red-500 hover:bg-red-50 font-bold">Hủy</Button>
                  <Button onClick={() => setUploadStep("preview")} className="flex-1">Xem trước →</Button>
                </div>
              </div>
            )}

            {/* step: preview */}
            {uploadStep === "preview" && (
              <div className="space-y-6 pb-10">
                <div className="rounded-2xl border bg-card p-6 space-y-3">
                  {coverImageUrl && (
                    <div className="mb-4">
                      <img src={coverImageUrl} alt="Cover preview" className="h-24 w-auto max-w-full object-contain rounded-xl border bg-muted/30 p-1" />
                    </div>
                  )}
                  <h3 className="font-bold text-lg">Thông tin giáo trình</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="min-w-0"><span className="text-muted-foreground">Tên:</span> <span className="font-semibold break-words">{curriculumName}</span></div>
                    <div><span className="text-muted-foreground">Lớp:</span> <span className="font-semibold">{grade}</span></div>
                    <div><span className="text-muted-foreground">Cấp độ:</span> <span className="font-semibold">{educationLevel || "Chưa chọn"}</span></div>
                    <div className="flex items-center gap-2"><span className="text-muted-foreground">Hiển thị:</span> <span className={`font-semibold flex items-center gap-1.5 ${isPublic ? "text-emerald-600" : "text-muted-foreground"}`}>{isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} {isPublic ? "Công khai" : "Riêng tư"}</span></div>
                    <div><span className="text-muted-foreground">NXB:</span> <span className="font-semibold">{publisher}</span></div>
                    <div><span className="text-muted-foreground">Số bài:</span> <span className="font-semibold">{lessonCount}</span></div>
                  </div>
                </div>

                {/* Removed file preview logic as upload is no longer part of the flow */}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button variant="outline" onClick={() => setUploadStep("config")} className="w-full sm:w-auto">← Quay lại</Button>
                  <Button onClick={handleSaveCurriculum} className="flex-1">
                    <Upload className="h-4 w-4 mr-2" /> Lưu giáo trình
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subject Form Modal */}
        {showSubjectForm && (
          <SubjectForm
            subject={editingSubject}
            onSave={() => { fetchSubjects(); setShowSubjectForm(false); setEditingSubject(null); }}
            onCancel={() => { setShowSubjectForm(false); setEditingSubject(null); }}
          />
        )}

        {showCurriculumForm && (
          <Dialog open={showCurriculumForm} onOpenChange={(open) => { if (!open) setShowCurriculumForm(false); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Sửa giáo trình</DialogTitle>
                <DialogDescription>Cập nhật thông tin giáo trình.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold">Chế độ hiển thị</label>
                    <select 
                      value={isPublic ? "true" : "false"} 
                      onChange={e => setIsPublic(e.target.value === "true")}
                      className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                    >
                      <option value="false">🔒 Không công khai (Cá nhân)</option>
                      <option value="true">🌍 Công khai (Mọi người)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Cấp độ</label>
                    <select 
                      value={educationLevel} 
                      onChange={e => setEducationLevel(e.target.value)}
                      className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                    >
                      <option value="">Chọn cấp độ</option>
                      <option value="Tiểu học">Tiểu học</option>
                      <option value="Trung học cơ sở">Trung học cơ sở</option>
                      <option value="Trung học Phổ Thông">Trung học Phổ Thông</option>
                      <option value="Đại Học / Cao Đẳng">Đại Học / Cao Đẳng</option>
                      <option value="Luyện thi chứng chỉ">Luyện thi chứng chỉ</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold">Tên giáo trình</label>
                  <input
                    value={curriculumName}
                    onChange={(e) => setCurriculumName(e.target.value)}
                    className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold">Lớp</label>
                    <input
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Nhà xuất bản</label>
                    <input
                      value={publisher}
                      onChange={(e) => setPublisher(e.target.value)}
                      className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-1 block">Ảnh giáo trình</label>
                  {!coverImageFile && !coverImageUrl ? (
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer bg-background hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <ImagePlus className="w-8 h-8 mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground"><span className="font-semibold">Tải ảnh lên</span> hoặc kéo thả</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setCoverImageFile(e.target.files[0]);
                            setCoverImageUrl(URL.createObjectURL(e.target.files[0]));
                          }
                        }} />
                      </label>
                    </div>
                  ) : (
                    <div className="relative inline-block rounded-xl overflow-hidden border bg-muted/30 p-1">
                      <img src={(coverImageUrl && !coverImageUrl.startsWith("blob:") && !coverImageUrl.startsWith("http")) ? `${API_BASE_URL.replace("/api", "")}${coverImageUrl}` : (coverImageUrl || "")} alt="Cover preview" className="h-32 w-auto max-w-full object-contain rounded-lg" />
                      <button
                        onClick={() => {
                          setCoverImageFile(null);
                          setCoverImageUrl(null);
                        }}
                        className="absolute top-2 right-2 rounded-full bg-destructive/90 p-1.5 text-white hover:bg-destructive transition-colors shadow-sm"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {curriculumError && (
                  <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{curriculumError}</div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="w-full border-red-500 text-red-500 hover:bg-red-50 font-bold" onClick={() => setShowCurriculumForm(false)}>
                    Hủy
                  </Button>
                  <Button className="w-full" onClick={handleSaveCurriculumMeta}>
                    Lưu thay đổi
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showImportFlashcard && (
          <Dialog open={showImportFlashcard} onOpenChange={setShowImportFlashcard}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nhập thuật ngữ và định nghĩa</DialogTitle>
                <DialogDescription>
                  Dán nội dung vào đây. Mỗi dòng là một thẻ, thuật ngữ và định nghĩa cách nhau bằng dấu phẩy (,).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-3 text-sm font-mono text-muted-foreground whitespace-pre-wrap">
                  Ví dụ:{"\n"}Hello, xin chào{"\n"}Bye, Tạm biệt
                </div>
                <textarea
                  value={importFlashcardContent}
                  onChange={(e) => setImportFlashcardContent(e.target.value)}
                  className="w-full min-h-[150px] rounded-xl border bg-background p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Từ vựng, Định nghĩa..."
                />
                <div className="flex justify-end gap-3 mt-4">
                  <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-50 font-bold" onClick={() => setShowImportFlashcard(false)}>Hủy</Button>
                  <Button onClick={handleImportFlashcards}>Nhập ngay</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

// ── sub-components ─────────────────────────────────────────────────────────

function ContentRenderer({ blocks }: { blocks: any[] }) {
  return (
    <div className="space-y-4 text-left">
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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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

        const imgs = await apiFetch<any[]>(`/lessons/${lessonId}/images`);
        setImages(imgs || []);
        setSlideIndex(0);
        setIsLightboxOpen(false);
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
    } catch {
      setIsDone(!next);
    }
  };

  if (loading) return (
    <div className="py-20 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="mt-4 text-muted-foreground font-medium">Đang tải nội dung bản xem trước...</p>
    </div>
  );

  if (!lesson) return <div className="py-20 text-center">Không tìm thấy bài học.</div>;

  return (
    <div className="space-y-4 sm:space-y-8 max-w-7xl mx-auto pb-20">
      {/* Responsive Header */}
      <div className="flex flex-col items-center gap-4 sm:block sm:relative sm:text-center sm:px-12 sm:py-4">
        <button
          onClick={onBack}
          className="absolute left-2 top-2 sm:top-1/2 sm:left-0 sm:-translate-y-1/2 group flex items-center justify-center h-10 w-10 rounded-full border bg-white/50 text-muted-foreground hover:text-primary hover:border-primary/30 transition-all shadow-sm z-10"
          title="Quay lại danh sách"
        >
          <ArrowLeft className="h-5 w-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        
        <div className="space-y-1 pt-6 sm:pt-0">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-foreground px-4 sm:px-0">{lesson.title}</h1>
          <p className="text-xs sm:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed px-4 sm:px-0">{lesson.description}</p>
        </div>

        <div className="sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2 w-full sm:w-auto px-4 sm:px-0 mt-2 sm:mt-0">
          <Button
            variant={isDone ? "default" : "outline"}
            size="sm"
            onClick={handleToggleDone}
            className={`rounded-2xl h-10 sm:h-11 w-full sm:w-auto px-6 font-bold shadow-sm transition-all duration-300 ${
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

      <div className="flex justify-center px-2 sm:px-4">
        <div className="grid grid-cols-2 sm:flex items-center gap-1 sm:gap-1.5 rounded-2xl bg-muted/40 p-1 sm:p-1.5 border border-white shadow-inner w-full sm:w-auto">
          {tabs.map((tab) => {
             const isActive = activeTab === tab.id;
             return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center justify-center gap-2 rounded-xl px-2 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold transition-all duration-300 ${
                  isActive
                    ? "bg-white text-primary shadow-sm scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/40"
                }`}
              >
                <tab.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isActive ? 'text-primary' : 'text-muted-foreground/70'}`} />
                <span className="truncate">{tab.label}</span>
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full hidden sm:block" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="animate-fade-in px-2 sm:px-0">
        {activeTab === "content" && (
          <div className="space-y-4 sm:space-y-6">
            {images.length > 0 && (
              <div className="rounded-2xl sm:rounded-3xl bg-card shadow-lg border-2 border-primary/5 overflow-hidden transition-all hover:shadow-xl">
                <div className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-5 border-b bg-primary/5">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1 sm:p-2 rounded-xl bg-primary/10">
                      <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div>
                      <span className="block text-[10px] sm:text-xs font-bold uppercase tracking-widest text-primary/70">Hình ảnh bài học</span>
                      <span className="hidden sm:block text-[10px] text-muted-foreground font-medium">Bản xem trước trực quan</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-0.5 sm:py-1 rounded-full bg-white text-[10px] font-bold text-primary shadow-sm border border-primary/10">
                      {slideIndex + 1} / {images.length}
                    </div>
                  </div>
                </div>
                <div 
                  className="relative group bg-muted/5 p-2 sm:p-6 text-center cursor-zoom-in"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  <div className="aspect-[16/10] flex items-center justify-center bg-white rounded-xl sm:rounded-2xl shadow-inner border border-muted/20 overflow-hidden">
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setSlideIndex((p) => (p - 1 + images.length) % images.length);
                        }}
                        className="absolute left-10 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center rounded-full bg-white/90 text-primary shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-white"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSlideIndex((p) => (p + 1) % images.length);
                        }}
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
                    <div key={i} className="flex flex-col gap-1 rounded-2xl bg-muted/20 p-5 border border-white transition-all hover:bg-white hover:shadow-md group text-left">
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
            <div className="rounded-3xl bg-card p-10 border shadow-md">
               <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 rounded-2xl bg-primary/10">
                    <Lightbulb className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Ghi nhớ trọng tâm</h2>
                    <p className="text-sm text-muted-foreground">Những điểm quan trọng nhất của bài học</p>
                  </div>
               </div>
               
               <div className="grid gap-4 md:grid-cols-2">
                  {lesson.keyPoints?.map((point: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-4 p-5 rounded-2xl bg-muted/10 border border-white group hover:bg-white hover:shadow-lg transition-all">
                      <div className="mt-1 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-xs text-primary">
                        {idx + 1}
                      </div>
                      <p className="text-foreground/90 font-medium leading-relaxed whitespace-pre-wrap">{point}</p>
                    </div>
                  ))}
               </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-[#2D9B63] to-emerald-700 p-10 text-white shadow-xl shadow-emerald-900/10">
               <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
                    <FileText className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold uppercase tracking-tight">Tóm tắt bài học</h2>
               </div>
               <div className="bg-white/10 backdrop-blur-md rounded-2xl p-7 border border-white/20 whitespace-pre-wrap leading-loose font-medium italic">
                  {lesson.summary || "Chưa có nội dung tóm tắt cho bài học này."}
               </div>
            </div>
          </div>
        )}
      </div>

      <ImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={images.map(img => img.file_url.startsWith("http") ? img.file_url : `${API_BASE_URL.replace("/api", "")}${img.file_url}`)}
        currentIndex={slideIndex}
        onNavigate={setSlideIndex}
      />
    </div>
  );
}
