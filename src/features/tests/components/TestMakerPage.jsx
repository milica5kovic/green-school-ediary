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
} from "lucide-react";
import { useAuth } from "../../../core/context/AuthContext";
import { useApp } from "../../../core/context/AppContext";
import {generateTestBundle} from "../../../core/utils/pdfGenerator"

const TestMakerPage = () => {
  const { supabase } = useApp();
  const { teacher } = useAuth();

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
    instructions:
      "Read all questions carefully. Show your work for full credit. No calculators allowed unless specified.",
    teacherName: teacher?.full_name || "",
  });

  const [questions, setQuestions] = useState([]);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [generating, setGenerating] = useState(false);

  const [uploadedTest, setUploadedTest] = useState(null);
  const [showHelpGuide, setShowHelpGuide] = useState(null);

  // Load subjects and classes
  useEffect(() => {
    loadSubjects();
    loadClasses();
  }, []);

const loadSubjects = async () => {
  try {
    if (!teacher?.subjects || teacher.subjects.length === 0) {
      console.log('No subjects found for teacher');
      setSubjects([]);
      return;
    }

    // ✅ Only show subjects this teacher teaches
    const { data, error } = await supabase
      .from("custom_subjects")
      .select("*")
      .eq("is_active", true)
      .in("subject_name", teacher.subjects)
      .order("subject_name");

    if (error) throw error;
    
    console.log('✅ Teacher subjects loaded:', data?.length || 0);
    setSubjects(data || []);
  } catch (error) {
    console.error("Error loading subjects:", error);
  }
};

