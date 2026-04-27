import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Import, Trash2, GripVertical, Image as ImageIcon, Plus,
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Play, Shuffle, Lightbulb,
  Pause, Settings, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
const PRESET_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
  '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
  '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
  '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
  '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
  '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
  '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'
];

interface CardData {
  id: number | string;
  term: string;
  definition: string;
}

const getCardFontSize = (text: string, baseSize: number, isFullscreen: boolean) => {
  const length = text?.length || 0;
  let size = baseSize;
  
  if (length > 200) size = baseSize * 0.3;
  else if (length > 100) size = baseSize * 0.4;
  else if (length > 50) size = baseSize * 0.6;
  else if (length > 30) size = baseSize * 0.8;
  
  // Mobile adjustment if not fullscreen
  if (!isFullscreen && window.innerWidth < 640) {
    size = size * 0.6;
  }
  
  return `${size}px`;
};

export default function EditQuizletPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [grade, setGrade] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [quizletUserId, setQuizletUserId] = useState<string | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);

  // Flashcard state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Test Mode state
  const [testMode, setTestMode] = useState<'none' | 'front' | 'back' | 'practice'>('none');
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<'correct' | 'incorrect' | null>(null);

  // Import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  // Style Settings state
  const [frontStyle, setFrontStyle] = useState({ color: '#ef4444', size: 64 });
  const [backStyle, setBackStyle] = useState({ color: '#2563eb', size: 64 });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempFrontStyle, setTempFrontStyle] = useState({ color: '#ef4444', size: 64 });
  const [tempBackStyle, setTempBackStyle] = useState({ color: '#2563eb', size: 64 });
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<CardData[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  const displayCards = isShuffled ? shuffledCards : cards;

  const handleImport = () => {
    if (!importText.trim()) return;
    const lines = importText.split("\n");
    const newCardsData = lines.map((line) => {
      const parts = line.split(",");
      return {
        term: parts[0]?.trim() || "",
        definition: parts.slice(1).join(",").trim() || ""
      };
    }).filter(c => c.term || c.definition);

    if (newCardsData.length > 0) {
      const updatedCards = [...cards];
      let importedIdx = 0;

      for (let i = 0; i < 2 && i < updatedCards.length; i++) {
        if (!updatedCards[i].term.trim() && !updatedCards[i].definition.trim()) {
          if (importedIdx < newCardsData.length) {
            updatedCards[i] = {
              ...updatedCards[i],
              term: newCardsData[importedIdx].term,
              definition: newCardsData[importedIdx].definition
            };
            importedIdx++;
          }
        }
      }

      const remainingCards = newCardsData.slice(importedIdx).map((c) => ({
        id: `imported_${Date.now()}_${Math.random()}`,
        term: c.term,
        definition: c.definition
      }));

      setCards([...updatedCards, ...remainingCards]);
      setIsImportOpen(false);
      setImportText("");
      toast.success(`Đã nhập ${newCardsData.length} thẻ`);
    } else {
      toast.error("Không tìm thấy dữ liệu hợp lệ để nhập");
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCards((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const data = await apiFetch("/subjects") as any[];
        setSubjects(data);
      } catch (err) {}
    }
    fetchSubjects();
  }, []);

  useEffect(() => {
    async function loadQuizlet() {
      try {
        const data = await apiFetch(`/quizlets/${id}`) as any;
        setTitle(data.title || "");
        setDescription(data.description || "");
        setSelectedSubjectId(data.subject_id || "");
        setGrade(data.grade || "");
        setEducationLevel(data.education_level || "");
        setIsPublic(!!data.is_public);
        setQuizletUserId(data.user_id || null);
        if (data.terms && data.terms.length > 0) {
          setCards(data.terms.map((t: any) => ({
            id: t.id,
            term: t.term,
            definition: t.definition
          })));
        } else {
          setCards([
            { id: 1, term: "", definition: "" },
            { id: 2, term: "", definition: "" },
          ]);
        }
      } catch (err) {
        toast.error("Không thể tải học phần");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) loadQuizlet();
  }, [id]);

  const handleNext = () => {
    if (currentIndex < displayCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const toggleFlip = () => {
    if (testMode !== 'none' && testMode !== 'practice') return;
    if (testMode === 'practice') return;
    setIsFlipped(!isFlipped);
  };

  useEffect(() => {
    if (testMode === 'front') setIsFlipped(false);
    if (testMode === 'back') setIsFlipped(true);
    setTestInput('');
    setTestResult(null);
  }, [testMode, currentIndex]);

  const toggleFullScreen = () => {
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(err => {
        toast.error(`Error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const toggleShuffle = () => {
    if (!isShuffled) {
      const newShuffled = [...cards].sort(() => Math.random() - 0.5);
      setShuffledCards(newShuffled);
      setIsShuffled(true);
    } else {
      setIsShuffled(false);
    }
    setCurrentIndex(0);
    setIsAutoPlaying(false);
    setIsFlipped(false);
  };

  useEffect(() => {
    let interval: any;
    if (isAutoPlaying && displayCards.length > 0) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1 >= displayCards.length ? 0 : prev + 1));
        setIsFlipped(false);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, displayCards.length]);

  const handleTestCheck = () => {
    const card = displayCards[currentIndex];
    const answer = testMode === 'front' ? card.definition : card.term;
    if (testInput.trim().toLowerCase() === answer.trim().toLowerCase()) {
      setTestResult('correct');
      toast.success("Chính Xác");
    } else {
      setTestResult('incorrect');
      toast.error("Không chính xác");
    }
  };

  const addCard = () => {
    setCards([...cards, { id: `new_${Date.now()}`, term: "", definition: "" }]);
  };

  const removeCard = (cardId: string | number) => {
    if (cards.length > 2) {
      setCards(cards.filter(c => c.id !== cardId));
    } else {
      toast.error("Cần ít nhất 2 thẻ");
    }
  };

  const updateCard = (cardId: string | number, field: 'term' | 'definition', value: string) => {
    setCards(cards.map(c => c.id === cardId ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Nhập tiêu đề"); return; }
    const cleanCards = cards.filter(c => c.term.trim() || c.definition.trim());
    if (cleanCards.length === 0) { toast.error("Nhập ít nhất một thẻ"); return; }

    setIsSubmitting(true);
    try {
      await apiFetch(`/quizlets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          subject_id: selectedSubjectId || null,
          grade: grade.trim() || null,
          education_level: educationLevel || null,
          is_public: isPublic,
          terms: cleanCards,
        }),
      });
      toast.success("Đã lưu thành công!");
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi lưu");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Xóa học phần này?")) return;
    setIsDeleting(true);
    try {
      await apiFetch(`/quizlets/${id}`, { method: "DELETE" });
      toast.success("Đã xóa!");
      navigate("/quizlet");
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi xóa");
      setIsDeleting(false);
    }
  };

  if (isLoading) return <div className="container py-8 text-center">Đang tải...</div>;

  const currentCard = displayCards[currentIndex] || { term: "", definition: "" };
  const isOwner = user?.id === quizletUserId || user?.role === 'admin';

  return (
    <div className="container py-8 max-w-5xl">
      <h1 className="text-2xl font-bold font-heading text-left text-gray-800 mb-4">{title}</h1>

      <div className="flex mb-6 justify-center">
        <div className="grid grid-cols-2 sm:flex items-center p-1 bg-white/80 backdrop-blur-md rounded-2xl border border-[#2D9B63]/10 shadow-lg shadow-[#2D9B63]/5 w-full sm:w-auto gap-1">
          <button
            onClick={() => setTestMode('none')}
            className={cn(
              "flex items-center justify-center text-center rounded-xl px-2 sm:px-6 py-2.5 text-[11px] sm:text-sm font-bold transition-all duration-300 leading-tight min-h-[44px]",
              testMode === 'none'
                ? "bg-[#2D9B63] text-white shadow-lg shadow-[#2D9B63]/30 scale-[1.02]"
                : "text-muted-foreground hover:bg-[#2D9B63]/5 hover:text-[#2D9B63]"
            )}
          >
            Flashcard
          </button>
          <button
            onClick={() => setTestMode('front')}
            className={cn(
              "flex items-center justify-center text-center rounded-xl px-2 sm:px-6 py-2.5 text-[11px] sm:text-sm font-bold transition-all duration-300 leading-tight min-h-[44px]",
              testMode === 'front'
                ? "bg-[#2D9B63] text-white shadow-lg shadow-[#2D9B63]/30 scale-[1.02]"
                : "text-muted-foreground hover:bg-[#2D9B63]/5 hover:text-[#2D9B63]"
            )}
          >
            Kiểm tra<br/>mặt trước
          </button>
          <button
            onClick={() => setTestMode('back')}
            className={cn(
              "flex items-center justify-center text-center rounded-xl px-2 sm:px-6 py-2.5 text-[11px] sm:text-sm font-bold transition-all duration-300 leading-tight min-h-[44px]",
              testMode === 'back'
                ? "bg-[#2D9B63] text-white shadow-lg shadow-[#2D9B63]/30 scale-[1.02]"
                : "text-muted-foreground hover:bg-[#2D9B63]/5 hover:text-[#2D9B63]"
            )}
          >
            Kiểm tra<br/>mặt sau
          </button>
          <button
            onClick={() => setTestMode('practice')}
            className={cn(
              "flex items-center justify-center text-center rounded-xl px-2 sm:px-6 py-2.5 text-[11px] sm:text-sm font-bold transition-all duration-300 leading-tight min-h-[44px]",
              testMode === 'practice'
                ? "bg-[#2D9B63] text-white shadow-lg shadow-[#2D9B63]/30 scale-[1.02]"
                : "text-muted-foreground hover:bg-[#2D9B63]/5 hover:text-[#2D9B63]"
            )}
          >
            Luyện tập
          </button>
        </div>
      </div>

      <div ref={playerRef} className={cn("bg-white rounded-xl shadow-lg border border-gray-100 p-4 mb-10", isFullscreen ? "fixed inset-0 z-50 flex flex-col justify-center bg-white" : "")}>
        {testMode === 'practice' ? (
          <div className="w-full rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex flex-col items-center justify-center py-8 px-6 sm:px-10 bg-red-50/60 min-h-[180px] border-b border-gray-200">
              <h2 className="text-center font-bold break-words w-full" style={{ color: frontStyle.color, fontSize: getCardFontSize(currentCard.term, frontStyle.size * 0.75, isFullscreen) }}>{currentCard.term || "Trống"}</h2>
            </div>
            <div className="flex flex-col items-center justify-center py-8 px-6 sm:px-10 bg-blue-50/60 min-h-[180px]">
              <h2 className="text-center font-bold break-words w-full" style={{ color: backStyle.color, fontSize: getCardFontSize(currentCard.definition, backStyle.size * 0.75, isFullscreen) }}>{currentCard.definition || "Trống"}</h2>
            </div>
          </div>
        ) : (
          <div 
            className="relative w-full h-[400px] cursor-pointer perspective-1000"
            onClick={toggleFlip}
          >
            <div className={cn("w-full h-full [transform-style:preserve-3d] transition-transform duration-500", isFlipped ? "rotate-y-180" : "")}>
              <div className="absolute inset-0 bg-gray-100 rounded-2xl flex items-center justify-center p-6 sm:p-10 backface-hidden border border-gray-200">
                <h2 className="text-center font-bold break-words w-full" style={{ color: frontStyle.color, fontSize: getCardFontSize(currentCard.term, frontStyle.size, isFullscreen) }}>{currentCard.term || "Trống"}</h2>
              </div>
              <div className="absolute inset-0 bg-gray-100 rounded-2xl flex items-center justify-center p-6 sm:p-10 backface-hidden rotate-y-180 border border-gray-200">
                <h2 className="text-center font-bold break-words w-full" style={{ color: backStyle.color, fontSize: getCardFontSize(currentCard.definition, backStyle.size, isFullscreen) }}>{currentCard.definition || "Trống"}</h2>
              </div>
            </div>
          </div>
        )}

        {(testMode === 'front' || testMode === 'back') && (
          <div className="mt-8 max-w-lg mx-auto flex gap-4">
            <input type="text" className="flex-1 border p-3 rounded-lg" value={testInput} onChange={(e) => setTestInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTestCheck()} placeholder="Nhập đáp án..." />
            <Button onClick={handleTestCheck}>Kiểm tra</Button>
          </div>
        )}

        <div className="flex items-center justify-between mt-6 px-1 sm:px-4 flex-nowrap gap-0">
          <div className="flex gap-0 sm:gap-2 shrink-0 flex-nowrap">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => setIsAutoPlaying(!isAutoPlaying)}>{isAutoPlaying ? <Pause className="h-4 w-4 sm:h-5 sm:h-5" /> : <Play className="h-4 w-4 sm:h-5 sm:h-5" />}</Button>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8 sm:h-10 sm:w-10", isShuffled ? "text-primary" : "")} onClick={toggleShuffle}><Shuffle className="h-4 w-4 sm:h-5 sm:h-5" /></Button>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-4 shrink-0 flex-nowrap mx-auto">
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10" onClick={handlePrev} disabled={currentIndex === 0}><ChevronLeft className="h-5 w-5 sm:h-6 sm:h-6" /></Button>
            <span className="font-bold text-[12px] sm:text-base px-1 whitespace-nowrap shrink-0 tabular-nums leading-none min-w-[50px] sm:min-w-[80px] text-center">
              {currentIndex + 1} / {displayCards.length}
            </span>
            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10" onClick={handleNext} disabled={currentIndex === displayCards.length - 1}><ChevronRight className="h-5 w-5 sm:h-6 sm:h-6" /></Button>
          </div>
          <div className="flex gap-0 sm:gap-2 shrink-0 flex-nowrap">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={() => {
              setTempFrontStyle(frontStyle);
              setTempBackStyle(backStyle);
              setIsSettingsOpen(true);
            }}>
              <Settings className="h-4 w-4 sm:h-5 sm:h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={toggleFullScreen}>{isFullscreen ? <Minimize2 className="h-4 w-4 sm:h-5 sm:h-5" /> : <Maximize2 className="h-4 w-4 sm:h-5 sm:h-5" />}</Button>
          </div>
        </div>
      </div>


      <div className="h-px bg-gray-200 w-full my-12" />

      {isOwner ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold">Chỉnh sửa học phần</h2>
            <div className="grid grid-cols-2 sm:flex gap-3">
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="w-full sm:w-auto h-11 rounded-xl">Xóa</Button>
              <Button onClick={handleSave} disabled={isSubmitting} className="w-full sm:w-auto h-11 rounded-xl shadow-lg shadow-primary/20">Lưu thay đổi</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wide">Môn học</label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Chọn môn học" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wide">Hiển thị</label>
              <Select value={isPublic ? "public" : "private"} onValueChange={(val) => setIsPublic(val === "public")}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="public">Công khai</SelectItem><SelectItem value="private">Quyền riêng tư</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wide">Cấp độ</label>
              <Select value={educationLevel} onValueChange={setEducationLevel}>
                <SelectTrigger className="h-12 rounded-xl focus:ring-2 focus:ring-primary/40 outline-none shadow-sm transition-all text-gray-900 font-medium">
                  <SelectValue placeholder="-- Chọn cấp độ --" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-200 shadow-lg">
                  <SelectItem value="Tiểu học" className="cursor-pointer hover:bg-gray-100 focus:bg-primary/10 focus:text-gray-900 transition-colors">Tiểu học</SelectItem>
                  <SelectItem value="Trung học cơ sở" className="cursor-pointer hover:bg-gray-100 focus:bg-primary/10 focus:text-gray-900 transition-colors">Trung học cơ sở</SelectItem>
                  <SelectItem value="Trung học Phổ Thông" className="cursor-pointer hover:bg-gray-100 focus:bg-primary/10 focus:text-gray-900 transition-colors">Trung học Phổ Thông</SelectItem>
                  <SelectItem value="Đại Học / Cao Đẳng" className="cursor-pointer hover:bg-gray-100 focus:bg-primary/10 focus:text-gray-900 transition-colors">Đại Học / Cao Đẳng</SelectItem>
                  <SelectItem value="Luyện thi chứng chỉ" className="cursor-pointer hover:bg-gray-100 focus:bg-primary/10 focus:text-gray-900 transition-colors">Luyện thi chứng chỉ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold uppercase tracking-wide">Lớp</label>
              <input type="text" className="w-full h-12 border rounded-xl px-4" value={grade} onChange={e => setGrade(e.target.value)} placeholder="VD: 4" />
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <input type="text" className="w-full text-xl font-bold p-4 border rounded-xl" value={title} onChange={e => setTitle(e.target.value)} placeholder="Tiêu đề" />
            <textarea className="w-full p-4 border rounded-xl" rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả" />
          </div>

          <div className="mb-6 flex items-center gap-3">
            <Button 
              variant="outline" 
              className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none font-bold h-10 px-6"
              onClick={() => setIsImportOpen(true)}
            >
              <Import className="w-5 h-5 mr-2" /> Nhập danh sách
            </Button>
          </div>

          <div className="space-y-4">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={cards.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {cards.map((card, index) => (
                  <SortableCard 
                    key={card.id} 
                    card={card} 
                    index={index} 
                    updateCard={updateCard} 
                    removeCard={removeCard} 
                    totalCards={cards.length} 
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Nhập danh sách</DialogTitle></DialogHeader>
              <textarea className="w-full h-40 border p-3 rounded-lg font-mono text-sm" value={importText} onChange={e => setImportText(e.target.value)} placeholder="Từ vựng, Định nghĩa..." />
              <DialogFooter><Button variant="outline" onClick={() => setIsImportOpen(false)}>Hủy</Button><Button onClick={handleImport}>Nhập ngay</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Định dạng flashcard</DialogTitle></DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-gray-500 uppercase">Mặt trước</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Màu sắc</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-10 justify-start text-left px-3 font-mono text-xs">
                            <div className="w-4 h-4 rounded-full mr-2 border border-gray-200" style={{ backgroundColor: tempFrontStyle.color }} />
                            {tempFrontStyle.color.toUpperCase()}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3" align="start">
                          <div className="grid grid-cols-10 gap-1.5">
                            {PRESET_COLORS.map(color => (
                              <button
                                key={color}
                                onClick={() => setTempFrontStyle({...tempFrontStyle, color})}
                                className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center transition-transform hover:scale-110"
                                style={{ backgroundColor: color }}
                              >
                                {tempFrontStyle.color.toLowerCase() === color.toLowerCase() && (
                                  <Check className="h-3 w-3" style={{ color: ['#ffffff', '#f3f3f3', '#efefef', '#d9d9d9', '#cccccc'].includes(color.toLowerCase()) ? '#000' : '#fff' }} />
                                )}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Cỡ chữ (px)</label>
                      <input type="number" min={12} max={120} className="w-full h-10 border rounded-md px-3" value={tempFrontStyle.size} onChange={(e) => setTempFrontStyle({...tempFrontStyle, size: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-sm text-gray-500 uppercase">Mặt sau</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Màu sắc</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-10 justify-start text-left px-3 font-mono text-xs">
                            <div className="w-4 h-4 rounded-full mr-2 border border-gray-200" style={{ backgroundColor: tempBackStyle.color }} />
                            {tempBackStyle.color.toUpperCase()}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3" align="start">
                          <div className="grid grid-cols-10 gap-1.5">
                            {PRESET_COLORS.map(color => (
                              <button
                                key={color}
                                onClick={() => setTempBackStyle({...tempBackStyle, color})}
                                className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center transition-transform hover:scale-110"
                                style={{ backgroundColor: color }}
                              >
                                {tempBackStyle.color.toLowerCase() === color.toLowerCase() && (
                                  <Check className="h-3 w-3" style={{ color: ['#ffffff', '#f3f3f3', '#efefef', '#d9d9d9', '#cccccc'].includes(color.toLowerCase()) ? '#000' : '#fff' }} />
                                )}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">Cỡ chữ (px)</label>
                      <input type="number" min={12} max={120} className="w-full h-10 border rounded-md px-3" value={tempBackStyle.size} onChange={(e) => setTempBackStyle({...tempBackStyle, size: Number(e.target.value)})} />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Hủy</Button>
                <Button onClick={() => {
                  setFrontStyle(tempFrontStyle);
                  setBackStyle(tempBackStyle);
                  setIsSettingsOpen(false);
                }}>Áp dụng</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="mt-8 mb-12 flex justify-center">
            <Button variant="outline" className="rounded-full border-primary text-primary hover:bg-primary/5 font-bold h-10 px-6 flex items-center gap-2 text-sm sm:text-base shadow-sm" onClick={addCard}>
              <Plus className="h-4 w-4" /> Thêm thẻ
            </Button>
          </div>
        </>
      ) : (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-8 text-center text-blue-800">
          <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <h3 className="text-xl font-bold mb-2">Học phần công khai</h3>
          <p>Bạn có thể ôn tập học phần này nhưng không có quyền chỉnh sửa nội dung.</p>
        </div>
      )}
    </div>
  );
}

function SortableCard({ card, index, updateCard, removeCard, totalCards }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as const,
  };

  return (
    <div ref={setNodeRef} style={style} className={`bg-white border rounded-xl overflow-hidden shadow-sm ${isDragging ? 'opacity-50' : ''}`}>
      <div className="bg-gray-50 p-2 flex justify-between items-center border-b">
        <span className="font-bold ml-2 text-gray-500">{index + 1}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" {...attributes} {...listeners} className="cursor-grab focus:outline-none text-gray-500 hover:bg-gray-100">
            <GripVertical className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeCard(card.id)} disabled={totalCards <= 2}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-1">
          <input type="text" className="w-full border-b-2 focus:border-primary outline-none py-1 text-lg bg-transparent" value={card.term} onChange={e => updateCard(card.id, 'term', e.target.value)} />
          <label className="text-xs font-bold uppercase text-gray-400">Thuật ngữ</label>
        </div>
        <div className="space-y-1">
          <input type="text" className="w-full border-b-2 focus:border-primary outline-none py-1 text-lg bg-transparent" value={card.definition} onChange={e => updateCard(card.id, 'definition', e.target.value)} />
          <label className="text-xs font-bold uppercase text-gray-400">Định nghĩa</label>
        </div>
      </div>
    </div>
  );
}
