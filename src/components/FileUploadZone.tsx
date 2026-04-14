import { useState, useCallback } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadZoneProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  acceptedTypes?: string;
}

export default function FileUploadZone({ onFileSelected, isLoading, acceptedTypes = ".pdf,.docx,.doc,.txt" }: FileUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelected(file);
    }
  }, [onFileSelected]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelected(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (selectedFile && !isLoading) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border-2 border-primary/20 bg-primary/5 p-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{selectedFile.name}</p>
          <p className="text-sm text-muted-foreground">{formatSize(selectedFile.size)}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={clearFile}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <label
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-10 transition-all duration-200 ${
        dragActive
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-border hover:border-primary/40 hover:bg-muted/50"
      } ${isLoading ? "pointer-events-none opacity-60" : ""}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="font-semibold">Đang đọc tài liệu...</p>
        </>
      ) : (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold">Kéo thả file vào đây</p>
            <p className="mt-1 text-sm text-muted-foreground">hoặc nhấn để chọn file (PDF, DOCX, TXT)</p>
          </div>
        </>
      )}
      <input
        type="file"
        accept={acceptedTypes}
        onChange={handleChange}
        className="hidden"
        disabled={isLoading}
      />
    </label>
  );
}
