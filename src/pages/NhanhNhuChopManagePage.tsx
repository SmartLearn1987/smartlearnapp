import { useEffect, useState } from "react";
import { 
  Plus, Trash2, Edit2, Loader2, Save, FileQuestion, 
  Upload, ArrowLeft, Download, Circle, X, HelpCircle,
  LayoutGrid, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface NCQuestion {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  level: string;
  level: string;
  created_at: string;
}

interface PaginatedResponse {
  questions: NCQuestion[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

const LEVELS = [
  { value: "easy", label: "Dễ", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "medium", label: "Trung bình", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "hard", label: "Khó", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "extreme", label: "Cực khó", color: "bg-red-100 text-red-700 border-red-200" },
];

export default function NhanhNhuChopManagePage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<NCQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<string[]>(["Lựa chọn 1", "Lựa chọn 2"]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState("");
  const [level, setLevel] = useState("medium");
  
  const [importing, setImporting] = useState(false);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page: currentPage.toString(),
        limit: "30",
        searchTerm: searchTerm,
        level: selectedLevel || ""
      });
      const data = await apiFetch<PaginatedResponse>(`/nhanhnhuchop/questions?${query.toString()}`);
      setQuestions(data.questions);
      setTotalPages(data.totalPages);
      setTotalCount(data.total);
    } catch (err: any) {
      toast.error("Không thể tải danh sách câu hỏi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [currentPage, selectedLevel]);

  // Handle search with a small delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) setCurrentPage(1);
      else fetchQuestions();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when level changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLevel]);

  const openFormForAdd = () => {
    setEditId(null);
    setQuestionText("");
    setOptions(["Lựa chọn 1", "Lựa chọn 2"]);
    setCorrectIndex(0);
    setExplanation("");
    setLevel("medium");
    setIsFormOpen(true);
  };

  const openFormForEdit = (q: NCQuestion) => {
    setEditId(q.id);
    setQuestionText(q.question);
    setOptions(q.options);
    setCorrectIndex(q.correct_index);
    setExplanation(q.explanation || "");
    setLevel(q.level);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!questionText.trim()) return toast.error("Vui lòng nhập câu hỏi");
    if (options.some(opt => !opt.trim())) return toast.error("Vui lòng nhập đầy đủ các lựa chọn");
    
    setSaving(true);
    try {
      const payload = {
        question: questionText.trim(),
        options: options.map(opt => opt.trim()),
        correct_index: correctIndex,
        explanation: explanation.trim() || null,
        level
      };

      if (editId) {
        await apiFetch(`/nhanhnhuchop/questions/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        toast.success("Cập nhật câu hỏi thành công");
      } else {
        await apiFetch("/nhanhnhuchop/questions", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        toast.success("Thêm câu hỏi mới thành công");
      }
      setIsFormOpen(false);
      fetchQuestions();
    } catch (err: any) {
      toast.error("Lỗi khi lưu: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) return;
    try {
      await apiFetch(`/nhanhnhuchop/questions/${id}`, { method: "DELETE" });
      toast.success("Đã xóa câu hỏi");
      fetchQuestions();
    } catch (err: any) {
      toast.error("Lỗi khi xóa câu hỏi");
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const mappedQuestions = jsonData.map(row => {
          // Columns: "Câu hỏi", "Lựa chọn 1", "Lựa chọn 2", ..., "Đáp án đúng" (index 1-based or marked with 'x')
          // Format giống Trắc nghiệm (QuizModule): "Câu hỏi", "Lựa chọn 1", "Đáp án 1" ('x' or empty)
          const opts: string[] = [];
          let correctIdx = 0;
          
          for (let i = 1; i <= 6; i++) {
            const content = row[`Lựa chọn ${i}`];
            if (content) {
              opts.push(String(content));
              if (row[`Đáp án ${i}`]?.toString().toLowerCase() === "x") {
                correctIdx = opts.length - 1;
              }
            }
          }

          const rowLevel = row["Cấp độ"] || "Trung bình";
          const levelVal = LEVELS.find(l => l.label === rowLevel)?.value || "medium";

          return {
            question: row["Câu hỏi"],
            options: opts,
            correct_index: correctIdx,
            level: levelVal
          };
        }).filter(q => q.question && q.options.length >= 2);

        if (mappedQuestions.length === 0) {
          toast.error("Không tìm thấy dữ liệu hợp lệ. Vui lòng kiểm tra file Excel mẫu.");
          return;
        }

        const res = await apiFetch<{ imported: number }>("/nhanhnhuchop/import", {
          method: "POST",
          body: JSON.stringify({ questions: mappedQuestions })
        });

        toast.success(`Đã nhập thành công ${res.imported} câu hỏi!`);
        fetchQuestions();
      } catch (err: any) {
        toast.error("Lỗi khi xử lý file Excel: " + err.message);
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        "Câu hỏi": "Con gì kéo xe thay ngựa?",
        "Cấp độ": "Dễ",
        "Lựa chọn 1": "Con trâu",
        "Đáp án 1": "",
        "Lựa chọn 2": "Con bò",
        "Đáp án 2": "x",
        "Lựa chọn 3": "Con lừa",
        "Đáp án 3": "",
        "Lựa chọn 4": "Con hươu",
        "Đáp án 4": ""
      }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "NhanhNhuChop");
    XLSX.writeFile(wb, "SmartLearn_NhanhNhuChop_Template.xlsx");
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedLevel(null);
    setCurrentPage(1);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-fade-in pb-20 px-4">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <button
          onClick={() => navigate("/")}
          className="flex items-center justify-center h-12 w-12 rounded-2xl bg-white shadow-sm hover:shadow-md transition-all border border-border group"
        >
          <ArrowLeft className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-600">
              <FileQuestion className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-tight">Nhanh như chớp</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Quản lý ngân hàng câu hỏi phản xạ nhanh</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
            <input type="file" id="nc-import" className="hidden" accept=".xlsx, .xls" onChange={handleExcelImport} />
            <Button 
                variant="outline" 
                className="rounded-xl h-12 px-6 font-bold border-emerald-500 text-emerald-600 hover:bg-emerald-50 gap-2 shadow-sm"
                onClick={() => document.getElementById('nc-import')?.click()}
                disabled={importing}
            >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Nhập Excel
            </Button>
            <Button onClick={openFormForAdd} className="h-12 px-6 rounded-xl font-bold gap-2 shadow-lg shadow-emerald-200 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="h-5 w-5" /> Thêm câu hỏi
            </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text"
            placeholder="Tìm kiếm câu hỏi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-4 rounded-2xl border-2 border-border focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium"
          />
        </div>
        <div className="flex gap-2">
           {LEVELS.map(l => (
             <button
               key={l.value}
               onClick={() => setSelectedLevel(selectedLevel === l.value ? null : l.value)}
               className={`px-4 py-2 rounded-xl border-2 text-xs font-bold transition-all
                 ${selectedLevel === l.value ? l.color + " ring-4 ring-offset-1 ring-current/20" : "bg-white border-border text-muted-foreground hover:bg-muted"}`}
             >
               {l.label}
             </button>
           ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        </div>
      ) : (
        <>
          {questions.length > 0 ? (
            <div className="rounded-3xl border border-border bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] w-40">Cấp độ</th>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px] min-w-[250px]">Câu hỏi</th>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Trả lời</th>
                      <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-[10px]">Gợi ý</th>
                      <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase tracking-wider text-[10px] w-28">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {questions.map((q) => {
                      const lvInfo = LEVELS.find(l => l.value === q.level) || LEVELS[0];
                      const correctAnswer = q.options[q.correct_index] || "-";
                      return (
                        <tr key={q.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${lvInfo.color}`}>
                              {lvInfo.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-800 leading-snug line-clamp-2">{q.question}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{new Date(q.created_at).toLocaleDateString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-2 text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100 italic">
                              {correctAnswer}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-slate-500 text-xs line-clamp-2 italic">{q.explanation || "-"}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => openFormForEdit(q)}
                                className="p-2 text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(q.id)}
                                className="p-2 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-slate-50/50 border-t border-border flex items-center justify-between">
                  <p className="text-xs text-slate-500 font-bold">
                    Hiển thị <span className="text-emerald-600">{questions.length}</span> / <span className="text-emerald-600">{totalCount}</span> câu hỏi
                  </p>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || loading}
                      className="h-9 px-4 rounded-xl font-bold border-border hover:bg-white transition-all"
                    >
                      Trước
                    </Button>
                    <div className="flex items-center gap-1 mx-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) pageNum = i + 1;
                        else if (currentPage <= 3) pageNum = i + 1;
                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                        else pageNum = currentPage - 2 + i;
                        
                        return (
                          <Button 
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`h-9 w-9 p-0 rounded-xl font-black ${currentPage === pageNum ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "text-slate-400 hover:text-slate-600 hover:bg-white"}`}
                            disabled={loading}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || loading}
                      className="h-9 px-4 rounded-xl font-bold border-border hover:bg-white transition-all"
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center justify-center border-4 border-dashed border-muted rounded-[3rem] text-center space-y-4">
              <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center text-muted-foreground">
                <LayoutGrid className="h-10 w-10" />
              </div>
              <p className="text-lg font-bold text-muted-foreground">Không tìm thấy câu hỏi nào</p>
              <div className="flex gap-3">
                {(searchTerm || selectedLevel) && (
                  <Button onClick={clearFilters} variant="ghost" className="rounded-xl font-bold">Xóa bộ lọc</Button>
                )}
                <Button onClick={openFormForAdd} variant="outline" className="rounded-xl border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-bold">Tạo câu hỏi đầu tiên</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Editor Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl animate-scale-in flex flex-col max-h-full">
            {/* Modal Header */}
            <div className="p-8 pb-4 flex items-center justify-between border-b border-slate-50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <Plus className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800">{editId ? "Cập nhật câu hỏi" : "Thêm câu hỏi mới"}</h2>
                  <p className="text-sm text-muted-foreground">Chỉ hỗ trợ dạng câu hỏi một đáp án duy nhất</p>
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
            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-200">
              {/* Level Icons */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Mức độ khó</label>
                <div className="grid grid-cols-4 gap-3">
                  {LEVELS.map(l => (
                    <button
                      key={l.value}
                      onClick={() => setLevel(l.value)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all
                        ${level === l.value ? l.color + " ring-4 ring-offset-2 ring-current/10" : "bg-slate-50 border-slate-50 text-slate-400 opacity-60 hover:opacity-100"}`}
                    >
                      <span className="text-sm font-black">{l.label}</span>
                      {level === l.value && <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-current shadow-sm" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nội dung câu hỏi</label>
                <textarea 
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="VD: Mặt trời mọc ở hướng nào?"
                  className="w-full min-h-[140px] p-6 rounded-[2rem] border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/5 outline-none transition-all text-xl font-bold text-slate-800 placeholder:text-slate-200"
                />
              </div>

              {/* Options List */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between ml-1">
                   <label className="text-xs font-black uppercase tracking-widest text-slate-400">Các lựa chọn đáp án</label>
                   <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setOptions([...options, ""])}
                    className="text-emerald-600 font-black hover:bg-emerald-50 rounded-full"
                   >
                     <Plus className="h-4 w-4 mr-1" /> Thêm lựa chọn
                   </Button>
                 </div>

                 <div className="space-y-3">
                    {options.map((opt, idx) => (
                      <div 
                        key={idx}
                        className={`group/opt flex items-center gap-4 p-2 rounded-3xl border-2 transition-all
                          ${correctIndex === idx ? 'bg-emerald-50 border-emerald-500 shadow-md shadow-emerald-500/5' : 'bg-white border-slate-50 hover:border-slate-200'}`}
                      >
                        <button 
                          onClick={() => setCorrectIndex(idx)}
                          className={`h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center transition-all
                            ${correctIndex === idx ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                        >
                          {correctIndex === idx ? <Circle className="h-4 w-4 fill-current" /> : <span className="font-black">{idx + 1}</span>}
                        </button>
                        
                        <input 
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...options];
                            newOpts[idx] = e.target.value;
                            setOptions(newOpts);
                          }}
                          placeholder={`Lựa chọn ${idx + 1}...`}
                          className="flex-1 bg-transparent border-none outline-none font-bold text-slate-700 placeholder:text-slate-300"
                        />

                        {options.length > 2 && (
                          <button 
                            onClick={() => {
                              const newOpts = options.filter((_, i) => i !== idx);
                              setOptions(newOpts);
                              if (correctIndex >= newOpts.length) setCorrectIndex(0);
                            }}
                            className="p-3 text-slate-200 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-all rounded-full hover:bg-red-50"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    ))}
                 </div>
              </div>

              {/* Explanation (Optional) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                  <HelpCircle className="h-3 w-3" /> Giải thích (Nếu có)
                </div>
                <textarea 
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Mô tả tóm tắt giải thích cho đáp án đúng..."
                  className="w-full min-h-[100px] p-5 rounded-[1.5rem] border-2 border-slate-100 bg-slate-50/50 focus:bg-white focus:border-slate-300 outline-none transition-all text-sm font-medium text-slate-600"
                />
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
                disabled={saving || !questionText.trim() || options.some(o => !o.trim())}
                onClick={handleSave}
              >
                {saving ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Save className="h-6 w-6 mr-2" />}
                {editId ? "Lưu thay đổi" : "Tạo câu hỏi"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Template Download / Format Info */}
      <div className="flex justify-center flex-col items-center gap-4 opacity-60 hover:opacity-100 transition-opacity pt-10">
        <p className="text-xs text-muted-foreground font-medium flex items-center gap-2">
            <Download className="h-3 w-3" /> Chưa có file Excel mẫu? 
            <button onClick={handleDownloadTemplate} className="text-emerald-700 font-bold hover:underline">Tải ngay tại đây</button>
        </p>
      </div>

    </div>
  );
}
