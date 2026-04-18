import { useState, useCallback } from "react";
import { List, ListOrdered, AlignLeft, Type, Palette } from "lucide-react";

export interface RichBlock {
  type: "paragraph" | "heading" | "list_item" | "numbered_item";
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

interface RichTextEditorProps {
  value: RichBlock[];
  onChange: (blocks: RichBlock[]) => void;
}

const FONT_FAMILIES = [
  { label: "Mặc định", value: "inherit" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "monospace" },
  { label: "Sans", value: "Arial, sans-serif" },
];

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32];

const COLORS = [
  "#111827", "#6b7280", "#b91c1c", "#1d4ed8",
  "#15803d", "#9333ea", "#c2410c", "#0e7490",
];

export function textToBlocks(text: string): RichBlock[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ type: "paragraph" as const, text }));
}

const DEFAULT_BLOCK: Omit<RichBlock, "text"> = {
  type: "paragraph",
  fontSize: 16,
  fontFamily: "inherit",
  color: "#111827",
  bold: false,
  italic: false,
};

export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  // Which block index is currently focused (-1 = none)
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);

  // Toolbar state — synced from focused block, or used for next new block
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("inherit");
  const [color, setColor] = useState("#111827");
  const [blockType, setBlockType] = useState<RichBlock["type"]>("paragraph");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  /** When a block receives focus, sync toolbar to that block's style */
  const handleFocus = useCallback((idx: number) => {
    setFocusedIdx(idx);
    const b = value[idx];
    if (b) {
      setFontSize(b.fontSize ?? 16);
      setFontFamily(b.fontFamily ?? "inherit");
      setColor(b.color ?? "#111827");
      setBlockType(b.type);
      setBold(b.bold ?? false);
      setItalic(b.italic ?? false);
    }
  }, [value]);

  /** Apply a style property to the currently focused block */
  const applyToFocused = useCallback(<K extends keyof RichBlock>(key: K, val: RichBlock[K]) => {
    if (focusedIdx === -1) return;
    onChange(value.map((b, i) => i === focusedIdx ? { ...b, [key]: val } : b));
  }, [focusedIdx, value, onChange]);

  const handleFontSize = (v: number) => {
    setFontSize(v);
    applyToFocused("fontSize", v);
  };
  const handleFontFamily = (v: string) => {
    setFontFamily(v);
    applyToFocused("fontFamily", v);
  };
  const handleColor = (v: string) => {
    setColor(v);
    applyToFocused("color", v);
  };
  const handleBlockType = (v: RichBlock["type"]) => {
    setBlockType(v);
    applyToFocused("type", v);
  };
  const handleBold = () => {
    const next = !bold;
    setBold(next);
    applyToFocused("bold", next);
  };
  const handleItalic = () => {
    const next = !italic;
    setItalic(next);
    applyToFocused("italic", next);
  };

  const addBlock = () => {
    onChange([
      ...value,
      { ...DEFAULT_BLOCK, type: blockType, fontSize, fontFamily, color, bold, italic, text: "" },
    ]);
    // focus will be picked up by the new input via autoFocus-like approach
    setTimeout(() => setFocusedIdx(value.length), 50);
  };

  const updateText = (idx: number, text: string) => {
    onChange(value.map((b, i) => i === idx ? { ...b, text } : b));
  };

  const removeBlock = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
    setFocusedIdx(-1);
  };

  const getStyle = (b: RichBlock): React.CSSProperties => ({
    fontSize: b.fontSize ? `${b.fontSize}px` : undefined,
    fontFamily: b.fontFamily !== "inherit" ? b.fontFamily : undefined,
    color: b.color || undefined,
    fontWeight: b.bold ? "bold" : "normal",
    fontStyle: b.italic ? "italic" : "normal",
  });

  const getPrefix = (type: RichBlock["type"], idx: number) => {
    if (type === "list_item") return "•";
    if (type === "numbered_item") return `${idx + 1}.`;
    return null;
  };

  // Prevent textarea from losing focus when clicking toolbar items
  const preventBlur = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="rounded-2xl border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
      {/* ── Toolbar ── */}
      <div
        className="flex flex-wrap items-center gap-1.5 border-b bg-muted/30 px-3 py-2"
        onMouseDown={preventBlur}
      >
        {/* Font size */}
        <div className="flex items-center gap-1">
          <Type className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={fontSize}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => handleFontSize(Number(e.target.value))}
            className="rounded-md border bg-background px-1.5 py-0.5 text-xs outline-none cursor-pointer"
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}px</option>
            ))}
          </select>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Font family */}
        <select
          value={fontFamily}
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => handleFontFamily(e.target.value)}
          className="rounded-md border bg-background px-1.5 py-0.5 text-xs outline-none cursor-pointer"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <div className="h-4 w-px bg-border" />

        {/* Color swatches */}
        <div className="flex items-center gap-1">
          <Palette className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex gap-0.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleColor(c); }}
                title={c}
                className="h-4 w-4 rounded-full border transition-transform hover:scale-125"
                style={{
                  backgroundColor: c,
                  boxShadow: color === c ? `0 0 0 2px white, 0 0 0 3.5px ${c}` : undefined,
                }}
              />
            ))}
          </div>
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Bold / Italic */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); handleBold(); }}
          className={`rounded-md px-2 py-0.5 text-xs font-bold transition-colors ${bold ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
        >
          B
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); handleItalic(); }}
          className={`rounded-md px-2 py-0.5 text-xs italic transition-colors ${italic ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}
        >
          I
        </button>

        <div className="h-4 w-px bg-border" />

        {/* Block type */}
        {([
          { type: "paragraph", icon: AlignLeft, label: "Đoạn văn" },
          { type: "heading", icon: Type, label: "Tiêu đề" },
          { type: "list_item", icon: List, label: "Danh sách" },
          { type: "numbered_item", icon: ListOrdered, label: "Đánh số" },
        ] as const).map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); handleBlockType(type); }}
            title={label}
            className={`rounded-md p-1 transition-colors ${blockType === type ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}

        <div className="ml-auto">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); addBlock(); }}
            className="rounded-lg bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary hover:bg-primary/20 transition-colors whitespace-nowrap"
          >
            + Thêm đoạn
          </button>
        </div>
      </div>

      {/* ── Block list ── */}
      <div className="min-h-[160px] space-y-0.5 p-3">
        {value.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground/50 select-none">
            Nhấn "+ Thêm dòng" để bắt đầu nhập nội dung...
          </div>
        )}
        {value.map((block, idx) => {
          const prefix = getPrefix(block.type, idx);
          const isFocused = focusedIdx === idx;
          return (
            <div
              key={idx}
              className={`group flex items-start gap-2 rounded-lg px-1 py-0.5 transition-colors ${isFocused ? "bg-primary/5" : "hover:bg-muted/40"}`}
            >
              {prefix && (
                <span
                  className="mt-[7px] shrink-0 min-w-[20px] text-sm font-semibold text-primary select-none"
                  style={getStyle(block)}
                >
                  {prefix}
                </span>
              )}
              <textarea
                value={block.text}
                onFocus={() => handleFocus(idx)}
                onBlur={() => setFocusedIdx(-1)}
                onChange={(e) => {
                  updateText(idx, e.target.value);
                  // auto-resize
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = el.scrollHeight + "px";
                }}
                placeholder={block.type === "heading" ? "Nhập tiêu đề..." : "Nhập nội dung..."}
                rows={1}
                className="flex-1 rounded-lg border-0 bg-transparent px-2 py-1 outline-none placeholder:text-muted-foreground/40 resize-none overflow-hidden leading-relaxed"
                style={{ ...getStyle(block), minHeight: "32px" }}
              />
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); removeBlock(idx); }}
                className="mt-1 opacity-0 group-hover:opacity-100 shrink-0 rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <span className="text-xs">✕</span>
              </button>
            </div>
          );
        })}
      </div>

      {focusedIdx >= 0 && (
        <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground bg-muted/20">
          Dòng {focusedIdx + 1} đang được chọn — Thay đổi toolbar sẽ áp dụng ngay cho dòng này
        </div>
      )}
    </div>
  );
}
