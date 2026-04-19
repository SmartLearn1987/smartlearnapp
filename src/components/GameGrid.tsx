import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Gamepad2, Loader2, X, BookOpen, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import { apiFetch } from "@/lib/api";

export const GAMES = [
  {
    id: "duoihinh",
    title: "Đuổi hình bắt chữ",
    image: "/images/game_duoihinh_1775396514456.png",
    description: "Thách thức tư duy với những câu đố hình ảnh đầy thú vị",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    id: "vuatiengviet",
    title: "Vua tiếng việt",
    image: "/images/game_vuatieng_1775396728606.png",
    description: "Ông vua từ vựng và ngữ pháp tiếng Việt",
    color: "bg-green-500/10 text-green-600",
  },
  {
    id: "chepchinh",
    title: "Chép chính tả",
    image: "/images/game_chepchinh_1775396772922.png",
    description: "Luyện nghe và viết tiếng Việt chuẩn xác nhất",
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    id: "hoccungbe",
    title: "Học cùng bé",
    image: "/images/game_hoccungbe.png",
    description: "Khám phá thế giới tri thức cùng những bài học vui nhộn cho bé",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    id: "cadao",
    title: "Ca dao tục ngữ",
    image: "/images/game_cadao.png",
    description: "Tìm hiểu kho tàng trí tuệ dân gian qua các câu ca dao truyền thống",
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    id: "nhanhnhuchop",
    title: "Nhanh như chớp",
    image: "/images/game_nhanhchớp.png",
    description: "Thử thách phản xạ và kiến thức cực nhanh với các câu hỏi hóc búa",
    color: "bg-emerald-500/10 text-emerald-600",
  },
];

const LEVELS = [
  { value: "easy",    label: "Dễ",         color: "border-green-300 bg-green-50 text-green-700" },
  { value: "medium",  label: "Trung bình",  color: "border-blue-300 bg-blue-50 text-blue-700" },
  { value: "hard",    label: "Khó",         color: "border-orange-300 bg-orange-50 text-orange-700" },
  { value: "extreme", label: "Cực khó",     color: "border-red-300 bg-red-50 text-red-700" },
];

