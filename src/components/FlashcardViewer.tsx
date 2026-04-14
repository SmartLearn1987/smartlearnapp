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
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

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

  return (
    <div 
      ref={playerRef}
      className={cn(
        "flex flex-col items-center gap-6 transition-all duration-300",
        isFullscreen ? "fixed inset-0 z-50 bg-white justify-center p-10" : "w-full"
      )}
    >
      <div className={cn("perspective-1000 w-full", isFullscreen ? "max-w-3xl" : "max-w-md")}>
        <button
          onClick={() => setFlipped(!flipped)}
          className={cn(
            "relative w-full cursor-pointer transition-all duration-500",
            isFullscreen ? "h-96" : "h-56"
          )}
          style={{ 
            transformStyle: "preserve-3d", 
            transform: flipped ? "rotateY(180deg)" : "rotateY(0)" 
          }}
        >
          {/* Front */}
          <div className="backface-hidden absolute inset-0 flex items-center justify-center rounded-3xl bg-primary p-12 text-primary-foreground shadow-xl border-4 border-white/20">
            <span className={cn(
              "text-center font-heading font-black",
              isFullscreen ? "text-6xl" : "text-3xl"
            )}>
              {card.front}
            </span>
          </div>
          {/* Back */}
          <div className="backface-hidden rotate-y-180 absolute inset-0 flex items-center justify-center rounded-3xl bg-secondary p-12 text-secondary-foreground shadow-xl border-4 border-white/20">
            <span className={cn(
              "text-center font-heading font-bold",
              isFullscreen ? "text-4xl" : "text-xl"
            )}>
              {card.back}
            </span>
          </div>
        </button>
      </div>

      <div className="flex items-center justify-between w-full max-w-xl px-4 mt-4">
        {/* Play/Shuffle Left Group */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center transition-all",
              isAutoPlaying ? "bg-primary text-white shadow-lg" : "hover:bg-muted text-muted-foreground"
            )}
          >
            {isAutoPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button 
            onClick={toggleShuffle}
            className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center transition-all",
              isShuffled ? "bg-primary text-white shadow-lg" : "hover:bg-muted text-muted-foreground"
            )}
          >
            <Shuffle className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Middle Group */}
        <div className="flex items-center gap-6">
          <button 
            onClick={prev} 
            className="h-12 w-12 rounded-full flex items-center justify-center bg-muted/50 hover:bg-muted text-foreground transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="font-heading text-lg font-bold min-w-[60px] text-center">
            {currentIndex + 1} / {displayCards.length}
          </span>
          <button 
            onClick={next} 
            className="h-12 w-12 rounded-full flex items-center justify-center bg-muted/50 hover:bg-muted text-foreground transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Fullscreen/Reset Right Group */}
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleFullScreen}
            className="h-12 w-12 rounded-full flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
