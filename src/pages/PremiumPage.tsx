import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Crown, Check, Sparkles, Zap, Shield, Star, ArrowLeft,
  Clock, BookOpen, Gamepad2, Users, ChevronRight, BadgeCheck
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

interface Plan {
  id: string;
  name: string;
  durationDays: number;
  price: number;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

function formatPrice(price: number) {
  if (price === 0) return "Miễn phí";
  return price.toLocaleString("vi-VN") + " ₫";
}

function formatDuration(days: number, name: string) {
  if (days >= 1800) return "Vô thời hạn";
  if (days >= 365) return `${Math.round(days / 365)} năm`;
  if (days >= 30) return `${Math.round(days / 30)} tháng`;
  return `${days} ngày`;
}

const FEATURES = [
  { icon: BookOpen, label: "Truy cập toàn bộ nội dung học" },
  { icon: Gamepad2, label: "Chơi tất cả trò chơi học tập" },
  { icon: Sparkles, label: "Tạo flashcard & trắc nghiệm không giới hạn" },
  { icon: Zap, label: "Lịch học thông minh" },
  { icon: Shield, label: "Không có quảng cáo" },
  { icon: Users, label: "Hỗ trợ ưu tiên" },
];

export default function PremiumPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: () => apiFetch("/plans"),
  });

  // Filter only plans marked as Premium
  const paidPlans = plans.filter((p) => p.isPremium);
  // Find a "popular" plan — longest duration among non-unlimited
  const popularPlan = paidPlans.find((p) => {
    const sorted = [...paidPlans]
      .filter((x) => x.durationDays < 1800)
      .sort((a, b) => b.price - a.price);
    return sorted[0]?.id === p.id;
  });

  const handleUpgrade = (plan: Plan) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setSelectedPlan(plan);
    // Navigate to payment methods page
    navigate("/p/payment-methods");
  };

  const currentPlan = user?.plan || "Miễn phí";
  const isCurrentFree = currentPlan === "Miễn phí";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf4] via-white to-[#fefce8]">
      {/* Header */}
      <div className="container py-8 px-4">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="group mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Quay lại
          </button>

          {/* Hero */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
              <Crown className="h-4 w-4" />
              Nâng cấp Premium
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
              Mở khóa toàn bộ trải nghiệm{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2D9B63] to-[#1a7a4a]">
                Smart Learn
              </span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
              Học không giới hạn với tất cả tính năng cao cấp. Không quảng cáo, hỗ trợ ưu tiên, và nhiều hơn nữa.
            </p>

            {/* Current plan badge */}
            {user && (
              <div className="mt-4 inline-flex items-center gap-2 bg-white border border-border rounded-xl px-4 py-2 text-sm shadow-sm">
                <BadgeCheck className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Gói hiện tại của bạn:</span>
                <span className="font-bold text-primary">{currentPlan}</span>
              </div>
            )}
          </div>
        </div>



        {/* Plans */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
            <p>Đang tải gói cước...</p>
          </div>
        ) : paidPlans.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Crown className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-semibold">Chưa có gói cước nào được cấu hình</p>
            <p className="text-sm mt-1">Vui lòng liên hệ admin để biết thêm thông tin.</p>
          </div>
        ) : (
          <div className={`grid gap-6 max-w-5xl mx-auto ${paidPlans.length === 1 ? "grid-cols-1 max-w-sm" : paidPlans.length === 2 ? "sm:grid-cols-2 max-w-2xl" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
            {paidPlans.map((plan) => {
              const isPopular = plan.id === popularPlan?.id;
              const isUnlimited = plan.durationDays >= 1800;
              const isCurrent = currentPlan === plan.name;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl border-2 p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                    isPopular
                      ? "border-primary bg-gradient-to-br from-[#2D9B63] to-[#1a7a4a] text-white shadow-2xl shadow-primary/30 scale-[1.02]"
                      : "border-border bg-white shadow-sm hover:shadow-lg hover:border-primary/30"
                  }`}
                >
                  {/* Popular badge */}
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full shadow-md">
                        <Star className="h-3 w-3 fill-current" />
                        Phổ biến nhất
                      </span>
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="mb-6">
                    <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold mb-3 ${
                      isPopular ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                    }`}>
                      {isUnlimited ? <Crown className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                      {formatDuration(plan.durationDays, plan.name)}
                    </div>

                    <h2 className={`text-2xl font-bold font-heading ${isPopular ? "text-white" : "text-gray-900"}`}>
                      {plan.name}
                    </h2>

                    {plan.description && (
                      <p className={`mt-1 text-sm ${isPopular ? "text-white/80" : "text-muted-foreground"}`}>
                        {plan.description}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className={`text-4xl font-black ${isPopular ? "text-white" : "text-gray-900"}`}>
                      {formatPrice(plan.price)}
                    </div>
                    <div className={`text-sm mt-1 ${isPopular ? "text-white/70" : "text-muted-foreground"}`}>
                      {plan.durationDays >= 1800 ? "Một lần duy nhất" :
                       `/${formatDuration(plan.durationDays, plan.name)}`}
                    </div>
                  </div>

                  {/* Features included */}
                  <div className="space-y-2.5 mb-8 flex-1">
                    {FEATURES.slice(0, 4).map(({ label }) => (
                      <div key={label} className="flex items-start gap-2.5">
                        <div className={`shrink-0 h-5 w-5 rounded-full flex items-center justify-center mt-0.5 ${
                          isPopular ? "bg-white/20" : "bg-primary/10"
                        }`}>
                          <Check className={`h-3 w-3 ${isPopular ? "text-white" : "text-primary"}`} />
                        </div>
                        <span className={`text-sm ${isPopular ? "text-white/90" : "text-gray-600"}`}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  {isCurrent ? (
                    <div className={`w-full rounded-2xl py-3 text-center text-sm font-bold ${
                      isPopular ? "bg-white/20 text-white border border-white/30" : "bg-muted text-muted-foreground"
                    }`}>
                      <BadgeCheck className="h-4 w-4 inline mr-1.5" />
                      Gói hiện tại
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan)}
                      className={`w-full rounded-2xl py-3 text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                        isPopular
                          ? "bg-white text-primary hover:bg-amber-50 shadow-lg"
                          : "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                      }`}
                    >
                      Nâng cấp ngay
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Free plan note */}
        {isCurrentFree && (
          <p className="text-center text-sm text-muted-foreground mt-8">
            Bạn đang dùng gói <strong>Miễn phí</strong>.{" "}
            Nâng cấp để trải nghiệm đầy đủ tính năng.
          </p>
        )}

        {/* FAQ / Guarantee */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="rounded-3xl border border-border bg-white p-8 shadow-sm space-y-4">
            <h3 className="font-heading text-xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Cam kết của chúng tôi
            </h3>
            <ul className="space-y-3">
              {[
                "Thanh toán an toàn qua SePay",
                "Kích hoạt ngay sau khi thanh toán thành công",
                "Hỗ trợ qua email & Zalo trong 24h",
                "Hoàn tiền trong 7 ngày nếu có lỗi kỹ thuật",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground pt-2 border-t border-border">
              Cần hỗ trợ?{" "}
              <Link to="/contact" className="text-primary font-semibold hover:underline">
                Liên hệ chúng tôi
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="pb-16" />
      </div>
    </div>
  );
}
