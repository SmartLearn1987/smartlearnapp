import { useEffect, useState } from "react";
import { 
  Plus, Trash2, Edit2, Loader2, Save, Package, 
  ArrowLeft, X, CreditCard, Clock, Info, CheckCircle2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

interface SubscriptionPlan {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  isPremium: boolean;
}

export default function PlanManagePage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [durationDays, setDurationDays] = useState(30);
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>({ key: "sortOrder", direction: "asc" });

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<SubscriptionPlan[]>("/admin/plans");
      setPlans(data);
    } catch (err: any) {
      toast.error("Không thể tải danh sách gói cước.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig?.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedPlans = [...plans].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    
    let valA: any = a[key as keyof SubscriptionPlan];
    let valB: any = b[key as keyof SubscriptionPlan];

    if (typeof valA === "string" && typeof valB === "string") {
       valA = valA.toLowerCase();
       valB = valB.toLowerCase();
    }
    
    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });

  const renderSortableHeader = (label: string, key: string) => (
    <th 
      className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] cursor-pointer hover:bg-slate-100/50 transition-colors"
      onClick={() => handleSort(key)}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortConfig?.key === key ? (
          sortConfig.direction === "asc" ? <ArrowUp className="h-3 w-3 text-emerald-600" /> : <ArrowDown className="h-3 w-3 text-emerald-600" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </th>
  );

  const openFormForAdd = () => {
    setEditId(null);
    setName("");
    setDurationDays(30);
    setPrice(0);
    setDescription("");
    setIsActive(true);
    setIsPremium(false);
    setSortOrder(plans.length > 0 ? Math.max(...plans.map(p => p.sortOrder)) + 1 : 0);
    setIsFormOpen(true);
  };

  const openFormForEdit = (p: SubscriptionPlan) => {
    setEditId(p.id);
    setName(p.name);
    setDurationDays(p.durationDays);
    setPrice(p.price);
    setDescription(p.description || "");
    setIsActive(p.isActive);
    setIsPremium(p.isPremium ?? false);
    setSortOrder(p.sortOrder);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Vui lòng nhập tên gói cước");
    if (durationDays <= 0) return toast.error("Thời hạn phải lớn hơn 0");
    
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        durationDays,
        price,
        description: description.trim() || null,
        isActive,
        isPremium,
        sortOrder
      };

      if (editId) {
        await apiFetch(`/plans/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        toast.success("Cập nhật gói cước thành công");
      } else {
        await apiFetch("/plans", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast.success("Thêm gói cước mới thành công");
      }
      setIsFormOpen(false);
      fetchPlans();
    } catch (err: any) {
      toast.error("Lỗi khi lưu: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa gói cước này?")) return;
    try {
      await apiFetch(`/plans/${id}`, { method: "DELETE" });
      toast.success("Đã xóa gói cước");
      fetchPlans();
    } catch (err: any) {
      toast.error("Lỗi khi xóa gói cước");
    }
  };

  const formatPrice = (p: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in pb-20 px-4">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center justify-center h-12 w-12 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all border border-border group"
        >
          <ArrowLeft className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-600">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight">Quản lý gói cước</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Thiết lập danh sách và giá các gói dịch vụ</p>
            </div>
          </div>
        </div>
        <Button onClick={openFormForAdd} className="h-12 px-6 rounded-xl font-bold gap-2 shadow-lg shadow-emerald-200 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-5 w-5" /> Thêm gói cước
        </Button>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50 border-b border-border">
                <tr>
                  {renderSortableHeader("STT", "sortOrder")}
                  {renderSortableHeader("Tên gói", "name")}
                  {renderSortableHeader("Thời hạn (Ngày)", "durationDays")}
                  {renderSortableHeader("Giá tiền", "price")}
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <div className="flex items-center gap-1">
                      <Crown className="h-3 w-3 text-yellow-500" />
                      Premium
                    </div>
                  </th>
                  <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Trạng thái</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase tracking-wider text-[10px] w-28">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedPlans.length > 0 ? sortedPlans.map((p) => (
                  <tr key={p.id} className={`hover:bg-slate-50/50 transition-colors group ${!p.isActive ? "bg-slate-50/30 opacity-60" : ""}`}>
                    <td className="px-6 py-4 font-mono text-xs text-slate-400">#{p.sortOrder}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 leading-snug">{p.name}</p>
                      {p.description && <p className="text-[10px] text-muted-foreground mt-0.5 italic line-clamp-1">{p.description}</p>}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 opacity-40" />
                        {p.durationDays} ngày
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                        {p.price === 0 ? "Miễn phí" : formatPrice(p.price)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.isPremium ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                          <Crown className="h-3 w-3" /> Premium
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-medium">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <AlertCircle className="h-3 w-3" /> Đã ẩn
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openFormForEdit(p)}
                          className="p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="p-2 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-20 text-center text-muted-foreground italic font-medium">
                        Chưa có gói cước nào được tạo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-[3rem] shadow-2xl animate-scale-in flex flex-col max-h-full">
            {/* Modal Header */}
            <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{editId ? "Cập nhật gói cước" : "Tạo gói cước mới"}</h2>
                  <p className="text-sm text-muted-foreground">Thiết lập các thông số cơ bản cho gói dịch vụ</p>
                </div>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Tên gói cước</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                  <input 
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Gói cao cấp 1 năm"
                    className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/5 outline-none transition-all font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Duration */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Thời hạn (Ngày)</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                    <input 
                      type="number"
                      value={durationDays}
                      onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
                      className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/5 outline-none transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Giá tiền (VND)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-300">₫</span>
                    <input 
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
                      className="w-full h-14 pl-10 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/5 outline-none transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Mô tả tóm tắt</label>
                <div className="relative">
                  <Info className="absolute left-4 top-4 h-5 w-5 text-slate-300" />
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Giới thiệu ngắn về gói cước này..."
                    className="w-full min-h-[100px] pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/5 outline-none transition-all font-medium text-slate-600 text-sm"
                  />
                </div>
              </div>

              {/* Order & Status */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Thứ tự hiển thị</label>
                  <input 
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                    className="w-full h-12 px-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-400 outline-none transition-all font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Trạng thái</label>
                  <div className="flex items-center gap-6 h-12 px-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={isActive} 
                        onChange={(e) => setIsActive(e.target.checked)}
                        className="h-5 w-5 rounded-lg border-2 border-slate-200 text-emerald-600 focus:ring-emerald-500 transition-all"
                      />
                      <span className="text-sm font-bold text-slate-600 group-hover:text-emerald-600 transition-colors">Đang hoạt động</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Premium toggle */}
              <div className="pt-2">
                <label
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    isPremium
                      ? "border-amber-400 bg-amber-50"
                      : "border-slate-100 bg-slate-50/50 hover:border-amber-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isPremium}
                    onChange={(e) => setIsPremium(e.target.checked)}
                    className="h-5 w-5 rounded-lg border-2 border-amber-300 text-amber-500 focus:ring-amber-400 transition-all"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isPremium ? "bg-amber-400/20" : "bg-slate-200/50"}`}>
                      <Crown className={`h-5 w-5 ${isPremium ? "text-amber-500" : "text-slate-400"}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-black ${isPremium ? "text-amber-700" : "text-slate-600"}`}>Gói Premium</p>
                      <p className="text-xs text-muted-foreground">Hiển thị trên trang Nâng cấp Premium</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 border-t border-slate-50 flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="flex-1 h-14 rounded-2xl font-black text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                onClick={() => setIsFormOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button 
                className="flex-[2] h-14 rounded-2xl font-black text-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200"
                disabled={saving || !name.trim()}
                onClick={handleSave}
              >
                {saving ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Save className="h-6 w-6 mr-2" />}
                {editId ? "Lưu thay đổi" : "Tạo gói cước"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