const loadClasses = async () => {
  try {
    // ✅ Load all classes this teacher teaches
    const { data: teacherClasses, error } = await supabase
      .from("classes")
      .select("class_name")
      .eq("teacher_id", teacher?.id);

    if (error) throw error;

    // ✅ Get unique class names
    const uniqueClasses = [...new Set(teacherClasses?.map(c => c.class_name) || [])];
    
    // ✅ Add class_teacher_for if exists
    if (teacher?.class_teacher_for && !uniqueClasses.includes(teacher.class_teacher_for)) {
      uniqueClasses.push(teacher.class_teacher_for);
    }

    if (uniqueClasses.length === 0) {
      console.log('No classes found for teacher');
      setClasses([]);
      return;
    }

    // ✅ Load class details
    const { data, error: classError } = await supabase
      .from("custom_classes")
      .select("*")
      .eq("is_active", true)
      .in("class_name", uniqueClasses)
      .order("class_name");

    if (classError) throw classError;

    console.log('✅ Teacher classes loaded:', data?.length || 0);
    setClasses(data || []);
  } catch (error) {
    console.error("Error loading classes:", error);
  }
};

  // Auto-calculate points per question
  const calculatePointsPerQuestion = () => {
    if (questions.length === 0) return 0;
    return Math.floor(testInfo.totalPoints / questions.length);
  };

  const addQuestion = (questionData) => {
    const pointsPerQuestion =
      calculatePointsPerQuestion() ||
      Math.floor(testInfo.totalPoints / (questions.length + 1));

    const newQuestion = {
      id: Date.now(),
      ...questionData,
      points: pointsPerQuestion,
    };

    setQuestions([...questions, newQuestion]);
    setShowAddQuestion(false);
  };

  const updateQuestion = (id, updatedData) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, ...updatedData } : q)),
    );
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

      // Validate structure
      if (!testData.title || !testData.questions) {
        alert("Invalid test file format");
        return;
      }

      // Load test data
      setTestInfo({
        title: testData.title || "",
        subject: testData.subject || "",
        className: testData.className || "",
        date: testData.date || new Date().toISOString().split("T")[0],
        duration: testData.duration || 45,
        totalPoints: testData.totalPoints || 100,
        instructions: testData.instructions || "",
        teacherName: teacher?.full_name || "",
      });

      // Load questions with IDs
      const questionsWithIds = testData.questions.map((q, index) => ({
        ...q,
        id: Date.now() + index,
        points: Math.floor(
          (testData.totalPoints || 100) / testData.questions.length,
        ),
      }));

      setQuestions(questionsWithIds);
      setUploadedTest(file.name);
      alert(
        `Successfully loaded test: ${testData.title} with ${questionsWithIds.length} questions!`,
      );
    } catch (error) {
      console.error("Error loading test:", error);
      alert("Failed to load test file: " + error.message);
    }

    // Reset input
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
      };

      const { studentTest, answerKey } = await generateTestBundle(
        testData,
        shuffleQuestions,
      );


      alert("Test and Answer Key generated successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">

{/* Header */}
<div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 rounded-2xl shadow-xl p-6">
  {/* Decorative Elements */}
  <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
  
  <div className="relative">
    <div className="flex items-center justify-between">
      {/* Left: Title */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white border-opacity-30">
          <FileText size={24} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Test Maker</h2>
          <p className="text-sm text-emerald-100">Create professional assessments</p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <label className="group bg-white bg-opacity-20 backdrop-blur-sm text-white px-4 py-2.5 rounded-lg font-medium hover:bg-opacity-30 transition-all cursor-pointer flex items-center gap-2 border border-white border-opacity-30">
          <Upload size={18} />
          Upload
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        <button
          onClick={() => handleGeneratePDF(false)}
          disabled={generating}
          className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-4 py-2.5 rounded-lg font-medium hover:bg-opacity-30 transition-all flex items-center gap-2 disabled:opacity-50 border border-white border-opacity-30"
        >
          <Download size={18} />
          {generating ? "..." : "PDF"}
        </button>

        <button
          onClick={() => handleGeneratePDF(true)}
          disabled={generating}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2.5 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Shuffle size={18} />
          Shuffle
        </button>

        <button
          onClick={() => setShowHelpGuide(true)}
          className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-4 py-2.5 rounded-lg font-medium hover:bg-opacity-30 transition-all flex items-center gap-2 border border-white border-opacity-30"
        >
          <Sparkles size={18} />
          AI
        </button>
      </div>
    </div>

    {uploadedTest && (
      <div className="mt-3 bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-2 border border-white border-opacity-30">
        <p className="text-white text-xs">
          <strong>✓ Loaded:</strong> {uploadedTest}
        </p>
      </div>
    )}
  </div>
</div>


{/* Test Info */}
<div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-gray-100">
  <div className="flex items-center gap-3 mb-6">
    <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
      <FileText size={20} className="text-white" />
    </div>
    <h3 className="text-2xl font-bold text-gray-900">Test Information</h3>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Test Title <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        value={testInfo.title}
        onChange={(e) => setTestInfo({ ...testInfo, title: e.target.value })}
        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
        placeholder="e.g., Unit 3 Assessment"
      />
    </div>

    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Subject <span className="text-red-500">*</span>
      </label>
      <select
        value={testInfo.subject}
        onChange={(e) => setTestInfo({ ...testInfo, subject: e.target.value })}
        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
      >
        <option value="">Select subject...</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.subject_name}>
            {s.subject_name}
          </option>
        ))}
      </select>
      {subjects.length === 0 && (
        <p className="text-xs text-gray-500 mt-1">No subjects assigned to you</p>
      )}
    </div>

    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Class <span className="text-red-500">*</span>
      </label>
      <select
        value={testInfo.className}
        onChange={(e) => setTestInfo({ ...testInfo, className: e.target.value })}
        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
      >
        <option value="">Select class...</option>
        {classes.map((c) => (
          <option key={c.id} value={c.class_name}>
            {c.class_name}
          </option>
        ))}
      </select>
      {classes.length === 0 && (
        <p className="text-xs text-gray-500 mt-1">No classes assigned to you</p>
      )}
    </div>

    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Test Date
      </label>
      <input
        type="date"
        value={testInfo.date}
        onChange={(e) => setTestInfo({ ...testInfo, date: e.target.value })}
        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
      />
    </div>

    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Duration (minutes)
      </label>
      <input
        type="number"
        value={testInfo.duration}
        onChange={(e) => setTestInfo({ ...testInfo, duration: parseInt(e.target.value) })}
        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
        min="15"
        max="180"
        step="5"
      />
    </div>

    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        Total Points
      </label>
      <input
        type="number"
        value={testInfo.totalPoints}
        onChange={(e) => setTestInfo({ ...testInfo, totalPoints: parseInt(e.target.value) })}
        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
        min="10"
        max="200"
        step="5"
      />
    </div>
  </div>

  <div className="mt-6">
    <label className="block text-sm font-bold text-gray-700 mb-2">
      Test Instructions
    </label>
    <textarea
      value={testInfo.instructions}
      onChange={(e) => setTestInfo({ ...testInfo, instructions: e.target.value })}
      className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none"
      rows="4"
      placeholder="Instructions for students taking this test..."
    />
  </div>

  <div className="mt-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-5 border-2 border-blue-200">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-white font-bold text-sm">ℹ</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-blue-900 mb-1">Auto-calculation Active</p>
        <p className="text-sm text-blue-800">
          With <strong>{questions.length} questions</strong> and <strong>{testInfo.totalPoints} total points</strong>, 
          each question will be worth approximately <strong className="text-blue-900">{calculatePointsPerQuestion()} points</strong>.
        </p>
      </div>
    </div>
  </div>
