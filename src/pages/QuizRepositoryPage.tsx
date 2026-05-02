import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Loader2, Save, FileQuestion, Upload, Download, Search, LayoutGrid, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

interface QuestionOption {
  id?: string;
  content: string;
  is_correct: boolean;
}

interface RepositoryQuestion {
  id: string;
  content: string;
  type: string;
  exam_id: string;
  subject_id: string | null;
  category: string | null;
  education_level: string;
  grade: string | null;
  subject_name: string | null;
  creator_name: string | null;
  created_at: string;
  is_system: boolean;
  options: QuestionOption[];
}


const EDUCATION_LEVELS = [
  "Tiểu học",
  "Trung học cơ sở",
  "Trung học Phổ Thông",
  "Đại Học / Cao Đẳng",
  "Luyện thi chứng chỉ",
  "Khác",
];

const QUESTION_TYPES = [
  { value: "single", label: "Một lựa chọn" },
  { value: "multiple", label: "Nhiều lựa chọn" },
  { value: "text", label: "Nhập văn bản" },
  { value: "ordering", label: "Sắp xếp câu" },
];

export default function QuizRepositoryPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<RepositoryQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState(EDUCATION_LEVELS[0]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  // Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [questionContent, setQuestionContent] = useState("");
  const [questionType, setQuestionType] = useState("single");
  const [options, setOptions] = useState<QuestionOption[]>([
    { content: "", is_correct: true },
    { content: "", is_correct: false },
  ]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof RepositoryQuestion | "subject_name" | "creator_name"; direction: "asc" | "desc" } | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedEducationLevel, setSelectedEducationLevel] = useState(EDUCATION_LEVELS[0]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);


  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<RepositoryQuestion[]>("/questions");
      setQuestions(data);
    } catch (err) {
      toast.error("Không thể tải danh sách câu hỏi");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const data = await apiFetch<any[]>("/subjects");
      setSubjects(data);
    } catch (err) {
      console.error("Failed to fetch subjects");
    }
  };

  useEffect(() => {
    fetchQuestions();
    fetchSubjects();
  }, []);

  const filteredQuestions = questions
    .filter((q) => {
      const matchesSearch = q.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab =
        q.education_level === activeTab ||
        (activeTab === "Khác" &&
          !EDUCATION_LEVELS.slice(0, -1).includes(q.education_level));
      const matchesSubject = !activeSubjectId || q.subject_id === activeSubjectId;
      return matchesSearch && matchesTab && matchesSubject;
    })
    .sort((a, b) => {
      if (!sortConfig) return 0;
      const { key, direction } = sortConfig;

      let valA = a[key as keyof RepositoryQuestion] || "";
      let valB = b[key as keyof RepositoryQuestion] || "";

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return direction === "asc" ? -1 : 1;
      if (valA > valB) return direction === "asc" ? 1 : -1;
      return 0;
    });

  const requestSort = (key: any) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === "asc" ? " ↑" : " ↓";
  };




  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa câu hỏi này?")) return;
    try {
      await apiFetch(`/questions/${id}`, { method: "DELETE" });
      toast.success("Đã xóa câu hỏi");
      setQuestions(questions.filter((q) => q.id !== id));
    } catch (err) {
      toast.error("Không thể xóa câu hỏi");
    }
  };

  const handleSave = async () => {
    if (!questionContent.trim()) return toast.error("Vui lòng nhập nội dung câu hỏi");
    setSaving(true);
    try {
      const payload = {
        content: questionContent,
        type: questionType,
        options: options.filter(o => o.content.trim() !== ""),
        subject_id: selectedSubjectId || null,
        grade: selectedGrade || null,
        education_level: selectedEducationLevel || null,
        category: selectedCategory || null
      };

      if (editId) {
        await apiFetch(`/questions/${editId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Đã cập nhật câu hỏi");
      } else {
        // For new question, we'll let the backend assign it to a default exam
        await apiFetch("/questions/bulk", {
          method: "POST",
          body: JSON.stringify({ 
            questions: [payload],
            ...payload
          }),
        });
        toast.success("Đã tạo câu hỏi mới");
      }
      setIsFormOpen(false);
      fetchQuestions();
    } catch (err) {
      toast.error("Có lỗi xảy ra khi lưu");
    } finally {
      setSaving(false);
    }
  };

  const openFormForEdit = (q: RepositoryQuestion) => {
    setEditId(q.id);
    setQuestionContent(q.content);
    setQuestionType(q.type);
    setSelectedSubjectId(q.subject_id || "");
    setSelectedGrade(q.grade || "");
    setSelectedEducationLevel(q.education_level || EDUCATION_LEVELS[0]);
    setSelectedCategory(q.category || "");
    setOptions(q.options || []);
    setIsFormOpen(true);
  };

  const openFormForAdd = () => {
    setEditId(null);
    setQuestionContent("");
    setQuestionType("single");
    setSelectedSubjectId("");
    setSelectedGrade("");
    setSelectedEducationLevel(activeTab || EDUCATION_LEVELS[0]);
    setSelectedCategory("");
    setOptions([
      { content: "", is_correct: true },
      { content: "", is_correct: false },
    ]);
    setIsFormOpen(true);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast.error("File không có dữ liệu");
          return;
        }

        const importedQuestions = jsonData.map((row: any) => {
          const type = (row["Loại câu hỏi"] || "single");
          const rowOptions: any[] = [];
          if (type === "text" || type === "ordering") {
            const answer = String(row["Lựa chọn 1"] || row["Câu hỏi"] || "");
            rowOptions.push({ content: answer, is_correct: true });
          } else {
            for (let i = 1; i <= 6; i++) {
              const content = row[`Lựa chọn ${i}`];
              if (content) {
                rowOptions.push({
                  content: String(content),
                  is_correct: row[`Đáp án ${i}`]?.toString().toLowerCase() === "x"
                });
              }
            }
          }

          // Map subject name to ID if possible
          const subjectName = row["Môn học"];
          const subjectId = subjectName ? subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase())?.id : null;

          return {
            content: type === "ordering" ? "Sắp xếp câu" : (row["Câu hỏi"] || "Câu hỏi không tên"),
            type,
            options: rowOptions,
            subject_id: subjectId,
            grade: row["Lớp"] || null,
            education_level: row["Cấp độ"] || activeTab || "Khác",
            category: row["Nhóm"] || null
          };
        });

        const first = importedQuestions[0];
        await apiFetch("/questions/bulk", {
          method: "POST",
          body: JSON.stringify({ 
            questions: importedQuestions,
            subject_id: first.subject_id,
            grade: first.grade,
            education_level: first.education_level,
            category: first.category
          })
        });

        toast.success(`Đã nhập thành công ${importedQuestions.length} câu hỏi`);
        fetchQuestions();
      } catch (err) {
        toast.error("Lỗi khi nhập dữ liệu");
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Cấp độ": "Tiểu học",
        "Môn học": "Tiếng Việt",
        "Lớp": "4",
        "Nhóm": "Từ vựng",
        "Câu hỏi": "Thủ đô của Việt Nam là gì?",
        "Loại câu hỏi": "single",
        "Lựa chọn 1": "Hà Nội", "Đáp án 1": "x",
        "Lựa chọn 2": "TP.HCM", "Đáp án 2": "",
        "Lựa chọn 3": "Đà Nẵng", "Đáp án 3": "",
        "Lựa chọn 4": "Huế", "Đáp án 4": ""
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "KhoCauHoi_Template.xlsx");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Kho Trắc nghiệm</h1>
          <p className="text-muted-foreground mt-1">Quản lý tập trung toàn bộ câu hỏi trắc nghiệm</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <input type="file" id="import-excel" className="hidden" accept=".xlsx, .xls" onChange={handleImportFile} />
          
          <Button 
            variant="outline" 
            className="gap-2 rounded-full border-emerald-500 text-emerald-600 hover:bg-emerald-50 bg-emerald-50/30 font-bold px-6 h-10" 
            onClick={() => document.getElementById("import-excel")?.click()} 
            disabled={importing}
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Tải trắc nghiệm
          </Button>

          <Button 
            variant="outline" 
            className="gap-2 rounded-full border-orange-400 text-orange-500 hover:bg-orange-50 bg-orange-50/30 font-bold px-6 h-10" 
            onClick={handleDownloadTemplate}
          >
            <Download className="h-4 w-4" /> File mẫu
          </Button>

          <div className="w-px h-6 bg-border mx-1 hidden sm:block"></div>

          <Button 
            onClick={openFormForAdd} 
            className="rounded-full h-10 px-6 font-bold bg-primary text-white hover:brightness-110 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" /> Thêm câu hỏi
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar Tabs */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-heading font-semibold mb-4 text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" /> Cấp độ
            </h3>
            <div className="space-y-1.5">
              {EDUCATION_LEVELS.map((level) => {
                const isActive = activeTab === level;
                // Find subjects that have questions in this level
                const levelQuestions = questions.filter(q => 
                  q.education_level === level || 
                  (level === "Khác" && !EDUCATION_LEVELS.slice(0, -1).includes(q.education_level))
                );
                
                const levelSubjectCounts = levelQuestions.reduce((acc, q) => {
                  const sId = q.subject_id || "none";
                  acc[sId] = (acc[sId] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                const levelSubjects = subjects.filter(s => levelSubjectCounts[s.id]);
                const totalCount = levelQuestions.length;

                return (
                  <div key={level} className="space-y-1">
                    <button
                      onClick={() => {
                        setActiveTab(level);
                        setActiveSubjectId(null);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {level}
                        <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-muted/50">{totalCount}</Badge>
                      </span>
                      {isActive && <CheckCircle2 className="h-4 w-4" />}
                    </button>
                    
                    {isActive && levelSubjects.length > 0 && (
                      <div className="ml-4 pl-4 border-l border-border space-y-1 py-1">
                        {levelSubjects.map(s => (
                          <button
                            key={s.id}
                            onClick={() => setActiveSubjectId(s.id)}
                            className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all ${
                              activeSubjectId === s.id
                                ? "text-primary font-bold bg-primary/5"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                          >
                            <span>{s.name}</span>
                            <span className="text-[10px] opacity-60">({levelSubjectCounts[s.id]})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>


        </div>


        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm câu hỏi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-border bg-card pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="px-4 py-4 font-semibold text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort("subject_name")}>
                      Môn học{getSortIcon("subject_name")}
                    </th>
                    <th className="px-4 py-4 font-semibold text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort("grade")}>
                      Lớp{getSortIcon("grade")}
                    </th>
                    <th className="px-4 py-4 font-semibold text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort("category")}>
                      Nhóm{getSortIcon("category")}
                    </th>
                    <th className="px-4 py-4 font-semibold text-muted-foreground min-w-[200px] cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort("content")}>
                      Câu hỏi{getSortIcon("content")}
                    </th>
                    <th className="px-4 py-4 font-semibold text-muted-foreground">Đáp án</th>
                    <th className="px-4 py-4 font-semibold text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort("type")}>
                      Loại{getSortIcon("type")}
                    </th>
                    <th className="px-4 py-4 font-semibold text-muted-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => requestSort("creator_name")}>
                      Người tạo{getSortIcon("creator_name")}
                    </th>
                    <th className="px-4 py-4 text-right font-semibold text-muted-foreground">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-20 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        <p className="text-muted-foreground mt-2">Đang tải dữ liệu...</p>
                      </td>
                    </tr>
                  ) : filteredQuestions.map((q) => (
                    <tr key={q.id} className="hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="font-bold text-primary">{q.subject_name || "Chưa có môn"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold whitespace-nowrap">{q.grade || "Cả năm"}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-muted-foreground italic">{q.category || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium line-clamp-2">{q.content}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {q.options?.filter(o => o.is_correct).map((o, idx) => (
                            <span key={idx} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                              ✓ {o.content}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="capitalize text-[10px] whitespace-nowrap">
                          {QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{q.creator_name || "Hệ thống"}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{new Date(q.created_at).toLocaleDateString("vi-VN")}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openFormForEdit(q)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(q.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredQuestions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-20 text-center">
                        <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground mt-2">Không tìm thấy câu hỏi nào</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl rounded-[2rem] bg-card p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border border-border max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FileQuestion className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold">{editId ? "Sửa câu hỏi" : "Thêm câu hỏi mới"}</h2>
                  <p className="text-sm text-muted-foreground">Thông tin chi tiết câu hỏi trắc nghiệm</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsFormOpen(false)}>✕</Button>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Môn học</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    <option value="">-- Chọn môn học --</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cấp độ</label>
                    <select
                      value={selectedEducationLevel}
                      onChange={(e) => setSelectedEducationLevel(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Lớp</label>
                    <input
                      type="text"
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      placeholder="VD: 4"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Nhóm câu hỏi</label>
                    <input
                      type="text"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      placeholder="VD: Từ vựng, Ngữ pháp..."
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Loại câu hỏi</label>
                    <select
                      value={questionType}
                      onChange={(e) => setQuestionType(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Nội dung câu hỏi</label>
                <textarea
                  value={questionContent}
                  onChange={(e) => setQuestionContent(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi..."
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px]"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {questionType === "text" 
                      ? "Đáp án đúng" 
                      : questionType === "ordering"
                        ? "Nội dung câu đúng (Thứ tự đúng)" 
                        : "Các phương án trả lời"}
                  </label>
                  {questionType !== "text" && questionType !== "ordering" && (
                    <Button variant="ghost" size="sm" className="h-8 text-primary font-bold" onClick={() => setOptions([...options, { content: "", is_correct: false }])}>
                      + Thêm phương án
                    </Button>
                  )}
                </div>

                {(questionType === "text" || questionType === "ordering") ? (
                  <div className="space-y-2">
                    <textarea
                      value={options[0]?.content || ""}
                      onChange={(e) => {
                        setOptions([{ content: e.target.value, is_correct: true }]);
                      }}
                      placeholder={questionType === "ordering" ? "VD: Một con ngựa đau cả tàu bỏ cỏ" : "Nhập đáp án đúng..."}
                      className="w-full rounded-2xl border border-dashed border-border bg-muted/10 px-5 py-4 text-sm focus:border-primary outline-none min-h-[120px] transition-all"
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                      {questionType === "ordering" 
                        ? "Hệ thống sẽ tự động tách câu này thành các từ và trộn ngẫu nhiên khi học sinh làm bài."
                        : "Hệ thống sẽ so khớp chính xác đáp án này khi chấm điểm."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {options.map((opt, idx) => (
                      <div key={idx} className="flex gap-3 items-start">
                        <div className="pt-2">
                          <input
                            type={questionType === "multiple" ? "checkbox" : "radio"}
                            name="correct_answer"
                            checked={opt.is_correct}
                            onChange={() => {
                              const newOpts = [...options];
                              if (questionType !== "multiple") {
                                newOpts.forEach((o, i) => o.is_correct = i === idx);
                              } else {
                                newOpts[idx].is_correct = !newOpts[idx].is_correct;
                              }
                              setOptions(newOpts);
                            }}
                            className="h-5 w-5 accent-primary cursor-pointer"
                          />
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={opt.content}
                            onChange={(e) => {
                              const newOpts = [...options];
                              newOpts[idx].content = e.target.value;
                              setOptions(newOpts);
                            }}
                            placeholder={`Lựa chọn ${idx + 1}`}
                            className="w-full rounded-xl border border-border bg-muted/50 px-4 py-2 text-sm focus:border-primary outline-none"
                          />
                        </div>
                        {options.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setOptions(options.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 h-12 rounded-xl border-red-500 text-red-500 hover:bg-red-50 font-bold" onClick={() => setIsFormOpen(false)}>Hủy</Button>
                <Button className="flex-1 h-12 rounded-xl font-bold" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />} {editId ? "Cập nhật" : "Lưu câu hỏi"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
