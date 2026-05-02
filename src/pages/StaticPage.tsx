import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export default function StaticPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<{ title: string; content: string; updated_at?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPage = async () => {
      setLoading(true);
      try {
        const result = await apiFetch<any>(`/system-pages/${slug}`);
        if (slug === "payment-methods" && result.title === "Hình thức thanh toán") {
          result.title = "Hướng dẫn thanh toán";
        }
        setData(result);
      } catch (err) {
        console.error("Error fetching static page:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
    window.scrollTo(0, 0);
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || !data.title) {
    return (
      <div className="container max-w-2xl py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Trang không tồn tại</h1>
        <p className="text-muted-foreground mb-8">Nội dung bạn đang tìm kiếm không có sẵn hoặc đã được di chuyển.</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container px-4 md:px-0">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-8 font-medium text-muted-foreground hover:text-foreground rounded-xl"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
        </Button>

        <article className="bg-card rounded-[32px] border border-border p-8 md:p-12 shadow-sm opacity-0 animate-fade-up">
          <header className="mb-10 text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-heading text-foreground mb-4 leading-tight">
              {data.title}
            </h1>
            {data.updated_at && (
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                <Clock className="h-4 w-4" />
                Cập nhật lần cuối: {new Date(data.updated_at).toLocaleDateString("vi-VN")}
              </p>
            )}
          </header>

          <div 
            className="prose prose-slate max-w-none dark:prose-invert 
              prose-headings:font-heading prose-headings:font-bold prose-headings:text-foreground
              prose-p:text-slate-600 dark:prose-p:text-slate-400
              prose-li:text-slate-600 dark:prose-li:text-slate-400
              prose-strong:text-foreground
              prose-img:rounded-3xl prose-img:border prose-img:border-border"
          >
            <div dangerouslySetInnerHTML={{ 
              __html: data.content.includes('<') && data.content.includes('>') 
                ? data.content 
                : data.content.replace(/\n/g, '<br/>') 
            }} />
          </div>
        </article>

        <div className="mt-12 text-center text-sm text-muted-foreground opacity-60">
          © {new Date().getFullYear()} Smart Learn. All rights reserved.
        </div>
      </div>
    </div>
  );
}
