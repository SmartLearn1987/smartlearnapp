import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { 
  BarChart3, 
  Search, 
  RefreshCcw,
  User as UserIcon,
  Crown,
  Calendar,
  Clock,
  BookOpen,
  Layers,
  ClipboardList,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { Input } from "@/components/ui/input";

interface UserStatistic {
  id: string;
  username: string;
  displayName: string;
  plan: string;
  planEndDate: string | null;
  lastLogin: string | null;
  lessonCount: number;
  flashcardCount: number;
  quizCount: number;
}

export default function StatisticsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const [sortConfig, setSortConfig] = useState<{ key: keyof UserStatistic | '', direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });

  const { data: users, isLoading, refetch, isRefetching } = useQuery<UserStatistic[]>({
    queryKey: ["statistics", "users"],
    queryFn: () => apiFetch("/statistics/users"),
  });

  const { data: monthlySummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["statistics", "monthly-summary"],
    queryFn: () => apiFetch("/statistics/monthly-summary"),
  });

  const filteredUsers = (users || []).filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.displayName && u.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSort = (key: keyof UserStatistic) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const valA = a[sortConfig.key];
    const valB = b[sortConfig.key];

    if (valA === null || valA === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
    if (valB === null || valB === undefined) return sortConfig.direction === 'asc' ? -1 : 1;

    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const renderSortIcon = (key: keyof UserStatistic) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 opacity-20 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 ml-1 text-primary" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 ml-1 text-primary" />
    );
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case "Miễn phí":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "Cơ bản":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Nâng cao":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="container py-8 max-w-[1400px] animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/50 p-6 sm:p-8 rounded-[40px] border border-white/60 shadow-sm backdrop-blur-sm mb-8 mt-4">
        <div className="flex items-start gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/20">
            <BarChart3 className="h-7 w-7" />
          </div>
          <div className="space-y-1 text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#112240]">Thống kê hệ thống</h1>
            <p className="text-sm text-muted-foreground font-medium">
              Theo dõi tình hình hoạt động và đóng góp của người dùng
            </p>
          </div>
        </div>
      </div>

      {/* Monthly Summary Statistics */}
      {!summaryLoading && monthlySummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 animate-fade-in">
          {/* Current Month */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
               <BarChart3 className="w-32 h-32" />
             </div>
             <div className="flex items-center gap-3 mb-6 relative z-10">
               <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-xl border border-emerald-200">
                 <Calendar className="h-5 w-5" />
               </div>
               <h3 className="text-lg font-black text-[#112240] tracking-tight">Thống kê tháng {format(new Date(), "MM/yyyy")}</h3>
             </div>
             <div className="space-y-3 relative z-10">
               <div className="flex justify-between items-center bg-slate-50/80 hover:bg-emerald-50 transition-colors p-3.5 rounded-xl border border-slate-100">
                 <span className="text-sm font-bold text-slate-600">Số user đăng ký mới</span>
                 <span className="text-lg font-black text-emerald-600">+{monthlySummary.currentMonth.newUsers}</span>
               </div>
               <div className="flex justify-between items-center bg-slate-50/80 hover:bg-blue-50 transition-colors p-3.5 rounded-xl border border-slate-100">
                 <span className="text-sm font-bold text-slate-600">Số user đăng nhập</span>
                 <span className="text-lg font-black text-blue-600">{monthlySummary.currentMonth.loginUsers}</span>
               </div>
               <div className="flex justify-between items-center bg-slate-50/80 hover:bg-red-50 transition-colors p-3.5 rounded-xl border border-slate-100">
                 <span className="text-sm font-bold text-slate-600">Số user xóa tài khoản</span>
                 <span className="text-lg font-black text-red-500">{monthlySummary.currentMonth.deletedUsers}</span>
               </div>
             </div>
          </div>

          {/* Previous Month */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm relative overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
             <div className="absolute top-0 right-0 p-4 opacity-5">
               <BarChart3 className="w-32 h-32" />
             </div>
             <div className="flex items-center gap-3 mb-6 relative z-10">
               <div className="bg-slate-100 text-slate-600 p-2.5 rounded-xl border border-slate-200">
                 <Calendar className="h-5 w-5" />
               </div>
               <h3 className="text-lg font-black text-[#112240] tracking-tight">Thống kê tháng {format(new Date(new Date().setMonth(new Date().getMonth() - 1)), "MM/yyyy")}</h3>
             </div>
             <div className="space-y-3 relative z-10">
               <div className="flex justify-between items-center bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                 <span className="text-sm font-bold text-slate-600">Số user đăng ký mới</span>
                 <span className="text-lg font-black text-slate-700">+{monthlySummary.previousMonth.newUsers}</span>
               </div>
               <div className="flex justify-between items-center bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                 <span className="text-sm font-bold text-slate-600">Số user đăng nhập</span>
                 <span className="text-lg font-black text-slate-700">{monthlySummary.previousMonth.loginUsers}</span>
               </div>
               <div className="flex justify-between items-center bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                 <span className="text-sm font-bold text-slate-600">Số user xóa tài khoản</span>
                 <span className="text-lg font-black text-slate-700">{monthlySummary.previousMonth.deletedUsers}</span>
               </div>
             </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Tìm kiếm người dùng..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white border-white/60 shadow-sm rounded-xl"
          />
        </div>
        <button 
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border shadow-sm hover:bg-slate-50 transition-colors"
        >
          <RefreshCcw className={`h-4 w-4 ${isRefetching ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
          <span className="text-sm font-semibold">Làm mới</span>
        </button>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-700 cursor-pointer group hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('username')}>
                  <div className="flex items-center">
                    Người dùng {renderSortIcon('username')}
                  </div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-700 cursor-pointer group hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('plan')}>
                  <div className="flex items-center">
                    Gói cước {renderSortIcon('plan')}
                  </div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-700 cursor-pointer group hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('planEndDate')}>
                  <div className="flex items-center">
                    Ngày hết hạn {renderSortIcon('planEndDate')}
                  </div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-700 cursor-pointer group hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('lastLogin')}>
                  <div className="flex items-center">
                    Hoạt động {renderSortIcon('lastLogin')}
                  </div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-700 text-center cursor-pointer group hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('lessonCount')}>
                  <div className="flex items-center justify-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-emerald-600" />
                    <span>Bài học</span>
                    {renderSortIcon('lessonCount')}
                  </div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-700 text-center cursor-pointer group hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('flashcardCount')}>
                  <div className="flex items-center justify-center gap-1.5">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <span>Flashcard</span>
                    {renderSortIcon('flashcardCount')}
                  </div>
                </th>
                <th className="px-6 py-4 font-bold text-slate-700 text-center cursor-pointer group hover:bg-slate-100 transition-colors select-none" onClick={() => handleSort('quizCount')}>
                  <div className="flex items-center justify-center gap-1.5">
                    <ClipboardList className="h-4 w-4 text-purple-600" />
                    <span>Trắc nghiệm</span>
                    {renderSortIcon('quizCount')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCcw className="h-5 w-5 animate-spin" />
                      Đang tải dữ liệu...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    Không tìm thấy người dùng nào.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((u) => {
                  const isExpired = u.planEndDate && new Date(u.planEndDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
                  return (
                    <tr key={u.id} className={`transition-colors ${isExpired ? 'bg-slate-100 hover:bg-slate-200/50' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                          {(u.displayName || u.username || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{u.displayName || u.username}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <UserIcon className="h-3 w-3" /> @{u.username}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getPlanBadgeColor(u.plan || "Miễn phí")}`}>
                        <Crown className="h-3.5 w-3.5" />
                        {u.plan || "Miễn phí"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.planEndDate ? (
                        <div className="text-sm flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-slate-700">{format(new Date(u.planEndDate), "dd/MM/yyyy")}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {u.lastLogin ? (
                          <span className="font-medium text-slate-700" title={format(new Date(u.lastLogin), "dd/MM/yyyy HH:mm")}>
                            {formatDistanceToNow(new Date(u.lastLogin), { addSuffix: true, locale: vi })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Chưa đăng nhập</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-base text-emerald-600">{u.lessonCount}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-base text-blue-600">{u.flashcardCount}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-base text-purple-600">{u.quizCount}</span>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
