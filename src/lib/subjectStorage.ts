import type { Subject } from "@/data/mockData";
import { subjects as builtinSubjects } from "@/data/mockData";

const CUSTOM_SUBJECTS_KEY = "hvui-custom-subjects-v1";

const SUBJECT_COLORS = [
  "bg-primary", "bg-secondary", "bg-accent", "bg-quiz",
  "bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-orange-500",
];
const SUBJECT_ICONS = ["📖", "🔢", "🌿", "⭐", "🎨", "🔬", "🧪", "🌍", "🗺️", "🏛️", "🎵", "💻", "📐", "📜", "⌛", "📍", "🚀", "🔭", "⚙️", "EN", "🔤", "🇯🇵", "⚽", "🎭", "🎯", "📊", "💡"];

export function getCustomSubjects(): Subject[] {
  const raw = localStorage.getItem(CUSTOM_SUBJECTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveCustomSubjects(subjects: Subject[]) {
  localStorage.setItem(CUSTOM_SUBJECTS_KEY, JSON.stringify(subjects));
}

export function getAllSubjectsWithCustom(): Subject[] {
  return [...builtinSubjects, ...getCustomSubjects()];
}

export function saveSubject(subject: Subject): void {
  const list = getCustomSubjects();
  const idx = list.findIndex((s) => s.id === subject.id);
  if (idx >= 0) list[idx] = subject;
  else list.push(subject);
  saveCustomSubjects(list);
}

export function deleteCustomSubject(subjectId: string): void {
  saveCustomSubjects(getCustomSubjects().filter((s) => s.id !== subjectId));
}

export function isBuiltinSubject(subjectId: string): boolean {
  return builtinSubjects.some((s) => s.id === subjectId);
}

export function generateSubjectId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    + `-${Date.now().toString(36)}`;
}

export function pickColor(index: number): string {
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
}

export function getSubjectIcons(): string[] {
  return SUBJECT_ICONS;
}
