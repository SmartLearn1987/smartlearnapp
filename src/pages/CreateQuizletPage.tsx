import { useState, useEffect } from "react";
import { Import, Trash2, GripVertical, Image as ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
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

export default function CreateQuizletPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [grade, setGrade] = useState("");
  const [educationLevel, setEducationLevel] = useState("");

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const data = await apiFetch("/subjects") as any[];
        setSubjects(data);
      } catch (err) {
        toast.error("Không thể tải danh sách môn học");
      }
    }
    fetchSubjects();
  }, []);
  interface CardData {
    id: number | string;
    term: string;
    definition: string;
  }

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
  interface CardData {
    id: number | string;
    term: string;
    definition: string;
  }

  const [cards, setCards] = useState<CardData[]>([
    { id: 1, term: "", definition: "" },
    { id: 2, term: "", definition: "" },
  ]);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

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

      // Fill first 2 empty cards if they exist
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

      // Add the remaining imported cards
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

  const addCard = () => {
    setCards([...cards, { id: cards.length + 1, term: "", definition: "" }]);
  };

  const removeCard = (id: string | number) => {
    if (cards.length > 2) {
      setCards(cards.filter(c => c.id !== id));
    }
  };

  const updateCard = (id: string | number, field: 'term' | 'definition', value: string) => {
    setCards(cards.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return;
    }
    const cleanCards = cards.filter(c => c.term.trim() || c.definition.trim());
    if (cleanCards.length === 0) {
      toast.error("Vui lòng nhập ít nhất một thuật ngữ");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch("/quizlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          subject_id: selectedSubjectId || null,
          grade: grade.trim() || null,
          education_level: educationLevel || null,
          is_public: isPublic ?? false,
          created_by: user?.id || null,
          terms: cleanCards,
        }),
      });
      toast.success("Đã tạo học phần thành công!");
      navigate("/quizlet");
    } catch (err: any) {
      toast.error(err.message || "Không thể tạo học phần. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-heading text-gray-900 leading-tight">Tạo một học phần mới</h1>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button 
            className="w-full sm:w-auto bg-[#2D9B63] hover:bg-[#2D9B63]/90 text-white font-bold rounded-xl h-11 px-8 shadow-lg shadow-[#2D9B63]/20 transition-all active:scale-95"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            Tạo và ôn luyện
          </Button>
        </div>
      </div>

      {/* Visibility Toggle */}
      <div className="mb-6 max-w-sm">
        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Chế độ hiển thị</label>
        <Select value={isPublic ? "public" : "private"} onValueChange={(val) => setIsPublic(val === "public")}>
          <SelectTrigger className="w-full bg-white border border-gray-200 rounded-xl h-12 focus:ring-2 focus:ring-primary/40 outline-none shadow-sm transition-all text-gray-900 font-medium">
            <SelectValue placeholder="Chọn chế độ hiển thị" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-gray-200 shadow-lg">
            <SelectItem value="public" className="cursor-pointer hover:bg-gray-100 focus:bg-primary/10 focus:text-gray-900 transition-colors">Công khai (Tất cả User đều thấy)</SelectItem>
            <SelectItem value="private" className="cursor-pointer hover:bg-gray-100 focus:bg-primary/10 focus:text-gray-900 transition-colors">Không công khai (Chỉ mình tôi)</SelectItem>
          </SelectContent>
        </Select>
      </div>



      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 max-w-2xl">
        <div className="md:col-span-2">
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Môn học</label>
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
            <SelectTrigger className="w-full bg-white border border-gray-200 rounded-xl h-12 focus:ring-2 focus:ring-primary/40 outline-none shadow-sm transition-all text-gray-900 font-medium">
              <SelectValue placeholder="Chọn môn học" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-gray-200 shadow-lg">
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id} className="cursor-pointer hover:bg-gray-100 focus:bg-primary/10 focus:text-gray-900 transition-colors">
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Cấp độ</label>
          <Select value={educationLevel} onValueChange={setEducationLevel}>
            <SelectTrigger className="w-full bg-white border border-gray-200 rounded-xl h-12 focus:ring-2 focus:ring-primary/40 outline-none shadow-sm transition-all text-gray-900 font-medium">
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
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Lớp</label>
          <input
            type="text"
            placeholder="VD: 4"
            className="w-full bg-white border border-gray-200 rounded-xl h-12 px-4 focus:ring-2 focus:ring-primary/40 outline-none shadow-sm transition-all text-gray-900 font-medium"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          />
        </div>
      </div>
      {/* Title & Description */}
      <div className="space-y-5 mb-10">
        <div className="relative group">
          <input
            type="text"
            placeholder="Nhập tiêu đề hoặc thuật ngữ học phần..."
            className="w-full text-xl font-bold bg-white border border-gray-200 rounded-xl p-5 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 text-gray-900 shadow-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="relative group">
          <textarea
            rows={2}
            placeholder="Thêm mô tả (không bắt buộc)..."
            className="w-full bg-white border border-gray-200 rounded-xl p-5 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400 text-gray-900 shadow-sm resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none font-bold h-10 px-6"
            onClick={() => setIsImportOpen(true)}
          >
            <Import className="w-5 h-5 mr-2" /> Nhập danh sách
          </Button>

          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Nhập thuật ngữ và định nghĩa</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Dán nội dung vào đây. Mỗi dòng là một thẻ, thuật ngữ và định nghĩa cách nhau bằng dấu phẩy (,).
                  <br/>Ví dụ:<br/>
                  <span className="font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded inline-block mt-1">Hello, xin chào<br/>Bye, Tạm biệt</span>
                </p>
                <textarea
                  className="w-full h-40 p-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                  placeholder="Từ vựng, Định nghĩa..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsImportOpen(false)} className="border-red-500 text-red-500 hover:bg-red-50 font-bold">Hủy</Button>
                <Button onClick={handleImport}>Nhập ngay</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


        </div>
        

      </div>

      {/* Cards List */}
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
      
      {/* Add Card Button */}
      <div className="mt-8 flex justify-center pb-10">
        <Button 
          onClick={addCard}
          variant="outline" 
          className="rounded-full border-primary text-primary hover:bg-primary/5 font-bold h-10 px-6 flex items-center gap-2 text-sm sm:text-base shadow-sm"
        >
          <Plus className="h-4 w-4" /> Thêm thẻ
        </Button>
      </div>
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
    <div ref={setNodeRef} style={style} className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${isDragging ? 'opacity-50' : ''}`}>
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-gray-50 px-4 py-3 bg-gray-50/50">
        <span className="font-bold text-gray-700">{index + 1}</span>
        <div className="flex gap-2 text-muted-foreground">
          <button {...attributes} {...listeners} className="p-1 hover:bg-gray-200 rounded transition-colors cursor-grab focus:outline-none">
            <GripVertical className="w-5 h-5" />
          </button>
          <button 
            onClick={() => removeCard(card.id)}
            disabled={totalCards <= 2}
            className={`p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors ${totalCards <= 2 ? 'opacity-50 cursor-not-allowed text-gray-400' : ''}`}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <input
              type="text"
              value={card.term}
              onChange={(e) => updateCard(card.id, 'term', e.target.value)}
              className="w-full pb-2 text-lg focus:outline-none border-b-2 border-gray-200 focus:border-primary transition-colors bg-white/50"
            />
            <div className="text-xs font-semibold text-muted-foreground mt-2 uppercase tracking-wide">Thuật ngữ</div>
          </div>
          
          <div className="flex-1">
            <input
              type="text"
              value={card.definition}
              onChange={(e) => updateCard(card.id, 'definition', e.target.value)}
              className="w-full pb-2 text-lg focus:outline-none border-b-2 border-gray-200 focus:border-primary transition-colors bg-white/50"
            />
            <div className="text-xs font-semibold text-muted-foreground mt-2 uppercase tracking-wide">Định nghĩa</div>
          </div>
        </div>
      </div>
    </div>
  );
}
