import { useState } from "react";
import { User, Mail, Phone, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: ""
  });
  const [loading, setLoading] = useState(false);
  const [captchaChecked, setCaptchaChecked] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Vui lòng điền đầy đủ các thông tin bắt buộc (*)");
      return;
    }
    
    if (!captchaChecked) {
      toast.error("Vui lòng xác minh bạn không phải là người máy.");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/contact", {
        method: "POST",
        body: JSON.stringify(formData)
      });
      
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: ""
      });
      setCaptchaChecked(false);
      toast.success("Cảm ơn bạn nhé! Ý kiến của bạn là động lực rất lớn để Smart Learn cải thiện mỗi ngày. Chúc bạn có những giờ phút học tập thật vui vẻ!", {
        duration: 6000,
      });
    } catch (err: any) {
      toast.error(err.message || "Có lỗi xảy ra khi gửi thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 animate-fade-in">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight font-heading">
            Liên hệ với chúng tôi
          </h1>
          <div className="h-1.5 w-20 bg-emerald-500 rounded-full" />
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-8 sm:p-12 overflow-hidden relative">
          {/* Subtle background element */}
          <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50" />
          
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Họ và tên <span className="text-red-500">*</span></label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Nhập họ và tên của bạn"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50/30 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Email <span className="text-red-500">*</span></label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50/30 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Số điện thoại <span className="text-red-500">*</span></label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="tel"
                  placeholder="Nhập số điện thoại"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50/30 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 ml-1">Thông điệp</label>
              <textarea
                placeholder="Để lại thông điệp của bạn"
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                className="w-full p-6 rounded-[2rem] border-2 border-slate-100 bg-slate-50/30 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400 resize-none min-h-[160px]"
              />
            </div>

            {/* CAPTCHA Mockup */}
            <div className="pt-2">
              <div 
                onClick={() => setCaptchaChecked(!captchaChecked)}
                className={`bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between max-w-[300px] shadow-sm cursor-pointer transition-all ${captchaChecked ? 'bg-emerald-50/50 border-emerald-100 shadow-inner' : 'hover:bg-slate-100'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-6 w-6 border-2 rounded flex items-center justify-center transition-all ${captchaChecked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'}`}>
                    {captchaChecked && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </div>
                  <span className="text-[12px] font-medium text-slate-600">Tôi không phải là người máy</span>
                </div>
                <div className="flex flex-col items-center">
                  <img src="https://www.gstatic.com/recaptcha/api2/logo_48.png" alt="reCAPTCHA" className={`h-6 w-6 transition-all ${captchaChecked ? 'grayscale-0' : 'grayscale'}`} />
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">reCAPTCHA</span>
                  <div className="flex gap-1 text-[7px] text-slate-400">
                    <span className="hover:underline">Bảo mật</span>
                    <span className="hover:underline">Điều khoản</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <Button 
                type="submit" 
                disabled={loading || !captchaChecked}
                className={`w-full sm:w-auto h-14 px-12 rounded-full font-black text-lg text-white tracking-wider
                  transform transition-all duration-300
                  ${loading || !captchaChecked 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-emerald-500/20'}`}
              >
                {loading ? "Đang gửi..." : "Gửi đi"}
                {!loading && <Send className="ml-2 h-5 w-5" />}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
