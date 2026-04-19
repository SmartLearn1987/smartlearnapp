import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, XCircle, ChevronLeft, RefreshCcw, 
  Trophy, Clock, Target, Calendar, ArrowRight,
  Check, X, HelpCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export default function QuizResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { exam, userAnswers, timeTaken } = location.state || {};
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (mounted = true) => {
    if (!exam || isSaving || isSaved) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await apiFetch(`/exams/${exam.id}/results`, {
        method: "POST",
        body: JSON.stringify({
          score: scorePercent,
          timeTaken: timeTaken
        })
      });
      if (mounted) {
        setIsSaved(true);
        setIsSaving(false);
      }
    } catch (err: any) {
      if (mounted) {
        setIsSaving(false);
        setSaveError(err.message || "Lỗi lưu kết quả");
        if (!err.message.includes("Unauthorized")) {
          toast.error("Không thể lưu kết quả: " + err.message);
        }
      }
    }
  };

  if (!exam) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4 text-center">
        <HelpCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Không tìm thấy dữ liệu kết quả</h1>
        <Button onClick={() => navigate("/quizzes")} variant="link">Quay lại danh sách</Button>
      </div>
    );
  }

  const results = exam.questions.map((q: any) => {
    const userAnswer = userAnswers[q.id];
    let isCorrect = false;

    if (q.type === "text" || q.type === "ordering") {
      const correctText = q.options[0]?.content || "";
      isCorrect = (userAnswer || "").trim().toLowerCase() === correctText.trim().toLowerCase();
    } else if (q.type === "multiple") {
      const correctIds = q.options.filter((o: any) => o.is_correct).map((o: any) => o.id).sort();
      const userIds = (userAnswer || []).sort();
      isCorrect = correctIds.length > 0 && JSON.stringify(correctIds) === JSON.stringify(userIds);
    } else {
      const correctId = q.options.find((o: any) => o.is_correct)?.id;
      isCorrect = userAnswer === correctId;
    }

    return { ...q, userAnswer, isCorrect };
  });

  const correctCount = results.filter((r: any) => r.isCorrect).length;
  const totalCount = exam.questions.length;
  const scorePercent = Math.round((correctCount / totalCount) * 100);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  useEffect(() => {
    let mounted = true;
    if (exam && !isSaved && !isSaving && !saveError) {
      handleSave(mounted);
    }
    return () => { mounted = false; };
  }, [exam, isSaved, isSaving, saveError]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Hero Section */}
      <section className="bg-white border-b pt-12 pb-20 px-4">
        <div className="container max-w-4xl text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary mb-6 animate-bounce">
            <Trophy className="h-10 w-10" />
          </div>
          <h1 className="text-4xl font-black mb-4 font-heading text-gray-900 tracking-tight">Kết quả bài làm</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
            Bạn đã hoàn thành bài thi <strong>"{exam.title}"</strong>. Hãy cùng xem lại chi tiết bài làm dưới đây nhé!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-[32px] p-8 border-2 border-primary/20 shadow-xl shadow-primary/5">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Điểm số</p>
              <div className="text-5xl font-black text-primary tabular-nums">{scorePercent}%</div>
            </div>
            <div className="bg-white rounded-[32px] p-8 border-2 border-gray-100 shadow-xl shadow-gray-500/5">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Câu trả lời</p>
              <div className="text-5xl font-black text-gray-800 tabular-nums">{correctCount}/{totalCount}</div>
            </div>
            <div className="bg-white rounded-[32px] p-8 border-2 border-gray-100 shadow-xl shadow-gray-500/5">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-2">Thời gian</p>
              <div className="text-5xl font-black text-gray-800 tabular-nums">{formatTime(timeTaken)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b px-4 py-4 mb-12 shadow-sm">
        <div className="container max-w-4xl flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/quizzes")} 
              className="rounded-2xl h-11 px-6 font-bold flex items-center gap-2"
              disabled={isSaving}
            >
              <ChevronLeft className="h-5 w-5" /> Danh sách
            </Button>
            {isSaving && (
              <span className="text-sm font-medium text-muted-foreground animate-pulse flex items-center gap-2">
                <RefreshCcw className="h-4 w-4 animate-spin" /> Đang lưu kết quả...
              </span>
            )}
            {isSaved && (
              <span className="text-sm font-bold text-green-600 flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                <Check className="h-4 w-4" /> Đã lưu
              </span>
            )}
            {saveError && !isSaving && (
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-red-500 flex items-center gap-1.5 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                  <XCircle className="h-4 w-4" /> Lưu lỗi
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleSave()}
                  className="h-8 rounded-xl text-xs font-bold border-red-200 text-red-600 hover:bg-red-50"
                >
                  Thử lại
                </Button>
              </div>
            )}
          </div>
          <Button 
            onClick={() => navigate(`/quizzes/take/${exam.id}`)} 
            className="rounded-2xl h-11 px-8 font-bold flex items-center gap-2 bg-primary group"
            disabled={isSaving}
          >
            <RefreshCcw className="h-4 w-4 transform transition-transform group-hover:rotate-180" />
            Làm lại bài thi
          </Button>
        </div>
      </div>

      {/* Review Section */}
      <main className="container max-w-4xl px-4 space-y-8">
        <h2 className="text-2xl font-bold flex items-center gap-3 mb-8">
          <Target className="h-6 w-6 text-primary" /> Chi tiết từng câu hỏi
        </h2>

        {results.map((q: any, idx: number) => (
          <div key={q.id} className={`bg-white rounded-[32px] p-8 sm:p-10 shadow-sm border-2 transition-all ${q.isCorrect ? "border-green-100" : "border-destructive/10"}`}>
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl text-lg font-black ${q.isCorrect ? "bg-green-100 text-green-700" : "bg-destructive/10 text-destructive"}`}>
                  {idx + 1}
                </span>
                <span className={`text-sm font-bold px-3 py-1 rounded-full uppercase tracking-widest ${q.isCorrect ? "bg-green-50 text-green-600" : "bg-destructive/5 text-destructive"}`}>
                  {q.isCorrect ? "Chính xác" : "Cần xem lại"}
                </span>
              </div>
            </div>

            <h3 className="text-xl font-bold leading-snug mb-8 text-gray-800">
              {q.type === "ordering" ? "Sắp xếp lại theo thứ tự đúng của câu." : q.content}
            </h3>

            <div className="space-y-4">
              {q.type === "text" ? (
                <div className="grid gap-4">
                  <div className="p-6 rounded-2xl border-2 border-gray-100 bg-gray-50/50">
                    <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-widest">Bạn đã trả lời:</p>
                    <p className={`text-lg font-semibold ${q.isCorrect ? "text-green-600" : "text-destructive"}`}>
                      {q.userAnswer || "Chưa nhập câu trả lời"}
                    </p>
                  </div>
                  {!q.isCorrect && (
                    <div className="p-6 rounded-2xl border-2 border-green-100 bg-green-50/30">
                      <p className="text-xs font-bold text-green-600 mb-2 uppercase tracking-widest">Đáp án đúng:</p>
                      <p className="text-lg font-bold text-green-700">{q.options[0]?.content}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-3">
                  {q.options.map((opt: any) => {
                    const isSelected = q.type === "multiple" 
                      ? (q.userAnswer || []).includes(opt.id)
                      : q.userAnswer === opt.id;
                    const isCorrect = opt.is_correct;
                    
                    let bgClass = "bg-white border-gray-100";
                    let textClass = "text-gray-700";
                    let icon = null;

                    if (isSelected && isCorrect) {
                      bgClass = "bg-green-50 border-green-200";
                      textClass = "text-green-700";
                      icon = <Check className="h-4 w-4 bg-green-600 text-white rounded-full p-0.5" />;
                    } else if (isSelected && !isCorrect) {
                      bgClass = "bg-destructive/5 border-destructive/20";
                      textClass = "text-destructive";
                      icon = <X className="h-4 w-4 bg-destructive text-white rounded-full p-0.5" />;
                    } else if (!isSelected && isCorrect) {
                      bgClass = "bg-green-50 border-green-100 ring-2 ring-green-600/20";
                      textClass = "text-green-700";
                      icon = <ArrowRight className="h-4 w-4 text-green-600" />;
                    }

                    return (
                      <div key={opt.id} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${bgClass}`}>
                        <span className={`text-base font-bold ${textClass}`}>{opt.content}</span>
                        {icon}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="pt-12 flex justify-center">
          <Button 
            onClick={() => navigate("/quizzes")}
            className="rounded-3xl h-16 px-12 font-black text-xl bg-gray-900 shadow-2xl hover:bg-black transition-all hover:scale-105"
          >
            Quay lại danh sách bài thi
          </Button>
        </div>
      </main>
    </div>
  );
}
