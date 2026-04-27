import { useState, useEffect } from "react";
import { 
  ArrowLeft, Plus, Trash2, GripVertical, 
  CheckCircle2, Circle, CheckSquare, Square, Type, 
  Clock, Save, Loader2, AlertCircle, Trash,
  Download, Upload, FileSpreadsheet, FileJson
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type QuestionType = "single" | "multiple" | "text" | "ordering";

interface Option {
  id: string | number;
  content: string;
  is_correct: boolean;
}

interface Question {
  id: string | number;
  content: string;
  type: QuestionType;
  options: Option[];
}

export default function QuizFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<number>(30);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [educationLevel, setEducationLevel] = useState("");
  const [grade, setGrade] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: Date.now(),
      content: "",
      type: "single",
      options: [
        { id: Date.now() + 1, content: "Lựa chọn 1", is_correct: true },
        { id: Date.now() + 2, content: "Lựa chọn 2", is_correct: false },
      ]
    }
  ]);
  
  useEffect(() => {
    async function fetchSubjects() {
      try {
        const data = await apiFetch("/subjects") as any[];
        setSubjects(data);
      } catch (err) {
        // silently fail or handle
      }
    }
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (isEdit) {
      const loadExam = async () => {
        try {
          const data = await apiFetch<any>(`/exams/${id}`);
          setTitle(data.title);
          setDescription(data.description || "");
          setDuration(data.duration || 30);
          setSelectedSubjectId(data.subject_id || "");
          setEducationLevel(data.education_level || "");
          setGrade(data.grade || "");
          setIsPublic(data.is_public !== false);
          setQuestions(data.questions.map((q: any) => ({
            ...q,
            options: q.options || []
          })));
        } catch (err) {
          toast.error("Không thể tải thông tin bài thi");
          navigate("/quizzes");
        } finally {
          setLoading(false);
        }
      };
      loadExam();
    }
  }, [id, isEdit, navigate]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now(),
        content: "",
        type: "single",
        options: [
          { id: Date.now() + 1, content: "Lựa chọn 1", is_correct: true },
          { id: Date.now() + 2, content: "Lựa chọn 2", is_correct: false },
        ]
      }
    ]);
  };

  const removeQuestion = (qId: string | number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== qId));
    }
  };

  const updateQuestion = (qId: string | number, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === qId ? { ...q, ...updates } : q));
  };

  const addOption = (qId: string | number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          options: [...q.options, { id: Date.now(), content: "", is_correct: false }]
        };
      }
      return q;
    }));
  };

  const removeOption = (qId: string | number, optId: string | number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId && q.options.length > 1) {
        return { ...q, options: q.options.filter(o => o.id !== optId) };
      }
      return q;
    }));
  };

  const toggleOptionCorrect = (qId: string | number, optId: string | number) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        if (q.type === "single") {
          return {
            ...q,
            options: q.options.map(o => ({ ...o, is_correct: o.id === optId }))
          };
        } else {
          return {
            ...q,
            options: q.options.map(o => o.id === optId ? { ...o, is_correct: !o.is_correct } : o)
          };
        }
      }
      return q;
    }));
  };

  const updateOptionContent = (qId: string | number, optId: string | number, content: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          options: q.options.map(o => o.id === optId ? { ...o, content } : o)
        };
      }
      return q;
    }));
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Câu hỏi": "Thủ đô của Việt Nam là gì?",
        "Loại câu hỏi": "single",
        "Lựa chọn 1": "Hà Nội",
        "Đáp án 1": "x",
        "Lựa chọn 2": "TP.HCM",
        "Đáp án 2": "",
        "Lựa chọn 3": "Đà Nẵng",
        "Đáp án 3": "",
        "Lựa chọn 4": "Huế",
        "Đáp án 4": ""
      },
      {
        "Câu hỏi": "Các thành phố trực thuộc trung ương của Việt Nam?",
        "Loại câu hỏi": "multiple",
        "Lựa chọn 1": "Hà Nội",
        "Đáp án 1": "x",
        "Lựa chọn 2": "Hải Phòng",
        "Đáp án 2": "x",
        "Lựa chọn 3": "Đà Nẵng",
        "Đáp án 3": "x",
        "Lựa chọn 4": "Cần Thơ",
        "Đáp án 4": "x"
      },
      {
        "Câu hỏi": "Thủ đô của Việt Nam là gì?",
        "Loại câu hỏi": "text",
        "Lựa chọn 1": "Hà Nội",
        "Đáp án 1": "x",
        "Lựa chọn 2": "",
        "Đáp án 2": "",
        "Lựa chọn 3": "",
        "Đáp án 3": "",
        "Lựa chọn 4": "",
        "Đáp án 4": ""
      },
      {
        "Câu hỏi": "Bầu ơi thương lấy bí cùng",
        "Loại câu hỏi": "ordering",
        "Lựa chọn 1": "",
        "Đáp án 1": "",
        "Lựa chọn 2": "",
        "Đáp án 2": "",
        "Lựa chọn 3": "",
        "Đáp án 3": "",
        "Lựa chọn 4": "",
        "Đáp án 4": ""
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Questions");
    XLSX.writeFile(wb, "Smartlearn_Quiz_Template.xlsx");
    toast.success("Đã tải file mẫu thành công");
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          toast.error("File không có dữ liệu câu hỏi");
          return;
        }

        const importedQuestions: Question[] = jsonData.map((row: any, index) => {
          const type = (row["Loại câu hỏi"] || "single") as QuestionType;
          const options: Option[] = [];
          if (type === "text" || type === "ordering") {
            const answer = String(row["Lựa chọn 1"] || row["Câu hỏi"] || "");
            options.push({ id: Date.now() + index * 10, content: answer, is_correct: true });
          } else {
            for (let i = 1; i <= 6; i++) {
              const content = row[`Lựa chọn ${i}`];
              if (content) {
                options.push({
                  id: Date.now() + index * 10 + i,
                  content: String(content),
                  is_correct: row[`Đáp án ${i}`]?.toString().toLowerCase() === "x"
                });
              }
            }
          }

          return {
            id: Date.now() + index,
            content: type === "ordering" ? "Sắp xếp câu" : (row["Câu hỏi"] || "Câu hỏi không tên"),
            type,
            options: options.length > 0 ? options : [{ id: Date.now(), content: "Lựa chọn 1", is_correct: true }]
          };
        });

        setQuestions(importedQuestions);
        toast.success(`Đã nhập thành công ${importedQuestions.length} câu hỏi`);
      } catch (err) {
        console.error("Import Error:", err);
        toast.error("Đã xảy ra lỗi khi đọc file. Vui lòng kiểm tra lại định dạng.");
      }
      // Reset input
      e.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSave = async () => {
    if (!title.trim()) return toast.error("Vui lòng nhập tên bài thi");
    if (!selectedSubjectId) return toast.error("Vui lòng chọn môn học");
    
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        duration,
        subject_id: selectedSubjectId || null,
        education_level: educationLevel || null,
        grade: grade.trim() || null,
        is_public: isPublic,
        questions: questions.map(q => ({
          content: q.content.trim() || "Câu hỏi không tên",
          type: q.type,
          options: (q.type === "text" || q.type === "ordering")
            ? [{ content: q.options[0]?.content.trim() || "", is_correct: true }] 
            : q.options.filter(o => o.content.trim())
        }))
      };

      if (isEdit) {
        await apiFetch(`/exams/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        toast.success("Đã cập nhật bài thi");
      } else {
        await apiFetch("/exams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        toast.success("Đã tạo bài thi thành công");
      }
      navigate("/quizzes");
    } catch (err: any) {
      toast.error(err.message || "Không thể lưu bài thi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur-md px-4 py-3 sm:py-4 shadow-sm">
        <div className="container max-w-5xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/quizzes")} className="rounded-xl shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-heading text-lg sm:text-xl font-bold truncate">
              {isEdit ? "Chỉnh sửa bài trắc nghiệm" : "Tạo bài trắc nghiệm mới"}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between sm:justify-end">
            <input
              type="file"
              id="quiz-import"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleImportFile}
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => document.getElementById("quiz-import")?.click()}
                className="rounded-xl h-10 px-3 sm:px-4 font-bold border-primary text-primary hover:bg-primary/5 flex-1 sm:flex-none flex items-center gap-2 text-xs sm:text-sm"
              >
                <Upload className="h-4 w-4" /> <span className="sm:inline">Tải trắc nghiệm</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDownloadTemplate}
                className="rounded-xl h-10 px-3 sm:px-4 font-bold border-amber-500 text-amber-600 hover:bg-amber-50 flex-1 sm:flex-none flex items-center gap-2 text-xs sm:text-sm"
              >
                <Download className="h-4 w-4" /> <span className="sm:inline">File mẫu</span>
              </Button>
            </div>
            <div className="hidden sm:block w-px h-6 bg-gray-200 mx-1" />
            <Button onClick={handleSave} disabled={saving} className="rounded-xl h-10 px-6 font-bold flex items-center gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto text-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu bài trắc nghiệm
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl py-6 sm:py-8 px-4 space-y-8">
        {/* Exam Meta Card */}
        <section className="bg-white rounded-[32px] p-6 sm:p-10 shadow-sm border border-gray-100 transition-all">
          <div className="space-y-8">
            <div className="max-w-xl space-y-8">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest text-[10px]">Chế độ hiển thị</label>
                <Select value={isPublic ? "public" : "private"} onValueChange={(val) => setIsPublic(val === "public")}>
                  <SelectTrigger className="w-full bg-white border border-gray-100 rounded-2xl h-11 focus:ring-4 focus:ring-primary/10 outline-none shadow-sm transition-all text-gray-900 font-semibold bg-gray-50/50 border-none">
                    <SelectValue placeholder="Chọn chế độ hiển thị" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                    <SelectItem value="public" className="cursor-pointer font-medium">Công khai (Mọi người đều có thể thấy)</SelectItem>
                    <SelectItem value="private" className="cursor-pointer font-medium">Không công khai (Chỉ mình tôi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest text-[10px]">Môn học</label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger className="w-full bg-white border border-gray-100 rounded-2xl h-11 focus:ring-4 focus:ring-primary/10 outline-none shadow-sm transition-all text-gray-900 font-semibold border-none bg-gray-50/50">
                    <SelectValue placeholder="Chọn môn học" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()} className="cursor-pointer hover:bg-gray-100 focus:bg-primary/10 focus:text-gray-900 transition-colors font-medium">
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest text-[10px]">Cấp độ</label>
                  <Select value={educationLevel} onValueChange={setEducationLevel}>
                    <SelectTrigger className="w-full bg-white border border-gray-100 rounded-2xl h-11 focus:ring-4 focus:ring-primary/10 transition-all text-gray-900 font-semibold shadow-sm">
                      <SelectValue placeholder="-- Chọn cấp độ --" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-gray-100 shadow-xl">
                      <SelectItem value="Tiểu học" className="cursor-pointer font-medium">Tiểu học</SelectItem>
                      <SelectItem value="Trung học cơ sở" className="cursor-pointer font-medium">Trung học cơ sở</SelectItem>
                      <SelectItem value="Trung học Phổ Thông" className="cursor-pointer font-medium">Trung học Phổ Thông</SelectItem>
                      <SelectItem value="Đại Học / Cao Đẳng" className="cursor-pointer font-medium">Đại Học / Cao Đẳng</SelectItem>
                      <SelectItem value="Luyện thi chứng chỉ" className="cursor-pointer font-medium">Luyện thi chứng chỉ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest text-[10px]">Lớp</label>
                  <input
                    type="text"
                    placeholder="VD: 4"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl h-11 px-4 focus:ring-4 focus:ring-primary/10 outline-none shadow-sm transition-all text-gray-900 font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest text-[10px]">Tên bài thi</label>
                <input
                  type="text"
                  placeholder="Nhập tên bài thi ở đây..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-2xl sm:text-3xl font-bold bg-gray-50/50 border border-gray-100 rounded-2xl p-5 sm:p-6 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-muted-foreground/30 shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest text-[10px]">Mô tả</label>
                <textarea
                  placeholder="Mô tả chi tiết về bài thi..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-base bg-gray-50/50 border border-gray-100 rounded-2xl p-6 focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-muted-foreground/30 resize-none min-h-[120px] shadow-inner"
                />
              </div>
            </div>
            
            <div className="pt-4 border-t flex items-center gap-6 text-sm font-semibold text-muted-foreground">
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-2xl">
                <Clock className="h-4 w-4" />
                <span>Thời gian: <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value))} className="w-12 bg-transparent font-bold text-foreground text-center" /> phút</span>
              </div>
            </div>
          </div>
        </section>

        {/* Questions List */}
        <div className="space-y-6">
          {questions.map((question, qIdx) => (
            <div key={question.id} className="group bg-white rounded-3xl shadow-sm border-2 border-transparent hover:border-gray-100 transition-all overflow-hidden opacity-0 animate-fade-up" style={{ animationDelay: `${qIdx * 50}ms` }}>
              {/* Question Header */}
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-b">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-sm font-bold shadow-sm border">
                    {qIdx + 1}
                  </span>
                  <div className="h-4 w-px bg-gray-200" />
                  <div className="flex items-center gap-2">
                    <select 
                      value={question.type}
                      onChange={(e) => {
                        const newType = e.target.value as QuestionType;
                        const updates: Partial<Question> = { type: newType };
                        
                        if (newType === "text" || newType === "ordering") {
                          updates.options = [{ id: Date.now(), content: question.options[0]?.content || "", is_correct: true }];
                          if (newType === "ordering" && (!question.content || question.content === "Câu hỏi không tên")) {
                            updates.content = "Sắp xếp câu";
                          }
                        } else if (question.options.length === 0) {
                          updates.options = [{ id: Date.now(), content: "Lựa chọn 1", is_correct: true }];
                        }
                        
                        updateQuestion(question.id, updates);
                      }}
                      className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer text-primary outline-none"
                    >
                      <option value="single">Một lựa chọn</option>
                      <option value="multiple">Nhiều lựa chọn</option>
                      <option value="text">Nhập văn bản</option>
                      <option value="ordering">Sắp xếp câu</option>
                    </select>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeQuestion(question.id)}
                  disabled={questions.length <= 1}
                  className="rounded-xl hover:bg-destructive/5 hover:text-destructive text-muted-foreground/50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Question Content */}
              <div className="p-8 space-y-6">
                <div className="relative mb-6">
                  <textarea
                    placeholder="Nhập câu hỏi của bạn..."
                    value={question.content}
                    onChange={(e) => updateQuestion(question.id, { content: e.target.value })}
                    className="w-full text-lg font-bold text-gray-800 bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/40 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/60 resize-none min-h-[80px]"
                    rows={2}
                  />
                </div>

                <div className="space-y-3">
                  {question.type === "text" || question.type === "ordering" ? (
                    <div className="mt-2 text-left">
                      <div className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                        {question.type === "text" ? "Đáp án đúng" : "Nội dung câu đúng (thứ tự đúng)"}
                      </div>
                      <textarea
                        placeholder={question.type === "text" ? "Nhập nội dung đáp án..." : "Nhập câu văn hoàn chỉnh với thứ tự đúng..."}
                        value={question.options[0]?.content || ""}
                        onChange={(e) => updateOptionContent(question.id, question.options[0]?.id, e.target.value)}
                        className="w-full rounded-2xl border-2 border-dashed bg-[#F8FAFC] px-4 py-3 text-sm font-medium focus:border-primary/30 focus:outline-none transition-all resize-none min-h-[80px]"
                      />
                      {question.type === "ordering" && (
                        <p className="mt-2 text-[10px] text-muted-foreground italic">
                          Hệ thống sẽ tự động tách câu này thành các từ và trộn ngẫu nhiên khi học sinh làm bài.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {question.options.map((option, oIdx) => (
                        <div key={option.id} className="flex items-center gap-3 group/option">
                          <button 
                            onClick={() => toggleOptionCorrect(question.id, option.id)}
                            className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                              option.is_correct 
                                ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                                : "border-gray-200 hover:border-primary/50 text-transparent"
                            }`}
                          >
                            {question.type === "single" ? <Circle className="h-3 w-3 fill-current" /> : <CheckSquare className="h-3 w-3" />}
                          </button>
                          
                          <input
                            type="text"
                            placeholder={`Lựa chọn ${oIdx + 1}`}
                            value={option.content}
                            onChange={(e) => updateOptionContent(question.id, option.id, e.target.value)}
                            className="flex-1 bg-transparent border-none text-base font-medium focus:outline-none transition-colors"
                          />
                          
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeOption(question.id, option.id)}
                            disabled={question.options.length <= 1}
                            className="opacity-0 group-hover/option:opacity-100 h-8 w-8 rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 transition-all"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => addOption(question.id)}
                        className="text-primary font-bold px-0 hover:bg-transparent hover:text-primary/80 flex items-center gap-2 mt-2"
                      >
                        <Plus className="h-4 w-4 bg-primary/10 rounded-full p-0.5" />
                        Thêm lựa chọn
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Final Add Question Button */}
        <div className="flex justify-center pb-20">
          <Button 
            onClick={addQuestion}
            variant="outline"
            className="w-full max-w-sm h-14 rounded-full border-2 border-primary bg-white text-primary hover:bg-primary/5 transition-all text-lg font-bold group shadow-md shadow-primary/10"
          >
            <Plus className="mr-3 h-6 w-6 transform group-hover:rotate-90 transition-transform" />
            Thêm câu hỏi mới
          </Button>
        </div>
      </main>
    </div>
  );
}

function X(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
