import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Plus, Trash2, KeyRound, ShieldCheck, User as UserIcon,
  Loader2, CheckCircle2, AlertCircle, X, Calendar, Edit3, BookOpen,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { listUsers, createUser, deleteUser, changePassword, updateUser, type User, type Role } from "@/lib/auth";
import { toast } from "sonner";

const getTodayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const formatDateInput = (dateStr: string | null | undefined) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  } catch (e) {
    return "";
  }
};

const calculateEndDate = (startStr: string, planType: string) => {
  if (!startStr) return "";
  const d = new Date(startStr);
  let daysToAdd = 7;
  if (planType === "1 tháng") daysToAdd = 30;
  else if (planType === "2 tháng") daysToAdd = 60;
  else if (planType === "3 tháng") daysToAdd = 90;
  else if (planType === "6 tháng") daysToAdd = 180;
  else if (planType === "12 tháng") daysToAdd = 365;
  
  d.setDate(d.getDate() + daysToAdd);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

function RoleBadge({ role }: { role: Role }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
        <ShieldCheck className="h-3 w-3" /> Admin
      </span>
    );
  }
  if (role === "teacher") {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 px-2.5 py-1 text-xs font-bold text-sky-600">
        <BookOpen className="h-3 w-3" /> Teacher
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
      <UserIcon className="h-3 w-3" /> User
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <div className="flex justify-center" title="Đang hoạt động">
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      </div>
    );
  }
  return (
    <div className="flex justify-center" title="Đã bị khóa">
      <AlertCircle className="h-5 w-5 text-destructive" />
    </div>
  );
}

