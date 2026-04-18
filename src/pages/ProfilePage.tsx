import { useState, useEffect } from "react";
import { User as UserIcon, Loader2, AlertCircle, ArrowLeft, ShieldCheck, Mail, GraduationCap, Lock, Check, Camera, Flame, CheckCircle2, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { updateUser, changePassword } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { getStreakStats } from "@/lib/streak";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useRef } from "react";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streakData = getStreakStats();
  
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [educationLevel, setEducationLevel] = useState("Tiểu học");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [plan, setPlan] = useState("Miễn phí");
  const [planStartDate, setPlanStartDate] = useState("");
  const [planEndDate, setPlanEndDate] = useState("");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setEmail(user.email || "");
      setEducationLevel(user.educationLevel || "");
      setAvatarUrl(user.avatarUrl || "");
      setPlan(user.plan || "Miễn phí");
      setPlanStartDate(user.planStartDate || "");
      setPlanEndDate(user.planEndDate || "");

      // Fetch fresh data from database to ensure education_level is up-to-date
      apiFetch<any>("/me").then((freshData) => {
        if (freshData) {
          if (freshData.educationLevel) setEducationLevel(freshData.educationLevel);
          if (freshData.avatarUrl) setAvatarUrl(freshData.avatarUrl);
          if (freshData.plan) setPlan(freshData.plan);
          if (freshData.planStartDate) setPlanStartDate(freshData.planStartDate);
          if (freshData.planEndDate) setPlanEndDate(freshData.planEndDate);
        }
      }).catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Vui lòng chọn một tệp hình ảnh.");
      return;
    }

    // Create local preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await apiFetch<{ url: string }>("/upload", {
        method: "POST",
        body: formData,
      });

      if (uploadRes.url) {
        // Use the actual server URL once uploaded
        setAvatarUrl(uploadRes.url);
        
        // Persist immediately
        const result = await updateUser(
          user.id,
          displayName,
          user.role,
          email,
          educationLevel,
          uploadRes.url,
          user.isActive
        );

        if (result.ok) {
          toast.success("Đã cập nhật ảnh đại diện");
          
          const currentSession = JSON.parse(sessionStorage.getItem("hvui-session-v1") || "{}");
          const updatedSession = { 
            ...currentSession, 
            avatarUrl: uploadRes.url 
          };
            sessionStorage.setItem("hvui-session-v1", JSON.stringify(updatedSession));
          
          refresh();
        }
      }
    } catch (err: any) {
      toast.error("Không thể tải ảnh lên: " + err.message);
      // Revert to original if failed
      setAvatarUrl(user.avatarUrl || "");
    } finally {
      setIsUploadingAvatar(false);
      // Clean up the object URL to avoid memory leaks
      URL.revokeObjectURL(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Địa chỉ email không hợp lệ.");
      return;
    }

    if (password) {
      if (password.length < 6) {
        setError("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Mật khẩu và nhập lại mật khẩu không khớp.");
        return;
      }
    }

    setLoading(true);

    try {
      // Update password if provided
      if (password) {
        const pwResult = await changePassword(user.id, password);
        if (!pwResult.ok) {
          setError(pwResult.message || "Không thể đổi mật khẩu");
          setLoading(false);
          return;
        }
      }

      // Update info
      const result = await updateUser(
        user.id, 
        displayName, 
        user.role, 
        email, 
        educationLevel, 
        avatarUrl,
        user.isActive
      );

      if (result.ok) {
        toast.success("Cập nhật thông tin cá nhân thành công");
        
        // Merge with current session to avoid losing fields
        const currentSession = JSON.parse(sessionStorage.getItem("hvui-session-v1") || "{}");
        // We know we updated these specific fields
        const updatedSession = { 
          ...currentSession, 
          displayName, 
          educationLevel,
          email,
          avatarUrl: avatarUrl.startsWith('blob:') ? currentSession.avatarUrl : avatarUrl // Don't save blob URLs
        };
        sessionStorage.setItem("hvui-session-v1", JSON.stringify(updatedSession));
        
        refresh();
        setPassword("");
        setConfirmPassword("");
      } else {
        setError((result as any).message || "Không thể cập nhật thông tin");
      }
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-10 max-w-3xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <button 
            onClick={() => navigate(-1)}
            className="group mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Quay lại</span>
          </button>
          <h1 className="font-heading text-3xl font-bold">Thông tin cá nhân</h1>
          <p className="mt-1 text-muted-foreground">Quản lý và cập nhật thông tin tài khoản của bạn</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* Streak Section moved from Dashboard */}
          <div className="rounded-2xl bg-card p-6 shadow-sm border border-primary/5 opacity-0 animate-fade-up" style={{ animationDelay: "100ms" }}>
            <div className="flex flex-col xl:flex-row items-center gap-6">
              <div className="flex items-center gap-3 xl:border-r border-border xl:pr-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30">
                    <Flame className="h-7 w-7 text-white animate-bounce" style={{ animationDuration: '3s' }} />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-black text-foreground">{streakData.streak} ngày</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Chuỗi hoạt động</p>
                </div>
              </div>

              <div className="flex-1 w-full">
                <p className="mb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-center xl:text-left">Hoạt động tuần này</p>
                <div className="flex justify-between md:justify-center xl:justify-start gap-2 sm:gap-3">
                  {streakData.weekData.map((day) => (
                    <div key={day.date} className="flex flex-col items-center gap-1.5">
                      <span className={`text-[9px] font-black uppercase ${day.isToday ? 'text-primary' : 'text-muted-foreground/60'}`}>
                        {day.label}
                      </span>
                      <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl border-2 transition-all duration-500 ${
                        day.active 
                          ? 'bg-primary/10 border-primary text-primary shadow-md shadow-primary/10' 
                          : day.isToday ? 'border-dashed border-primary/30 bg-primary/5 text-primary/30' : 'border-border bg-muted/30 text-muted-foreground/20'
                      }`}>
                        {day.active ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <div className="h-1.5 w-1.5 rounded-full bg-current" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-border pb-4">
                <UserIcon className="h-5 w-5 text-primary" />
                <h2 className="font-heading text-lg font-bold">Thông tin tài khoản</h2>
              </div>

              {/* Avatar Section Moved Here */}
              <div className="space-y-3">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Ảnh đại diện
                </label>
                <div className="flex items-center gap-6">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-primary/10 text-primary text-3xl font-bold border-2 border-transparent group-hover:border-primary/50 transition-all">
                      {isUploadingAvatar ? (
                        <Loader2 className="h-8 w-8 animate-spin" />
                      ) : avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                      ) : (
                        (user.displayName || user.username || "?").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 rounded-xl bg-background border border-border p-1.5 shadow-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Camera className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Thay đổi ảnh đại diện</p>
                    <p className="text-xs text-muted-foreground">Tải ảnh lên từ máy tính của bạn (JPG, PNG)</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="mt-2 h-8 text-xs border-dashed">
                      Chọn ảnh mới
                    </Button>
                  </div>
                  {/* Hidden File Input */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    Tên đăng nhập
                  </label>
                  <input value={user.username} disabled
                    className="w-full rounded-xl border-2 border-input bg-muted px-4 py-3 text-sm font-medium text-muted-foreground focus:outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Tên hiển thị
                  </label>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="VD: Nguyễn Văn A"
                    className="w-full rounded-xl border-2 border-primary/20 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:outline-none transition-all hover:border-primary/40 shadow-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Email học tập
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vd: hocsinh01@gmail.com"
                    className="w-full rounded-xl border-2 border-primary/20 bg-white pl-11 pr-4 py-3 text-sm font-medium focus:border-primary focus:outline-none transition-all hover:border-primary/40 shadow-sm" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Cấp độ
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <select 
                    value={educationLevel} 
                    onChange={(e) => setEducationLevel(e.target.value)}
                    disabled={user.role !== 'admin'}
                    className={`w-full appearance-none rounded-xl border-2 pl-11 pr-4 py-3 text-sm font-medium focus:border-primary focus:outline-none transition-all ${user.role !== 'admin' ? 'bg-muted text-muted-foreground cursor-not-allowed border-input' : 'bg-white border-primary/20 hover:border-primary/40 shadow-sm'}`}
                  >
                    <option value="">-- Chọn cấp độ --</option>
                    <option value="Tiểu học">Tiểu học</option>
                    <option value="Trung học cơ sở">Trung học cơ sở</option>
                    <option value="Trung học Phổ Thông">Trung học Phổ Thông</option>
                    <option value="Đại Học / Cao Đẳng">Đại Học / Cao Đẳng</option>
                    <option value="Luyện thi chứng chỉ">Luyện thi chứng chỉ</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-border pb-4">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="font-heading text-lg font-bold">Thông tin gói hội viên</h2>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Gói cước
                  </label>
                  <input value={plan} disabled
                    className="w-full rounded-xl border-2 border-input bg-muted px-4 py-3 text-sm font-medium text-muted-foreground focus:outline-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Ngày bắt đầu
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input type="date" value={planStartDate ? planStartDate.split('T')[0] : ""} disabled
                        className="w-full rounded-xl border-2 border-input bg-muted pl-11 pr-4 py-3 text-sm font-medium text-muted-foreground focus:outline-none" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Ngày kết thúc
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input type="date" value={planEndDate ? planEndDate.split('T')[0] : ""} disabled
                        className="w-full rounded-xl border-2 border-input bg-muted pl-11 pr-4 py-3 text-sm font-medium text-muted-foreground focus:outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-2 border-b border-border pb-4">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="font-heading text-lg font-bold">Thay đổi mật khẩu</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Mật khẩu mới
                  </label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                    className="w-full rounded-xl border-2 border-primary/20 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:outline-none transition-all hover:border-primary/40 shadow-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Xác nhận mật khẩu
                  </label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                    className="w-full rounded-xl border-2 border-primary/20 bg-white px-4 py-3 text-sm font-medium focus:border-primary focus:outline-none transition-all hover:border-primary/40 shadow-sm" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground italic flex items-center gap-2">
                <AlertCircle className="h-3 w-3" /> Hãy để trống nếu bạn không có thiện ý thay đổi mật khẩu hiện tại
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-4 text-sm font-medium text-destructive flex items-center gap-3 animate-shake">
                <AlertCircle className="h-5 w-5 shrink-0" /> {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} className="rounded-xl h-12 px-8">
                Hủy
              </Button>
              <Button type="submit" className="rounded-xl h-12 px-10 shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Lưu thay đổi
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
