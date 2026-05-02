import { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Play, 
  Pause, 
  Shuffle, 
  Maximize2, 
  Minimize2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@/data/mockData";

export default function FlashcardViewer({ flashcards }: { flashcards: Flashcard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  const displayCards = isShuffled ? shuffledCards : flashcards;
  const card = displayCards[currentIndex] || { front: "Trống", back: "Trống" };

  const next = () => {
    setFlipped(false);
    setCurrentIndex((i) => (i + 1) % displayCards.length);
  };

  const prev = () => {
    setFlipped(false);
    setCurrentIndex((i) => (i - 1 + displayCards.length) % displayCards.length);
  };

  const toggleShuffle = () => {
    if (!isShuffled) {
      const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
      setShuffledCards(shuffled);
      setIsShuffled(true);
    } else {
      setIsShuffled(false);
    }
    setCurrentIndex(0);
    setIsAutoPlaying(false);
    setFlipped(false);
  };

  const toggleFullScreen = () => {
    const doc = document as any;
    const element = playerRef.current as any;
    if (!element) return;

    if (!isFullscreen) {
      if (element.requestFullscreen) {
        element.requestFullscreen().catch(() => {});
      } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      const doc = document as any;
      const isNativeFs = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
      
      if (!isNativeFs && isFullscreen) {
        if (doc.fullscreenEnabled || doc.webkitFullscreenEnabled) {
          setIsFullscreen(false);
        }
      }
    };
    
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, [isFullscreen]);

  useEffect(() => {
    let interval: any;
    if (isAutoPlaying && displayCards.length > 0) {
      interval = setInterval(() => {
        setFlipped(false);
        setTimeout(() => {
           setCurrentIndex((prevIndex) => (prevIndex + 1) % displayCards.length);
        }, 150); // slight delay after unflip
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, displayCards.length]);

  const getDynamicFontSize = (text: string, baseSize: number) => {
    const length = text?.length || 0;
    let size = baseSize;
    if (length > 200) size = baseSize * 0.4;
    else if (length > 100) size = baseSize * 0.5;
    else if (length > 50) size = baseSize * 0.7;
    else if (length > 30) size = baseSize * 0.85;

    // Mobile adjustment
    if (window.innerWidth < 640) {
      size = size * 0.75;
    }
    return `${size}px`;
  };

  return (
    <div 
      ref={playerRef}
      className={cn(
        "flex flex-col items-center gap-4 sm:gap-6 transition-all duration-300",
        isFullscreen ? "fixed inset-0 z-[100] bg-white h-screen w-screen p-4 sm:p-10 overflow-y-auto" : "w-full"
      )}
    >
      <div className={cn("perspective-1000 w-full flex-1 flex flex-col items-center justify-center", isFullscreen ? "max-w-5xl" : "max-w-md")}>
        <button
          onClick={() => setFlipped(!flipped)}
          className={cn(
            "relative w-full cursor-pointer transition-all duration-500",
            isFullscreen ? "flex-1 min-h-[300px] max-h-[75vh]" : "h-64 sm:h-80"
          )}
          style={{ 
            transformStyle: "preserve-3d", 
            transform: flipped ? "rotateY(180deg)" : "rotateY(0)" 
          }}
        >
          {/* Front */}
          <div className="backface-hidden absolute inset-0 flex items-center justify-center rounded-3xl bg-gray-100 p-6 sm:p-12 text-[#ef4444] shadow-md border border-gray-200 overflow-hidden">
            <span 
              className="text-center font-bold break-words w-full"
              style={{ fontSize: getDynamicFontSize(card.front, isFullscreen ? 64 : 40) }}
            >
              {card.front}
            </span>
          </div>
          {/* Back */}
          <div className="backface-hidden rotate-y-180 absolute inset-0 flex items-center justify-center rounded-3xl bg-gray-100 p-6 sm:p-12 text-[#2563eb] shadow-md border border-gray-200 overflow-hidden">
            <span 
              className="text-center font-bold break-words w-full"
              style={{ fontSize: getDynamicFontSize(card.back, isFullscreen ? 48 : 28) }}
            >
              {card.back}
            </span>
          </div>
        </button>
      </div>

      <div className="flex items-center justify-between w-full max-w-xl px-1 sm:px-4 mt-4 select-none flex-nowrap gap-0">
        {/* Play/Shuffle Left Group */}
        <div className="flex items-center gap-0 sm:gap-2 shrink-0 flex-nowrap">
          <button 
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={cn(
              "h-8 w-8 sm:h-12 sm:w-12 rounded-full flex items-center justify-center transition-all shrink-0",
              isAutoPlaying ? "bg-primary text-white shadow-lg" : "hover:bg-muted text-muted-foreground"
            )}
          >
            {isAutoPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          <button 
            onClick={toggleShuffle}
            className={cn(
              "h-8 w-8 sm:h-12 sm:w-12 rounded-full flex items-center justify-center transition-all shrink-0",
              isShuffled ? "bg-primary text-white shadow-lg" : "hover:bg-muted text-muted-foreground"
            )}
          >
            <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Navigation Middle Group */}
        <div className="flex items-center gap-0.5 sm:gap-6 shrink-0 flex-nowrap mx-auto">
          <button 
            onClick={prev} 
            className="h-9 w-9 sm:h-12 sm:w-12 rounded-full flex items-center justify-center bg-muted/50 hover:bg-muted text-foreground transition-colors shrink-0"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <span className="font-bold text-[12px] sm:text-lg px-1 sm:px-4 text-center whitespace-nowrap shrink-0 tabular-nums leading-none min-w-[50px] sm:min-w-[100px]">
            {currentIndex + 1} / {displayCards.length}
          </span>
          <button 
            onClick={next} 
            className="h-9 w-9 sm:h-12 sm:w-12 rounded-full flex items-center justify-center bg-muted/50 hover:bg-muted text-foreground transition-colors shrink-0"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Fullscreen/Reset Right Group */}
        <div className="flex items-center gap-0 sm:gap-2 shrink-0 flex-nowrap">
          <button 
            onClick={toggleFullScreen}
            className="h-8 w-8 sm:h-12 sm:w-12 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors shrink-0"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
