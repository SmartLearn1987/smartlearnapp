import { useState, useRef, useCallback } from "react";
import {
  Upload, Plus, Pencil, Trash2, X, Check,
  ChevronLeft, ChevronRight, RotateCcw, Shuffle,
  Download, FileSpreadsheet, Layers, GripVertical,
  Eye, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface FlashcardTabProps {
  lessonId: string;
  isTeacher?: boolean;
  initialCards?: Flashcard[];
  onSave?: (cards: Flashcard[]) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => `card-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ─── Main Component ───────────────────────────────────────────────────────────

export function FlashcardTab({
  lessonId,
  isTeacher = false,
  initialCards = [],
  onSave,
}: FlashcardTabProps) {
  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [activeTab, setActiveTab] = useState<"manage" | "preview">(
    isTeacher ? "manage" : "preview"
  );

  const persist = useCallback(
    (next: Flashcard[]) => {
      setCards(next);
      onSave?.(next);
    },
    [onSave]
  );

  // ── Preview state ────────────────────────────────────────────────────────
  const [previewCards, setPreviewCards] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);

  const startPreview = (shuffled = false) => {
    const deck = shuffled
      ? [...cards].sort(() => Math.random() - 0.5)
      : [...cards];
    setPreviewCards(deck);
    setCurrentIdx(0);
    setIsFlipped(false);
    setIsShuffled(shuffled);
    setActiveTab("preview");
  };

  // ── Dialog state ─────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Flashcard | null>(null);
  const [formFront, setFormFront] = useState("");
  const [formBack, setFormBack] = useState("");
  const [formError, setFormError] = useState("");

  const openAdd = () => {
    setEditTarget(null);
    setFormFront("");
    setFormBack("");
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (card: Flashcard) => {
    setEditTarget(card);
    setFormFront(card.front);
    setFormBack(card.back);
    setFormError("");
    setDialogOpen(true);
  };

  const handleSaveCard = () => {
    if (!formFront.trim()) { setFormError("Mặt trước không được để trống."); return; }
    if (!formBack.trim()) { setFormError("Mặt sau không được để trống."); return; }

    if (editTarget) {
      persist(cards.map((c) => c.id === editTarget.id ? { ...c, front: formFront.trim(), back: formBack.trim() } : c));
    } else {
      persist([...cards, { id: uid(), front: formFront.trim(), back: formBack.trim() }]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    persist(cards.filter((c) => c.id !== id));
  };

  // ── Excel import ──────────────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [importError, setImportError] = useState("");
  const [importCount, setImportCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseExcel = (file: File) => {
    setImportError("");
    setImportCount(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const parsed: Flashcard[] = rows
          .slice(1)
          .filter((r) => r[0] && r[1])
          .map((r) => ({
            id: uid(),
            front: String(r[0]).trim(),
            back: String(r[1]).trim(),
          }));

        if (parsed.length === 0) {
          setImportError("Không tìm thấy dữ liệu. Cột A = Mặt trước, Cột B = Mặt sau.");
          return;
        }
        persist([...cards, ...parsed]);
        setImportCount(parsed.length);
      } catch {
        setImportError("Không đọc được file. Hãy dùng định dạng .xlsx hoặc .xls.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Mặt trước", "Mặt sau"],
      ["Photosynthesis", "Quá trình thực vật tổng hợp thức ăn từ ánh sáng mặt trời"],
      ["Mitosis", "Phân bào nguyên phân tạo ra 2 tế bào con giống hệt tế bào mẹ"],
      ["DNA", "Phân tử mang thông tin di truyền của sinh vật"],
    ]);
    ws["!cols"] = [{ wch: 30 }, { wch: 60 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Flashcards");
    XLSX.writeFile(wb, "flashcard-template.xlsx");
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ── Header bar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold text-gray-800">Flashcard</span>
          {cards.length > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 border-0">
              {cards.length} thẻ
            </Badge>
          )}
        </div>
        {cards.length > 0 && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => startPreview(false)}
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              <Eye className="w-3.5 h-3.5 mr-1" /> Xem thẻ
            </Button>
          </div>
        )}
      </div>

      {/* ── Teacher UI ── */}
      {isTeacher ? (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="bg-gray-100 rounded-lg p-1 h-auto">
            <TabsTrigger value="manage" className="rounded-md text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Quản lý thẻ
            </TabsTrigger>
            <TabsTrigger value="preview" className="rounded-md text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm" disabled={cards.length === 0}>
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Xem trước
            </TabsTrigger>
          </TabsList>

          {/* ─── MANAGE TAB ─── */}
          <TabsContent value="manage" className="mt-4 space-y-4">

            {/* Excel import zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl transition-all duration-200 ${
                isDragging
                  ? "border-emerald-400 bg-emerald-50 scale-[1.01]"
                  : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50/80"
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault(); setIsDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) parseExcel(f);
              }}
            >
              <div className="flex items-center gap-4 p-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isDragging ? "bg-emerald-200" : "bg-emerald-100"}`}>
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">
                    Nhập từ Excel
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Kéo thả file vào đây · Cột A = Mặt trước, Cột B = Mặt sau
                  </p>
                  {importError && (
                    <p className="text-xs text-red-500 mt-1">{importError}</p>
                  )}
                  {importCount !== null && (
                    <p className="text-xs text-emerald-600 mt-1 font-medium">
                      ✓ Đã thêm {importCount} thẻ từ Excel
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadTemplate}
                    className="text-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> Mẫu
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" /> Chọn file
                  </Button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) parseExcel(f);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Add manually button */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 shrink-0">hoặc nhập thủ công</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <Button
              onClick={openAdd}
              className="w-full bg-white border-2 border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 shadow-none"
            >
              <Plus className="w-4 h-4 mr-2" /> Thêm thẻ mới
            </Button>

            {/* Card list table */}
            {cards.length > 0 ? (
              <div className="rounded-xl border overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-2.5 border-b flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Danh sách thẻ
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {cards.length} thẻ
                  </Badge>
                </div>
                <div className="divide-y max-h-[420px] overflow-y-auto">
                  {cards.map((card, idx) => (
                    <div
                      key={card.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/80 group transition-colors"
                    >
                      <span className="text-xs text-gray-300 font-mono mt-0.5 w-5 shrink-0 select-none">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 mb-0.5">Mặt trước</p>
                          <p className="text-sm text-gray-800 font-medium truncate">
                            {card.front}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400 mb-0.5">Mặt sau</p>
                          <p className="text-sm text-gray-600 truncate">{card.back}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => openEdit(card)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(card.id)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bulk actions footer */}
                <div className="bg-gray-50 border-t px-4 py-2.5 flex justify-end">
                  <button
                    onClick={() => { if (confirm(`Xoá tất cả ${cards.length} thẻ?`)) persist([]); }}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Xoá tất cả
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-gray-100 py-14 text-center">
                <Layers className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Chưa có thẻ nào</p>
                <p className="text-xs text-gray-300 mt-1">
                  Thêm thủ công hoặc nhập từ Excel
                </p>
              </div>
            )}
          </TabsContent>

          {/* ─── PREVIEW TAB (Teacher) ─── */}
          <TabsContent value="preview" className="mt-4">
            <PreviewDeck
              cards={previewCards.length > 0 ? previewCards : cards}
              currentIdx={currentIdx}
              isFlipped={isFlipped}
              isShuffled={isShuffled}
              onCurrentChange={setCurrentIdx}
              onFlip={() => setIsFlipped((f) => !f)}
              onShuffle={() => startPreview(true)}
              onReset={() => startPreview(false)}
            />
          </TabsContent>
        </Tabs>
      ) : (
        /* ── Student preview-only ── */
        cards.length > 0 ? (
          <PreviewDeck
            cards={previewCards.length > 0 ? previewCards : cards}
            currentIdx={currentIdx}
            isFlipped={isFlipped}
            isShuffled={isShuffled}
            onCurrentChange={setCurrentIdx}
            onFlip={() => setIsFlipped((f) => !f)}
            onShuffle={() => startPreview(true)}
            onReset={() => startPreview(false)}
          />
        ) : (
          <Card className="py-16 text-center border-dashed">
            <Layers className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Chưa có flashcard</p>
          </Card>
        )
      )}

      {/* ─── Add / Edit Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                {editTarget ? <Pencil className="w-3.5 h-3.5 text-emerald-700" /> : <Plus className="w-3.5 h-3.5 text-emerald-700" />}
              </div>
              {editTarget ? "Chỉnh sửa thẻ" : "Thêm thẻ mới"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="front" className="text-sm font-medium">
                Mặt trước
                <span className="text-red-400 ml-0.5">*</span>
              </Label>
              <Textarea
                id="front"
                placeholder="Thuật ngữ, khái niệm, câu hỏi..."
                value={formFront}
                onChange={(e) => { setFormFront(e.target.value); setFormError(""); }}
                className="resize-none text-sm min-h-[90px] focus:ring-emerald-400"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="back" className="text-sm font-medium">
                Mặt sau
                <span className="text-red-400 ml-0.5">*</span>
              </Label>
              <Textarea
                id="back"
                placeholder="Định nghĩa, giải thích, đáp án..."
                value={formBack}
                onChange={(e) => { setFormBack(e.target.value); setFormError(""); }}
                className="resize-none text-sm min-h-[90px] focus:ring-emerald-400"
              />
            </div>

            {formError && (
              <p className="text-sm text-red-500 flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> {formError}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Huỷ
            </Button>
            <Button
              onClick={handleSaveCard}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {editTarget ? "Lưu thay đổi" : "Thêm thẻ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Preview Deck Sub-component ───────────────────────────────────────────────

interface PreviewDeckProps {
  cards: Flashcard[];
  currentIdx: number;
  isFlipped: boolean;
  isShuffled: boolean;
  onCurrentChange: (i: number) => void;
  onFlip: () => void;
  onShuffle: () => void;
  onReset: () => void;
}

function PreviewDeck({
  cards, currentIdx, isFlipped, isShuffled,
  onCurrentChange, onFlip, onShuffle, onReset,
}: PreviewDeckProps) {
  const current = cards[currentIdx];
  if (!current) return null;

  const progress = ((currentIdx + 1) / cards.length) * 100;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-500">
          <span className="font-mono font-medium text-gray-700">
            {currentIdx + 1}
          </span>
          <span className="text-gray-300">/</span>
          <span>{cards.length}</span>
          {isShuffled && (
            <Badge className="bg-amber-100 text-amber-700 border-0 text-xs ml-1">
              Đã trộn
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onReset} title="Đặt lại thứ tự">
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onShuffle} title="Trộn bài">
            <Shuffle className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <Progress value={progress} className="h-1 bg-gray-100" />

      {/* Flip card */}
      <div
        className="cursor-pointer select-none"
        style={{ perspective: "1200px" }}
        onClick={onFlip}
      >
        <div
          className="relative w-full transition-transform duration-500 ease-out"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            height: "240px",
          }}
        >
          {/* Front face */}
          <div
            className="absolute inset-0 rounded-2xl border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col items-center justify-center px-8 shadow-sm"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-xl font-semibold text-center text-gray-800 leading-snug">
              {current.front}
            </p>
            <span className="text-xs text-gray-300 mt-6">
              Nhấn để lật thẻ
            </span>
          </div>

          {/* Back face */}
          <div
            className="absolute inset-0 rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col items-center justify-center px-8 shadow-sm"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <p className="text-lg text-center text-gray-700 leading-relaxed">
              {current.back}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={currentIdx === 0}
          onClick={() => { onCurrentChange(currentIdx - 1); if (isFlipped) onFlip(); }}
          className="w-28"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Trước
        </Button>

        {/* Dot indicators (show up to 9) */}
        <div className="flex gap-1.5">
          {cards.slice(0, 9).map((_, i) => (
            <button
              key={i}
              onClick={() => { onCurrentChange(i); if (isFlipped) onFlip(); }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === currentIdx
                  ? "bg-emerald-500 w-4"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
          {cards.length > 9 && (
            <span className="text-xs text-gray-300">…</span>
          )}
        </div>

        <Button
          variant="outline"
          disabled={currentIdx === cards.length - 1}
          onClick={() => { onCurrentChange(currentIdx + 1); if (isFlipped) onFlip(); }}
          className="w-28"
        >
          Tiếp <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
