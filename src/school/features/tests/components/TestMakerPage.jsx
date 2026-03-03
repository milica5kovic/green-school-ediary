import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { useAuth } from "../../../../core/context/AuthContext";
import { useApp } from "../../../../core/context/AppContext";
import { useBranding } from "../../../../core/context/BrandingContext";
import { generateTestBundle } from "../../../../core/utils/pdfGenerator";

// ════════════════════════════════════════════════════════════════════════════
// PREDEFINED INSTRUCTIONS
// ════════════════════════════════════════════════════════════════════════════

const INSTRUCTION_PRESETS = [
  {
    id: "standard",
    label: "Standard Test",
    text: "Read all questions carefully before answering. Write your answers clearly. Check your work before submitting.",
  },
  {
    id: "no_calculator",
    label: "No Calculator",
    text: "Calculators are NOT allowed. Show all working for full credit. Read each question carefully.",
  },
  {
    id: "calculator_allowed",
    label: "Calculator Allowed",
    text: "Calculators may be used. Show all working clearly. Label your answers with correct units where applicable.",
  },
  {
    id: "open_book",
    label: "Open Book",
    text: "This is an open book examination. You may use your textbook and notes. No electronic devices allowed.",
  },
  {
    id: "multiple_choice",
    label: "Multiple Choice Only",
    text: "Choose the best answer for each question. Mark your answers clearly. Only one answer per question.",
  },
  {
    id: "essay",
    label: "Essay/Extended Writing",
    text: "Plan your answers before writing. Use paragraphs and proper structure. Support your points with evidence.",
  },
  {
    id: "science_practical",
    label: "Science Practical",
    text: "Follow safety guidelines at all times. Record all observations accurately. Include units in measurements.",
  },
  {
    id: "custom",
    label: "Custom Instructions",
    text: "",
  },
];

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const TestMakerPage = () => {
  const { supabase } = useApp();
  const { teacher } = useAuth();
  
  // Get ALL branding data for PDF generation
  const branding = useBranding();
  const { primaryColor } = branding;

  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  // Test Data
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
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [uploadedTest, setUploadedTest] = useState(null);
  const [showAIGuide, setShowAIGuide] = useState(false);

  // ══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    loadSubjects();
    loadClasses();
  }, []);

  const loadSubjects = async () => {
    try {
      if (!teacher?.subjects || teacher.subjects.length === 0) {
        setSubjects([]);
        return;
      }

      const { data, error } = await supabase
        .from("custom_subjects")
        .select("*")
        .eq("is_active", true)
        .in("subject_name", teacher.subjects)
        .order("subject_name");

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error("Error loading subjects:", error);
    }
  };

  const loadClasses = async () => {
    try {
      const { data: teacherClasses, error } = await supabase
        .from("classes")
        .select("class_name")
        .eq("teacher_id", teacher?.id);

      if (error) throw error;

      const uniqueClasses = [...new Set(teacherClasses?.map((c) => c.class_name) || [])];

      if (teacher?.class_teacher_for && !uniqueClasses.includes(teacher.class_teacher_for)) {
        uniqueClasses.push(teacher.class_teacher_for);
      }

      if (uniqueClasses.length === 0) {
        setClasses([]);
        return;
      }

      const { data, error: classError } = await supabase
        .from("custom_classes")
        .select("*")
        .eq("is_active", true)
        .in("class_name", uniqueClasses)
        .order("class_name");

      if (classError) throw classError;
      setClasses(data || []);
    } catch (error) {
      console.error("Error loading classes:", error);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  const calculatePointsPerQuestion = () => {
    if (questions.length === 0) return 0;
    return Math.floor(testInfo.totalPoints / questions.length);
  };

  const handleInstructionPresetChange = (presetId) => {
    const preset = INSTRUCTION_PRESETS.find((p) => p.id === presetId);
    setTestInfo({
      ...testInfo,
      instructionPreset: presetId,
      instructions: preset?.text || "",
    });
  };

  const addQuestion = (questionData) => {
    const pointsPerQuestion =
      calculatePointsPerQuestion() || Math.floor(testInfo.totalPoints / (questions.length + 1));

    const newQuestion = {
      id: Date.now(),
      ...questionData,
      points: pointsPerQuestion,
    };

    setQuestions([...questions, newQuestion]);
    setShowAddQuestion(false);
  };

  const updateQuestion = (id, updatedData) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updatedData } : q)));
    setEditingQuestion(null);
  };

  const deleteQuestion = (id) => {
    if (window.confirm("Delete this question?")) {
      setQuestions(questions.filter((q) => q.id !== id));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      alert("Please upload a JSON file");
      return;
    }

    try {
      const text = await file.text();
      const testData = JSON.parse(text);

      if (!testData.title || !testData.questions) {
        alert("Invalid test file format");
        return;
      }

      setTestInfo({
        title: testData.title || "",
        subject: testData.subject || "",
        className: testData.className || "",
        date: testData.date || new Date().toISOString().split("T")[0],
        duration: testData.duration || 45,
        totalPoints: testData.totalPoints || 100,
        instructionPreset: "custom",
        instructions: testData.instructions || "",
        teacherName: teacher?.full_name || "",
      });

      const questionsWithIds = testData.questions.map((q, index) => ({
        ...q,
        id: Date.now() + index,
        points: Math.floor((testData.totalPoints || 100) / testData.questions.length),
      }));

      setQuestions(questionsWithIds);
      setUploadedTest(file.name);
      alert(`Loaded: ${testData.title} with ${questionsWithIds.length} questions`);
    } catch (error) {
      console.error("Error loading test:", error);
      alert("Failed to load test file: " + error.message);
    }

    e.target.value = "";
  };

  const handleGeneratePDF = async (shuffleQuestions = false) => {
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

      const testData = {
        ...testInfo,
        questions: questions,
        // Branding data for PDF - from useBranding() hook
        schoolName: branding.name,
        logoUrl: branding.logoUrl,
        primaryColor: branding.primaryColor,
        pdfHeaderText: branding.pdfHeaderText || branding.name,
        pdfFooterText: branding.pdfFooterText || '',
        tagline: branding.tagline || '',
        showLogoInPdf: branding.showLogoInPdf !== false,
      };

      console.log('📄 Generating PDF with:', {
        schoolName: testData.schoolName,
        logoUrl: testData.logoUrl,
        primaryColor: testData.primaryColor,
      });

      await generateTestBundle(testData, shuffleQuestions);
      alert("Test and Answer Key generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Test Maker</h2>
          <p className="text-gray-500 text-sm mt-1">Create professional assessments with PDF export</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg cursor-pointer transition-colors"
          >
            <Upload size={16} />
            Upload JSON
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={() => setShowAIGuide(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
          >
            <Sparkles size={16} />
            AI Guide
          </button>

          <button
            onClick={() => handleGeneratePDF(false)}
            disabled={generating || questions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            style={{ backgroundColor: primaryColor }}
          >
            <Download size={16} />
            {generating ? "Generating..." : "Generate PDF"}
          </button>

          <button
            onClick={() => handleGeneratePDF(true)}
            disabled={generating || questions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all disabled:opacity-50"
          >
            <Shuffle size={16} />
            Shuffle & PDF
          </button>
        </div>
      </div>

      {/* Uploaded file indicator */}
      {uploadedTest && (
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{ backgroundColor: `${primaryColor}10`, color: primaryColor }}
        >
          <Check size={16} />
          <span>
            Loaded: <strong>{uploadedTest}</strong>
          </span>
          <button
            onClick={() => setUploadedTest(null)}
            className="ml-auto p-1 hover:bg-white/50 rounded"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═══ TEST INFO CARD ═══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div
          className="px-5 py-4 border-b flex items-center gap-3"
          style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}20` }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <FileText size={20} style={{ color: primaryColor }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Test Information</h3>
            <p className="text-sm text-gray-500">Basic details for your assessment</p>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Title */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Test Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={testInfo.title}
                onChange={(e) => setTestInfo({ ...testInfo, title: e.target.value })}
                placeholder="e.g., Unit 3 Assessment - Fractions"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none transition-shadow"
                onFocus={(e) => (e.target.style.boxShadow = `0 0 0 2px ${primaryColor}30`)}
                onBlur={(e) => (e.target.style.boxShadow = "none")}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Calendar size={14} className="inline mr-1" />
                Test Date
              </label>
              <input
                type="date"
                value={testInfo.date}
                onChange={(e) => setTestInfo({ ...testInfo, date: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <BookOpen size={14} className="inline mr-1" />
                Subject <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={testInfo.subject}
                  onChange={(e) => setTestInfo({ ...testInfo, subject: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none appearance-none bg-white"
                >
                  <option value="">Select subject...</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.subject_name}>
                      {s.subject_name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {subjects.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No subjects assigned</p>
              )}
            </div>

            {/* Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Users size={14} className="inline mr-1" />
                Class <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={testInfo.className}
                  onChange={(e) => setTestInfo({ ...testInfo, className: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none appearance-none bg-white"
                >
                  <option value="">Select class...</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.class_name}>
                      {c.class_name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {classes.length === 0 && (
                <p className="text-xs text-gray-400 mt-1">No classes assigned</p>
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Clock size={14} className="inline mr-1" />
                Duration (min)
              </label>
              <input
                type="number"
                value={testInfo.duration}
                onChange={(e) => setTestInfo({ ...testInfo, duration: parseInt(e.target.value) || 45 })}
                min="15"
                max="180"
                step="5"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>

            {/* Total Points */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <Award size={14} className="inline mr-1" />
                Total Points
              </label>
              <input
                type="number"
                value={testInfo.totalPoints}
                onChange={(e) => setTestInfo({ ...testInfo, totalPoints: parseInt(e.target.value) || 100 })}
                min="10"
                max="500"
                step="5"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
              />
            </div>

            {/* Instructions Preset */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Instructions Template
              </label>
              <div className="relative">
                <select
                  value={testInfo.instructionPreset}
                  onChange={(e) => handleInstructionPresetChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none appearance-none bg-white"
                >
                  {INSTRUCTION_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Custom Instructions */}
            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Instructions Text
                {testInfo.instructionPreset !== "custom" && (
                  <span className="text-gray-400 font-normal ml-2">(edit to customize)</span>
                )}
              </label>
              <textarea
                value={testInfo.instructions}
                onChange={(e) =>
                  setTestInfo({ ...testInfo, instructions: e.target.value, instructionPreset: "custom" })
                }
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none"
                placeholder="Enter instructions for students..."
              />
            </div>
          </div>

          {/* Points Summary */}
          {questions.length > 0 && (
            <div
              className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ backgroundColor: `${primaryColor}08`, border: `1px solid ${primaryColor}20` }}
            >
              <Award size={18} style={{ color: primaryColor }} />
              <p className="text-sm" style={{ color: primaryColor }}>
                <strong>{questions.length}</strong> questions × <strong>{calculatePointsPerQuestion()}</strong> points each = <strong>{testInfo.totalPoints}</strong> total
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ QUESTIONS CARD ═══════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <FileText size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Questions</h3>
              <p className="text-sm text-gray-500">{questions.length} question{questions.length !== 1 ? "s" : ""} added</p>
            </div>
          </div>

          <button
            onClick={() => setShowAddQuestion(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus size={16} />
            Add Question
          </button>
        </div>

        <div className="p-5">
          {questions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <FileText size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium mb-1">No questions yet</p>
              <p className="text-gray-400 text-sm mb-4">Add questions manually or use AI to generate them</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowAddQuestion(true)}
                  className="px-4 py-2 text-white text-sm font-medium rounded-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  Add Question
                </button>
                <button
                  onClick={() => setShowAIGuide(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg"
                >
                  Use AI Guide
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {questions.map((q, index) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  index={index}
                  primaryColor={primaryColor}
                  onEdit={() => setEditingQuestion(q)}
                  onDelete={() => deleteQuestion(q.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODALS ═══════════════════════════════════════════════════════════ */}
      {showAddQuestion && (
        <AddQuestionModal
          primaryColor={primaryColor}
          onClose={() => setShowAddQuestion(false)}
          onSave={addQuestion}
        />
      )}

      {editingQuestion && (
        <AddQuestionModal
          question={editingQuestion}
          primaryColor={primaryColor}
          onClose={() => setEditingQuestion(null)}
          onSave={(data) => updateQuestion(editingQuestion.id, data)}
        />
      )}

      {showAIGuide && (
        <AIGuideModal primaryColor={primaryColor} onClose={() => setShowAIGuide(false)} />
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// QUESTION CARD
// ════════════════════════════════════════════════════════════════════════════

const QuestionCard = ({ question, index, primaryColor, onEdit, onDelete }) => {
  const typeConfig = {
    multiple_choice: { label: "Multiple Choice", bg: "bg-blue-50", text: "text-blue-700" },
    true_false: { label: "True/False", bg: "bg-green-50", text: "text-green-700" },
    short_answer: { label: "Short Answer", bg: "bg-amber-50", text: "text-amber-700" },
    essay: { label: "Essay", bg: "bg-purple-50", text: "text-purple-700" },
    fill_blank: { label: "Fill in Blank", bg: "bg-pink-50", text: "text-pink-700" },
  };

  const config = typeConfig[question.type] || typeConfig.short_answer;

  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 pt-0.5">
          <GripVertical size={16} className="text-gray-300 group-hover:text-gray-400 cursor-move" />
          <span className="font-bold text-gray-500 text-sm w-6">{index + 1}.</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
              {config.label}
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
            >
              {question.points} pts
            </span>
          </div>

          <p className="text-gray-800 text-sm">{question.question}</p>

          {question.type === "multiple_choice" && question.options && (
            <div className="mt-2 ml-2 space-y-1">
              {["A", "B", "C", "D"].map(
                (letter) =>
                  question.options[letter] && (
                    <p key={letter} className="text-xs text-gray-600 flex items-center gap-1">
                      <span className="font-medium">{letter})</span> {question.options[letter]}
                      {question.correctAnswer === letter && (
                        <Check size={12} className="text-green-600 ml-1" />
                      )}
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
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ADD/EDIT QUESTION MODAL
// ════════════════════════════════════════════════════════════════════════════

const AddQuestionModal = ({ question, primaryColor, onClose, onSave }) => {
  const [questionType, setQuestionType] = useState(question?.type || "multiple_choice");
  const [questionText, setQuestionText] = useState(question?.question || "");
  const [options, setOptions] = useState(question?.options || { A: "", B: "", C: "", D: "" });
  const [correctAnswer, setCorrectAnswer] = useState(question?.correctAnswer || "");

  const handleSave = () => {
    if (!questionText.trim()) {
      alert("Please enter a question");
      return;
    }

    onSave({
      type: questionType,
      question: questionText,
      options: questionType === "multiple_choice" ? options : null,
      correctAnswer,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">
            {question ? "Edit Question" : "Add Question"}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Question Type</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True/False</option>
              <option value="short_answer">Short Answer</option>
              <option value="essay">Essay</option>
              <option value="fill_blank">Fill in the Blank</option>
            </select>
          </div>

          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Question <span className="text-red-500">*</span>
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none"
              placeholder="Enter your question here..."
            />
          </div>

          {/* Multiple Choice Options */}
          {questionType === "multiple_choice" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Options</label>
              <div className="space-y-2">
                {["A", "B", "C", "D"].map((letter) => (
                  <div key={letter} className="flex items-center gap-2">
                    <span className="font-medium text-gray-500 w-6 text-sm">{letter})</span>
                    <input
                      type="text"
                      value={options[letter]}
                      onChange={(e) => setOptions({ ...options, [letter]: e.target.value })}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                      placeholder={`Option ${letter}`}
                    />
                    <button
                      type="button"
                      onClick={() => setCorrectAnswer(letter)}
                      className={`p-2 rounded-lg transition-colors ${
                        correctAnswer === letter
                          ? "bg-green-100 text-green-600"
                          : "hover:bg-gray-100 text-gray-400"
                      }`}
                      title="Mark as correct"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ))}
              </div>
              {!correctAnswer && (
                <p className="text-xs text-amber-600 mt-2">Click ✓ to mark the correct answer</p>
              )}
            </div>
          )}

          {/* True/False */}
          {questionType === "true_false" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Correct Answer</label>
              <div className="flex gap-3">
                {["True", "False"].map((val) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tfAnswer"
                      value={val}
                      checked={correctAnswer === val}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      style={{ accentColor: primaryColor }}
                    />
                    <span className="text-sm">{val}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Short Answer / Essay */}
          {(questionType === "short_answer" || questionType === "essay" || questionType === "fill_blank") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Sample Answer <span className="text-gray-400 font-normal">(for answer key)</span>
              </label>
              <textarea
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none resize-none"
                placeholder="Enter expected answer or key points..."
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg"
            style={{ backgroundColor: primaryColor }}
          >
            {question ? "Update" : "Add Question"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// AI GUIDE MODAL
// ════════════════════════════════════════════════════════════════════════════

const AIGuideModal = ({ primaryColor, onClose }) => {
  const [copied, setCopied] = useState(false);

  const promptTemplate = `Create a 15-question test for [SUBJECT] aimed at [CLASS LEVEL] students about [TOPIC].

Include:
- 8 multiple choice questions (4 options each, labeled A-D)
- 3 true/false questions  
- 2 short answer questions
- 2 essay questions

Return ONLY valid JSON (no markdown, no backticks) in this exact format:

{
  "title": "Test Title Here",
  "subject": "Subject Name",
  "className": "Y5",
  "duration": 45,
  "totalPoints": 100,
  "instructions": "Read all questions carefully.",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "What is 2 + 2?",
      "options": { "A": "3", "B": "4", "C": "5", "D": "6" },
      "correctAnswer": "B"
    },
    {
      "type": "true_false",
      "question": "The sun rises in the east.",
      "correctAnswer": "True"
    },
    {
      "type": "short_answer",
      "question": "Explain photosynthesis briefly.",
      "correctAnswer": "Plants convert sunlight to energy."
    }
  ]
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(promptTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    { title: "Open ChatGPT", desc: "Go to chatgpt.com and log in" },
    { title: "Copy the prompt below", desc: "Click the copy button" },
    { title: "Customize it", desc: "Replace [SUBJECT], [CLASS LEVEL], [TOPIC]" },
    { title: "Paste & generate", desc: "ChatGPT will create your test JSON" },
    { title: "Save as .json", desc: "Copy output, save as test.json" },
    { title: "Upload here", desc: "Use the Upload JSON button above" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Sparkles size={20} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Generate Tests with AI</h3>
              <p className="text-sm text-gray-500">Use ChatGPT to create test questions</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Steps */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {steps.map((step, i) => (
              <div key={i} className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="font-medium text-purple-900 text-sm">{step.title}</span>
                </div>
                <p className="text-xs text-purple-700 ml-7">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Prompt Template</label>
              <button
                onClick={handleCopy}
                className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                  copied ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                }`}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">{promptTemplate}</pre>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-start gap-2">
              <HelpCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 mb-1">Tips</p>
                <ul className="text-xs text-amber-800 space-y-1 list-disc ml-4">
                  <li>Be specific about topic and difficulty</li>
                  <li>Remove any markdown backticks from ChatGPT output</li>
                  <li>Review questions for accuracy before generating PDF</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestMakerPage;