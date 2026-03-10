import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { supabase } from "../../../../core/infrastructure/supabaseClient";
import { useAuth } from "../../../../core/context/AuthContext";
import { useTenant } from "../../../../core/context/TenantContext";
import { useBranding } from "../../../../core/context/BrandingContext";
import useTermTheme from "../../../../shared/hooks/useTermTheme";
import { generateTestBundle } from "../../../../core/utils/pdfGenerator";

// ============================================================================
// TEST MAKER PAGE - Production Ready
// Multi-tenant aware, uses useTermTheme
// ============================================================================

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
      console.error("Error loading data:", error);
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
      alert("Please upload a JSON file");
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.title || !data.questions) {
        alert("Invalid test file format");
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
      alert("Failed to load file: " + error.message);
    }

    e.target.value = "";
  };

  const handleGeneratePDF = async (shuffle = false) => {
    if (!testInfo.title || !testInfo.subject || !testInfo.className) {
      alert("Please fill in test title, subject, and class");
      return;
    }
    if (questions.length === 0) {
      alert("Please add at least one question");
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

      alert("Test PDF generated successfully!");
    } catch (error) {
      console.error("PDF error:", error);
      alert("Failed to generate PDF: " + error.message);
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
  const typeStyles = {
    multiple_choice: { label: "Multiple Choice", bg: "bg-blue-50", text: "text-blue-700" },
    true_false: { label: "True/False", bg: "bg-green-50", text: "text-green-700" },
    short_answer: { label: "Short Answer", bg: "bg-amber-50", text: "text-amber-700" },
    essay: { label: "Essay", bg: "bg-purple-50", text: "text-purple-700" },
    fill_blank: { label: "Fill Blank", bg: "bg-pink-50", text: "text-pink-700" },
  };

  const style = typeStyles[question.type] || typeStyles.short_answer;

  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 pt-0.5">
          <GripVertical size={16} className="text-gray-300 group-hover:text-gray-400 cursor-move" />
          <span className="font-bold text-gray-500 text-sm w-6">{index + 1}.</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
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

// ─── Question Modal ──────────────────────────────────────────────────────────

const QuestionModal = ({ question, theme, onClose, onSave }) => {
  const [type, setType] = useState(question?.type || "multiple_choice");
  const [text, setText] = useState(question?.question || "");
  const [options, setOptions] = useState(question?.options || { A: "", B: "", C: "", D: "" });
  const [answer, setAnswer] = useState(question?.correctAnswer || "");

  const handleSave = () => {
    if (!text.trim()) {
      alert("Please enter a question");
      return;
    }
    onSave({
      type,
      question: text,
      options: type === "multiple_choice" ? options : null,
      correctAnswer: answer,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div 
          className="px-6 py-4 flex items-center justify-between text-white"
          style={{ backgroundColor: theme.color }}
        >
          <h3 className="text-lg font-bold">{question ? "Edit Question" : "Add Question"}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white"
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True/False</option>
              <option value="short_answer">Short Answer</option>
              <option value="essay">Essay</option>
              <option value="fill_blank">Fill in the Blank</option>
            </select>
          </div>

          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question *</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none resize-none"
              placeholder="Enter your question..."
            />
          </div>

          {/* Multiple Choice Options */}
          {type === "multiple_choice" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
              <div className="space-y-2">
                {["A", "B", "C", "D"].map(letter => (
                  <div key={letter} className="flex items-center gap-2">
                    <span className="font-medium text-gray-500 w-6 text-sm">{letter})</span>
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
                      className={`p-2 rounded-lg transition-colors ${
                        answer === letter ? "bg-green-100 text-green-600" : "hover:bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* True/False */}
          {type === "true_false" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
              <div className="flex gap-3">
                {["True", "False"].map(val => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tf"
                      value={val}
                      checked={answer === val}
                      onChange={e => setAnswer(e.target.value)}
                      style={{ accentColor: theme.color }}
                    />
                    <span className="text-sm">{val}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Short Answer / Essay */}
          {(type === "short_answer" || type === "essay" || type === "fill_blank") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sample Answer</label>
              <textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none resize-none"
                placeholder="Expected answer..."
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl">
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-xl"
            style={{ backgroundColor: theme.color }}
          >
            {question ? "Update" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── AI Guide Modal ──────────────────────────────────────────────────────────

const AIGuideModal = ({ theme, onClose }) => {
  const [copied, setCopied] = useState(false);

  const prompt = `Create a 10-question test for [SUBJECT] for [CLASS] students about [TOPIC].

Include: 5 multiple choice, 2 true/false, 2 short answer, 1 essay.

Return ONLY valid JSON:
{
  "title": "Test Title",
  "subject": "Subject",
  "className": "Y5",
  "duration": 45,
  "totalPoints": 100,
  "instructions": "Read carefully.",
  "questions": [
    {"type": "multiple_choice", "question": "What is 2+2?", "options": {"A": "3", "B": "4", "C": "5", "D": "6"}, "correctAnswer": "B"},
    {"type": "true_false", "question": "The sun is a star.", "correctAnswer": "True"},
    {"type": "short_answer", "question": "Define photosynthesis.", "correctAnswer": "Plants convert sunlight to energy."}
  ]
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div 
          className="px-6 py-4 flex items-center justify-between text-white"
          style={{ backgroundColor: theme.color }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={20} />
            <h3 className="text-lg font-bold">AI Test Generator</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            {["1. Copy prompt", "2. Paste in ChatGPT", "3. Upload JSON"].map((step, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-xl">
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mx-auto mb-1"
                  style={{ backgroundColor: theme.color }}
                >
                  {i + 1}
                </div>
                <p className="text-xs text-gray-600">{step.split(". ")[1]}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Prompt Template</label>
              <button
                onClick={handleCopy}
                className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors ${
                  copied ? "bg-green-100 text-green-700" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="bg-gray-900 rounded-xl p-4 text-xs text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
              {prompt}
            </pre>
          </div>

          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
            <div className="flex gap-2">
              <HelpCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                <strong>Tip:</strong> Replace [SUBJECT], [CLASS], [TOPIC] with your values. Remove any markdown from ChatGPT's response before saving as .json
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50">
          <button onClick={onClose} className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestMakerPage;