import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Shuffle, Play, Pause, ChevronLeft, ChevronRight, 
  RotateCcw, ImageIcon, Volume2, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface LearningQuestion {
  id: string;
  image_url: string;
  answer: string;
}

interface LearningCategory {
  id: string;
  name: string;
  general_question: string;
}

export default function LearningGamePlayPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  
  const [category, setCategory] = useState<LearningCategory | null>(null);
  const [questions, setQuestions] = useState<LearningQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const autoPlayTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchGameData = useCallback(async () => {
    try {
      setLoading(true);
      const [catData, qData] = await Promise.all([
        apiFetch<LearningCategory>(`/learning/categories/${categoryId}`),
        apiFetch<LearningQuestion[]>(`/learning/categories/${categoryId}/questions`)
      ]);
      
      setCategory(catData);
      setQuestions(qData);
    } catch (err: any) {
      toast.error("Không thể tải dữ liệu bài học.");
      navigate("/games");
    } finally {
      setLoading(false);
    }
  }, [categoryId, navigate]);

  useEffect(() => {
    fetchGameData();
  }, [fetchGameData]);

  // Handle Auto-play
  useEffect(() => {
    if (isPlaying && questions.length > 0) {
      autoPlayTimer.current = setInterval(() => {
        setIsFlipped((prev) => {
          if (!prev) return true; // Flip to back
          
          // If already flipped, move to next card and unflip
          setTimeout(() => {
            setCurrentIndex((curr) => (curr + 1) % questions.length);
            setIsFlipped(false);
          }, 1000);
          return true;
        });
      }, 4000);
    } else {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    }

    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [isPlaying, questions.length]);

  const handleNext = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % questions.length);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + questions.length) % questions.length);
    }, 150);
  };

  const handleShuffle = () => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    setQuestions(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    toast.success("Đã xáo trộn các thẻ hình!");
  };

  const toggleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFCF6]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-bounce rounded-full bg-primary shadow-lg flex items-center justify-center text-white">
            <ImageIcon className="h-8 w-8" />
          </div>
          <p className="font-heading text-xl font-bold text-primary animate-pulse">Bé chờ một chút nhé...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-[#FDFCF6] pb-20 overflow-x-hidden pt-4 px-4">
      {/* Header */}
      <div className="mx-auto max-w-4xl flex items-center justify-between mb-8">
        <button
          onClick={() => navigate("/")}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm hover:shadow-md transition-all active:scale-95 group border border-emerald-100"
        >
          <ArrowLeft className="h-5 w-5 text-primary group-hover:-translate-x-1 transition-transform" />
        </button>
        
        <div className="flex flex-col items-center">
          <h1 className="font-heading text-lg font-black text-primary uppercase tracking-wide">
            {category?.name}
          </h1>
          <div className="flex items-center gap-2 mt-1 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200">
            <span className="text-[10px] font-black text-primary">
              CÂU {currentIndex + 1} / {questions.length}
            </span>
          </div>
        </div>

        <div className="w-10" />
      </div>

      {/* Main Card Area */}
      <div className="mx-auto max-w-sm px-4">
        <div 
          className="relative perspective-1000 w-full aspect-[4/5] group cursor-pointer"
          onClick={toggleFlip}
        >
          <div className={`relative w-full h-full transition-all duration-700 preserve-3d shadow-2xl rounded-[2.5rem] ${isFlipped ? 'rotate-y-180' : ''}`}>
            {/* Front Side */}
            <div className="absolute inset-0 backface-hidden w-full h-full bg-white rounded-[2.5rem] border-4 border-primary/50 p-8 flex flex-col items-center">
              <div className="w-full text-center space-y-4 flex flex-col items-center justify-center flex-1">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 text-primary border border-emerald-100 mb-2">
                  <HelpCircle className="h-5 w-5" />
                  <span className="font-bold text-sm">{category?.general_question || "Đây là gì nào?"}</span>
                </div>
                
                <div className="w-full aspect-square rounded-3xl overflow-hidden bg-[#F8FAFC] p-2 border border-slate-100 shadow-inner">
                  <img 
                    src={currentQuestion?.image_url} 
                    alt="Illustration"
                    className="w-full h-full object-contain rounded-2xl transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-slate-400 text-xs font-medium bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                <RotateCcw className="h-3 w-3 animate-reverse-spin" />
                <span>Chạm để xem đáp án</span>
              </div>
            </div>

            {/* Back Side */}
            <div className="absolute inset-0 backface-hidden w-full h-full bg-white rounded-[2.5rem] border-4 border-emerald-400 p-6 flex flex-col items-center rotate-y-180">
               <div className="w-full flex-1 flex flex-col items-center justify-center space-y-6">
                 <div className="w-full aspect-[4/3] rounded-3xl overflow-hidden bg-white">
                    <img 
                      src={currentQuestion?.image_url} 
                      alt="Illustration"
                      className="w-full h-full object-contain"
                    />
                 </div>
                 
                 <div className="w-full text-center space-y-2">
                   <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-500">ĐÁP ÁN ĐÚNG</p>
                   <div className="inline-block relative">
                     <h2 className="text-4xl font-black text-slate-800 drop-shadow-sm">
                      {currentQuestion?.answer}
                     </h2>
                     <div className="absolute -bottom-1 left-0 right-0 h-2 bg-emerald-200/50 rounded-full -z-10" />
                   </div>
                 </div>
               </div>

               <div className="mt-2 text-emerald-400">
                 <Volume2 className="h-8 w-8 animate-pulse" />
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-[50]">
        <div className="mx-auto max-w-sm flex items-center justify-center gap-3 sm:gap-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`h-14 w-14 rounded-2xl border transition-all duration-300 shadow-sm
              ${isPlaying 
                ? "bg-rose-50 border-rose-200 text-rose-600 shadow-rose-100" 
                : "bg-emerald-50 border-emerald-200 text-primary shadow-emerald-100"}`}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Dừng tự chạy" : "Bắt đầu tự chạy"}
          >
            {isPlaying ? (
              <Pause className="h-7 w-7 fill-current" />
            ) : (
              <Play className="h-7 w-7 fill-current" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 hover:bg-amber-100 shadow-sm shadow-amber-100"
            onClick={handleShuffle}
            title="Xáo trộn thẻ"
          >
            <Shuffle className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 hover:text-slate-900 shadow-sm"
            onClick={handleNext}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        </div>
      </div>

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        @keyframes reverse-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-reverse-spin {
          animation: reverse-spin 3s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