function PlanBadge({ plan }: { plan?: string }) {
  const p = plan || "Miễn phí";
  if (p === "Miễn phí") {
    return (
      <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground border border-border/50">
        {p}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm shadow-emerald-500/20">
      {p}
    </span>
  );
}

// ── Create user screen ──────────────────────────────────────────
function UserCreateScreen({ onBack, onCreated }: { onBack: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [educationLevel, setEducationLevel] = useState("Tiểu học");
  const [role, setRole] = useState<Role>("user");
  const [plan, setPlan] = useState("Miễn phí");
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(calculateEndDate(getTodayStr(), "Miễn phí"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPlan = e.target.value;
    setPlan(newPlan);
    const today = getTodayStr();
    setStartDate(today);
    setEndDate(calculateEndDate(today, newPlan));
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    setEndDate(calculateEndDate(newStart, plan));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Mật khẩu và nhập lại mật khẩu không khớp.");
      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Địa chỉ email không hợp lệ.");
      return;
    }

    setLoading(true);
    const result = await createUser(username, displayName, password, role, email, educationLevel, plan, startDate, endDate);
    setLoading(false);
    if (result.ok) {
      toast.success(`Đã tạo tài khoản "${result.user.username}"`);
      onCreated();
      onBack();
    } else {
      setError((result as any).message);
    }
  };

  return (
    <div className="space-y-8 opacity-0 animate-fade-up">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Plus className="h-6 w-6 text-primary" /> Tạo tài khoản mới
          </h2>
          <p className="text-sm text-muted-foreground">Nhập thông tin để đăng ký thành viên mới</p>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-8 shadow-sm max-w-2xl mx-auto">

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Tên đăng nhập *</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="vd: hocsinh01"
                className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Tên hiển thị</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nguyễn Văn A"
                className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vd: hocsinh01@gmail.com"
              className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Cấp độ</label>
            <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none">
              <option value="">-- Chọn cấp độ --</option>
              <option value="Tiểu học">Tiểu học</option>
              <option value="Trung học cơ sở">Trung học cơ sở</option>
              <option value="Trung học Phổ Thông">Trung học Phổ Thông</option>
              <option value="Đại Học / Cao Đẳng">Đại Học / Cao Đẳng</option>
              <option value="Luyện thi chứng chỉ">Luyện thi chứng chỉ</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Gói cước</label>
            <select value={plan} onChange={handlePlanChange}
              className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none">
              <option value="Miễn phí">Miễn phí</option>
              <option value="1 tháng">1 tháng</option>
              <option value="2 tháng">2 tháng</option>
              <option value="3 tháng">3 tháng</option>
              <option value="6 tháng">6 tháng</option>
              <option value="12 tháng">12 tháng</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Ngày bắt đầu</label>
              <input type="date" value={startDate} onChange={handleStartDateChange}
                className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Ngày kết thúc</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Mật khẩu * (≥ 6 ký tự)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Nhập lại mật khẩu *</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Vai trò</label>
            <div className="flex gap-3">
              {(["user", "teacher", "admin"] as Role[]).map((r) => (
                <label key={r} className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 transition-colors ${role === r ? "border-primary bg-primary/5" : "border-input hover:border-primary/30"}`}>
                  <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="hidden" />
                  {r === "admin" ? <ShieldCheck className="h-4 w-4 shrink-0 text-primary" /> : r === "teacher" ? <BookOpen className="h-4 w-4 shrink-0 text-sky-600" /> : <UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <span className="text-sm font-semibold capitalize">{r === "admin" ? "Admin" : r === "teacher" ? "Teacher" : "User"}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1 h-12 rounded-xl">Hủy</Button>
            <Button type="submit" className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/20" disabled={loading || !username || !password || !confirmPassword || password.length < 6}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xác nhận tạo
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit user screen ────────────────────────────────────────────
function UserEditScreen({ user, onBack, onUpdated }: { user: User; onBack: () => void; onUpdated: () => void }) {
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [email, setEmail] = useState(user.email || "");
  const [educationLevel, setEducationLevel] = useState(user.educationLevel || "");
  const [role, setRole] = useState<Role>(user.role || "user");
  const [isActive, setIsActive] = useState<boolean>(user.isActive ?? true);
  const [plan, setPlan] = useState(user.plan || "Miễn phí");
  const [startDate, setStartDate] = useState(formatDateInput(user.planStartDate) || getTodayStr());
  const [endDate, setEndDate] = useState(formatDateInput(user.planEndDate) || calculateEndDate(formatDateInput(user.planStartDate) || getTodayStr(), user.plan || "Miễn phí"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePlanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPlan = e.target.value;
    setPlan(newPlan);
    const today = getTodayStr();
    setStartDate(today);
    setEndDate(calculateEndDate(today, newPlan));
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    setEndDate(calculateEndDate(newStart, plan));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Địa chỉ email không hợp lệ.");
      return;
    }

    setLoading(true);
    const result = await updateUser(user.id, displayName, role, email, educationLevel, undefined, isActive, plan, startDate, endDate);
    setLoading(false);
    if (result.ok) {
      toast.success(`Đã cập nhật tài khoản "${user.username}"`);
      onUpdated();
      onBack();
    } else {
      setError((result as any).message);
    }
  };

  return (
    <div className="space-y-8 opacity-0 animate-fade-up">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="font-heading text-2xl font-bold flex items-center gap-2">
            <Edit3 className="h-6 w-6 text-primary" /> Sửa đổi thông tin
          </h2>
          <p className="text-sm text-muted-foreground">Cập nhật thông tin chi tiết cho tài khoản @{user.username}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-8 shadow-sm max-w-2xl mx-auto">

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-muted-foreground">Tên đăng nhập</label>
              <input value={user.username} disabled
                className="w-full rounded-xl border-2 border-input bg-muted px-3 py-2.5 text-sm font-medium text-muted-foreground focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Tên hiển thị</label>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nguyễn Văn A"
                className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vd: hocsinh01@gmail.com"
              className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Cấp độ</label>
            <select value={educationLevel} onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none">
              <option value="">-- Chọn cấp độ --</option>
              <option value="Tiểu học">Tiểu học</option>
              <option value="Trung học cơ sở">Trung học cơ sở</option>
              <option value="Trung học Phổ Thông">Trung học Phổ Thông</option>
              <option value="Đại Học / Cao Đẳng">Đại Học / Cao Đẳng</option>
              <option value="Luyện thi chứng chỉ">Luyện thi chứng chỉ</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Gói cước</label>
            <select value={plan} onChange={handlePlanChange}
              className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none">
              <option value="Miễn phí">Miễn phí</option>
              <option value="1 tháng">1 tháng</option>
              <option value="2 tháng">2 tháng</option>
              <option value="3 tháng">3 tháng</option>
              <option value="6 tháng">6 tháng</option>
              <option value="12 tháng">12 tháng</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Ngày bắt đầu</label>
              <input type="date" value={startDate} onChange={handleStartDateChange}
                className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Ngày kết thúc</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border-2 border-input bg-background px-3 py-2.5 text-sm font-medium focus:border-primary focus:outline-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Trạng thái</label>
            <div className="flex gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="isActive" checked={isActive} onChange={() => setIsActive(true)} className="h-4 w-4 accent-primary" />
                <span className="text-sm font-medium">Hoạt động</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="isActive" checked={!isActive} onChange={() => setIsActive(false)} className="h-4 w-4 accent-primary" />
                <span className="text-sm font-medium">Dừng hoạt động</span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Vai trò</label>
            <div className="flex gap-3">
              {(["user", "teacher", "admin"] as Role[]).map((r) => (
                <label key={r} className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 transition-colors ${role === r ? "border-primary bg-primary/5" : "border-input hover:border-primary/30"}`}>
                  <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="hidden" />
                  {r === "admin" ? <ShieldCheck className="h-4 w-4 shrink-0 text-primary" /> : r === "teacher" ? <BookOpen className="h-4 w-4 shrink-0 text-sky-600" /> : <UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <span className="text-sm font-semibold capitalize">{r === "admin" ? "Admin" : r === "teacher" ? "Teacher" : "User"}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-4 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1 h-12 rounded-xl">Hủy</Button>
            <Button type="submit" className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/20" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Change password modal ─────────────────────────────────────
function ChangePwModal({ user, onClose }: { user: User; onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await changePassword(user.id, pw);
    setLoading(false);
    if (result.ok) {
      toast.success("Đã đổi mật khẩu thành công");
      onClose();
    } else {
      setError(result.message ?? "Lỗi không xác định");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card shadow-2xl border border-border p-6 space-y-5 opacity-0 animate-scale-in">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-bold flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-secondary" /> Đổi mật khẩu
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground">Tài khoản: <strong>{user.displayName}</strong> (@{user.username})</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
            placeholder="Mật khẩu mới (≥ 6 ký tự)" autoFocus
            className="w-full rounded-xl border-2 border-input bg-background px-4 py-2.5 text-sm font-medium focus:border-primary focus:outline-none" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Hủy</Button>
            <Button type="submit" className="flex-1" disabled={loading || pw.length < 6}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lưu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main AdminPage ────────────────────────────────────────────
export default function AdminPage() {
  const navigate = useNavigate();
  const { user: currentUser, isAdmin } = useAuth();
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [users, setUsers] = useState<User[]>([]);
  const [changePwTarget, setChangePwTarget] = useState<User | null>(null);
  const [editUserTarget, setEditUserTarget] = useState<User | null>(null);

  useEffect(() => {
    if (!isAdmin) { navigate("/"); return; }
    listUsers().then(setUsers);
  }, [isAdmin]);

  const refresh = async () => setUsers(await listUsers());


  const handleDelete = async (u: User) => {
    if (!confirm(`Xóa tài khoản "${u.displayName}" (@${u.username})?`)) return;
    const result = await deleteUser(u.id);
    if (result.ok) {
      toast.success("Đã xóa tài khoản");
      refresh();
    } else {
      toast.error(result.message);
    }
  };


  if (!isAdmin) return null;

  const admins = users.filter((u) => u.role === "admin");
  const normalUsers = users.filter((u) => u.role === "user");

  // Sub-screens
  if (view === "create") {
    return (
      <div className="container py-10 px-4">
        <UserCreateScreen onBack={() => setView("list")} onCreated={refresh} />
      </div>
    );
  }

  if (view === "edit" && editUserTarget) {
    return (
      <div className="container py-10 px-4">
        <UserEditScreen user={editUserTarget} onBack={() => setView("list")} onUpdated={refresh} />
      </div>
    );
  }

  return (
    <div className="container py-10 px-4">
      {changePwTarget && <ChangePwModal user={changePwTarget} onClose={() => setChangePwTarget(null)} />}
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-0 animate-fade-up">
            <div>
              <h1 className="font-heading text-3xl font-bold flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </span>
                Quản lý tài khoản
              </h1>
              <p className="mt-2 sm:mt-1 text-muted-foreground text-sm">{users.length} tài khoản • {admins.length} admin, {normalUsers.length} user</p>
            </div>
            <Button onClick={() => setView("create")} className="w-full sm:w-auto h-12 px-6 rounded-xl shadow-lg shadow-primary/10">
              <Plus className="mr-2 h-4 w-4" /> Tạo tài khoản
            </Button>
          </div>

          {/* User list table */}
          <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden opacity-0 animate-fade-up" style={{ animationDelay: "80ms" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-4 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Tên hiển thị</th>
                    <th className="px-3 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px] whitespace-nowrap">Tên đăng nhập</th>
                    <th className="px-3 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px] whitespace-nowrap">Cấp độ</th>
                    <th className="px-3 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px] whitespace-nowrap">Gói cước</th>
                    <th className="px-3 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px] whitespace-nowrap">Ngày hết hạn</th>
                    <th className="px-3 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px] whitespace-nowrap text-center">Trạng thái</th>
                    <th className="px-3 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px] whitespace-nowrap text-center">Vai trò</th>
                    <th className="px-4 py-4 font-bold text-muted-foreground uppercase tracking-wider text-[10px] text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id} className={`hover:bg-muted/30 transition-colors border-b border-border/50 ${u.isActive === false ? "bg-muted/20" : ""}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${u.role === "admin" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {u.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-foreground truncate max-w-[150px]" title={u.displayName}>{u.displayName}</span>
                            {u.id === currentUser?.id && (
                              <span className="text-[9px] font-bold text-secondary uppercase">Bạn</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-muted-foreground font-medium truncate max-w-[120px]" title={`@${u.username}`}>@{u.username}</td>
                      <td className="px-3 py-4 text-foreground font-medium truncate max-w-[150px]" title={u.educationLevel || ""}>{u.educationLevel || "—"}</td>
                      <td className="px-3 py-4">
                        <PlanBadge plan={u.plan} />
                      </td>
                      <td className="px-3 py-4 font-medium text-muted-foreground tabular-nums text-xs">
                        {u.planEndDate ? new Date(u.planEndDate).toLocaleDateString("vi-VN") : "—"}
                      </td>
                      <td className="px-3 py-4">
                        <StatusBadge active={u.isActive !== false} />
                      </td>
                      <td className="px-3 py-4 text-center">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditUserTarget(u); setView("edit"); }} className="h-8 w-8 p-0" title="Chỉnh sửa">
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setChangePwTarget(u)} className="h-8 w-8 p-0" title="Đổi mật khẩu">
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          {u.username !== "admin" && u.id !== currentUser?.id && (
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(u)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Xóa">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Info box */}
          <div className="mt-6 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground space-y-1 opacity-0 animate-fade-up" style={{ animationDelay: "160ms" }}>
            <p className="font-semibold text-foreground">Phân quyền</p>
            <p>🛡️ <strong>Admin</strong>: Toàn quyền – xem, upload giáo trình, import quiz/flashcard, quản lý tài khoản.</p>
            <p>👩‍🏫 <strong>Teacher</strong>: Quyền như User, cộng thêm truy cập Màn hình Giáo viên.</p>
            <p>👤 <strong>User</strong>: Chỉ xem bài học, làm quiz, ôn flashcard. Không upload hoặc import.</p>
          </div>
    </div>
  );
}
