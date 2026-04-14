import type { Course, Lesson, ContentBlock } from "@/data/mockData";

const CUSTOM_COURSES_KEY = "custom-courses-v1";
const CUSTOM_SUBJECTS_KEY = "custom-subjects-v1";

export function getCustomCourses(): Course[] {
  const data = localStorage.getItem(CUSTOM_COURSES_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveCustomCourse(course: Course): void {
  const courses = getCustomCourses();
  const idx = courses.findIndex((c) => c.id === course.id);
  if (idx >= 0) {
    courses[idx] = course;
  } else {
    courses.push(course);
  }
  localStorage.setItem(CUSTOM_COURSES_KEY, JSON.stringify(courses));
}

export function deleteCustomCourse(courseId: string): void {
  const courses = getCustomCourses().filter((c) => c.id !== courseId);
  localStorage.setItem(CUSTOM_COURSES_KEY, JSON.stringify(courses));
}

export function textToContentBlocks(rawText: string): ContentBlock[] {
  const lines = rawText.split("\n").filter((l) => l.trim());
  const blocks: ContentBlock[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;

    // Detect headings by length/patterns
    if (trimmed.length < 60 && (trimmed === trimmed.toUpperCase() || /^(Bài|Chương|Phần|Mục|I\.|II\.|III\.|IV\.|V\.|Tiết)\b/i.test(trimmed))) {
      blocks.push({ type: "heading", text: trimmed, level: 1 });
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      blocks.push({ type: "paragraph", text: trimmed });
    } else {
      blocks.push({ type: "paragraph", text: trimmed });
    }
  }

  return blocks;
}

export function splitTextIntoLessons(rawText: string, courseTitle: string): Lesson[] {
  // Split by common lesson markers
  const lessonPattern = /(?:^|\n)(Bài\s+\d+[:.]\s*.+)/gi;
  const parts = rawText.split(lessonPattern).filter((p) => p.trim());

  if (parts.length <= 1) {
    // No lesson markers found, create a single lesson
    return [
      createLesson(`lesson-${Date.now()}`, courseTitle, "Nội dung từ tài liệu upload", rawText),
    ];
  }

  const lessons: Lesson[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const title = parts[i]?.trim() || `Bài ${Math.floor(i / 2) + 1}`;
    const content = parts[i + 1]?.trim() || parts[i]?.trim() || "";
    const id = `lesson-${Date.now()}-${i}`;
    lessons.push(createLesson(id, title, "", content));
  }

  return lessons.length > 0 ? lessons : [createLesson(`lesson-${Date.now()}`, courseTitle, "", rawText)];
}

function createLesson(id: string, title: string, description: string, rawContent: string): Lesson {
  return {
    id,
    title,
    description: description || `Nội dung bài: ${title.slice(0, 50)}`,
    completed: false,
    content: textToContentBlocks(rawContent),
    quiz: [],
    flashcards: [],
    summary: rawContent.slice(0, 300) + (rawContent.length > 300 ? "..." : ""),
    keyPoints: [],
    vocabulary: [],
  };
}

export function generateId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
