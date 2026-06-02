import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Download,
  Shuffle,
  Sparkles,
  Upload,
  GripVertical,
  Edit2,
  Clock,
  Award,
  BookOpen,
  ChevronDown,
  X,
  Copy,
  Check,
  HelpCircle,
  Calendar,
  Users,
  Loader2,
  GitBranch,
  Code2,
  Calculator,
  MessageSquare,
  AlignLeft,
  Type,
  CheckSquare,
  ToggleLeft,
  Pencil,
  Eraser,
  RotateCcw,
  Square,
  Circle,
  Diamond,
  ArrowRight,
  Minus,
} from "lucide-react";
import { useApp } from "../../../../core/context/AppContext";
import { useAuth } from "../../../../core/context/AuthContext";
import { useTenant } from "../../../../core/context/TenantContext";
import { useBranding } from "../../../../core/context/BrandingContext";
import useTermTheme from "../../../../shared/hooks/useTermTheme";
import { generateTestBundle } from "../../../../core/utils/pdfGenerator";
import { toast } from "../../../../core/components/Toast";

// ============================================================================
// TEST MAKER PAGE - Production Ready
// Multi-tenant aware, uses useTermTheme
// ============================================================================

// ─── Question Type Registry ─────────────────────────────────────────────────

const QUESTION_TYPES = [
  {
    id: "multiple_choice",
    label: "Multiple Choice",
    desc: "A / B / C / D options with one correct answer",
    icon: CheckSquare,
    bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700",
  },
  {
    id: "true_false",
    label: "True / False",
    desc: "Binary choice question",
    icon: ToggleLeft,
    bg: "bg-green-50", border: "border-green-200", text: "text-green-700",
  },
  {
    id: "short_answer",
    label: "Short Answer",
    desc: "Brief written response with answer lines",
    icon: MessageSquare,
    bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700",
  },
  {
    id: "essay",
    label: "Essay",
    desc: "Extended written response, multiple lines",
    icon: AlignLeft,
    bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700",
  },
  {
    id: "fill_blank",
    label: "Fill in Blank",
    desc: "Complete the missing word or phrase",
    icon: Type,
    bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-700",
  },
  {
    id: "flowchart",
    label: "Flowchart",
    desc: "Students draw a flow diagram in blank area",
    icon: GitBranch,
    bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700",
  },
  {
    id: "algorithm",
    label: "Algorithm",
    desc: "Write pseudocode steps in a code-style box",
    icon: Code2,
    bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700",
  },
  {
    id: "math_graph",
    label: "Math / Grid",
    desc: "Graph paper area for diagrams and working",
    icon: Calculator,
    bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700",
  },
];

const INSTRUCTION_PRESETS = [
  { id: "standard", label: "Standard Test", text: "Read all questions carefully before answering. Write your answers clearly. Check your work before submitting." },
  { id: "no_calculator", label: "No Calculator", text: "Calculators are NOT allowed. Show all working for full credit. Read each question carefully." },
  { id: "calculator_allowed", label: "Calculator Allowed", text: "Calculators may be used. Show all working clearly. Label your answers with correct units where applicable." },
  { id: "open_book", label: "Open Book", text: "This is an open book examination. You may use your textbook and notes. No electronic devices allowed." },
  { id: "multiple_choice", label: "Multiple Choice", text: "Choose the best answer for each question. Mark your answers clearly. Only one answer per question." },
  { id: "essay", label: "Essay Writing", text: "Plan your answers before writing. Use paragraphs and proper structure. Support your points with evidence." },
  { id: "science", label: "Science Practical", text: "Follow safety guidelines at all times. Record all observations accurately. Include units in measurements." },
  { id: "custom", label: "Custom", text: "" },
];

