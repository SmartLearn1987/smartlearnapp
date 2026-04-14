import type { QuizQuestion, Flashcard } from "@/data/mockData";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// Lấy API key từ localStorage (người dùng tự nhập)
export function getApiKey(): string {
  return localStorage.getItem("anthropic-api-key") || "";
}

export function saveApiKey(key: string): void {
  localStorage.setItem("anthropic-api-key", key);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Chưa có API key. Vui lòng nhập API key Anthropic.");

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Lỗi API: ${res.status}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "";
}

export async function generateQuiz(
  lessonTitle: string,
  lessonContent: string
): Promise<QuizQuestion[]> {
  const prompt = `Bạn là giáo viên tiểu học Việt Nam. Hãy tạo 4 câu hỏi trắc nghiệm từ nội dung bài học dưới đây.

Tiêu đề bài: ${lessonTitle}

Nội dung:
${lessonContent.slice(0, 3000)}

Yêu cầu:
- Mỗi câu có 4 lựa chọn (A, B, C, D)
- Phù hợp với học sinh tiểu học
- Hỏi về nội dung chính, nhân vật, sự kiện quan trọng
- Có giải thích ngắn cho đáp án đúng

Trả lời ĐÚNG FORMAT JSON sau (không thêm text khác):
[
  {
    "question": "Câu hỏi?",
    "options": ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
    "correctIndex": 0,
    "explanation": "Giải thích ngắn"
  }
]`;

  const raw = await callClaude(prompt);
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return parsed.map((q: any, i: number) => ({
    id: `ai-quiz-${Date.now()}-${i}`,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));
}

export async function generateFlashcards(
  lessonTitle: string,
  lessonContent: string
): Promise<Flashcard[]> {
  const prompt = `Bạn là giáo viên tiểu học Việt Nam. Hãy tạo 5 flashcard ôn tập từ nội dung bài học dưới đây.

Tiêu đề bài: ${lessonTitle}

Nội dung:
${lessonContent.slice(0, 3000)}

Yêu cầu:
- Mặt trước (front): từ khóa, khái niệm, câu hỏi ngắn
- Mặt sau (back): định nghĩa, giải thích, câu trả lời đầy đủ
- Bao gồm từ vựng quan trọng, nhân vật, sự kiện chính
- Phù hợp học sinh tiểu học

Trả lời ĐÚNG FORMAT JSON sau (không thêm text khác):
[
  {
    "front": "Từ hoặc câu hỏi",
    "back": "Định nghĩa hoặc câu trả lời"
  }
]`;

  const raw = await callClaude(prompt);
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  return parsed.map((f: any, i: number) => ({
    id: `ai-fc-${Date.now()}-${i}`,
    front: f.front,
    back: f.back,
  }));
}