const LANGUAGES = [
  { value: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { value: "en", label: "Tiếng Anh",  flag: "🇺🇸" },
  { value: "ja", label: "Tiếng Nhật", flag: "🇯🇵" },
];

function DictationSelectModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [level, setLevel] = useState("medium");
  const [language, setLanguage] = useState("vi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePlay = async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ level, language });
      await apiFetch(`/dictation/random?${qs}`); // validate exists
      navigate(`/games/dictation/play?level=${level}&language=${language}`);
      onClose();
    } catch {
      setError("Chưa có bài chính tả phù hợp với lựa chọn này. Vui lòng thử cấp độ/ngôn ngữ khác.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold">Chép chính tả</h2>
              <p className="text-xs text-muted-foreground">Chọn cấp độ và ngôn ngữ</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Level */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Cấp độ</label>
          <div className="grid grid-cols-2 gap-2">
            {LEVELS.map((lv) => (
              <button
                key={lv.value}
                onClick={() => setLevel(lv.value)}
                className={`rounded-xl border-2 py-2.5 text-xs font-semibold transition-all
                  ${level === lv.value ? lv.color + " ring-2 ring-offset-1 ring-current" : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"}`}
              >
                {lv.label}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Ngôn ngữ</label>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLanguage(lang.value)}
                className={`rounded-xl border-2 py-2.5 text-xs font-semibold transition-all flex flex-col items-center gap-1
                  ${language === lang.value ? "border-primary/40 bg-primary/10 text-primary ring-2 ring-offset-1 ring-primary/40" : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"}`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive font-medium">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Hủy</Button>
          <Button className="flex-1" onClick={handlePlay} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Chơi ngay
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PictogramSelectModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [level, setLevel] = useState("medium");
  const [limit, setLimit] = useState(10);
  const [time, setTime] = useState(5); // minutes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePlay = async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ level, limit: limit.toString() });
      await apiFetch(`/pictogram/play?${qs}`); // validate exists
      navigate(`/games/pictogram/play?level=${level}&limit=${limit}&time=${time * 60}`);
      onClose();
    } catch {
      setError("Chưa có đủ câu hỏi phù hợp với lựa chọn này. Vui lòng thử cấp độ khác.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold">Đuổi hình bắt chữ</h2>
              <p className="text-xs text-muted-foreground">Cấu hình lượt chơi của bạn</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Level */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Cấp độ</label>
          <div className="grid grid-cols-2 gap-2">
            {LEVELS.map((lv) => (
              <button
                key={lv.value}
                onClick={() => setLevel(lv.value)}
                className={`rounded-xl border-2 py-2 text-xs font-semibold transition-all
                  ${level === lv.value ? lv.color + " ring-2 ring-offset-1 ring-current" : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"}`}
              >
                {lv.label}
              </button>
            ))}
          </div>
        </div>

        {/* Limit & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Số câu hỏi</label>
            <select 
              value={limit} 
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              {[5, 10, 15, 20, 30].map(n => (
                <option key={n} value={n}>{n} câu</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Thời gian (phút)</label>
            <select 
              value={time} 
              onChange={(e) => setTime(Number(e.target.value))}
              className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              {[1, 2, 3, 5, 10, 15].map(n => (
                <option key={n} value={n}>{n} phút</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive font-medium">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Hủy</Button>
          <Button className="flex-1" onClick={handlePlay} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Chơi ngay
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ProverbSelectModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [level, setLevel] = useState("medium");
  const [limit, setLimit] = useState(10);
  const [time, setTime] = useState(5); // minutes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePlay = async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ level, limit: limit.toString() });
      await apiFetch(`/proverbs/play?${qs}`); // validate exists
      navigate(`/games/proverbs/play?level=${level}&limit=${limit}&time=${time * 60}`);
      onClose();
    } catch {
      setError("Chưa có đủ câu hỏi phù hợp với lựa chọn này. Vui lòng thử cấp độ khác.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold">Ca dao tục ngữ</h2>
              <p className="text-xs text-muted-foreground">Cấu hình lượt chơi của bạn</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Level */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Cấp độ</label>
          <div className="grid grid-cols-2 gap-2">
            {LEVELS.map((lv) => (
              <button
                key={lv.value}
                onClick={() => setLevel(lv.value)}
                className={`rounded-xl border-2 py-2 text-xs font-semibold transition-all
                  ${level === lv.value ? lv.color + " ring-2 ring-offset-1 ring-current" : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"}`}
              >
                {lv.label}
              </button>
            ))}
          </div>
        </div>

        {/* Limit & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Số câu hỏi</label>
            <select 
              value={limit} 
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              {[5, 10, 15, 20, 30].map(n => (
                <option key={n} value={n}>{n} câu</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Thời gian (phút)</label>
            <select 
              value={time} 
              onChange={(e) => setTime(Number(e.target.value))}
              className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              {[1, 2, 3, 5, 10, 15].map(n => (
                <option key={n} value={n}>{n} phút</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive font-medium">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Hủy</Button>
          <Button className="flex-1" onClick={handlePlay} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Chơi ngay
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function LearningSelectModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCategories = async () => {
    try {
      const data = await apiFetch<any[]>("/learning/categories");
      const filtered = data.filter(c => (c.item_count || 0) > 0);
      setCategories(filtered);
      if (filtered.length > 0) setSelectedId(filtered[0].id);
    } catch {
      setError("Không thể tải danh sách chủ đề.");
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    fetchCategories();
  });

  const handlePlay = () => {
    if (selectedId) {
      navigate(`/games/learning/play/${selectedId}`);
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/20 backdrop-blur-md px-4">
      <div className="w-full max-w-md rounded-[2rem] bg-card border border-border shadow-2xl p-6 space-y-5 animate-scale-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold">Học cùng bé</h2>
              <p className="text-xs text-muted-foreground">Chọn một chủ đề để bắt đầu bài học</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          </div>
        ) : error ? (
          <p className="text-center py-6 text-sm text-destructive font-medium">{error}</p>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm text-muted-foreground font-medium">Hiện chưa có bài học nào sẵn sàng.</p>
            <p className="text-xs text-muted-foreground/60 italic">Vui lòng quay lại sau nhé!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedId(cat.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left
                    ${selectedId === cat.id 
                      ? "border-emerald-500 bg-emerald-50/50 shadow-md ring-4 ring-emerald-500/5" 
                      : "border-border bg-muted/20 hover:border-emerald-200 hover:bg-white"}`}
                >
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0
                    ${selectedId === cat.id ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    <LayoutGrid className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{cat.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{cat.item_count} hình ảnh</p>
                  </div>
                  {selectedId === cat.id && (
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 h-12 rounded-2xl font-bold" onClick={onClose}>Hủy</Button>
              <Button 
                className="flex-1 h-12 rounded-2xl font-bold text-base bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200" 
                onClick={handlePlay}
                disabled={!selectedId}
              >
                Chơi ngay
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function NhanhNhuChopSelectModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [level, setLevel] = useState("medium");
  const [limit, setLimit] = useState("10");
  const [time, setTime] = useState("300"); // 5 minutes in seconds
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePlay = async () => {
    setLoading(true);
    setError("");
    try {
      // Validate questions exist
      const data = await apiFetch<any[]>(`/nhanhnhuchop/play?level=${level}&limit=1`);
      if (data.length === 0) {
        setError("Chưa có câu hỏi phù hợp với cấp độ này. Vui lòng chọn cấp độ khác.");
        return;
      }
      navigate(`/games/nhanhnhuchop/play?level=${level}&limit=${limit}&time=${time}`);
      onClose();
    } catch {
      setError("Không thể khởi tạo trò chơi. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-[2rem] bg-card border border-border shadow-2xl p-8 space-y-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
              <Gamepad2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold">Nhanh như chớp</h2>
              <p className="text-xs text-muted-foreground">Tùy chỉnh lượt chơi của bạn</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Level */}
        <div className="space-y-3">
          <label className="text-sm font-black uppercase tracking-wider text-slate-500">Cấp độ</label>
          <div className="grid grid-cols-2 gap-2">
            {LEVELS.map((lv) => (
              <button
                key={lv.value}
                onClick={() => setLevel(lv.value)}
                className={`rounded-2xl border-2 py-3 text-sm font-bold transition-all
                  ${level === lv.value 
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-offset-1 ring-emerald-500/20" 
                    : "border-slate-100 bg-slate-50/50 text-slate-400 hover:bg-slate-50"}`}
              >
                {lv.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 gap-4">
           {/* Question Count */}
          <div className="space-y-3">
            <label className="text-sm font-black uppercase tracking-wider text-slate-500">Số câu hỏi</label>
            <select 
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold focus:border-emerald-500 outline-none transition-all"
            >
              <option value="10">10 câu</option>
              <option value="20">20 câu</option>
              <option value="30">30 câu</option>
            </select>
          </div>

          {/* Time Limit */}
          <div className="space-y-3">
            <label className="text-sm font-black uppercase tracking-wider text-slate-500">Thời gian</label>
            <select 
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold focus:border-emerald-500 outline-none transition-all"
            >
              <option value="300">5 phút</option>
              <option value="600">10 phút</option>
              <option value="900">15 phút</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600 font-bold border border-red-100">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="ghost" className="flex-1 h-12 rounded-2xl font-bold bg-slate-50" onClick={onClose}>Hủy</Button>
          <Button 
            className="flex-1 h-12 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200" 
            onClick={handlePlay} 
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Chơi ngay"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function VuaTiengVietSelectModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [level, setLevel] = useState("medium");
  const [limit, setLimit] = useState(10);
  const [time, setTime] = useState(5); // minutes
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePlay = async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ level, limit: limit.toString() });
      await apiFetch(`/vuatiengviet/play?${qs}`); // validate exists
      navigate(`/games/vuatiengviet/play?level=${level}&limit=${limit}&time=${time * 60}`);
      onClose();
    } catch {
      setError("Chưa có đủ câu hỏi phù hợp với lựa chọn này. Vui lòng thử cấp độ khác.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-6 space-y-5 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-600">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold">Vua tiếng việt</h2>
              <p className="text-xs text-muted-foreground">Cấu hình lượt chơi của bạn</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Level */}
        <div className="space-y-2">
          <label className="text-sm font-semibold">Cấp độ</label>
          <div className="grid grid-cols-2 gap-2">
            {LEVELS.map((lv) => (
              <button
                key={lv.value}
                onClick={() => setLevel(lv.value)}
                className={`rounded-xl border-2 py-2 text-xs font-semibold transition-all
                  ${level === lv.value ? lv.color + " ring-2 ring-offset-1 ring-current" : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"}`}
              >
                {lv.label}
              </button>
            ))}
          </div>
        </div>

        {/* Limit & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Số câu hỏi</label>
            <select 
              value={limit} 
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              {[5, 10, 15, 20, 30].map(n => (
                <option key={n} value={n}>{n} câu</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Thời gian (phút)</label>
            <select 
              value={time} 
              onChange={(e) => setTime(Number(e.target.value))}
              className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              {[1, 2, 3, 5, 10, 15].map(n => (
                <option key={n} value={n}>{n} phút</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive font-medium">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Hủy</Button>
          <Button className="flex-1" onClick={handlePlay} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Chơi ngay
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function GameGrid({ isAdmin = false }: { isAdmin?: boolean }) {
  const navigate = useNavigate();
  const [showDictationSelect, setShowDictationSelect] = useState(false);
  const [showPictogramSelect, setShowPictogramSelect] = useState(false);
  const [showProverbSelect, setShowProverbSelect] = useState(false);
  const [showVuaTiengVietSelect, setShowVuaTiengVietSelect] = useState(false);
  const [showLearningSelect, setShowLearningSelect] = useState(false);
  const [showNhanhNhuChopSelect, setShowNhanhNhuChopSelect] = useState(false);

  const handleGameClick = (gameId: string, gameTitle: string) => {
    if (gameId === "chepchinh") {
      if (isAdmin) {
        navigate("/games/dictation");
      } else {
        setShowDictationSelect(true);
      }
    } else if (gameId === "duoihinh") {
      if (isAdmin) {
        navigate("/games/pictogram");
      } else {
        setShowPictogramSelect(true);
      }
    } else if (gameId === "vuatiengviet") {
      if (isAdmin) {
        navigate("/games/vuatiengviet");
      } else {
        setShowVuaTiengVietSelect(true);
      }
    } else if (gameId === "cadao") {
      if (isAdmin) {
        navigate("/games/proverbs");
      } else {
        setShowProverbSelect(true);
      }
    } else if (gameId === "hoccungbe") {
      if (isAdmin) {
        navigate("/games/learning");
      } else {
        setShowLearningSelect(true);
      }
    } else if (gameId === "nhanhnhuchop") {
      if (isAdmin) {
        navigate("/games/nhanhnhuchop");
      } else {
        setShowNhanhNhuChopSelect(true);
      }
    } else {
      alert(`Tính năng ${gameTitle} sắp ra mắt!`);
    }
  };

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((game, index) => (
          <div
            key={game.id}
            className="group relative flex min-h-[210px] flex-col overflow-hidden rounded-2xl bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] cursor-pointer"
            style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
            onClick={() => handleGameClick(game.id, game.title)}
          >
            {/* Background Decor */}
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 transition-transform duration-300 group-hover:scale-150 ${game.color.split(' ')[0]}`} />

            {/* Image Thumbnail */}
            <div className="mb-3 h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted shadow-sm ring-1 ring-border relative z-10 bg-muted">
              <img
                src={game.image}
                alt={game.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>

            <div>
              <h3 className="relative z-10 font-heading text-base font-bold transition-colors group-hover:text-primary">
                {game.title}
              </h3>
              <p className="relative z-10 mt-1 line-clamp-2 text-sm text-muted-foreground">
                {game.description}
              </p>
            </div>

            <div className="relative z-10 mt-auto flex items-center pt-3">
              <span className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                {isAdmin ? "Cấu hình Game" : "Bắt đầu"} <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {showDictationSelect && (
        <DictationSelectModal onClose={() => setShowDictationSelect(false)} />
      )}
      {showPictogramSelect && (
        <PictogramSelectModal onClose={() => setShowPictogramSelect(false)} />
      )}
      {showProverbSelect && (
        <ProverbSelectModal onClose={() => setShowProverbSelect(false)} />
      )}
      {showVuaTiengVietSelect && (
        <VuaTiengVietSelectModal onClose={() => setShowVuaTiengVietSelect(false)} />
      )}
      {showLearningSelect && (
        <LearningSelectModal onClose={() => setShowLearningSelect(false)} />
      )}
      {showNhanhNhuChopSelect && (
        <NhanhNhuChopSelectModal onClose={() => setShowNhanhNhuChopSelect(false)} />
      )}
    </>
  );
}
