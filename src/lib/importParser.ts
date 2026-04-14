import * as XLSX from "xlsx";
import type { QuizQuestion, Flashcard } from "@/data/mockData";

export type ImportType = "quiz" | "flashcard" | "unknown";

export interface ParsedImport {
  type: ImportType;
  quiz: QuizQuestion[];
  flashcards: Flashcard[];
  errors: string[];
  totalRows: number;
}

function uid(prefix: string, i: number) {
  return `${prefix}-${Date.now()}-${i}`;
}

// ── Detect which sheet/format this is ────────────────────────
function detectType(headers: string[]): ImportType {
  const h = headers.map((s) => s?.toString().toLowerCase().trim());
  if (h.includes("question") || h.includes("optiona")) return "quiz";
  if (h.includes("front") || h.includes("back")) return "flashcard";
  return "unknown";
}

// ── Parse rows → QuizQuestion[] ──────────────────────────────
function rowsToQuiz(rows: Record<string, any>[]): { items: QuizQuestion[]; errors: string[] } {
  const errors: string[] = [];
  const items: QuizQuestion[] = [];

  rows.forEach((r, i) => {
    const rowNum = i + 2; // 1-indexed, +1 for header
    const question = r["question"]?.toString().trim();
    if (!question) return; // skip blank rows silently

    const options = ["optionA", "optionB", "optionC", "optionD"]
      .map((k) => r[k]?.toString().trim() ?? "")
      .filter(Boolean);

    if (options.length < 2) {
      errors.push(`Hàng ${rowNum}: cần ít nhất 2 lựa chọn (optionA, optionB…)`);
      return;
    }

    const ci = Number(r["correctIndex"] ?? r["correctindex"] ?? 0);
    if (isNaN(ci) || ci < 0 || ci >= options.length) {
      errors.push(`Hàng ${rowNum}: correctIndex "${r["correctIndex"]}" không hợp lệ (phải là 0–${options.length - 1})`);
      return;
    }

    items.push({
      id: uid("imp-q", i),
      question,
      options,
      correctIndex: ci,
      explanation: r["explanation"]?.toString().trim() ?? "",
    });
  });

  return { items, errors };
}

// ── Parse rows → Flashcard[] ──────────────────────────────────
function rowsToFlashcards(rows: Record<string, any>[]): { items: Flashcard[]; errors: string[] } {
  const errors: string[] = [];
  const items: Flashcard[] = [];

  rows.forEach((r, i) => {
    const rowNum = i + 2;
    const front = r["front"]?.toString().trim();
    const back = r["back"]?.toString().trim();
    if (!front && !back) return; // blank row
    if (!front) { errors.push(`Hàng ${rowNum}: thiếu cột "front"`); return; }
    if (!back)  { errors.push(`Hàng ${rowNum}: thiếu cột "back"`);  return; }
    items.push({ id: uid("imp-f", i), front, back });
  });

  return { items, errors };
}

// ── Normalise header names (case/space insensitive) ───────────
function normaliseHeaders(rows: Record<string, any>[]): Record<string, any>[] {
  return rows.map((r) => {
    const out: Record<string, any> = {};
    for (const key of Object.keys(r)) {
      // strip BOM, trim, lowercase for matching
      const clean = key.replace(/^\uFEFF/, "").trim().toLowerCase()
        .replace(/\s+/g, "").replace(/\(.*?\)/g, ""); // remove parentheses content
      out[clean] = r[key];
    }
    return out;
  });
}

// ── Excel (.xlsx / .xls) ──────────────────────────────────────
function parseExcel(buffer: ArrayBuffer): ParsedImport {
  const wb = XLSX.read(buffer, { type: "array" });
  const allErrors: string[] = [];
  let quiz: QuizQuestion[] = [];
  let flashcards: Flashcard[] = [];
  let totalRows = 0;

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    if (rawRows.length === 0) continue;

    const rows = normaliseHeaders(rawRows);
    const headerKeys = Object.keys(rows[0] ?? {});
    const type = detectType(headerKeys);
    totalRows += rows.length;

    if (type === "quiz") {
      const { items, errors } = rowsToQuiz(rows);
      quiz = [...quiz, ...items];
      allErrors.push(...errors.map((e) => `[Sheet: ${sheetName}] ${e}`));
    } else if (type === "flashcard") {
      const { items, errors } = rowsToFlashcards(rows);
      flashcards = [...flashcards, ...items];
      allErrors.push(...errors.map((e) => `[Sheet: ${sheetName}] ${e}`));
    }
  }

  const type: ImportType = quiz.length > 0 && flashcards.length > 0
    ? "quiz" // mixed – report as quiz since we have both
    : quiz.length > 0 ? "quiz"
    : flashcards.length > 0 ? "flashcard"
    : "unknown";

  if (quiz.length === 0 && flashcards.length === 0 && allErrors.length === 0) {
    allErrors.push('Không nhận ra định dạng. Sheet phải có cột "question/optionA…" (quiz) hoặc "front/back" (flashcard).');
  }

  return { type, quiz, flashcards, errors: allErrors, totalRows };
}

// ── CSV ───────────────────────────────────────────────────────
function parseCsv(text: string): ParsedImport {
  // Use XLSX to parse CSV for consistent handling of quoted fields
  const wb = XLSX.read(text, { type: "string" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

  if (rawRows.length === 0) {
    return { type: "unknown", quiz: [], flashcards: [], errors: ["File CSV trống hoặc không đọc được."], totalRows: 0 };
  }

  const rows = normaliseHeaders(rawRows);
  const headerKeys = Object.keys(rows[0] ?? {});
  const type = detectType(headerKeys);

  if (type === "quiz") {
    const { items, errors } = rowsToQuiz(rows);
    return { type: "quiz", quiz: items, flashcards: [], errors, totalRows: rawRows.length };
  }
  if (type === "flashcard") {
    const { items, errors } = rowsToFlashcards(rows);
    return { type: "flashcard", quiz: [], flashcards: items, errors, totalRows: rawRows.length };
  }

  return {
    type: "unknown", quiz: [], flashcards: [],
    errors: ['Không nhận ra định dạng CSV. File phải có cột "question,optionA,optionB,optionC,optionD,correctIndex" hoặc "front,back".'],
    totalRows: rawRows.length,
  };
}

// ── Public API ────────────────────────────────────────────────
export async function parseImportFile(file: File): Promise<ParsedImport> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    const text = await file.text();
    return parseCsv(text);
  }

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    return parseExcel(buf);
  }

  return {
    type: "unknown", quiz: [], flashcards: [],
    errors: [`Định dạng "${file.name}" không được hỗ trợ. Chỉ chấp nhận .xlsx và .csv`],
    totalRows: 0,
  };
}
