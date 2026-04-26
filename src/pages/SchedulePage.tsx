import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";

import { createPortal } from "react-dom";
import { Calendar as CalendarIcon, CheckSquare, StickyNote, Plus, Trash2, Check, Clock, BookOpen, Edit3, Save, X, GripVertical, ChevronDown, Eye } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "timetable" | "tasks" | "notes";

interface TimetableEntry {
  id: string;
  day: string;
  subject: string;
  startTime: string;
  endTime: string;
  room: string;
  color: string;
}

interface TimetableGroup {
  id: string;
  name: string;
  entries: TimetableEntry[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
  createdAt: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  updatedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

const DAY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  "Thứ 2":    { bg: "bg-blue-500",   text: "text-white", icon: "text-white" },
  "Thứ 3":    { bg: "bg-emerald-500", text: "text-white", icon: "text-white" },
  "Thứ 4":    { bg: "bg-violet-500",  text: "text-white", icon: "text-white" },
  "Thứ 5":    { bg: "bg-orange-500",  text: "text-white", icon: "text-white" },
  "Thứ 6":    { bg: "bg-pink-500",    text: "text-white", icon: "text-white" },
  "Thứ 7":    { bg: "bg-cyan-500",    text: "text-white", icon: "text-white" },
  "Chủ nhật": { bg: "bg-rose-500",    text: "text-white", icon: "text-white" },
};

const SUBJECT_COLORS = [
  "bg-blue-500/15 border-blue-400/40 text-blue-700",
  "bg-green-500/15 border-green-400/40 text-green-700",
  "bg-purple-500/15 border-purple-400/40 text-purple-700",
  "bg-orange-500/15 border-orange-400/40 text-orange-700",
  "bg-pink-500/15 border-pink-400/40 text-pink-700",
  "bg-cyan-500/15 border-cyan-400/40 text-cyan-700",
  "bg-yellow-500/15 border-yellow-400/40 text-yellow-700",
];

const NOTE_COLORS = [
  // Hàng 1: Màu nhạt
  { bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-300/60", label: "Vàng" },
  { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-300/60", label: "Xanh dương" },
  { bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-300/60", label: "Xanh lá" },
  { bg: "bg-pink-50 dark:bg-pink-950/30", border: "border-pink-300/60", label: "Hồng" },
  { bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-300/60", label: "Tím" },
  { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-300/60", label: "Cam" },
  // Hàng 2: Màu đậm
  { bg: "bg-yellow-200 dark:bg-yellow-900/40", border: "border-yellow-400/70", label: "Vàng đậm" },
  { bg: "bg-blue-200 dark:bg-blue-900/40", border: "border-blue-400/70", label: "Xanh dương đậm" },
  { bg: "bg-green-200 dark:bg-green-900/40", border: "border-green-400/70", label: "Xanh lá đậm" },
  { bg: "bg-pink-200 dark:bg-pink-900/40", border: "border-pink-400/70", label: "Hồng đậm" },
  { bg: "bg-purple-200 dark:bg-purple-900/40", border: "border-purple-400/70", label: "Tím đậm" },
  { bg: "bg-orange-200 dark:bg-orange-900/40", border: "border-orange-400/70", label: "Cam đậm" },
];

const PRIORITY_CONFIG = {
  high: { label: "Cao", cls: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "Trung bình", cls: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  low: { label: "Thấp", cls: "bg-green-100 text-green-700 border-green-200" },
};

const LOCAL_KEY = {
  timetable: "smartlearn-timetable",
  tasks: "smartlearn-tasks",
  notes: "smartlearn-notes",
};

const getLocalKey = (key: keyof typeof LOCAL_KEY, userId: string) => {
  if (!userId) return `guest-${LOCAL_KEY[key]}`;
  return `${LOCAL_KEY[key]}-${userId}`;
};


function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy HH:mm");
  } catch {
    return dateStr;
  }
};

// ─── Shared Components ────────────────────────────────────────────────────────

interface PortalModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

function PortalModal({ children, onClose }: PortalModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-white/5 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg pointer-events-auto flex flex-col max-h-[90vh]">
        {children}
      </div>
    </div>,
    document.body
  );
}

// ─── Timetable Tab ───────────────────────────────────────────────────────────

function TimetableTab({ userId }: { userId: string }) {
  const [groups, setGroups] = useState<TimetableGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  const fetchTimetable = async () => {
    try {
      const data = await apiFetch<any[]>("/timetable");
      const transformed = data.map(g => ({
        id: g.id,
        name: g.name,
        entries: (g.entries || []).map((e: any) => ({
          id: e.id,
          day: e.day,
          subject: e.subject,
          startTime: e.start_time,
          endTime: e.end_time,
          room: e.room,
          color: e.color
        }))
      }));
      setGroups(transformed);
      if (transformed.length > 0 && !activeGroupId) {
        setActiveGroupId(transformed[0].id);
      }
    } catch (err) {
      console.error("Fetch Timetable Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const migrateAndFetch = async () => {
      const localKey = getLocalKey("timetable", userId);
      const localData = localStorage.getItem(localKey);
      
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          let groupsToMigrate: TimetableGroup[] = [];
          
          if (Array.isArray(parsed)) {
            if (parsed.length > 0 && !parsed[0].entries) {
               groupsToMigrate = [{ id: "default", name: "Lịch học chính", entries: parsed }];
            } else {
               groupsToMigrate = parsed;
            }
          }

          if (groupsToMigrate.length > 0) {
            toast.info("Đang đồng bộ dữ liệu lịch học lên máy chủ...");
            for (const g of groupsToMigrate) {
              const newGroup = await apiFetch<any>("/timetable/groups", {
                method: "POST",
                body: JSON.stringify({ name: g.name })
              });
              for (const e of g.entries) {
                await apiFetch("/timetable/entries", {
                  method: "POST",
                  body: JSON.stringify({
                    group_id: newGroup.id,
                    day: e.day,
                    subject: e.subject,
                    start_time: e.startTime,
                    end_time: e.endTime,
                    room: e.room,
                    color: e.color
                  })
                });
              }
            }
            localStorage.removeItem(localKey);
            toast.success("Đồng bộ lịch học thành công!");
          }
        } catch (e) {
          console.error("Migration error:", e);
        }
      }
      fetchTimetable();
    };

    migrateAndFetch();
  }, [userId]);

  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];
  const entries = activeGroup?.entries || [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Omit<TimetableEntry, "id">>({ 
    day: "Thứ 2", subject: "", startTime: "07:00", endTime: "08:30", room: "", color: SUBJECT_COLORS[0],
  });
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [editForm, setEditForm] = useState<Omit<TimetableEntry, "id">>({ 
    day: "Thứ 2", subject: "", startTime: "07:00", endTime: "08:30", room: "", color: SUBJECT_COLORS[0],
  });

  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const add = async () => {
    if (!form.subject.trim()) { toast.error("Vui lòng nhập tên môn học"); return; }
    if (!activeGroupId) { toast.error("Vui lòng chọn hoặc tạo nhóm lịch học"); return; }
    try {
      const newEntry = await apiFetch<any>("/timetable/entries", {
        method: "POST",
        body: JSON.stringify({
          group_id: activeGroupId,
          day: form.day,
          subject: form.subject,
          start_time: form.startTime,
          end_time: form.endTime,
          room: form.room,
          color: form.color
        })
      });
      const transformed = {
        id: newEntry.id,
        day: newEntry.day,
        subject: newEntry.subject,
        startTime: newEntry.start_time,
        endTime: newEntry.end_time,
        room: newEntry.room,
        color: newEntry.color
      };
      setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, entries: [...g.entries, transformed] } : g));
      setShowForm(false);
      setForm({ day: "Thứ 2", subject: "", startTime: "07:00", endTime: "08:30", room: "", color: SUBJECT_COLORS[0] });
      toast.success("Đã thêm môn học");
    } catch (err) {
      toast.error("Không thể thêm môn học");
    }
  };

  const remove = async (id: string) => {
    try {
      await apiFetch(`/timetable/entries/${id}`, { method: "DELETE" });
      setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, entries: g.entries.filter(e => e.id !== id) } : g));
      toast.success("Đã xóa môn học");
    } catch (err) {
      toast.error("Không thể xóa môn học");
    }
  };

  const saveEdit = async () => {
    if (!editForm.subject.trim()) { toast.error("Vui lòng nhập tên môn học"); return; }
    try {
      const updated = await apiFetch<any>(`/timetable/entries/${editingEntry!.id}`, {
        method: "PUT",
        body: JSON.stringify({
          day: editForm.day,
          subject: editForm.subject,
          start_time: editForm.startTime,
          end_time: editForm.endTime,
          room: editForm.room,
          color: editForm.color
        })
      });
      const transformed = {
        id: updated.id,
        day: updated.day,
        subject: updated.subject,
        startTime: updated.start_time,
        endTime: updated.end_time,
        room: updated.room,
        color: updated.color
      };
      setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, entries: g.entries.map(e => e.id === transformed.id ? transformed : e) } : g));
      setEditingEntry(null);
      toast.success("Đã cập nhật môn học");
    } catch (err) {
      toast.error("Không thể cập nhật môn học");
    }
  };

  const addGroup = async () => {
    if (!newGroupName.trim()) { toast.error("Vui lòng nhập tên loại"); return; }
    try {
      const newGroup = await apiFetch<any>("/timetable/groups", {
        method: "POST",
        body: JSON.stringify({ name: newGroupName.trim() })
      });
      const transformed = { ...newGroup, entries: [] };
      setGroups(prev => [...prev, transformed]);
      setActiveGroupId(newGroup.id);
      setNewGroupName("");
      setIsAddingGroup(false);
      toast.success("Đã thêm loại thời khóa biểu mới");
    } catch (err) {
      toast.error("Không thể thêm loại thời khóa biểu");
    }
  };

  const removeGroup = async (id: string) => {
    if (groups.length <= 1) { toast.error("Không thể xóa nhóm cuối cùng"); return; }
    try {
      await apiFetch(`/timetable/groups/${id}`, { method: "DELETE" });
      const newGroups = groups.filter(g => g.id !== id);
      setGroups(newGroups);
      if (activeGroupId === id) setActiveGroupId(newGroups[0].id);
      toast.success("Đã xóa nhóm thời khóa biểu");
    } catch (err) {
      toast.error("Không thể xóa nhóm");
    }
  };

  const grouped = DAYS.map(day => ({
    day,
    entries: entries.filter(e => e.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  // Body scroll lock
  useEffect(() => {
    if (editingEntry) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [editingEntry]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
        <p className="text-muted-foreground animate-pulse">Đang tải lịch học...</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border-2 border-dashed border-border bg-muted/20">
         <div className="mb-4 p-4 rounded-full bg-primary/10">
           <Plus className="h-8 w-8 text-primary" />
         </div>
         <h3 className="font-bold text-lg mb-1">Chưa có lịch học</h3>
         <p className="text-muted-foreground mb-6 max-w-xs">Hãy tạo nhóm lịch học đầu tiên để bắt đầu quản lý thời gian của bạn</p>
         <div className="flex items-center gap-2">
            <input 
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="Tên loại (Vd: Lịch học chính)"
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button onClick={addGroup} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary/90 transition-all">Tạo ngay</button>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Group Switcher Selection Area */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {groups.map(group => (
          <div key={group.id} className="relative group/pill">
            <button
              onClick={() => setActiveGroupId(group.id)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                activeGroupId === group.id 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {group.name}
            </button>
            {groups.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); removeGroup(group.id); }}
                className="absolute -top-1 -right-1 hidden group-hover/pill:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white shadow-sm ring-2 ring-background hover:scale-110 transition-transform"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        ))}

        {!isAddingGroup ? (
          <button
            onClick={() => setIsAddingGroup(true)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-primary transition-colors"
            title="Thêm loại thời khóa biểu"
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
            <input
              autoFocus
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") addGroup();
                if (e.key === "Escape") setIsAddingGroup(false);
              }}
              placeholder="Tên loại..."
              className="rounded-full border border-border bg-background px-3 py-1 text-xs focus:border-primary focus:outline-none"
            />
            <button onClick={addGroup} className="text-primary hover:text-primary/80"><Check className="h-4 w-4" /></button>
            <button onClick={() => setIsAddingGroup(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold">{activeGroup.name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Quản lý lịch học hàng tuần của bạn</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-95 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Thêm môn học
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-fade-up space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Thêm môn học mới</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Thứ trong tuần</label>
              <select
                value={form.day}
                onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
              >
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Môn học *</label>
              <input
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="VD: Toán, Văn, Anh..."
                className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bắt đầu</label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kết thúc</label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phòng học</label>
              <input
                value={form.room}
                onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                placeholder="VD: P.101, Online..."
                className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Màu sắc</label>
              <div className="flex gap-2 flex-wrap">
                {SUBJECT_COLORS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className={`h-8 w-8 rounded-lg border-2 transition-transform hover:scale-110 ${c} ${form.color === c ? "scale-110 ring-2 ring-primary ring-offset-1" : ""}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={add} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              <Check className="h-4 w-4" /> Thêm
            </button>
            <button onClick={() => setShowForm(false)} className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors">
              <X className="h-4 w-4" /> Hủy
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {grouped.filter(g => g.entries.length > 0).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border-2 border-dashed border-border bg-muted/20">
            <CalendarIcon className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">Chưa có môn học nào</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Nhấn "Thêm môn học" để bắt đầu</p>
          </div>
        ) : (
          grouped.filter(g => g.entries.length > 0).map(({ day, entries: dayEntries }) => {
            const morning = dayEntries.filter(e => e.startTime < "12:00");
            const afternoon = dayEntries.filter(e => e.startTime >= "12:00");

            const EntryRow = ({ entry }: { entry: TimetableEntry }) => (
              <div className="flex items-center gap-2 px-3 py-2.5 group hover:bg-muted/20 transition-colors border-b border-border/50 last:border-0">
                <div className={`rounded-lg px-2 py-0.5 text-xs font-bold border shrink-0 ${entry.color}`}>
                  {entry.subject}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="truncate">{entry.startTime} – {entry.endTime}</span>
                </div>
                {entry.room && (
                  <div className="text-xs text-muted-foreground/60 flex items-center gap-1 shrink-0">
                    <BookOpen className="h-3 w-3" /> {entry.room}
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                  <button
                    onClick={() => openEdit(entry)}
                    className="rounded-lg p-1 text-primary hover:bg-primary/10 transition-colors"
                    title="Sửa"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => remove(entry.id)}
                    className="rounded-lg p-1 text-destructive hover:bg-destructive/10 transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );

            return (
              <div key={day} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                {/* Day header */}
                <div className={`flex items-center gap-2 px-4 py-3 ${DAY_COLORS[day]?.bg ?? "bg-muted/30"}`}>
                  <CalendarIcon className={`h-4 w-4 ${DAY_COLORS[day]?.icon ?? "text-primary"}`} />
                  <span className={`font-bold text-sm ${DAY_COLORS[day]?.text ?? ""}`}>{day}</span>
                  <span className={`ml-auto text-xs font-medium ${DAY_COLORS[day]?.text ?? "text-muted-foreground"} opacity-80`}>{dayEntries.length} môn</span>
                </div>

                {/* 2-column grid */}
                <div className="grid grid-cols-2 divide-x divide-border">
                  {/* Sáng column */}
                  <div>
                    <div className="flex items-center gap-1.5 bg-amber-50/60 border-b border-border px-3 py-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600">☀ Sáng</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{morning.length} tiết</span>
                    </div>
                    {morning.length > 0 ? (
                      morning.map(entry => <EntryRow key={entry.id} entry={entry} />)
                    ) : (
                      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground/50 italic">
                        Không có tiết sáng
                      </div>
                    )}
                  </div>

                  {/* Chiều column */}
                  <div>
                    <div className="flex items-center gap-1.5 bg-blue-50/60 border-b border-border px-3 py-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600">🌙 Chiều</span>
                      <span className="ml-auto text-[10px] text-muted-foreground">{afternoon.length} tiết</span>
                    </div>
                    {afternoon.length > 0 ? (
                      afternoon.map(entry => <EntryRow key={entry.id} entry={entry} />)
                    ) : (
                      <div className="flex items-center justify-center py-6 text-xs text-muted-foreground/50 italic">
                        Không có tiết chiều
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {editingEntry && (
        <PortalModal onClose={() => setEditingEntry(null)}>
          <div
            className="w-full rounded-3xl border-2 bg-card border-border shadow-2xl p-8 animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-xl font-bold">Sửa môn học</h3>
              <button onClick={() => setEditingEntry(null)} className="rounded-xl p-2.5 hover:bg-muted transition-all active:scale-95">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Thứ trong tuần</label>
                  <select
                    value={editForm.day}
                    onChange={e => setEditForm(f => ({ ...f, day: e.target.value }))}
                    className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
                  >
                    {DAYS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Môn học *</label>
                  <input
                    value={editForm.subject}
                    onChange={e => setEditForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="VD: Toán, Văn, Anh..."
                    className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bắt đầu</label>
                  <input
                    type="time"
                    value={editForm.startTime}
                    onChange={e => setEditForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Kết thúc</label>
                  <input
                    type="time"
                    value={editForm.endTime}
                    onChange={e => setEditForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phòng học</label>
                  <input
                    value={editForm.room}
                    onChange={e => setEditForm(f => ({ ...f, room: e.target.value }))}
                    placeholder="VD: P.101, Online..."
                    className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Màu sắc</label>
                  <div className="flex gap-2 flex-wrap">
                    {SUBJECT_COLORS.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => setEditForm(f => ({ ...f, color: c }))}
                        className={`h-8 w-8 rounded-lg border-2 transition-transform hover:scale-110 ${c} ${editForm.color === c ? "scale-110 ring-2 ring-primary ring-offset-1" : ""}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-6 mt-2 border-t border-border">
              <button onClick={saveEdit} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md shadow-primary/20">
                <Save className="h-4 w-4" /> Lưu thay đổi
              </button>
              <button onClick={() => setEditingEntry(null)} className="flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
                <X className="h-4 w-4" /> Hủy
              </button>
            </div>
          </div>
        </PortalModal>
      )}
    </div>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

function TasksTab({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const data = await apiFetch<any[]>("/tasks");
      const transformed = data.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueDate: t.due_date ? t.due_date.split('T')[0] : "",
        completed: t.completed,
        priority: t.priority,
        createdAt: t.created_at
      }));
      setTasks(transformed);
    } catch (err) {
      console.error("Fetch Tasks Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const migrateAndFetch = async () => {
      const localKey = getLocalKey("tasks", userId);
      const localData = localStorage.getItem(localKey);
      
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            toast.info("Đang đồng bộ dữ liệu nhiệm vụ lên máy chủ...");
            for (const t of parsed) {
              await apiFetch("/tasks", {
                method: "POST",
                body: JSON.stringify({
                  title: t.title,
                  description: t.description,
                  due_date: t.dueDate || null,
                  completed: t.completed,
                  priority: t.priority
                })
              });
            }
            localStorage.removeItem(localKey);
            toast.success("Đồng bộ nhiệm vụ thành công!");
          }
        } catch (e) {
          console.error("Migration error:", e);
        }
      }
      fetchTasks();
    };

    migrateAndFetch();
  }, [userId]);

  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const [form, setForm] = useState({ title: "", description: "", dueDate: "", priority: "medium" as Task["priority"] });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", dueDate: "", priority: "medium" as Task["priority"] });
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});
  const [viewingTaskDetail, setViewingTaskDetail] = useState<Task | null>(null);

  const toggleMonth = (key: string) => {
    setCollapsedMonths(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const add = async () => {
    if (!form.title.trim()) { toast.error("Vui lòng nhập tiêu đề nhiệm vụ"); return; }
    try {
      const newTask = await apiFetch<any>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          due_date: form.dueDate || null,
          priority: form.priority
        })
      });
      const transformed = {
        id: newTask.id,
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.due_date ? newTask.due_date.split('T')[0] : "",
        completed: newTask.completed,
        priority: newTask.priority,
        createdAt: newTask.created_at
      };
      setTasks(prev => [transformed, ...prev]);
      setForm({ title: "", description: "", dueDate: "", priority: "medium" });
      setShowForm(false);
      toast.success("Đã thêm nhiệm vụ");
    } catch (err) {
      toast.error("Không thể thêm nhiệm vụ");
    }
  };

  const toggle = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    try {
      const updated = await apiFetch<any>(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ completed: !task.completed })
      });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: updated.completed } : t));
    } catch (err) {
      toast.error("Không thể cập nhật nhiệm vụ");
    }
  };

  const remove = async (id: string) => {
    try {
      await apiFetch(`/tasks/${id}`, { method: "DELETE" });
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success("Đã xóa nhiệm vụ");
    } catch (err) {
      toast.error("Không thể xóa nhiệm vụ");
    }
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setEditForm({ title: task.title, description: task.description, dueDate: task.dueDate, priority: task.priority });
  };

  const saveEditTask = async () => {
    if (!editForm.title.trim()) { toast.error("Vui lòng nhập tiêu đề nhiệm vụ"); return; }
    try {
      const updated = await apiFetch<any>(`/tasks/${editingTask!.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          due_date: editForm.dueDate || null,
          priority: editForm.priority
        })
      });
      const transformed = {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        dueDate: updated.due_date ? updated.due_date.split('T')[0] : "",
        completed: updated.completed,
        priority: updated.priority,
        createdAt: updated.created_at
      };
      setTasks(prev => prev.map(t => t.id === editingTask!.id ? transformed : t));
      setEditingTask(null);
      toast.success("Đã cập nhật nhiệm vụ");
    } catch (err) {
      toast.error("Không thể cập nhật nhiệm vụ");
    }
  };

  const filtered = tasks.filter(t =>
    filter === "all" ? true : filter === "active" ? !t.completed : t.completed
  );

  // Group tasks by month (dueDate), tasks without date go last
  const groupedByMonth = (() => {
    const withDate = filtered
      .filter(t => t.dueDate)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const withoutDate = filtered.filter(t => !t.dueDate);

    const map = new Map<string, Task[]>();
    withDate.forEach(t => {
      const d = parseISO(t.dueDate);
      const key = format(d, "yyyy-MM"); // e.g. "2026-04"
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });

    const groups: { label: string; key: string; tasks: Task[]; doneCount: number }[] = [];
    map.forEach((tasks, key) => {
      const d = parseISO(key + "-01");
      const doneInMonth = tasks.filter(t => t.completed).length;
      groups.push({ 
        key, 
        label: `Tháng ${format(d, "M")} · ${format(d, "yyyy")}`, 
        tasks, 
        doneCount: doneInMonth 
      });
    });

    if (withoutDate.length > 0) {
      const doneInNoDate = withoutDate.filter(t => t.completed).length;
      groups.push({ key: "no-date", label: "Không có hạn chót", tasks: withoutDate, doneCount: doneInNoDate });
    }

    return groups;
  })();

  // Body scroll lock
  useEffect(() => {
    if (editingTask || viewingTaskDetail) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [editingTask, viewingTaskDetail]);

  const totalDone = tasks.filter(t => t.completed).length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
        <p className="text-muted-foreground animate-pulse">Đang tải nhiệm vụ...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="font-heading text-xl font-bold">Nhiệm vụ</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-lg active:scale-95 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Thêm nhiệm vụ
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-fade-up space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Nhiệm vụ mới</h3>
          <div className="space-y-3">
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Tiêu đề nhiệm vụ *"
              className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
              onKeyDown={e => e.key === "Enter" && add()}
            />
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả chi tiết (tùy chọn)"
              rows={3}
              className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors resize-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hạn chót</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors text-left"
                    >
                      <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className={form.dueDate ? "text-foreground" : "text-muted-foreground"}>
                        {form.dueDate ? format(parseISO(form.dueDate), "dd/MM/yyyy") : "Chọn ngày"}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.dueDate ? parseISO(form.dueDate) : undefined}
                      onSelect={(date) => setForm(f => ({ ...f, dueDate: date ? format(date, "yyyy-MM-dd") : "" }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Độ ưu tiên</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value as Task["priority"] }))}
                  className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="high">Cao</option>
                  <option value="medium">Trung bình</option>
                  <option value="low">Thấp</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={add} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              <Check className="h-4 w-4" /> Thêm
            </button>
            <button onClick={() => setShowForm(false)} className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors">
              <X className="h-4 w-4" /> Hủy
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(["all", "active", "done"] as const).map(f => {
          const isActive = filter === f;
          const colors = {
            all: "bg-emerald-600 text-white shadow-md shadow-emerald-600/20",
            active: "bg-blue-600 text-white shadow-md shadow-blue-600/20",
            done: "bg-purple-600 text-white shadow-md shadow-purple-600/20"
          };
          
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                isActive 
                  ? colors[f] 
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {f === "all" ? "Tất cả" : f === "active" ? "Đang làm" : "Hoàn thành"}
            </button>
          );
        })}
      </div>

      <div className="space-y-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border-2 border-dashed border-border bg-muted/20">
            <CheckSquare className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="font-medium text-muted-foreground">
              {filter === "done" ? "Chưa hoàn thành nhiệm vụ nào" : "Không có nhiệm vụ nào"}
            </p>
          </div>
        ) : (
          groupedByMonth.map(group => {
            const isCollapsed = collapsedMonths[group.key];
            return (
              <div key={group.key} className="space-y-3">
                {/* Month header */}
                <div className="space-y-2">
                  <button 
                    onClick={() => toggleMonth(group.key)}
                    className="flex w-full items-center gap-3 group/header"
                  >
                    <span className="text-xs font-bold uppercase tracking-widest text-primary group-hover/header:opacity-80 transition-opacity">
                      {group.label}
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary group-hover/header:bg-primary/20 transition-colors">
                      {group.tasks.length}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${isCollapsed ? "-rotate-90" : ""}`} />
                  </button>
                  
                  {/* Monthly Progress Bar */}
                  <div className="space-y-1.5 px-0.5">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-muted-foreground/70">
                      <span>Tiến độ tháng</span>
                      <span className="text-primary">{group.doneCount}/{group.tasks.length} hoàn thành ({Math.round(group.tasks.length ? (group.doneCount/group.tasks.length)*100 : 0)}%)</span>
                    </div>
                    <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden border border-border/50">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000"
                        style={{ width: `${group.tasks.length ? (group.doneCount / group.tasks.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tasks in this month - 2 Column Grid */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {group.tasks.map(task => {
                      const dueDateObj = task.dueDate ? new Date(task.dueDate) : null;
                      const isOverdue = dueDateObj && dueDateObj < new Date() && !task.completed;
                      
                      let dayLabel = "";
                      let dayColorClass = "bg-muted";
                      
                      if (dueDateObj) {
                        const dayIndex = dueDateObj.getDay();
                        const dayKey = dayIndex === 0 ? "Chủ nhật" : `Thứ ${dayIndex + 1}`;
                        dayLabel = dayIndex === 0 ? "CN" : `T${dayIndex + 1}`;
                        dayColorClass = DAY_COLORS[dayKey].bg;
                      }

                      return (
                        <div
                          key={task.id}
                          className={`group relative flex items-center h-full min-h-[140px] gap-4 rounded-2xl border p-4 transition-all duration-300 ${task.completed ? "border-border bg-muted/30 opacity-60" : "border-border bg-card shadow-sm hover:shadow-md"}`}
                        >
                          <button
                            onClick={() => toggle(task.id)}
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${task.completed ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}
                          >
                            {task.completed && <Check className="h-3.5 w-3.5" />}
                          </button>

                          {/* Big Date Badge - Square & Large */}
                          {dueDateObj && (
                            <div className={`flex flex-col items-center justify-center min-w-[64px] h-[64px] rounded-lg border-2 overflow-hidden shrink-0 shadow-md ${
                              isOverdue ? "border-red-400 bg-red-50" : "border-muted-foreground/10 bg-background"
                            }`}>
                              <div className={`w-full py-1.5 text-[10px] font-black text-center uppercase tracking-normal ${dayColorClass} text-white`}>
                                {dayLabel}
                              </div>
                              <div className={`text-2xl font-black leading-none py-2 ${
                                isOverdue ? "text-red-600" : "text-foreground"
                              }`}>
                                {dueDateObj.getDate()}
                              </div>
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-bold text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                                {task.title}
                              </p>
                              <span className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_CONFIG[task.priority].cls}`}>
                                {PRIORITY_CONFIG[task.priority].label}
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              {task.createdAt && (
                                <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Tạo: {new Date(task.createdAt).toLocaleDateString("vi-VN")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                            <button
                              onClick={() => setViewingTaskDetail(task)}
                              className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors"
                              title="Xem chi tiết"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditTask(task)}
                              className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors"
                              title="Sửa"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => remove(task.id)}
                              className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <PortalModal onClose={() => setEditingTask(null)}>
          <div
            className="w-full rounded-3xl border-2 bg-card border-border shadow-2xl p-8 animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-xl font-bold">Sửa nhiệm vụ</h3>
              <button onClick={() => setEditingTask(null)} className="rounded-xl p-2.5 hover:bg-muted transition-all active:scale-95">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar space-y-4">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tiêu đề *</label>
                  <input
                    value={editForm.title}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Tiêu đề nhiệm vụ"
                    className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mô tả</label>
                  <textarea
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Mô tả chi tiết (tùy chọn)"
                    rows={3}
                    className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Hạn chót</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center gap-2 rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors text-left"
                        >
                          <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className={editForm.dueDate ? "text-foreground" : "text-muted-foreground"}>
                            {editForm.dueDate ? format(parseISO(editForm.dueDate), "dd/MM/yyyy") : "Chọn ngày"}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={editForm.dueDate ? parseISO(editForm.dueDate) : undefined}
                          onSelect={(date) => setEditForm(f => ({ ...f, dueDate: date ? format(date, "yyyy-MM-dd") : "" }))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Độ ưu tiên</label>
                    <select
                      value={editForm.priority}
                      onChange={e => setEditForm(f => ({ ...f, priority: e.target.value as Task["priority"] }))}
                      className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors"
                    >
                      <option value="high">Cao</option>
                      <option value="medium">Trung bình</option>
                      <option value="low">Thấp</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-6 mt-2 border-t border-border">
              <button onClick={saveEditTask} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md shadow-primary/20">
                <Save className="h-4 w-4" /> Lưu thay đổi
              </button>
              <button onClick={() => setEditingTask(null)} className="flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
                <X className="h-4 w-4" /> Hủy
              </button>
            </div>
          </div>
        </PortalModal>
      )}

      {/* View Task Detail Modal */}
      {viewingTaskDetail && (
        <PortalModal onClose={() => setViewingTaskDetail(null)}>
          <div
            className="w-full rounded-3xl border-2 bg-card border-border shadow-2xl p-8 animate-in fade-in zoom-in duration-300 flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border ${PRIORITY_CONFIG[viewingTaskDetail.priority].cls.split(" ")[0]} bg-background`}>
                  <CheckSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-bold">{viewingTaskDetail.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${PRIORITY_CONFIG[viewingTaskDetail.priority].cls}`}>
                      {PRIORITY_CONFIG[viewingTaskDetail.priority].label}
                    </span>
                    {viewingTaskDetail.completed ? (
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                        <Check className="h-3 w-3" /> Hoàn thành
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Đang làm
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingTaskDetail(null)} className="rounded-xl p-2.5 hover:bg-muted transition-all active:scale-95 translate-x-2">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1">
              <div className="space-y-6">
                {viewingTaskDetail.description && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      Mô tả chi tiết
                    </h4>
                    <div className="rounded-2xl bg-muted/30 p-4 border border-border/50">
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{viewingTaskDetail.description}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 px-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Hạn chót</h4>
                    <p className="font-semibold text-sm flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-primary/70" />
                      {viewingTaskDetail.dueDate ? format(parseISO(viewingTaskDetail.dueDate), "dd/MM/yyyy") : "Không có"}
                    </p>
                  </div>
                  <div className="space-y-2 px-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ngày tạo</h4>
                    <p className="font-semibold text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary/70" />
                      {format(new Date(viewingTaskDetail.createdAt), "dd/MM/yyyy")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-6 mt-6 border-t border-border">
              {viewingTaskDetail.completed ? (
                <button
                  onClick={() => { toggle(viewingTaskDetail.id); setViewingTaskDetail(null); }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" /> Đánh dấu chưa xong
                </button>
              ) : (
                <button
                  onClick={() => { toggle(viewingTaskDetail.id); setViewingTaskDetail(null); }}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                >
                  <Check className="h-4 w-4" /> Hoàn thành ngay
                </button>
              )}
              <button
                onClick={() => { openEditTask(viewingTaskDetail); setViewingTaskDetail(null); }}
                className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-white hover:bg-sky-600 transition-colors shadow-lg shadow-sky-500/20"
              >
                <Edit3 className="h-4 w-4" /> Sửa
              </button>
            </div>
          </div>
        </PortalModal>
      )}
    </div>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

function NotesTab({ userId }: { userId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotes = async () => {
    try {
      const data = await apiFetch<any[]>("/notes");
      const transformed = data.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        color: n.color,
        updatedAt: n.updated_at
      }));
      setNotes(transformed);
    } catch (err) {
      console.error("Fetch Notes Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const migrateAndFetch = async () => {
      const localKey = getLocalKey("notes", userId);
      const localData = localStorage.getItem(localKey);
      
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            toast.info("Đang đồng bộ dữ liệu ghi chú lên máy chủ...");
            for (const n of parsed) {
              await apiFetch("/notes", {
                method: "POST",
                body: JSON.stringify({
                  title: n.title,
                  content: n.content,
                  color: n.color
                })
              });
            }
            localStorage.removeItem(localKey);
            toast.success("Đồng bộ ghi chú thành công!");
          }
        } catch (e) {
          console.error("Migration error:", e);
        }
      }
      fetchNotes();
    };

    migrateAndFetch();
  }, [userId]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingColor, setAddingColor] = useState(NOTE_COLORS[0]);
  const [addTitle, setAddTitle] = useState("");
  const [addContent, setAddContent] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editForm, setEditForm] = useState<{ title: string; content: string; color: string }>({ title: "", content: "", color: "" });
  const [viewingNote, setViewingNote] = useState<Note | null>(null);



  const add = async () => {
    if (!addTitle.trim() && !addContent.trim()) { toast.error("Vui lòng nhập tiêu đề hoặc nội dung"); return; }
    try {
      const newNote = await apiFetch<any>("/notes", {
        method: "POST",
        body: JSON.stringify({
          title: addTitle,
          content: addContent,
          color: addingColor.bg + " " + addingColor.border
        })
      });
      const transformed = {
        id: newNote.id,
        title: newNote.title,
        content: newNote.content,
        color: newNote.color,
        updatedAt: newNote.updated_at
      };
      setNotes(prev => [transformed, ...prev]);
      setAddTitle("");
      setAddContent("");
      setShowAdd(false);
      toast.success("Đã thêm ghi chú");
    } catch (err) {
      toast.error("Không thể thêm ghi chú");
    }
  };

  const saveEdit = async (id: string) => {
    try {
      const updated = await apiFetch<any>(`/notes/${id}`, {
        method: "PUT",
        body: JSON.stringify(editForm)
      });
      const transformed = {
        id: updated.id,
        title: updated.title,
        content: updated.content,
        color: updated.color,
        updatedAt: updated.updated_at
      };
      setNotes(prev => prev.map(n => n.id === id ? transformed : n));
      setEditingId(null);
      toast.success("Đã lưu ghi chú");
    } catch (err) {
      toast.error("Không thể cập nhật ghi chú");
    }
  };

  const remove = async (id: string) => {
    try {
      await apiFetch(`/notes/${id}`, { method: "DELETE" });
      setNotes(prev => prev.filter(n => n.id !== id));
      toast.success("Đã xóa ghi chú");
    } catch (err) {
      toast.error("Không thể xóa ghi chú");
    }
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditForm({ title: note.title, content: note.content, color: note.color });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
        <p className="text-muted-foreground animate-pulse">Đang tải ghi chú...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold">Ghi chú</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{notes.length} ghi chú</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-lg active:scale-95 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Thêm ghi chú
        </button>
      </div>

      {showAdd && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-fade-up space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Ghi chú mới</h3>
            <div className="flex flex-col gap-2 items-end">
              <div className="flex gap-1.5">
                {NOTE_COLORS.slice(0, 6).map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setAddingColor(c)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${c.bg} ${c.border} ${addingColor.label === c.label ? "scale-110 ring-2 ring-primary ring-offset-1" : ""}`}
                    title={c.label}
                  />
                ))}
              </div>
              <div className="flex gap-1.5">
                {NOTE_COLORS.slice(6, 12).map((c, i) => (
                  <button
                    key={i + 6}
                    onClick={() => setAddingColor(c)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${c.bg} ${c.border} ${addingColor.label === c.label ? "scale-110 ring-2 ring-primary ring-offset-1" : ""}`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <input
            value={addTitle}
            onChange={e => setAddTitle(e.target.value)}
            placeholder="Tiêu đề ghi chú"
            className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm font-semibold focus:border-primary focus:outline-none transition-colors"
          />
          <textarea
            value={addContent}
            onChange={e => setAddContent(e.target.value)}
            placeholder="Nội dung ghi chú..."
            rows={4}
            className="w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none transition-colors resize-none"
          />
          <div className="flex gap-2">
            <button onClick={add} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
              <Check className="h-4 w-4" /> Lưu
            </button>
            <button onClick={() => setShowAdd(false)} className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors">
              <X className="h-4 w-4" /> Hủy
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border-2 border-dashed border-border bg-muted/20">
          <StickyNote className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">Chưa có ghi chú nào</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Nhấn "Thêm ghi chú" để bắt đầu</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map(note => {
            const [bg, border] = note.color.split(" ");
            return (
              <div
                key={note.id}
                className={`group relative rounded-2xl border-2 p-4 transition-all duration-300 hover:shadow-md ${bg} ${border}`}
              >
                {editingId === note.id ? (
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1.5 items-end mb-1">
                      <div className="flex gap-1">
                        {NOTE_COLORS.slice(0, 6).map((c, i) => (
                          <button
                            key={i}
                            onClick={() => setEditForm(f => ({ ...f, color: c.bg + " " + c.border }))}
                            className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${c.bg} ${c.border} ${editForm.color === (c.bg + " " + c.border) ? "scale-110 ring-2 ring-primary ring-offset-1" : ""}`}
                          />
                        ))}
                      </div>
                      <div className="flex gap-1">
                        {NOTE_COLORS.slice(6, 12).map((c, i) => (
                          <button
                            key={i + 6}
                            onClick={() => setEditForm(f => ({ ...f, color: c.bg + " " + c.border }))}
                            className={`h-5 w-5 rounded-full border transition-transform hover:scale-110 ${c.bg} ${c.border} ${editForm.color === (c.bg + " " + c.border) ? "scale-110 ring-2 ring-primary ring-offset-1" : ""}`}
                          />
                        ))}
                      </div>
                    </div>
                    <input
                      value={editForm.title}
                      onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background/80 px-2 py-1.5 text-sm font-semibold focus:outline-none focus:border-primary"
                    />
                    <textarea
                      value={editForm.content}
                      onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                      rows={4}
                      className="w-full rounded-lg border border-border bg-background/80 px-2 py-1.5 text-sm focus:outline-none focus:border-primary resize-none"
                    />
                    <div className="flex gap-1.5">
                      <button onClick={() => saveEdit(note.id)} className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                        <Save className="h-3 w-3" /> Lưu
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex items-center gap-1 rounded-lg border border-border bg-background/80 px-2.5 py-1.5 text-xs font-semibold hover:bg-muted transition-colors">
                        <X className="h-3 w-3" /> Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {note.title && (
                      <>
                        <h3 className="font-bold text-sm mb-2 truncate">{note.title}</h3>
                        <div className="h-px w-full bg-black/5 mb-3" />
                      </>
                    )}
                    {note.content && (
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed line-clamp-6 min-h-[9rem]">
                        {note.content}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-3">
                      {formatDate(note.updatedAt)}
                    </p>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => setViewingNote(note)} className="rounded-lg bg-background/80 p-1.5 hover:bg-background shadow-sm transition-colors text-primary" title="Xem">
                        <Eye className="h-3 w-3" />
                      </button>
                      <button onClick={() => startEdit(note)} className="rounded-lg bg-background/80 p-1.5 hover:bg-background shadow-sm transition-colors text-foreground">
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button onClick={() => remove(note.id)} className="rounded-lg bg-background/80 p-1.5 text-destructive hover:bg-destructive/10 shadow-sm transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* View Note Modal */}
      {viewingNote && (
        <PortalModal onClose={() => setViewingNote(null)}>
          <div
            className={`w-full rounded-3xl border-2 bg-card border-black/5 shadow-2xl p-8 animate-in zoom-in-95 duration-300 flex flex-col overflow-hidden ${viewingNote.color.split(" ")[0]} ${viewingNote.color.split(" ")[1]}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-black/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-black/5">
                  <StickyNote className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-bold text-xl text-foreground">{viewingNote.title || "Chi tiết ghi chú"}</h3>
              </div>
              <button 
                onClick={() => setViewingNote(null)} 
                className="rounded-xl p-2.5 hover:bg-black/5 transition-all active:scale-95 translate-x-2"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap py-2">
                {viewingNote.content}
              </p>
            </div>
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-black/5">
              <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                Smart Learn Notes
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                <Clock className="h-3 w-3" />
                <span>Cập nhật: {formatDate(viewingNote.updatedAt)}</span>
              </div>
            </div>
          </div>
        </PortalModal>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "timetable", label: "Thời khóa biểu", icon: CalendarIcon },
  { key: "tasks", label: "Nhiệm vụ", icon: CheckSquare },
  { key: "notes", label: "Ghi chú", icon: StickyNote },
];

export default function SchedulePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("timetable");
  const userId = user?.id || "";


  return (
    <div className="container py-10 max-w-5xl">
      {/* Header */}
      <div className="mb-8 opacity-0 animate-fade-up">
        <h1 className="font-heading text-3xl font-bold">Thời gian biểu</h1>
        <p className="mt-1 text-muted-foreground">Quản lý lịch học, nhiệm vụ và ghi chú của bạn</p>
      </div>

      {/* Tab Bar */}
      <div className="mb-8 flex gap-1 rounded-2xl border border-border bg-muted/50 p-1.5 opacity-0 animate-fade-up" style={{ animationDelay: "60ms" }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-sm font-semibold transition-all duration-200 ${
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="opacity-0 animate-fade-up" style={{ animationDelay: "120ms" }}>
        {activeTab === "timetable" && <TimetableTab key={userId} userId={userId} />}
        {activeTab === "tasks" && <TasksTab key={userId} userId={userId} />}
        {activeTab === "notes" && <NotesTab key={userId} userId={userId} />}
      </div>


    </div>
  );
}
