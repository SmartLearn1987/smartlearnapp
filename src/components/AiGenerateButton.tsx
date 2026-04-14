import { useState } from "react";
import { Sparkles, Loader2, HelpCircle, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { generateQuiz, generateFlashcards, hasApiKey } from "@/lib/aiGenerator";
import ApiKeySetup from "@/components/ApiKeySetup";
import type { Lesson } from "@/data/mockData";

interface AiGenerateButtonProps {
  lesson: Lesson;
  onUpdate: (updated: Lesson) => void;
}

export default function AiGenerateButton({ lesson, onUpdate }: AiGenerateButtonProps) {
  const [loading, setLoading] = useState<"quiz" | "flashcard" | null>(null);
  const [showKeySetup, setShowKeySetup] = useState(false);

  // Build plain text from content blocks
  const lessonText = lesson.content
    .map((b) => b.text)
    .join("\n");

  const handleGenerate = async (type: "quiz" | "flashcard") => {
    if (!hasApiKey()) {
      setShowKeySetup(true);
      return;
    }

    setLoading(type);
    try {
      if (type === "quiz") {
        const quiz = await generateQuiz(lesson.title, lessonText);
        onUpdate({ ...lesson, quiz });
        toast.success(`Đã tạo ${quiz.length} câu hỏi trắc nghiệm!`);
      } else {
        const flashcards = await generateFlashcards(lesson.title, lessonText);
        onUpdate({ ...lesson, flashcards });
        toast.success(`Đã tạo ${flashcards.length} flashcard!`);
      }
    } catch (err: any) {
      if (err.message?.includes("API key")) {
        setShowKeySetup(true);
      }
      toast.error(err.message || "Lỗi khi tạo nội dung AI");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      {showKeySetup && (
        <ApiKeySetup onSaved={() => setShowKeySetup(false)} />
      )}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleGenerate("quiz")}
          disabled={!!loading}
          className="flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/10"
        >
          {loading === "quiz" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <HelpCircle className="h-4 w-4" />
          )}
          {loading === "quiz" ? "Đang tạo quiz..." : "✨ Tạo Quiz bằng AI"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleGenerate("flashcard")}
          disabled={!!loading}
          className="flex items-center gap-2 border-secondary/30 text-secondary hover:bg-secondary/10"
        >
          {loading === "flashcard" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Layers className="h-4 w-4" />
          )}
          {loading === "flashcard" ? "Đang tạo flashcard..." : "✨ Tạo Flashcard bằng AI"}
        </Button>

        {!hasApiKey() && !showKeySetup && (
          <button
            onClick={() => setShowKeySetup(true)}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Cài đặt API key
          </button>
        )}
      </div>
    </div>
  );
}
