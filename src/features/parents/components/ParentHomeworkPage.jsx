import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  ChevronDown,
  File,
  Download,
  Calendar,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { useApp } from "../../../core/context/AppContext";
const ParentHomeworkPage = () => {
  const { supabase } = useApp();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [homework, setHomework] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: parent } = await supabase
        .from("parents")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!parent) return;

      const { data: studentParents } = await supabase
        .from("student_parents")
        .select("students(*)")
        .eq("parent_id", parent.id);

      const childrenList =
        studentParents?.map((sp) => sp.students).filter(Boolean) || [];
      setChildren(childrenList);

      if (childrenList.length > 0) {
        setSelectedChild(childrenList[0]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadHomework = useCallback(async () => {
    if (!selectedChild) return;

    try {
      const { data: homeworkData } = await supabase
        .from("homework")
        .select("*")
        .eq("class_name", selectedChild.class_name)
        .order("due_date", { ascending: true });

      setHomework(homeworkData || []);
    } catch (error) {
      console.error("Error loading homework:", error);
    }
  }, [selectedChild, supabase]);

  useEffect(() => {
    if (selectedChild) {
      loadHomework();
    }
  }, [selectedChild, loadHomework]);

  const categorizeHomework = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = homework.filter(
      (hw) => hw.status === "pending" && new Date(hw.due_date) < today,
    );

    const dueSoon = homework.filter((hw) => {
      const dueDate = new Date(hw.due_date);
      const daysUntil = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      return hw.status === "pending" && daysUntil >= 0 && daysUntil <= 7;
    });

    const completed = homework.filter((hw) => hw.status === "completed");

    return { overdue, dueSoon, completed };
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) {
      return {
        text: Math.abs(diff) + " days overdue",
        color: "text-red-600",
        bg: "bg-gradient-to-br from-red-50 to-orange-50",
        border: "border-red-300",
        icon: "bg-red-100 text-red-600",
      };
    }
    if (diff === 0) {
      return {
        text: "Due today",
        color: "text-orange-600",
        bg: "bg-gradient-to-br from-orange-50 to-yellow-50",
        border: "border-orange-300",
        icon: "bg-orange-100 text-orange-600",
      };
    }
    if (diff === 1) {
      return {
        text: "Due tomorrow",
        color: "text-orange-600",
        bg: "bg-gradient-to-br from-yellow-50 to-orange-50",
        border: "border-orange-200",
        icon: "bg-yellow-100 text-orange-600",
      };
    }
    if (diff <= 7) {
      return {
        text: "Due in " + diff + " days",
        color: "text-emerald-600",
        bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
        border: "border-emerald-200",
        icon: "bg-emerald-100 text-emerald-600",
      };
    }
    return {
      text: "Due in " + diff + " days",
      color: "text-gray-600",
      bg: "bg-gradient-to-br from-gray-50 to-slate-50",
      border: "border-gray-200",
      icon: "bg-gray-100 text-gray-600",
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          <BookOpen
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600"
            size={24}
          />
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen size={40} className="text-gray-400" />
        </div>
        <p className="text-gray-600 text-lg">No student data available</p>
        <p className="text-gray-400 text-sm mt-2">
          Please contact your school administrator
        </p>
      </div>
    );
  }

  const stats = categorizeHomework();

  const filteredHomework =
    filter === "all"
      ? homework
      : filter === "overdue"
        ? stats.overdue
        : filter === "pending"
          ? stats.dueSoon
          : stats.completed;

  return (
    <div className="space-y-6">
      {/* Modern Header with Gradient */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 rounded-3xl shadow-2xl p-8 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Homework</h1>
                  <p className="text-emerald-100 text-sm">
                    Green School Assignment Tracker
                  </p>
                </div>
              </div>
            </div>

            {children.length > 1 && (
              <div className="relative">
                <select
                  value={selectedChild?.id || ""}
                  onChange={(e) =>
                    setSelectedChild(
                      children.find((c) => c.id === e.target.value),
                    )
                  }
                  className="appearance-none bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 cursor-pointer"
                >
                  {children.map((child) => (
                    <option
                      key={child.id}
                      value={child.id}
                      className="text-gray-900"
                    >
                      {child.name} - {child.class_name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  size={16}
                />
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20 hover:bg-opacity-25 transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-emerald-100 text-xs font-medium">Total</p>
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <BookOpen size={16} />
                </div>
              </div>
              <p className="text-3xl font-bold">{homework.length}</p>
            </div>

            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20 hover:bg-opacity-25 transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-red-100 text-xs font-medium">Overdue</p>
                <div className="w-8 h-8 bg-red-500 bg-opacity-30 rounded-lg flex items-center justify-center">
                  <AlertCircle size={16} />
                </div>
              </div>
              <p className="text-3xl font-bold">{stats.overdue.length}</p>
            </div>

            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20 hover:bg-opacity-25 transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-orange-100 text-xs font-medium">This Week</p>
                <div className="w-8 h-8 bg-orange-500 bg-opacity-30 rounded-lg flex items-center justify-center">
                  <Clock size={16} />
                </div>
              </div>
              <p className="text-3xl font-bold">{stats.dueSoon.length}</p>
            </div>

            <div className="bg-white bg-opacity-15 backdrop-blur-md rounded-2xl p-4 border border-white border-opacity-20 hover:bg-opacity-25 transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="text-emerald-100 text-xs font-medium">Done</p>
                <div className="w-8 h-8 bg-emerald-400 bg-opacity-30 rounded-lg flex items-center justify-center">
                  <Clock size={16} />
                </div>
              </div>
              <p className="text-3xl font-bold">{stats.completed.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter("all")}
            className={
              filter === "all"
                ? "px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
                : "px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
            }
          >
            All ({homework.length})
          </button>
          <button
            onClick={() => setFilter("overdue")}
            className={
              filter === "overdue"
                ? "px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg"
                : "px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
            }
          >
            Overdue ({stats.overdue.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={
              filter === "pending"
                ? "px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg"
                : "px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
            }
          >
            Due This Week ({stats.dueSoon.length})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={
              filter === "completed"
                ? "px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg"
                : "px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
            }
          >
            Completed ({stats.completed.length})
          </button>
        </div>

        {/* Homework List */}
        {filteredHomework.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl border border-gray-200">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={40} className="text-gray-300" />
            </div>
            <p className="text-gray-500 text-lg font-medium">
              {filter === "overdue" && "No overdue homework! 🎉"}
              {filter === "pending" && "Nothing due this week"}
              {filter === "completed" && "No completed homework yet"}
              {filter === "all" && "No homework assigned yet"}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Check back later for new assignments
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHomework.map((hw) => {
              const dueInfo = getDaysUntilDue(hw.due_date);

              return (
                <div
                  key={hw.id}
                  className={
                    "p-6 rounded-2xl border-2 hover:shadow-xl transition-all " +
                    dueInfo.border +
                    " " +
                    dueInfo.bg
                  }
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={
                          "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 " +
                          dueInfo.icon
                        }
                      >
                        <BookOpen size={20} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold">
                            {hw.class_name}
                          </span>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
                            {hw.subject}
                          </span>
                        </div>
                        <h4 className="font-bold text-gray-900 text-lg">
                          {hw.title}
                        </h4>
                      </div>
                    </div>

                    <span
                      className={
                        hw.status === "completed"
                          ? "px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700"
                          : "px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700"
                      }
                    >
                      {hw.status === "completed" ? "✓ Done" : "Pending"}
                    </span>
                  </div>

                  {/* Description */}
                  {hw.description && (
                    <p className="text-sm text-gray-700 mb-4 leading-relaxed pl-16">
                      {hw.description}
                    </p>
                  )}

                  {hw.attachments.map((attachment, idx) => (
                    <a
                      key={idx}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-all group border border-purple-100"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <File size={18} className="text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-purple-700">
                          {attachment.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          Click to view or download
                        </p>
                      </div>
                      <Download
                        size={16}
                        className="text-purple-600 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </a>
                  ))}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-sm pl-16 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar size={14} />
                      <span>
                        Assigned:{" "}
                        {new Date(hw.assigned_date).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                    <div
                      className={
                        "flex items-center gap-2 font-semibold px-3 py-1 rounded-lg " +
                        dueInfo.icon
                      }
                    >
                      <Clock size={14} />
                      <span>{dueInfo.text}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentHomeworkPage;
