import { useState } from "react";
import { Key, Eye, EyeOff, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveApiKey, getApiKey } from "@/lib/aiGenerator";
import { toast } from "sonner";

interface ApiKeySetupProps {
  onSaved?: () => void;
}

export default function ApiKeySetup({ onSaved }: ApiKeySetupProps) {
  const [key, setKey] = useState(getApiKey());
  const [show, setShow] = useState(false);

  const handleSave = () => {
    const trimmed = key.trim();
    if (!trimmed.startsWith("sk-ant-")) {
      toast.error("API key không hợp lệ. Key phải bắt đầu bằng sk-ant-");
      return;
    }
    saveApiKey(trimmed);
    toast.success("Đã lưu API key!");
    onSaved?.();
  };

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Key className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-sm">Anthropic API Key</h3>
        <a
          href="https://console.anthropic.com/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Lấy key <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        Cần có API key để tự động tạo Quiz & Flashcard bằng AI. Key được lưu trên trình duyệt của bạn.
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="w-full rounded-xl border-2 border-input bg-background px-4 py-2.5 pr-10 text-sm font-mono transition-colors focus:border-primary focus:outline-none"
          />
          <button
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button onClick={handleSave} size="sm" className="shrink-0">
          <CheckCircle2 className="mr-1.5 h-4 w-4" /> Lưu
        </Button>
      </div>
    </div>
  );
}
