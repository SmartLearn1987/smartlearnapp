import { useState, useRef } from "react";
import { Upload, ChevronLeft, ChevronRight, X, ImageIcon, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SlideImage { id: string; url: string; caption?: string; }

interface SummaryTabProps {
  lessonId: string;
  isTeacher?: boolean;
  initialSlides?: SlideImage[];
  onSave?: (slides: SlideImage[]) => void;
}

export function SummaryTab({ lessonId, isTeacher = false, initialSlides = [], onSave }: SummaryTabProps) {
  const [slides, setSlides] = useState<SlideImage[]>(initialSlides);
  const [current, setCurrent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImages = (files: FileList) => {
    const newSlides: SlideImage[] = [];
    let loaded = 0;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        newSlides.push({ id: `slide-${Date.now()}-${loaded}`, url: e.target?.result as string });
        loaded++;
        if (loaded === files.length) {
          const updated = [...slides, ...newSlides];
          setSlides(updated);
          onSave?.(updated);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeSlide = (id: string) => {
    const updated = slides.filter(s => s.id !== id);
    setSlides(updated);
    setCurrent(Math.min(current, updated.length - 1));
    onSave?.(updated);
  };

  return (
    <div className="space-y-4">
      {isTeacher && (
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Plus className="w-4 h-4 mr-2" /> Thêm ảnh slide
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => e.target.files && addImages(e.target.files)} />
          {slides.length > 0 && <Badge variant="secondary">{slides.length} slide</Badge>}
        </div>
      )}

      {slides.length > 0 && (
        <div className="space-y-3">
          {/* Main slide */}
          <div className="relative bg-black rounded-xl overflow-hidden" style={{ minHeight: 320 }}>
            <img src={slides[current]?.url} alt={`Slide ${current + 1}`}
              className="w-full h-auto max-h-[60vh] object-contain mx-auto block" />
            {isTeacher && (
              <button onClick={() => removeSlide(slides[current].id)}
                className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
              {current + 1} / {slides.length}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-center gap-3">
            <Button variant="outline" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" disabled={current === slides.length - 1} onClick={() => setCurrent(c => c + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Thumbnails */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {slides.map((slide, i) => (
              <button key={slide.id} onClick={() => setCurrent(i)}
                className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  i === current ? "border-blue-500" : "border-transparent opacity-60 hover:opacity-100"}`}>
                <img src={slide.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {slides.length === 0 && (
        <Card className="p-12 text-center">
          <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Chưa có slide tổng kết</p>
          <p className="text-sm text-gray-400">
            {isTeacher ? "Tải lên ảnh để tạo slide" : "Giáo viên chưa thêm slide"}
          </p>
        </Card>
      )}
    </div>
  );
}