import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, Home, GraduationCap, Users, LogOut, ChevronDown, ShieldCheck, Layers, Library, ClipboardList, User as UserIcon, Gamepad2, CalendarClock, FileText, BarChart3 } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isTeacher, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mgmtOpen, setMgmtOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mgmtRef = useRef<HTMLDivElement>(null);
  const isPlayPage = location.pathname.includes("/play");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (mgmtRef.current && !mgmtRef.current.contains(e.target as Node)) setMgmtOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success("Đã đăng xuất");
    navigate("/login");
  };

  const navItems = [
    { path: "/",          label: "Trang chủ", icon: Home,            show: true },
    { path: "/subjects",  label: "Sổ tay môn học",   icon: BookOpen,        show: true, subPaths: ["/courses", "/lessons"] },
    { path: "/schedule", label: "Thời gian biểu", icon: CalendarClock,    show: true },
    { path: "/quizlet",   label: "Flashcard", icon: Layers,          show: true },
    { path: "/quizzes",   label: "Trắc nghiệm", icon: ClipboardList, show: true },
  ].filter((item) => item.show);

  const mgmtItems = [
    { path: "/games",     label: "Quản lý Game",     icon: Gamepad2,      show: isAdmin },
    { path: "/teacher",   label: "Màn hình Giáo viên", icon: GraduationCap,  show: isAdmin || isTeacher },
    { path: "/admin/content", label: "Quản lý nội dung", icon: FileText, show: isAdmin },
    { path: "/admin/statistics", label: "Thống kê", icon: BarChart3, show: isAdmin },
  ].filter((item) => item.show);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-heading text-xl font-bold">
          <Library className="h-6 w-6 text-[#C08447]" />
          <span className="hidden md:inline text-[#2D9B63]">Smart Learn</span>
        </Link>

        <nav className="flex-1 min-w-0 flex items-center justify-center gap-1 overflow-x-auto no-scrollbar scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mx-2">
          {navItems.map((item: any) => {
            const active = item.path === "/" 
              ? (location.pathname === "/" || isPlayPage)
              : location.pathname.startsWith(item.path) || (item.subPaths?.some((sp: string) => location.pathname.startsWith(sp)));
            return (
              <Link key={item.path} to={item.path}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}>
                <item.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}

        </nav>

        <div className="flex items-center gap-1">
          {(isAdmin || isTeacher) && (
            <div ref={mgmtRef} className="relative group">
              <button onClick={() => setMgmtOpen(!mgmtOpen)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 sm:px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  (mgmtOpen || location.pathname.startsWith("/games") || location.pathname.startsWith("/teacher") || location.pathname.startsWith("/admin")) && !isPlayPage
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}>
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden lg:inline">Trang quản lý</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${mgmtOpen ? "rotate-180" : ""}`} />
              </button>

              {mgmtOpen && (
                <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-2 w-52 rounded-2xl bg-card border border-border shadow-2xl py-2 z-[100] animate-in fade-in zoom-in duration-200">
                  {mgmtItems.map((item) => (
                    <Link key={item.path} to={item.path} onClick={() => setMgmtOpen(false)}
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors ${
                        location.pathname.startsWith(item.path) ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      }`}>
                      <item.icon className="h-4 w-4" /> {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <div ref={menuRef} className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.displayName} className="h-7 w-7 rounded-lg object-cover" />
              ) : (
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${isAdmin ? "bg-primary/15 text-primary" : isTeacher ? "bg-sky-500/15 text-sky-600" : "bg-muted-foreground/15 text-muted-foreground"}`}>
                  {(user.displayName || user.username || "?").charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden lg:inline max-w-[100px] truncate">{user.displayName || user.username}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl bg-card border border-border shadow-xl py-2 z-50 animate-in fade-in zoom-in duration-200">
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-semibold text-sm">{user.displayName || user.username}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">@{user.username}</p>
                  {isAdmin && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      <ShieldCheck className="h-3 w-3" /> Admin
                    </span>
                  )}
                  {isTeacher && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-sky-500/10 px-2 py-0.5 text-xs font-bold text-sky-600">
                      <BookOpen className="h-3 w-3" /> Teacher
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
                    <Users className="h-4 w-4 text-primary" /> Quản lý tài khoản
                  </Link>
                )}
                <button 
                  onClick={() => { setMenuOpen(false); navigate("/profile"); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors text-left"
                >
                  <UserIcon className="h-4 w-4" /> Thông tin cá nhân
                </button>
                <button onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/5 transition-colors text-left">
                  <LogOut className="h-4 w-4" /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
