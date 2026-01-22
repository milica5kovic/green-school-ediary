import React, { useState, useEffect } from "react";
import { FileText, Plus } from "lucide-react";
import { useApp } from "../../context/AppContext";
import HomeworkCard from "./HomeworkCard";
import HomeworkModal from "./HomeworkModal";
import LoadingSpinner from "../shared/LoadingSpinner";
import HomeworkService from "../../domain/services/homeworkService";

const HomeworkPage = () => {
  const { homeworkService, classService, getDateKey, selectedDate } = useApp();
  const [homework, setHomework] = useState([]); // always an array
  const [stats, setStats] = useState({
    all: 0,
    upcoming: 0,
    overdue: 0,
    dueToday: 0,
  });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingClassId, setEditingClassId] = useState(null);
  const [todayClasses, setTodayClasses] = useState([]);

  useEffect(() => {
    loadHomework();
    loadTodayClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadTodayClasses = async () => {
    try {
      const dateKey = getDateKey(selectedDate);
      const classes = await classService.getClassesByDate(dateKey);
      setTodayClasses(classes || []);
    } catch (error) {
      console.error("Error loading classes:", error);
      setTodayClasses([]);
    }
  };

  const loadHomework = async () => {
    try {
      setLoading(true);
      const filtered =
        (await homeworkService.getFilteredHomework(filter)) || [];
      setHomework(filtered);

      const hwStats = (await homeworkService.getStats()) || {
        all: 0,
        upcoming: 0,
        overdue: 0,
        dueToday: 0,
      };
      setStats(hwStats);
    } catch (error) {
      console.error("Error loading homework:", error);
      setHomework([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (classId, description, dueDate, attachments) => {
    if (!classId) return; // safety check
    try {
      setLoading(true);

      if (editingClassId) {
        await homeworkService.updateHomework(classId, description, dueDate);
      } else {
        await homeworkService.assignHomework(
          classId,
          description,
          dueDate,
          attachments,
        );
      }

      await loadHomework();
      setShowModal(false);
      setEditingClassId(null);
    } catch (error) {
      console.error("Error saving homework:", error);
      alert("Failed to save homework. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (classId) => {
    try {
      const hw = await homeworkService.getHomework(classId);
      if (!hw) {
        alert("No homework found for this class.");
        return;
      }
      setEditingClassId(classId);
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching homework:", error);
      alert("Failed to load homework. Please try again.");
    }
  };

  const handleDelete = async (classId) => {
    if (!window.confirm("Are you sure you want to delete this homework?"))
      return;
    try {
      setLoading(true);
      await homeworkService.deleteHomework(classId);
      await loadHomework();
    } catch (error) {
      console.error("Error deleting homework:", error);
      alert("Failed to delete homework. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    if (todayClasses.length === 0) {
      alert("Please add a class for today first!");
      return;
    }
    setEditingClassId(null);
    setShowModal(true);
  };

  if (loading) {
    return <LoadingSpinner message="Loading homework..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            Homework Assignments
          </h2>
          <button
            onClick={openAddModal}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus size={20} />
            Assign Homework
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
            <p className="text-3xl font-bold text-emerald-700">{stats.all}</p>
            <p className="text-sm text-emerald-600 mt-1">Total Assignments</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
            <p className="text-3xl font-bold text-blue-700">{stats.upcoming}</p>
            <p className="text-sm text-blue-600 mt-1">Upcoming</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl p-4 border border-orange-200">
            <p className="text-3xl font-bold text-orange-700">
              {stats.dueToday}
            </p>
            <p className="text-sm text-orange-600 mt-1">Due Today</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-4 border border-red-200">
            <p className="text-3xl font-bold text-red-700">{stats.overdue}</p>
            <p className="text-sm text-red-600 mt-1">Overdue</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3">
          {["all", "upcoming", "dueToday", "overdue"].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                filter === filterType
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filterType === "dueToday"
                ? "Due Today"
                : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Homework List */}
      {homework.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-emerald-100">
          <FileText size={48} className="mx-auto text-emerald-300 mb-4" />
          <p className="text-gray-500">
            {filter === "all"
              ? "No homework assigned yet"
              : `No ${filter} homework`}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Assign homework from today's classes
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {homework.map(({ classId, homework: hw }) => (
            <HomeworkCard
              key={classId}
              classId={classId}
              homework={hw}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && todayClasses.length > 0 && (
        <HomeworkModal
          onClose={() => {
            setShowModal(false);
            setEditingClassId(null);
          }}
          onSave={handleSave}
          existingHomework={
  editingClassId
    ? homework.find(h => h.classId === editingClassId)?.homework || null
    : null
}

          classId={
            editingClassId ? editingClassId : todayClasses[0]?.class_id || null
          }
        />
      )}
    </div>
  );
};

export default HomeworkPage;
