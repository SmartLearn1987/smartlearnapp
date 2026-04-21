import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Loader2, Save, FileQuestion, Upload, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface VTQuestion {
  id: string;
  question: string;
  answer: string;
  hint: string;
  level: string;
  created_at: string;
}

const LEVELS = [
  { value: "easy", label: "Dễ", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "medium", label: "Trung bình", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "hard", label: "Khó", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "extreme", label: "Cực khó", color: "bg-red-100 text-red-700 border-red-200" },
];

export default function VuaTiengVietManagePage() {
  const [questions, setQuestions] = useState<VTQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pagination State
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<any>({ total: 0, easy: 0, medium: 0, hard: 0, extreme: 0 });
  
  // Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [hintText, setHintText] = useState("");
  const [level, setLevel] = useState("medium");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchQuestions = async (page = currentPage, filter = selectedFilter) => {
    setLoading(true);
    try {
      const query = `/vuatiengviet?page=${page}&limit=${pageSize}${filter ? `&level=${filter}` : ""}`;
      const response = await apiFetch<any>(query);
      setQuestions(response.data);
      setTotalCount(response.total);
      setTotalPages(response.totalPages);
      setStats(response.stats);
    } catch (err: any) {
      setError("Không thể tải danh sách câu hỏi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions(currentPage, selectedFilter);
  }, [currentPage, selectedFilter]);

  const handleFilterChange = (filter: string | null) => {
    setSelectedFilter(filter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const openFormForAdd = () => {
    setEditId(null);
    setQuestionText("");
    setAnswerText("");
    setHintText("");
    setLevel("medium");
    setIsFormOpen(true);
  };

  const openFormForEdit = (q: VTQuestion) => {
    setEditId(q.id);
    setQuestionText(q.question);
    setAnswerText(q.answer);
    setHintText(q.hint || "");
    setLevel(q.level);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!questionText.trim() || !answerText.trim()) return;
    setSaving(true);
    try {
      const payload = { 
        question: questionText, 
        answer: answerText, 
        hint: hintText,
        level 
      };
      if (editId) {
        await apiFetch(`/vuatiengviet/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/vuatiengviet", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }
      setIsFormOpen(false);
      fetchQuestions();
    } catch (err: any) {
      alert("Có lỗi xảy ra khi lưu: " + err.message);
    } finally {
      setSaving(false);
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
          // Map Vietnamese columns to internal keys
          // Expected columns: "Cấp độ", "Câu hỏi", "Trả lời", "Gợi ý"
          const rowLevel = row["Cấp độ"] || "Trung bình";
          const levelValue = LEVELS.find(l => l.label === rowLevel)?.value || "medium";
          
          return {
            question: row["Câu hỏi"],
            answer: row["Trả lời"],
            hint: row["Gợi ý"],
            level: levelValue
          };
        }).filter(q => q.question && q.answer);

        if (mappedQuestions.length === 0) {
          toast.error("Không tìm thấy dữ liệu hợp lệ trong file Excel.");
          return;
        }

        const res = await apiFetch<{ imported: number }>("/vuatiengviet/bulk", {
          method: "POST",
          body: JSON.stringify({ questions: mappedQuestions })
        });

        toast.success(`Đã nhập thành công ${res.imported} câu hỏi!`);
        fetchQuestions();
      } catch (err: any) {
        console.error("Excel Import Error:", err);
        toast.error("Lỗi khi xử lý file Excel: " + err.message);
      } finally {
        setImporting(false);
        // Reset file input
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa câu hỏi này không?")) return;
    try {
      await apiFetch(`/vuatiengviet/${id}`, { method: "DELETE" });
      toast.success("Đã xóa câu hỏi thành công!");
      fetchQuestions();
    } catch (err: any) {
      toast.error("Xóa thất bại: " + err.message);
    }
  };

  const handleExcelExport = () => {
    setExporting(true);
    try {
      // Note: This exports only the current page (30 records)
      const exportData = questions.map(q => ({
        "Cấp độ": LEVELS.find(l => l.value === q.level)?.label || q.level,
        "Câu hỏi": q.question,
        "Trả lời": q.answer,
        "Gợi ý": q.hint || "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      worksheet["!cols"] = [
        { wch: 12 },  // Cấp độ
        { wch: 50 },  // Câu hỏi
        { wch: 25 },  // Trả lời
        { wch: 35 },  // Gợi ý
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Câu hỏi");

      const filename = selectedFilter
        ? `VuaTiengViet_${LEVELS.find(l => l.value === selectedFilter)?.label || selectedFilter}.xlsx`
        : "VuaTiengViet_ToanBo.xlsx";

      XLSX.writeFile(workbook, filename);
      toast.success(`Đã xuất ${exportData.length} câu hỏi thành công!`);
    } catch (err: any) {
      toast.error("Lỗi khi xuất file Excel: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      { "Cấp độ": "Dễ",        "Câu hỏi": "Lá lành đùm lá...",          "Trả lời": "Rách",    "Gợi ý": "Câu tục ngữ về tinh thần tương trợ" },
      { "Cấp độ": "Trung bình", "Câu hỏi": "Con chim hót tiếng... (điền từ)", "Trả lời": "líu lo", "Gợi ý": "Âm thanh vui tươi" },
      { "Cấp độ": "Khó",        "Câu hỏi": "Thành ngữ: 'Uống nước nhớ...'?", "Trả lời": "nguồn",  "Gợi ý": "" },
      { "Cấp độ": "Cực khó",    "Câu hỏi": "Từ đồng nghĩa với 'dũng cảm'?", "Trả lời": "can đảm", "Gợi ý": "" },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet["!cols"] = [
      { wch: 12 },
      { wch: 50 },
      { wch: 25 },
      { wch: 35 },
    ];

    // Add a note/instructions row at the top would require shifting – instead add a second sheet
    const noteData = [
      { "Hướng dẫn": "Điền câu hỏi vào sheet 'Câu hỏi'. Cột 'Cấp độ' nhận 1 trong 4 giá trị: Dễ | Trung bình | Khó | Cực khó" },
      { "Hướng dẫn": "Cột 'Câu hỏi' và 'Trả lời' là bắt buộc. Cột 'Gợi ý' là tùy chọn." },
    ];
    const noteSheet = XLSX.utils.json_to_sheet(noteData);
    noteSheet["!cols"] = [{ wch: 90 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Câu hỏi");
    XLSX.utils.book_append_sheet(workbook, noteSheet, "Hướng dẫn");

    XLSX.writeFile(workbook, "VuaTiengViet_Template.xlsx");
    toast.success("Đã tải template thành công!");
  };

  const levelStats = LEVELS.map(lv => ({
    ...lv,
    count: stats[lv.value] || 0
  }));

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Vua Tiếng Việt</h1>
          <p className="text-muted-foreground mt-1">Quản lý ngân hàng câu hỏi game Vua Tiếng Việt</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="file"
            id="excel-import"
            className="hidden"
            accept=".xlsx, .xls"
            onChange={handleExcelImport}
            disabled={importing}
          />

          {/* Export Excel */}
          <Button
            variant="outline"
            className="gap-2 rounded-full border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 bg-blue-50/30 font-semibold px-5 h-11"
            onClick={handleExcelExport}
            disabled={exporting || questions.length === 0}
            title={`Xuất ${questions.length} câu hỏi đang hiển thị ra file Excel`}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Xuất Excel (Trang này)
          </Button>

          {/* Import Excel */}
          <Button 
            variant="outline" 
            className="gap-2 rounded-full border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 bg-emerald-50/30 font-bold px-6 h-11" 
            onClick={() => document.getElementById('excel-import')?.click()}
            disabled={importing}
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Thêm danh sách câu hỏi
          </Button>

          <Button onClick={openFormForAdd} className="gap-2 rounded-xl h-11">
            <Plus className="h-4 w-4" /> Thêm câu hỏi
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar Stats */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-heading font-semibold mb-4 text-sm uppercase text-muted-foreground tracking-wider">
              Thống kê cấp độ
            </h3>
            <div className="space-y-3">
              <div 
                className={`flex items-center justify-between p-2 -mx-2 rounded-lg cursor-pointer transition-colors ${selectedFilter === null ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted'}`}
                onClick={() => handleFilterChange(null)}
              >
                <span className="text-sm font-medium">Tổng câu hỏi</span>
                <span className="font-bold text-primary">{stats.total}</span>
              </div>
              <div className="h-px bg-border my-2" />
              {levelStats.map(stat => (
                <div 
                  key={stat.value} 
                  className={`flex items-center justify-between p-2 -mx-2 rounded-lg cursor-pointer transition-colors ${selectedFilter === stat.value ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted'}`}
                  onClick={() => handleFilterChange(stat.value)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${stat.color.split(' ')[0]}`} />
                    <span className="text-sm">{stat.label}</span>
                  </div>
                  <span className="font-mono text-sm font-semibold">{stat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {error && (
            <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-4 font-semibold text-muted-foreground w-28">Cấp độ</th>
                    <th className="px-4 py-4 font-semibold text-muted-foreground min-w-[200px]">Câu hỏi</th>
                    <th className="px-4 py-4 font-semibold text-muted-foreground">Trả lời</th>
                    <th className="px-4 py-4 font-semibold text-muted-foreground">Gợi ý</th>
                    <th className="px-4 py-4 text-right font-semibold text-muted-foreground w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {questions.map((q) => {
                    const lvInfo = LEVELS.find(l => l.value === q.level) || LEVELS[0];
                    return (
                      <tr key={q.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${lvInfo.color}`}>
                            {lvInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-base font-bold whitespace-normal">
                          {q.question}
                        </td>
                        <td className="px-4 py-3 text-green-700 font-bold whitespace-normal">
                          {q.answer}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-normal max-w-[200px]">
                          {q.hint || "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openFormForEdit(q)}
                              className="p-1.5 text-muted-foreground hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(q.id)}
                              className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {questions.length === 0 && !error && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center">
                        <p className="text-muted-foreground mb-4">
                          {selectedFilter ? "Chưa có câu hỏi nào thuộc cấp độ này" : "Chưa có câu hỏi nào"}
                        </p>
                        {!selectedFilter && (
                          <Button variant="outline" onClick={openFormForAdd}>Tạo câu hỏi đầu tiên</Button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination UI */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    Trước
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || loading}
                  >
                    Sau
                  </Button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Hiển thị <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> đến{" "}
                      <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> trong{" "}
                      <span className="font-medium">{totalCount}</span> kết quả
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || loading}
                    >
                      Trước
                    </Button>
                    <div className="flex items-center px-4 text-sm font-medium">
                      Trang {currentPage} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || loading}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-[2rem] bg-card p-6 sm:p-8 shadow-2xl animate-fade-in border border-border">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileQuestion className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold">
                  {editId ? "Sửa câu hỏi" : "Thêm câu hỏi mới"}
                </h2>
                <p className="text-sm text-muted-foreground">Nhập đầy đủ thông tin cho câu hỏi</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Cấp độ</label>
                <div className="grid grid-cols-4 gap-2">
                  {LEVELS.map((lv) => (
                    <button
                      key={lv.value}
                      onClick={() => setLevel(lv.value)}
                      className={`rounded-xl border-2 py-2 text-[10px] sm:text-xs font-semibold transition-all
                        ${level === lv.value ? lv.color + " ring-2 ring-offset-2 ring-current" : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"}`}
                    >
                      {lv.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Câu hỏi</label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Ví dụ: Tìm từ còn thiếu: Lá lành đùm lá..."
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Câu trả lời</label>
                <input
                  type="text"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Ví dụ: Rách"
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-green-500 text-green-700 font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Gợi ý (Tùy chọn)</label>
                <input
                  type="text"
                  value={hintText}
                  onChange={(e) => setHintText(e.target.value)}
                  placeholder="Mô tả gợi ý nếu người chơi gặp khó khăn"
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setIsFormOpen(false)}>
                Hủy
              </Button>
              <Button 
                className="flex-1 h-12 rounded-xl" 
                onClick={handleSave} 
                disabled={saving || !questionText.trim() || !answerText.trim()}
              >
                {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                {editId ? "Cập nhật" : "Tạo câu hỏi"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
