
// fileParser.ts - Sử dụng CDN để tránh lỗi bundling với pdfjs-dist
// Giải pháp này hoàn toàn tách biệt pdf.js khỏi bundle chính của ứng dụng.

async function loadPdfJsFromCDN(): Promise<any> {
  if ((window as any).pdfjsLib) {
    return (window as any).pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    // Sử dụng phiên bản ổn định từ cdnjs
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
    script.type = "module";
    script.onload = () => {
      // Với type="module", chúng ta cần import nó hoặc đợi nó đăng ký vào window
      // Tuy nhiên, pdf.js mjs không tự đăng ký vào window. 
      // Cách tốt nhất là dùng dynamic import với URL CDN.
      import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs")
        .then(module => {
          (window as any).pdfjsLib = module;
          resolve(module);
        })
        .catch(reject);
    };
    script.onerror = () => reject(new Error("Không thể tải PDF.js từ CDN"));
    document.head.appendChild(script);
  });
}

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Load library từ CDN thay vì bundle
    const pdfjsLib = await import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs");
    
    // Cấu hình worker từ CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item: any) => (item as any).str)
        .join(" ");
      pages.push(text);
    }

    return pages.join("\n\n");
  } catch (error) {
    console.error("PDF Parsing error:", error);
    throw new Error("Lỗi khi xử lý file PDF. Hãy đảm bảo file không bị khóa mật khẩu.");
  }
}

export async function extractTextFromDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

export async function parseUploadedFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return extractTextFromPDF(file);
  } else if (ext === "docx" || ext === "doc") {
    return extractTextFromDocx(file);
  } else if (ext === "txt") {
    return file.text();
  }

  throw new Error(`Định dạng file không hỗ trợ: .${ext}. Hãy upload file PDF, DOCX hoặc TXT.`);
}
