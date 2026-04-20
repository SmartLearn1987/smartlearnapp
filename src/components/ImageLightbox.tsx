import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  // Handle keyboard events
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNavigate((currentIndex - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") onNavigate((currentIndex + 1) % images.length);
    };

    window.addEventListener("keydown", handleKeyDown);
    // Prevent scrolling when lightbox is open
    document.body.style.overflow = "hidden";
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  if (!isOpen) return null;

  const currentImageUrl = images[currentIndex];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md transition-all duration-300 animate-in fade-in">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 sm:p-6 text-white/80">
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-widest uppercase opacity-60">Xem hình ảnh</span>
          <span className="text-lg font-black tabular-nums">{currentIndex + 1} / {images.length}</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsZoomed(!isZoomed)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 active:scale-95"
            title={isZoomed ? "Thu nhỏ" : "Phóng to"}
          >
            {isZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </button>
          
          <button 
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 active:scale-95"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div 
        className="relative flex h-full w-full items-center justify-center p-4 sm:p-12 overflow-hidden"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div 
          className={`relative flex items-center justify-center transition-transform duration-500 ease-out h-full w-full ${isZoomed ? "scale-150 cursor-zoom-out" : "scale-100 cursor-zoom-in"}`}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <img
            src={currentImageUrl}
            alt={`Image ${currentIndex + 1}`}
            className="max-h-full max-w-full select-none rounded shadow-2xl animate-in zoom-in-95 duration-300"
            draggable={false}
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((currentIndex - 1 + images.length) % images.length);
              setIsZoomed(false);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 backdrop-blur-md text-white border border-white/10 transition-all hover:bg-white/10 hover:scale-105 active:scale-90 z-50"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate((currentIndex + 1) % images.length);
              setIsZoomed(false);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 backdrop-blur-md text-white border border-white/10 transition-all hover:bg-white/10 hover:scale-105 active:scale-90 z-50"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      {/* Bottom Thumbnails (Optional hint on mobile or just controls) */}
      <div className="absolute bottom-6 flex gap-2 overflow-x-auto px-4 py-2 max-w-full no-scrollbar">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => { onNavigate(i); setIsZoomed(false); }}
            className={`h-1.5 transition-all duration-300 rounded-full ${i === currentIndex ? "w-8 bg-white" : "w-2 bg-white/30 hover:bg-white/50"}`}
          />
        ))}
      </div>
    </div>,
    document.body
  );
}
