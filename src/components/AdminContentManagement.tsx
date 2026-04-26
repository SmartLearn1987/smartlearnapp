import { useState, useEffect } from "react";
import { FileText, Save, Loader2, Eye, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

const PAGES = [
  { slug: "payment-methods", title: "Hướng dẫn thanh toán" },
  { slug: "privacy-policy", title: "Chính sách bảo mật" },
  { slug: "about-us", title: "Giới thiệu về chúng tôi" },
  { slug: "faq", title: "Các câu hỏi thường gặp" },
];

export default function AdminContentManagement() {
  const [selectedSlug, setSelectedSlug] = useState(PAGES[0].slug);
  const [title, setTitle] = useState(PAGES[0].title);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchPage();
  }, [selectedSlug]);

  const fetchPage = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>(`/system-pages/${selectedSlug}`);
      let fetchedTitle = data.title || PAGES.find(p => p.slug === selectedSlug)?.title || "";
      if (selectedSlug === "payment-methods" && fetchedTitle === "Hình thức thanh toán") {
        fetchedTitle = "Hướng dẫn thanh toán";
      }
      setTitle(fetchedTitle);
      setContent(data.content || "");
    } catch (err) {
      toast.error("Không thể tải nội dung trang");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Vui lòng nhập tiêu đề");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/system-pages", {
        method: "POST",
        body: JSON.stringify({ slug: selectedSlug, title, content }),
      });
      toast.success("Đã lưu nội dung thành công");
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi lưu nội dung");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 opacity-0 animate-fade-up">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Quản lý nội dung trang
          </h2>
          <p className="text-sm text-muted-foreground">Thiết lập thông tin pháp lý và giới thiệu cho hệ thống</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPreviewMode(!previewMode)}
            className="rounded-xl"
          >
            {previewMode ? <Edit2 className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {previewMode ? "Chế độ sửa" : "Xem trước"}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="rounded-xl shadow-lg shadow-primary/20"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Lưu thay đổi
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Chọn trang */}
        <div className="md:col-span-1 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">Danh sách trang</label>
          {PAGES.map((page) => (
            <button
              key={page.slug}
              onClick={() => setSelectedSlug(page.slug)}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                selectedSlug === page.slug 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "bg-card hover:bg-muted border border-border"
              }`}
            >
              {page.title}
            </button>
          ))}
        </div>

        {/* Nội dung soạn thảo */}
        <div className="md:col-span-3">
          <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-muted/30">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tiêu đề trang"
                className="w-full bg-transparent border-none text-lg font-bold focus:ring-0 focus:outline-none"
              />
            </div>
            
            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p>đang tải nội dung...</p>
                </div>
              ) : previewMode ? (
                <div className="prose prose-sm max-w-none dark:prose-invert min-h-[400px] isolate">
                  <div dangerouslySetInnerHTML={{ 
                    __html: content.includes('<') && content.includes('>') 
                      ? content 
                      : content.replace(/\n/g, '<br/>') 
                  }} />
                </div>
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập nội dung trang tại đây (Hỗ trợ định dạng HTML cơ bản)..."
                  className="w-full min-h-[400px] bg-transparent border-none resize-none focus:ring-0 focus:outline-none font-mono text-sm leading-relaxed"
                />
              )}
            </div>
            
            {!previewMode && (
              <div className="px-6 py-3 bg-muted/20 border-t border-border flex justify-between items-center text-[10px] text-muted-foreground">
                <span>Gợi ý: Bạn có thể sử dụng các thẻ HTML như &lt;b&gt;, &lt;i&gt;, &lt;h3&gt;, &lt;ul&gt; &lt;li&gt; để trình bày đẹp hơn.</span>
                <span>ID: {selectedSlug}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