</div>
{/* Questions List */}
<div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-gray-100">
  <div className="flex justify-between items-center mb-6">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
        <FileText size={20} className="text-white" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900">Questions</h3>
        <p className="text-sm text-gray-600">{questions.length} question{questions.length !== 1 ? 's' : ''} added</p>
      </div>
    </div>

    <div className="flex gap-3">
      <button
        onClick={() => setShowHelpGuide(true)}
        className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-5 py-3 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
      >
        <Sparkles size={18} />
        AI Assistant
      </button>

      <button
        onClick={() => setShowAddQuestion(true)}
        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-3 rounded-xl font-semibold hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
      >
        <Plus size={20} />
        Add Question
      </button>
    </div>
  </div>

  {questions.length === 0 ? (
    <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
      <FileText size={64} className="mx-auto text-gray-300 mb-4" />
      <p className="text-gray-600 font-semibold text-lg mb-2">No questions yet</p>
      <p className="text-gray-500 text-sm mb-6">Start building your test by adding questions</p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={() => setShowAddQuestion(true)}
          className="bg-emerald-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
        >
          Add First Question
        </button>
        <button
          onClick={() => setShowHelpGuide(true)}
          className="bg-purple-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-purple-600 transition-colors"
        >
          Use AI Assistant
        </button>
      </div>
    </div>
  ) : (
    <div className="space-y-3">
      {questions.map((q, index) => (
        <QuestionCard
          key={q.id}
          question={q}
          index={index}
          onEdit={() => setEditingQuestion(q)}
          onDelete={() => deleteQuestion(q.id)}
        />
      ))}
    </div>
  )}
</div>

      {/* Add Question Modal */}
      {showAddQuestion && (
        <AddQuestionModal
          onClose={() => setShowAddQuestion(false)}
          onSave={addQuestion}
        />
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <AddQuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={(data) => updateQuestion(editingQuestion.id, data)}
        />
      )}
      {/* Help Guide Modal */}
      {showHelpGuide && (
        <HelpGuideModal onClose={() => setShowHelpGuide(false)} />
      )}
    </div>
  );
};