const TestMakerPage = () => {
  const { schoolId } = useTenant();
  const { supabase } = useApp(); // 🔒 tenantSupabase — auto-adds school_id filter
  const { teacher } = useAuth();
  const branding = useBranding();
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  // Data
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Test state
  const [testInfo, setTestInfo] = useState({
    title: "",
    subject: "",
    className: "",
    date: new Date().toISOString().split("T")[0],
    duration: 45,
    totalPoints: 100,
    instructionPreset: "standard",
    instructions: INSTRUCTION_PRESETS[0].text,
    teacherName: teacher?.full_name || "",
  });

  const [questions, setQuestions] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [showAIGuide, setShowAIGuide] = useState(false);

  // ─── Load Data ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!schoolId || !teacher) return;

    try {
      setLoading(true);

      // Load subjects for this teacher
      if (teacher.subjects?.length > 0) {
        const { data: subjectsData } = await supabase
          .from("custom_subjects")
          .select("*")
          .eq("school_id", schoolId)
          .eq("is_active", true)
          .in("subject_name", teacher.subjects)
          .order("subject_name");
        setSubjects(subjectsData || []);
      }

      // Load classes this teacher teaches
      const { data: teacherClasses } = await supabase
        .from("teacher_schedule")
        .select("class_name")
        .eq("school_id", schoolId)
        .eq("teacher_id", teacher.user_id);

      const uniqueClassNames = [...new Set(teacherClasses?.map(c => c.class_name) || [])];
      
      if (teacher.class_teacher_for && !uniqueClassNames.includes(teacher.class_teacher_for)) {
        uniqueClassNames.push(teacher.class_teacher_for);
      }

      if (uniqueClassNames.length > 0) {
        const { data: classesData } = await supabase
          .from("custom_classes")
          .select("*")
          .eq("school_id", schoolId)
          .eq("is_active", true)
          .in("class_name", uniqueClassNames)
          .order("class_name");
        setClasses(classesData || []);
      }

    } catch (error) {
      console.error("Error loading data:", error.message);
    } finally {
      setLoading(false);
    }
  }, [schoolId, teacher]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const calculatePointsPerQuestion = () => {
    if (questions.length === 0) return 0;
    return Math.floor(testInfo.totalPoints / questions.length);
  };

  const handleInstructionChange = (presetId) => {
    const preset = INSTRUCTION_PRESETS.find(p => p.id === presetId);
    setTestInfo({
      ...testInfo,
      instructionPreset: presetId,
      instructions: preset?.text || "",
    });
  };

  const addQuestion = (questionData) => {
    const points = calculatePointsPerQuestion() || Math.floor(testInfo.totalPoints / (questions.length + 1));
    setQuestions([...questions, { id: Date.now(), ...questionData, points }]);
    setShowAddModal(false);
  };

  const updateQuestion = (id, data) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...data } : q));
    setEditingQuestion(null);
  };

  const deleteQuestion = (id) => {
    if (window.confirm("Delete this question?")) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith(".json")) {
      toast.warning("Please upload a JSON file");
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.title || !data.questions) {
        toast.warning("Invalid test file format");
        return;
      }

      setTestInfo({
        title: data.title || "",
        subject: data.subject || "",
        className: data.className || "",
        date: data.date || new Date().toISOString().split("T")[0],
        duration: data.duration || 45,
        totalPoints: data.totalPoints || 100,
        instructionPreset: "custom",
        instructions: data.instructions || "",
        teacherName: teacher?.full_name || "",
      });

      setQuestions(data.questions.map((q, i) => ({
        ...q,
        id: Date.now() + i,
        points: Math.floor((data.totalPoints || 100) / data.questions.length),
      })));

      setUploadedFile(file.name);
    } catch (error) {
      toast.error("Failed to load file: " + error.message);
    }

    e.target.value = "";
  };

  const handleGeneratePDF = async (shuffle = false) => {
    if (!testInfo.title || !testInfo.subject || !testInfo.className) {
      toast.warning("Please fill in test title, subject, and class");
      return;
    }
    if (questions.length === 0) {
      toast.warning("Please add at least one question");
      return;
    }

    try {
      setGenerating(true);

      await generateTestBundle({
        ...testInfo,
        questions,
        schoolName: branding.name,
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor,
        pdfHeaderText: branding.pdfHeaderText || branding.name,
        pdfFooterText: branding.pdfFooterText || "",
        tagline: branding.tagline || "",
        showLogoInPdf: branding.showLogoInPdf !== false,
      }, shuffle);

      toast.success("Test PDF generated successfully!");
    } catch (error) {
      console.error("PDF error:", error.message);
      toast.error("Failed to generate PDF: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin" style={{ color: theme.color }} />
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* ═══ TERM BANNER ═══ */}
      {theme.hasActiveTerm && (
        <div 
          className="rounded-xl px-4 py-2.5 flex items-center justify-between"
          style={{ backgroundColor: theme.withAlpha(0.1), borderWidth: '1px', borderColor: theme.withAlpha(0.2) }}
        >
          <div className="flex items-center gap-2">
            <TermIcon size={16} style={theme.textStyle} />
            <span className="text-sm font-semibold" style={theme.textStyle}>{theme.name} Term</span>
          </div>
          <span className="text-xs font-medium" style={theme.textStyle}>{theme.daysRemaining} days left</span>
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div 
        className="bg-white rounded-2xl shadow-lg p-6 border"
        style={{ borderColor: theme.withAlpha(0.2) }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: theme.withAlpha(0.15) }}
            >
              <FileText size={24} style={{ color: theme.color }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Test Maker</h2>
              <p className="text-gray-500 text-sm">Create assessments with PDF export</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl cursor-pointer transition-colors">
              <Upload size={16} />
              <span className="hidden sm:inline">Upload JSON</span>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => setShowAIGuide(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl transition-colors"
              style={{ backgroundColor: theme.withAlpha(0.1), color: theme.color }}
            >
              <Sparkles size={16} />
              <span className="hidden sm:inline">AI Guide</span>
            </button>

            <button
              onClick={() => handleGeneratePDF(false)}
              disabled={generating || questions.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
              style={{ backgroundColor: theme.color }}
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              <span className="hidden sm:inline">Generate PDF</span>
            </button>

            <button
              onClick={() => handleGeneratePDF(true)}
              disabled={generating || questions.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-xl transition-all disabled:opacity-50"
            >
              <Shuffle size={16} />
              <span className="hidden sm:inline">Shuffle</span>
            </button>
          </div>
        </div>

        {/* Uploaded file indicator */}
        {uploadedFile && (
          <div 
            className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
            style={{ backgroundColor: theme.withAlpha(0.1), color: theme.color }}
          >
            <Check size={16} />
            <span>Loaded: <strong>{uploadedFile}</strong></span>
            <button onClick={() => setUploadedFile(null)} className="ml-auto p-1 hover:bg-white/50 rounded">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ═══ TEST INFO ═══ */}
      <div 
        className="bg-white rounded-2xl shadow-lg border overflow-hidden"
        style={{ borderColor: theme.withAlpha(0.15) }}
      >
        <div 
          className="px-5 py-4 border-b flex items-center gap-3"
          style={{ backgroundColor: theme.withAlpha(0.05), borderColor: theme.withAlpha(0.15) }}
        >
          <BookOpen size={20} style={{ color: theme.color }} />
          <h3 className="font-bold text-gray-800">Test Information</h3>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input
                type="text"
                value={testInfo.title}
                onChange={(e) => setTestInfo({ ...testInfo, title: e.target.value })}
                placeholder="e.g., Unit 3 Assessment"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': theme.withAlpha(0.3) }}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar size={14} className="inline mr-1" /> Date
              </label>
              <input
                type="date"
                value={testInfo.date}
                onChange={(e) => setTestInfo({ ...testInfo, date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <select
                value={testInfo.subject}
                onChange={(e) => setTestInfo({ ...testInfo, subject: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white"
              >
                <option value="">Select...</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.subject_name}>{s.subject_name}</option>
                ))}
              </select>
            </div>

            {/* Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
              <select
                value={testInfo.className}
                onChange={(e) => setTestInfo({ ...testInfo, className: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white"
              >
                <option value="">Select...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.class_name}>{c.class_name}</option>
                ))}
              </select>
            </div>

            {/* Duration & Points */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock size={14} className="inline mr-1" /> Duration
                </label>
                <input
                  type="number"
                  value={testInfo.duration}
                  onChange={(e) => setTestInfo({ ...testInfo, duration: parseInt(e.target.value) || 45 })}
                  min="15" max="180" step="5"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Award size={14} className="inline mr-1" /> Points
                </label>
                <input
                  type="number"
                  value={testInfo.totalPoints}
                  onChange={(e) => setTestInfo({ ...testInfo, totalPoints: parseInt(e.target.value) || 100 })}
                  min="10" max="500" step="5"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>
            </div>

            {/* Instructions Preset */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions Template</label>
              <select
                value={testInfo.instructionPreset}
                onChange={(e) => handleInstructionChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white"
              >
                {INSTRUCTION_PRESETS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Instructions Text */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
              <textarea
                value={testInfo.instructions}
                onChange={(e) => setTestInfo({ ...testInfo, instructions: e.target.value, instructionPreset: "custom" })}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none resize-none"
                placeholder="Instructions for students..."
              />
            </div>
          </div>

          {/* Points Summary */}
          {questions.length > 0 && (
            <div 
              className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ backgroundColor: theme.withAlpha(0.08), border: `1px solid ${theme.withAlpha(0.2)}` }}
            >
              <Award size={18} style={{ color: theme.color }} />
              <p className="text-sm" style={{ color: theme.color }}>
                <strong>{questions.length}</strong> questions × <strong>{calculatePointsPerQuestion()}</strong> pts = <strong>{testInfo.totalPoints}</strong> total
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ QUESTIONS ═══ */}
      <div 
        className="bg-white rounded-2xl shadow-lg border overflow-hidden"
        style={{ borderColor: theme.withAlpha(0.15) }}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <FileText size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Questions</h3>
              <p className="text-sm text-gray-500">{questions.length} added</p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-white text-sm font-medium rounded-xl transition-all"
            style={{ backgroundColor: theme.color }}
          >
            <Plus size={16} /> Add
          </button>
        </div>

        <div className="p-5">
          {questions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <FileText size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium mb-1">No questions yet</p>
              <p className="text-gray-400 text-sm mb-4">Add questions manually or use AI</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 text-white text-sm font-medium rounded-xl"
                  style={{ backgroundColor: theme.color }}
                >
                  Add Question
                </button>
                <button
                  onClick={() => setShowAIGuide(true)}
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl"
                >
                  AI Guide
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={idx}
                  theme={theme}
                  onEdit={() => setEditingQuestion(q)}
                  onDelete={() => deleteQuestion(q.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      {showAddModal && (
        <QuestionModal
          theme={theme}
          onClose={() => setShowAddModal(false)}
          onSave={addQuestion}
        />
      )}

      {editingQuestion && (
        <QuestionModal
          question={editingQuestion}
          theme={theme}
          onClose={() => setEditingQuestion(null)}
          onSave={(data) => updateQuestion(editingQuestion.id, data)}
        />
      )}

      {showAIGuide && (
        <AIGuideModal theme={theme} onClose={() => setShowAIGuide(false)} />
      )}
    </div>
  );
};

// ─── Question Card ───────────────────────────────────────────────────────────

const QuestionCard = ({ question, index, theme, onEdit, onDelete }) => {
  const typeConfig = QUESTION_TYPES.find(qt => qt.id === question.type) || QUESTION_TYPES[2];
  const style = { label: typeConfig.label, bg: typeConfig.bg, text: typeConfig.text };
  const TypeIcon = typeConfig.icon;

  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 pt-0.5">
          <GripVertical size={16} className="text-gray-300 group-hover:text-gray-400 cursor-move" />
          <span className="font-bold text-gray-500 text-sm w-6">{index + 1}.</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
              <TypeIcon size={10} />
              {style.label}
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: theme.withAlpha(0.15), color: theme.color }}
            >
              {question.points} pts
            </span>
          </div>

          <p className="text-gray-800 text-sm">{question.question}</p>

          {question.type === "multiple_choice" && question.options && (
            <div className="mt-2 ml-2 space-y-0.5">
              {["A", "B", "C", "D"].map(letter =>
                question.options[letter] && (
                  <p key={letter} className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="font-medium">{letter})</span> {question.options[letter]}
                    {question.correctAnswer === letter && <Check size={12} className="text-green-600 ml-1" />}
                  </p>
                )
              )}
            </div>
          )}

          {question.type === "true_false" && (
            <p className="text-xs text-gray-500 mt-1">
              Answer: <span className="font-medium text-green-600">{question.correctAnswer}</span>
            </p>
          )}

          {question.type === "algorithm" && question.starterCode && (
            <pre className="mt-2 text-xs text-gray-500 bg-slate-50 rounded-lg p-2 font-mono overflow-x-auto whitespace-pre-wrap border border-slate-200">
              {question.starterCode.slice(0, 120)}{question.starterCode.length > 120 ? "…" : ""}
            </pre>
          )}

          {(question.type === "flowchart" || question.type === "math_graph") && (
            <p className="text-xs text-gray-400 mt-1 italic">
              {question.type === "flowchart"
                ? "PDF: blank area with flowchart symbol guide"
                : "PDF: graph paper grid for working / diagrams"}
            </p>
          )}
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
            <Edit2 size={14} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Fill-in-blank parser ───────────────────────────────────────────────────
// Teacher writes: "Water boils at [100] degrees." → student sees underscores

const parseFillBlank = (text = '') => {
  const blanks = [];
  const studentText = text.replace(/\[([^\]]+)\]/g, (_, word) => {
    blanks.push(word);
    return '_'.repeat(Math.max(8, word.length + 4));
  });
  return { studentText, blanks };
};

// ─── Drawing Canvas ─────────────────────────────────────────────────────────

const DRAW_TOOLS = [
  { id: 'pen',     label: 'Pen',       icon: Pencil    },
  { id: 'eraser',  label: 'Eraser',    icon: Eraser    },
  { id: 'line',    label: 'Line',      icon: Minus     },
  { id: 'arrow',   label: 'Arrow',     icon: ArrowRight },
  { id: 'rect',    label: 'Rectangle', icon: Square    },
  { id: 'oval',    label: 'Oval',      icon: Circle    },
  { id: 'diamond', label: 'Diamond',   icon: Diamond   },
  { id: 'text',    label: 'Text',      icon: Type      },
];

const CANVAS_W = 440;
const CANVAS_H = 210;
const GRID_PX  = 10;

const _drawBg = (ctx, bg) => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  if (bg !== 'grid') return;
  ctx.strokeStyle = '#c7dcf5'; ctx.lineWidth = 0.4;
  for (let x = 0; x <= CANVAS_W; x += GRID_PX) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CANVAS_H); ctx.stroke(); }
  for (let y = 0; y <= CANVAS_H; y += GRID_PX) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CANVAS_W,y); ctx.stroke(); }
  ctx.strokeStyle = '#a8c8ed'; ctx.lineWidth = 0.7;
  for (let x = 0; x <= CANVAS_W; x += GRID_PX*5) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CANVAS_H); ctx.stroke(); }
  for (let y = 0; y <= CANVAS_H; y += GRID_PX*5) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(CANVAS_W,y); ctx.stroke(); }
};

const _execShape = (ctx, tool, s, e, col, w) => {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const { x: sx, y: sy } = s; const { x: ex, y: ey } = e;
  if (tool === 'line') {
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.stroke();
  } else if (tool === 'arrow') {
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.stroke();
    const a = Math.atan2(ey-sy, ex-sx), hl = Math.max(10, w*5);
    ctx.beginPath();
    ctx.moveTo(ex,ey); ctx.lineTo(ex - hl*Math.cos(a-0.5), ey - hl*Math.sin(a-0.5));
    ctx.moveTo(ex,ey); ctx.lineTo(ex - hl*Math.cos(a+0.5), ey - hl*Math.sin(a+0.5));
    ctx.stroke();
  } else if (tool === 'rect') {
    ctx.beginPath(); ctx.strokeRect(sx, sy, ex-sx, ey-sy);
  } else if (tool === 'oval') {
    ctx.beginPath();
    ctx.ellipse((sx+ex)/2, (sy+ey)/2, Math.abs(ex-sx)/2, Math.abs(ey-sy)/2, 0, 0, 2*Math.PI);
    ctx.stroke();
  } else if (tool === 'diamond') {
    const cx=(sx+ex)/2, cy=(sy+ey)/2;
    ctx.beginPath(); ctx.moveTo(cx,sy); ctx.lineTo(ex,cy); ctx.lineTo(cx,ey); ctx.lineTo(sx,cy);
    ctx.closePath(); ctx.stroke();
  }
};

const DrawingCanvas = ({ background = 'plain', onChange, initialValue }) => {
  const canvasRef    = useRef(null);
  const isDownRef    = useRef(false);
  const startRef     = useRef({ x: 0, y: 0 });
  const savedRef     = useRef(null);
  const toolRef      = useRef('pen');
  const colorRef     = useRef('#1e293b');
  const widthRef     = useRef(2);
  const undoRef      = useRef([]);

  const [activeTool, setActiveTool] = useState('pen');
  const [color,      setColor]      = useState('#1e293b');
  const [strokeW,    setStrokeW]    = useState(2);
  const [canUndo,    setCanUndo]    = useState(false);

  useEffect(() => { toolRef.current  = activeTool; }, [activeTool]);
  useEffect(() => { colorRef.current = color;       }, [color]);
  useEffect(() => { widthRef.current = strokeW;     }, [strokeW]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    _drawBg(ctx, background);
    const snap = () => { undoRef.current = [canvas.toDataURL()]; setCanUndo(false); };
    if (initialValue) {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H); snap(); };
      img.src = initialValue;
    } else {
      snap();
    }
  }, []); // eslint-disable-line

  const pushAndEmit = (canvas) => {
    undoRef.current = [...undoRef.current.slice(-14), canvas.toDataURL()];
    setCanUndo(undoRef.current.length > 1);
    onChange?.(canvas.toDataURL());
  };

  const getPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * (CANVAS_W / r.width), y: (src.clientY - r.top) * (CANVAS_H / r.height) };
  };

  const onDown = (e) => {
    e.preventDefault();
    const p = getPos(e);
    isDownRef.current = true; startRef.current = p;
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    const tool = toolRef.current;
    if (tool === 'text') {
      const txt = window.prompt('Enter text:');
      if (txt) { ctx.font = '13px Arial'; ctx.fillStyle = colorRef.current; ctx.fillText(txt, p.x, p.y); pushAndEmit(canvas); }
      isDownRef.current = false; return;
    }
    if (tool === 'pen' || tool === 'eraser') { ctx.beginPath(); ctx.moveTo(p.x, p.y); }
    else { savedRef.current = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H); }
  };

  const onMove = (e) => {
    if (!isDownRef.current) return;
    e.preventDefault();
    const p = getPos(e); const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    const tool = toolRef.current; const col = colorRef.current; const w = widthRef.current;
    if (tool === 'pen') {
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineTo(p.x, p.y); ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w * 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineTo(p.x, p.y); ctx.stroke();
    } else if (savedRef.current) {
      ctx.putImageData(savedRef.current, 0, 0);
      _execShape(ctx, tool, startRef.current, p, col, w);
    }
  };

  const onUp = (e) => {
    if (!isDownRef.current) return;
    const p = getPos(e); const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    const tool = toolRef.current;
    if (savedRef.current && tool !== 'pen' && tool !== 'eraser') {
      ctx.putImageData(savedRef.current, 0, 0);
      _execShape(ctx, tool, startRef.current, p, colorRef.current, widthRef.current);
      savedRef.current = null;
    }
    pushAndEmit(canvas); isDownRef.current = false;
  };

  const undo = () => {
    if (undoRef.current.length <= 1) return;
    undoRef.current = undoRef.current.slice(0, -1);
    setCanUndo(undoRef.current.length > 1);
    const prev = undoRef.current[undoRef.current.length - 1];
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => { ctx.clearRect(0, 0, CANVAS_W, CANVAS_H); ctx.drawImage(img, 0, 0); onChange?.(prev); };
    img.src = prev;
  };

  const clearAll = () => {
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d');
    _drawBg(ctx, background); pushAndEmit(canvas);
  };

  const cursor = activeTool === 'text' ? 'text' : activeTool === 'eraser' ? 'cell' : 'crosshair';

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 flex-wrap p-1.5 bg-gray-50 rounded-xl border border-gray-200">
        {DRAW_TOOLS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} type="button" title={t.label} onClick={() => setActiveTool(t.id)}
              className={`p-1.5 rounded-lg transition-colors ${activeTool === t.id ? 'bg-white shadow-sm text-blue-600 border border-blue-200' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              <Icon size={14} />
            </button>
          );
        })}
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <input type="color" value={color} onChange={e => setColor(e.target.value)} title="Color"
          className="w-7 h-7 cursor-pointer rounded-md border border-gray-200 p-0.5" />
        <select value={strokeW} onChange={e => setStrokeW(Number(e.target.value))}
          className="text-xs border border-gray-200 bg-white rounded-lg px-1.5 py-1">
          <option value={1}>Thin</option>
          <option value={2}>Normal</option>
          <option value={4}>Thick</option>
        </select>
        <div className="flex-1" />
        <button type="button" title="Undo" onClick={undo} disabled={!canUndo}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors">
          <RotateCcw size={14} />
        </button>
        <button type="button" title="Clear all" onClick={clearAll}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
      {/* Canvas */}
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
        style={{ width: '100%', borderRadius: '10px', border: '1.5px solid #e2e8f0', cursor, display: 'block', touchAction: 'none' }}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
      />
      <p className="text-xs text-gray-400 text-center">
        Students see this drawing on the printed test and complete / fill it in by hand.
      </p>
    </div>
  );
};

// ─── Question Modal ──────────────────────────────────────────────────────────

const QuestionModal = ({ question, theme, onClose, onSave }) => {
  const [type, setType]           = useState(question?.type || "multiple_choice");
  const [text, setText]           = useState(question?.question || "");
  const [options, setOptions]     = useState(question?.options || { A: "", B: "", C: "", D: "" });
  const [answer, setAnswer]       = useState(question?.correctAnswer || "");
  const [starterCode, setStarterCode] = useState(question?.starterCode || "");
  const [drawing, setDrawing]     = useState(question?.drawing || null);

  const selectedType = QUESTION_TYPES.find(qt => qt.id === type);

  const handleSave = () => {
    if (!text.trim()) {
      toast.warning("Please enter a question");
      return;
    }
    // For fill_blank: auto-extract answer from [brackets] if no manual answer
    let effectiveAnswer = answer;
    if (type === "fill_blank" && !answer.trim()) {
      const { blanks } = parseFillBlank(text);
      if (blanks.length > 0) effectiveAnswer = blanks.join(" / ");
    }
    onSave({
      type,
      question: text,
      options: type === "multiple_choice" ? options : null,
      correctAnswer: effectiveAnswer,
      ...(type === "algorithm" && starterCode.trim() ? { starterCode } : {}),
      ...((type === "flowchart" || type === "math_graph") && drawing ? { drawing } : {}),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between text-white rounded-t-2xl"
          style={{ backgroundColor: theme.color }}
        >
          <h3 className="text-lg font-bold">{question ? "Edit Question" : "Add Question"}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Visual Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {QUESTION_TYPES.map(qt => {
                const Icon = qt.icon;
                const isSelected = type === qt.id;
                return (
                  <button
                    key={qt.id}
                    type="button"
                    onClick={() => setType(qt.id)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-center ${
                      isSelected
                        ? `${qt.bg} ${qt.border} ${qt.text}`
                        : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <Icon size={16} />
                    <span className="text-xs font-semibold leading-tight">{qt.label}</span>
                  </button>
                );
              })}
            </div>
            {selectedType && (
              <p className="text-xs text-gray-500 mt-2 ml-1">{selectedType.desc}</p>
            )}
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none resize-none"
              placeholder="Enter your question..."
              autoFocus
            />
          </div>

          {/* Multiple Choice Options */}
          {type === "multiple_choice" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options <span className="text-gray-400 font-normal text-xs">(click ✓ to mark correct)</span>
              </label>
              <div className="space-y-2">
                {["A", "B", "C", "D"].map(letter => (
                  <div key={letter} className="flex items-center gap-2">
                    <span className="font-bold text-gray-400 w-6 text-sm text-center">{letter}</span>
                    <input
                      type="text"
                      value={options[letter]}
                      onChange={e => setOptions({ ...options, [letter]: e.target.value })}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none"
                      placeholder={`Option ${letter}`}
                    />
                    <button
                      type="button"
                      onClick={() => setAnswer(letter)}
                      title="Mark as correct"
                      className={`p-2 rounded-lg transition-all border ${
                        answer === letter
                          ? "bg-green-100 text-green-600 border-green-300"
                          : "text-gray-300 border-gray-200 hover:text-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <Check size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* True / False */}
          {type === "true_false" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
              <div className="flex gap-3">
                {["True", "False"].map(val => (
                  <label
                    key={val}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                      answer === val
                        ? "bg-green-50 border-green-400 text-green-700 font-semibold"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tf"
                      value={val}
                      checked={answer === val}
                      onChange={e => setAnswer(e.target.value)}
                      className="sr-only"
                    />
                    {answer === val && <Check size={14} className="text-green-600" />}
                    <span className="text-sm">{val}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Fill in Blank – smart bracket syntax */}
          {type === "fill_blank" && (
            <>
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                <Type size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  Wrap each missing word in <strong>[square brackets]</strong>. The PDF replaces them with blank lines automatically.{" "}
                  Example: <code className="bg-blue-100 px-1 rounded">Water boils at [100] degrees.</code>
                </p>
              </div>

              {parseFillBlank(text).blanks.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1.5 text-xs">
                  <p className="font-semibold text-gray-600">Live preview</p>
                  <p>
                    <span className="text-gray-400">Student sees: </span>
                    <span className="text-gray-800">{parseFillBlank(text).studentText}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">Answer key: </span>
                    <span className="font-medium text-green-700">{parseFillBlank(text).blanks.join(" / ")}</span>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Answer Override{" "}
                  <span className="text-gray-400 font-normal text-xs">(optional — overrides auto-extracted answers)</span>
                </label>
                <input
                  type="text"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  placeholder="Leave blank to auto-extract from [brackets]"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Short Answer / Essay */}
          {(type === "short_answer" || type === "essay") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sample Answer <span className="text-gray-400 font-normal text-xs">(for answer key)</span>
              </label>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                rows={type === "essay" ? 4 : 2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none resize-none"
                placeholder="Expected answer..."
              />
            </div>
          )}

          {/* Algorithm – Starter Code + Model Solution */}
          {type === "algorithm" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Starter Code / Template{" "}
                  <span className="text-gray-400 font-normal text-xs">(optional — shown to students)</span>
                </label>
                <textarea
                  value={starterCode}
                  onChange={e => setStarterCode(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none resize-none font-mono bg-slate-50 text-slate-800"
                  placeholder={"BEGIN\n  INPUT x\n  // students continue here\nEND"}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Pre-filled in the student test. Leave blank for an empty code box.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Solution{" "}
                  <span className="text-gray-400 font-normal text-xs">(for answer key only — students never see this)</span>
                </label>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 text-sm border border-green-100 rounded-xl focus:outline-none resize-none font-mono bg-green-50 text-green-900"
                  placeholder={"BEGIN\n  total = 0\n  FOR i FROM 1 TO 5\n    INPUT num\n    total = total + num\n  END FOR\n  OUTPUT total / 5\nEND"}
                />
              </div>
            </>
          )}

          {/* Flowchart – Drawing Canvas + Model Answer */}
          {type === "flowchart" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teacher Drawing{" "}
                  <span className="text-gray-400 font-normal text-xs">
                    (draw a partial flowchart — students complete it on the printout)
                  </span>
                </label>
                <DrawingCanvas background="plain" onChange={setDrawing} initialValue={drawing} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Answer / Notes{" "}
                  <span className="text-gray-400 font-normal text-xs">(for answer key only — describe the expected flowchart)</span>
                </label>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-green-100 rounded-xl focus:outline-none resize-none bg-green-50 text-green-900"
                  placeholder="e.g. Start → Input number → Is number > 0? → Yes: Output 'Positive' → End. No: Output 'Negative' → End."
                />
              </div>
            </>
          )}

          {/* Math Grid – Drawing Canvas + Model Answer */}
          {type === "math_graph" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teacher Drawing{" "}
                  <span className="text-gray-400 font-normal text-xs">
                    (draw axes, partial graph, etc. — students complete on the graph paper printout)
                  </span>
                </label>
                <DrawingCanvas background="grid" onChange={setDrawing} initialValue={drawing} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model Answer / Notes{" "}
                  <span className="text-gray-400 font-normal text-xs">(for answer key only)</span>
                </label>
                <textarea
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-green-100 rounded-xl focus:outline-none resize-none bg-green-50 text-green-900"
                  placeholder="e.g. Points: (0,3), (1,5), (2,7), (-1,1), (-2,-1). Straight line, gradient = 2, y-intercept = 3."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors"
            style={{ backgroundColor: theme.color }}
          >
            {question ? "Update Question" : "Add Question"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── AI Guide Modal ──────────────────────────────────────────────────────────

const TYPE_REFERENCE = [
  {
    id: "multiple_choice", label: "Multiple Choice",
    bg: "bg-blue-50", text: "text-blue-700",
    fields: `"options": { "A": "...", "B": "...", "C": "...", "D": "..." },\n"correctAnswer": "B"`,
    note: "correctAnswer must be a single letter: A, B, C or D",
  },
  {
    id: "true_false", label: "True / False",
    bg: "bg-green-50", text: "text-green-700",
    fields: `"correctAnswer": "True"`,
    note: 'Must be exactly "True" or "False"',
  },
  {
    id: "fill_blank", label: "Fill in Blank",
    bg: "bg-pink-50", text: "text-pink-700",
    fields: `"question": "Plants use [sunlight] and [water] to grow."`,
    note: "Wrap each blank in [brackets] — answers are extracted automatically, no correctAnswer needed",
  },
  {
    id: "short_answer", label: "Short Answer",
    bg: "bg-amber-50", text: "text-amber-700",
    fields: `"correctAnswer": "Expected short response"`,
    note: "Renders as blank writing lines in the student PDF",
  },
  {
    id: "essay", label: "Essay",
    bg: "bg-purple-50", text: "text-purple-700",
    fields: `"correctAnswer": "Sample model answer..."`,
    note: "Larger writing space in PDF",
  },
  {
    id: "algorithm", label: "Algorithm",
    bg: "bg-slate-50", text: "text-slate-700",
    fields: `"starterCode": "BEGIN\\n  INPUT x\\n  // complete\\nEND",\n"correctAnswer": "BEGIN\\n  INPUT x\\n  x = x * 2\\n  OUTPUT x\\nEND"`,
    note: "starterCode is shown to students; correctAnswer is the model solution (answer key only). Both use \\n for newlines in JSON.",
  },
  {
    id: "flowchart", label: "Flowchart",
    bg: "bg-cyan-50", text: "text-cyan-700",
    fields: `"correctAnswer": "Start → Input number → Is number > 0? → Yes: Output 'Positive' → End"`,
    note: "correctAnswer is answer-key notes describing the expected flowchart. The teacher draws the partial diagram inside the app.",
  },
  {
    id: "math_graph", label: "Math / Grid",
    bg: "bg-orange-50", text: "text-orange-700",
    fields: `"correctAnswer": "y = 2x + 1, passes through (0,1) and (2,5)"`,
    note: "correctAnswer is the expected answer/description for the answer key. The teacher draws axes/partial graphs inside the app.",
  },
];

const AIGuideModal = ({ theme, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [tab, setTab]       = useState("prompt");

  const prompt = `You are generating a school test in JSON format.

Create a [N]-question test for [SUBJECT], Class [CLASS], about [TOPIC].

Return ONLY a valid JSON object — no markdown, no code fences, no explanation.

PLACEHOLDER_JSON

STRICT RULES — follow exactly:
• multiple_choice → correctAnswer is a single letter only: "A", "B", "C" or "D"
• true_false      → correctAnswer is exactly "True" or "False"
• fill_blank      → wrap every missing word/phrase in [square brackets] inside the question. Do NOT use underscores. No correctAnswer field.
• short_answer / essay → correctAnswer is the model answer text
• algorithm       → starterCode (optional) is the template shown to students; correctAnswer is the full model solution for the answer key. Both use \\n for line breaks in JSON.
• flowchart       → correctAnswer is a text description of the expected flowchart for the answer key. The teacher draws the partial diagram inside the app — not via JSON.
• math_graph      → correctAnswer describes the expected graph/values for the answer key. The teacher draws axes/partial graphs inside the app — not via JSON.
• Do NOT include any field not shown in the example below.`
    .replace("PLACEHOLDER_JSON", JSON.stringify({
      title: "Unit 4 Test – Photosynthesis",
      subject: "Biology",
      className: "Y8A",
      duration: 45,
      totalPoints: 100,
      instructions: "Read all questions carefully. Show your working where required.",
      questions: [
        { type: "multiple_choice", question: "Which gas do plants absorb during photosynthesis?", options: { A: "Oxygen", B: "Carbon dioxide", C: "Nitrogen", D: "Hydrogen" }, correctAnswer: "B" },
        { type: "true_false", question: "Photosynthesis only occurs during the day.", correctAnswer: "True" },
        { type: "fill_blank", question: "Plants use [sunlight], [water] and [carbon dioxide] to produce glucose and oxygen." },
        { type: "short_answer", question: "Name the two products of photosynthesis.", correctAnswer: "Glucose and oxygen" },
        { type: "essay", question: "Explain the process of photosynthesis and why it is important for life on Earth.", correctAnswer: "Photosynthesis is the process by which green plants convert sunlight into chemical energy stored as glucose. It is essential for life because it produces oxygen and forms the base of most food chains." },
        { type: "algorithm", question: "Write pseudocode to calculate the average of five numbers.", starterCode: "BEGIN\n  total = 0\n  count = 5\n  // Add your code here\nEND", correctAnswer: "BEGIN\n  total = 0\n  FOR i FROM 1 TO 5\n    INPUT num\n    total = total + num\n  END FOR\n  OUTPUT total / 5\nEND" },
        { type: "flowchart", question: "Draw a flowchart showing how a plant cell carries out photosynthesis step by step.", correctAnswer: "Start → Absorb sunlight (chlorophyll) → Take in CO2 (stomata) → Take in H2O (roots) → Produce glucose + O2 → End" },
        { type: "math_graph", question: "Plot the rate of photosynthesis (y-axis) against light intensity (x-axis) using the data in the table.", correctAnswer: "Curve rises steeply at low light, then levels off (plateau) at high light intensity due to limiting factors. Points: (0,0), (10,10), (20,18), (30,22), (40,23)" },
      ],
    }, null, 2));

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between text-white rounded-t-2xl" style={{ backgroundColor: theme.color }}>
          <div className="flex items-center gap-2">
            <Sparkles size={20} />
            <h3 className="text-lg font-bold">AI Test Generator</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} /></button>
        </div>

        {/* Steps */}
        <div className="px-6 pt-5 grid grid-cols-3 gap-3">
          {[
            { n: 1, label: "Copy prompt below" },
            { n: 2, label: "Paste into ChatGPT or any AI" },
            { n: 3, label: 'Save as .json & Upload' },
          ].map(s => (
            <div key={s.n} className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-center">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mx-auto mb-1.5" style={{ backgroundColor: theme.color }}>
                {s.n}
              </div>
              <p className="text-xs text-gray-600 font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
            {[{ id: "prompt", label: "Prompt Template" }, { id: "types", label: "Type Reference" }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${tab === t.id ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 pt-3 space-y-3">

          {/* ── Prompt tab ── */}
          {tab === "prompt" && (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500">
                  Replace <code className="bg-gray-100 px-1 rounded">[N]</code>{" "}
                  <code className="bg-gray-100 px-1 rounded">[SUBJECT]</code>{" "}
                  <code className="bg-gray-100 px-1 rounded">[CLASS]</code>{" "}
                  <code className="bg-gray-100 px-1 rounded">[TOPIC]</code> with your values.
                </p>
                <button onClick={handleCopy}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex-shrink-0 ${copied ? "bg-green-100 text-green-700" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy prompt"}
                </button>
              </div>

              <pre className="bg-gray-950 rounded-xl p-4 text-xs text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto leading-relaxed max-h-96 overflow-y-auto">
                {prompt}
              </pre>

              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 flex gap-2">
                <HelpCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  <strong>After the AI responds:</strong> the reply should start with <code className="bg-amber-100 px-1 rounded">{`{`}</code> and end with <code className="bg-amber-100 px-1 rounded">{`}`}</code> — no extra text. Save it as <code className="bg-amber-100 px-1 rounded">.json</code> and upload using the button in the page header.
                </p>
              </div>
            </>
          )}

          {/* ── Type Reference tab ── */}
          {tab === "types" && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-3">All 8 question types — required JSON fields and notes for each.</p>
              {TYPE_REFERENCE.map(tr => (
                <div key={tr.id} className={`rounded-xl border p-3 ${tr.bg}`}>
                  <div className="flex items-start gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg bg-white/60 ${tr.text} flex-shrink-0 mt-0.5 whitespace-nowrap`}>
                      {tr.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <code className="text-xs text-gray-700 font-mono block whitespace-pre-wrap break-words leading-relaxed">
                        {tr.fields}
                      </code>
                      {tr.note && (
                        <p className={`text-xs mt-1.5 ${tr.text} opacity-80`}>{tr.note}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestMakerPage;