import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

import { Eye, EyeOff, LogIn, BookOpen, Loader2, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { login, forgotPassword } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refresh } = useAuth();
  const from = (location.state as any)?.from ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);


  // Already logged in → redirect
  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError("");
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (result.ok) {
      refresh();
      toast.success(`Chào mừng, ${result.user.displayName}!`);
      navigate(from, { replace: true });
    } else {
      setError((result as any).message);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setError("");
    
    const res = await forgotPassword(forgotEmail);
    setForgotLoading(false);
    
    if (res.ok) {
      toast.success(res.message, { duration: 10000 });
      setMode("login");
      setForgotEmail("");
    } else {
      setError(res.message);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-secondary/8 blur-3xl" />
      </div>

      <div className="w-full max-w-md opacity-0 animate-fade-up">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C08447]/10 shadow-lg shadow-[#C08447]/10">
            <Library className="h-8 w-8 text-[#C08447]" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-[#2D9B63]">Smart Learn</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            {mode === "login" ? "Đăng nhập để tiếp tục" : "Khôi phục mật khẩu"}
          </p>
        </div>


        {/* Card */}
        <div className="rounded-2xl bg-card shadow-xl shadow-black/5 border border-border p-8 space-y-5">
          {mode === "login" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold">Tên đăng nhập</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nhập tên đăng nhập"
                  autoComplete="username"
                  autoFocus
                  className="w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-sm font-medium transition-colors focus:border-primary focus:outline-none placeholder:text-muted-foreground/50"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold">Mật khẩu</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                    className="w-full rounded-xl border-2 border-input bg-background px-4 py-3 pr-11 text-sm font-medium transition-colors focus:border-primary focus:outline-none placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                  ⚠️ {error}
                </div>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full h-11 text-sm font-bold" disabled={loading || !username || !password}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {loading ? "Đang đăng nhập…" : "Đăng nhập"}
              </Button>

              {/* Forgot Password Link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode("forgot"); setError(""); }}
                  className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold">Địa chỉ Email</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="Nhập email của bạn"
                  autoFocus
                  required
                  className="w-full rounded-xl border-2 border-input bg-background px-4 py-3 text-sm font-medium transition-colors focus:border-primary focus:outline-none placeholder:text-muted-foreground/50"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                  ⚠️ {error}
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-sm font-bold" disabled={forgotLoading || !forgotEmail}>
                {forgotLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                {forgotLoading ? "Đang xử lý…" : "Gửi mật khẩu mới"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors hover:underline"
                >
                  Quay lại đăng nhập
                </button>
              </div>
            </form>
          )}


          {/* Hint */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Chưa có tài khoản? </span>
            <Link to="/register" className="font-bold text-primary hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