// Question Card Component
const QuestionCard = ({ question, index, onEdit, onDelete }) => {
  const getTypeLabel = (type) => {
    const labels = {
      multiple_choice: "Multiple Choice",
      true_false: "True/False",
      short_answer: "Short Answer",
      essay: "Essay",
      fill_blank: "Fill in the Blank",
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      multiple_choice: "bg-blue-100 text-blue-700",
      true_false: "bg-green-100 text-green-700",
      short_answer: "bg-yellow-100 text-yellow-700",
      essay: "bg-purple-100 text-purple-700",
      fill_blank: "bg-pink-100 text-pink-700",
    };
    return colors[type] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-emerald-300 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-2 pt-1">
          <GripVertical size={20} className="text-gray-400 cursor-move" />
          <span className="font-bold text-gray-700">{index + 1}.</span>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(question.type)}`}
            >
              {getTypeLabel(question.type)}
            </span>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
              {question.points} pts
            </span>
          </div>

          <p className="text-gray-900 mb-2">{question.question}</p>

          {question.type === "multiple_choice" && (
            <div className="ml-4 space-y-1">
              {["A", "B", "C", "D"].map(
                (letter) =>
                  question.options[letter] && (
                    <p key={letter} className="text-sm text-gray-600">
                      {letter}) {question.options[letter]}
                      {question.correctAnswer === letter && (
                        <span className="ml-2 text-emerald-600 font-medium">
                          ✓
                        </span>
                      )}
                    </p>
                  ),
              )}
            </div>
          )}

          {question.type === "true_false" && (
            <p className="text-sm text-gray-600 ml-4">
              Correct Answer:{" "}
              <span className="font-medium text-emerald-600">
                {question.correctAnswer}
              </span>
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Add Question Modal Component (Part 1 - will continue in next message)
const AddQuestionModal = ({ question, onClose, onSave }) => {
  const [questionType, setQuestionType] = useState(
    question?.type || "multiple_choice",
  );
  const [questionText, setQuestionText] = useState(question?.question || "");
  const [options, setOptions] = useState(
    question?.options || { A: "", B: "", C: "", D: "" },
  );
  const [correctAnswer, setCorrectAnswer] = useState(
    question?.correctAnswer || "",
  );

  const handleSave = () => {
    if (!questionText.trim()) {
      alert("Please enter a question");
      return;
    }

    const questionData = {
      type: questionType,
      question: questionText,
      options: questionType === "multiple_choice" ? options : null,
      correctAnswer: correctAnswer,
    };

    onSave(questionData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-gray-800 mb-6">
          {question ? "Edit Question" : "Add Question"}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Type
            </label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True/False</option>
              <option value="short_answer">Short Answer</option>
              <option value="essay">Essay/Long Answer</option>
              <option value="fill_blank">Fill in the Blank</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question *
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              rows="3"
              placeholder="Enter your question here..."
            />
          </div>

          {questionType === "multiple_choice" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Options
              </label>
              <div className="space-y-2">
                {["A", "B", "C", "D"].map((letter) => (
                  <div key={letter} className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 w-6">
                      {letter})
                    </span>
                    <input
                      type="text"
                      value={options[letter]}
                      onChange={(e) =>
                        setOptions({ ...options, [letter]: e.target.value })
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder={`Option ${letter}`}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Correct Answer
                </label>
                <select
                  value={correctAnswer}
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Select correct answer...</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
            </div>
          )}

          {questionType === "true_false" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answer
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tfAnswer"
                    value="True"
                    checked={correctAnswer === "True"}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span>True</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tfAnswer"
                    value="False"
                    checked={correctAnswer === "False"}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <span>False</span>
                </label>
              </div>
            </div>
          )}

          {(questionType === "short_answer" ||
            questionType === "essay" ||
            questionType === "fill_blank") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sample/Expected Answer (Optional - for answer key)
              </label>
              <textarea
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                rows="3"
                placeholder="Enter sample answer or key points..."
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all"
          >
            {question ? "Update Question" : "Add Question"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Help Guide Modal
const HelpGuideModal = ({ onClose }) => {
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
  "instructions": "Read all questions carefully. Show your work for full credit.",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "What is the capital of France?",
      "options": {
        "A": "London",
        "B": "Paris",
        "C": "Berlin",
        "D": "Madrid"
      },
      "correctAnswer": "B"
    },
    {
      "type": "true_false",
      "question": "The Earth is flat.",
      "correctAnswer": "False"
    },
    {
      "type": "short_answer",
      "question": "Explain photosynthesis in 2-3 sentences.",
      "correctAnswer": "Photosynthesis is the process by which plants make food using sunlight, water, and carbon dioxide."
    },
    {
      "type": "essay",
      "question": "Describe the main causes of World War I.",
      "correctAnswer": "Key causes include militarism, alliances, imperialism, and nationalism (MAIN). The assassination of Archduke Franz Ferdinand was the immediate trigger."
    }
  ]
}`;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(promptTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
            <Sparkles size={28} className="text-purple-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800">
              Create Tests with ChatGPT
            </h3>
            <p className="text-sm text-gray-600">
              Follow these steps to generate test questions using AI
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </span>
              <h4 className="font-semibold text-gray-800">Open ChatGPT</h4>
            </div>
            <p className="text-sm text-gray-700 ml-8">
              Go to{" "}
              <a
                href="https://chatgpt.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-600 underline"
              >
                chatgpt.com
              </a>{" "}
              and log in
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </span>
              <h4 className="font-semibold text-gray-800">
                Copy This Prompt Template
              </h4>
            </div>
            <div className="ml-8 bg-white rounded-lg p-4 border border-gray-300 relative">
              <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto">
                {promptTemplate}
              </pre>
              <button
                onClick={handleCopy}
                className={`absolute top-2 right-2 px-3 py-1 rounded text-xs font-medium transition-all ${
                  copied
                    ? "bg-emerald-500 text-white"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </span>
              <h4 className="font-semibold text-gray-800">
                Customize the Prompt
              </h4>
            </div>
            <p className="text-sm text-gray-700 ml-8">
              Replace{" "}
              <code className="bg-gray-200 px-1 rounded">[SUBJECT]</code>,{" "}
              <code className="bg-gray-200 px-1 rounded">[CLASS LEVEL]</code>,
              and <code className="bg-gray-200 px-1 rounded">[TOPIC]</code> with
              your test details
            </p>
            <p className="text-xs text-gray-600 ml-8 mt-2">
              Example: "Create a 15-question test for{" "}
              <strong>Mathematics</strong> aimed at <strong>Year 6</strong>{" "}
              students about <strong>fractions and decimals</strong>."
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                4
              </span>
              <h4 className="font-semibold text-gray-800">
                Paste into ChatGPT & Generate
              </h4>
            </div>
            <p className="text-sm text-gray-700 ml-8">
              Paste your customized prompt and press Enter. ChatGPT will
              generate a JSON test file.
            </p>
          </div>

          {/* Step 5 */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                5
              </span>
              <h4 className="font-semibold text-gray-800">Save the JSON</h4>
            </div>
            <p className="text-sm text-gray-700 ml-8">
              Copy the JSON output from ChatGPT, paste it into a text editor
              (Notepad, VS Code), and save as{" "}
              <code className="bg-gray-200 px-1 rounded">test.json</code>
            </p>
          </div>

          {/* Step 6 */}
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                6
              </span>
              <h4 className="font-semibold text-gray-800">
                Upload to Test Maker
              </h4>
            </div>
            <p className="text-sm text-gray-700 ml-8">
              Click the <strong>"Upload Test"</strong> button above and select
              your JSON file. Done! ✅
            </p>
          </div>

          {/* Tips */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <p className="text-sm text-yellow-900">
              <strong>💡 Tips:</strong>
            </p>
            <ul className="text-xs text-yellow-800 space-y-1 ml-4 mt-2 list-disc">
              <li>Be specific about the topic and difficulty level</li>
              <li>
                If ChatGPT includes markdown (```json), remove the backticks
                before saving
              </li>
              <li>
                You can ask ChatGPT to regenerate specific questions if you
                don't like them
              </li>
              <li>
                Always review questions for accuracy before generating the PDF
              </li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestMakerPage;
