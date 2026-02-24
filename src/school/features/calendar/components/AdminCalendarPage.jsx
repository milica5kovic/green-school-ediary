import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Shield,
  AlertCircle,
  Users,
  FileText,
} from "lucide-react";
import { useApp } from "../../../../core/context/AppContext";

const AdminCalendarPage = () => {
  const { supabase } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [allTests, setAllTests] = useState([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: null,
    end: null,
  });
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    event_type: "event",
    start_date: "",
    end_date: "",
    description: "",
    scope: "all",
    affected_classes: [],
  });
  const [editingEvent, setEditingEvent] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load available classes
      const { data: classes } = await supabase
        .from("custom_classes")
        .select("class_name")
        .eq("is_active", true)
        .order("class_name");

      setAvailableClasses(classes?.map((c) => c.class_name) || []);

      // Load all school events
      const { data: events } = await supabase
        .from("school_events")
        .select("*")
        .order("start_date");

      setSchoolEvents(events || []);

      // Load all scheduled tests (read-only view for admin)
      const { data: tests } = await supabase
        .from("scheduled_tests")
        .select(
          `
          *,
          teachers(full_name)
        `,
        )
        .order("test_date");

      setAllTests(tests || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    let startPadding = firstDay.getDay() - 1;
    if (startPadding === -1) startPadding = 6;

    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

const getEventsForDate = (date) => {
  if (!date) return { events: [], tests: [] };
  
  // ✅ Format date manually without timezone conversion
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  const events = schoolEvents.filter(event => {
    return dateStr >= event.start_date && dateStr <= event.end_date;
  });
  
  const tests = allTests.filter(test => test.test_date === dateStr);
  
  return { events, tests };
};

const handleDayClick = (date) => {
  // ✅ Format date safely
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  setSelectedDateRange({ start: date, end: date });
  setShowAddEventModal(true);
  setFormData({
    title: '',
    event_type: 'event',
    start_date: dateStr,
    end_date: dateStr,
    description: '',
    scope: 'all',
    affected_classes: []
  });
  setEditingEvent(null);
};

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setSelectedDateRange({
      start: new Date(event.start_date),
      end: new Date(event.end_date),
    });
    setFormData({
      title: event.title,
      event_type: event.event_type,
      start_date: event.start_date,
      end_date: event.end_date,
      description: event.description || "",
      scope: event.scope,
      affected_classes: event.affected_classes || [],
    });
    setShowAddEventModal(true);
  };
  // ✅ HELPER FUNCTION - Format date without timezone issues
  const formatDateSafe = (dateString) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Delete this event? This cannot be undone.")) return;

    try {
      const { error } = await supabase
        .from("school_events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      await loadData();
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event");
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.start_date || !formData.end_date) {
      alert("Please fill in all required fields");
      return;
    }

    if (
      formData.scope === "specific" &&
      formData.affected_classes.length === 0
    ) {
      alert("Please select at least one class");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const eventData = {
        title: formData.title,
        event_type: formData.event_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        description: formData.description,
        scope: formData.scope,
        affected_classes:
          formData.scope === "all" ? null : formData.affected_classes,
        created_by: user.id,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from("school_events")
          .update(eventData)
          .eq("id", editingEvent.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("school_events")
          .insert([eventData]);

        if (error) throw error;
      }

      await loadData();
      setShowAddEventModal(false);
      setEditingEvent(null);
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event");
    }
  };

  const toggleClass = (className) => {
    setFormData((prev) => ({
      ...prev,
      affected_classes: prev.affected_classes.includes(className)
        ? prev.affected_classes.filter((c) => c !== className)
        : [...prev.affected_classes, className],
    }));
  };

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          <Shield
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600"
            size={24}
          />
        </div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl shadow-2xl p-8 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Shield size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">School Calendar</h1>
                  <p className="text-emerald-100 text-sm">
                    Manage events, breaks & view all tests
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedDateRange({ start: new Date(), end: new Date() });
                setShowAddEventModal(true);
                setEditingEvent(null);
                const today = new Date().toISOString().split("T")[0];
                setFormData({
                  title: "",
                  event_type: "event",
                  start_date: today,
                  end_date: today,
                  description: "",
                  scope: "all",
                  affected_classes: [],
                });
              }}
              className="bg-white text-emerald-600 px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all font-semibold"
            >
              <Plus size={20} />
              Add Event
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon size={24} className="text-emerald-600" />
            {monthName}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="p-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              <ChevronLeft size={20} className="text-emerald-600" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              <ChevronRight size={20} className="text-emerald-600" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Week Days */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-bold text-gray-700 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.map((date, idx) => {
              if (!date) {
                return <div key={"empty-" + idx} className="aspect-square" />;
              }

              const { events, tests } = getEventsForDate(date);
              const dayNumber = date.getDate();
              const today = isToday(date);

              const hasBreak = events.some(
                (e) => e.event_type === "break" || e.event_type === "holiday",
              );

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(date)}
                  className={
                    "min-h-[100px] rounded-xl border-2 p-2 transition-all relative group cursor-pointer " +
                    (hasBreak
                      ? "bg-gray-100 border-gray-300"
                      : today
                        ? "border-emerald-500 bg-emerald-50 hover:shadow-lg"
                        : "border-gray-200 hover:border-emerald-300 hover:shadow-md")
                  }
                >
                  <span
                    className={
                      "text-sm font-bold mb-1 block " +
                      (today
                        ? "text-emerald-600"
                        : hasBreak
                          ? "text-gray-400"
                          : "text-gray-700")
                    }
                  >
                    {dayNumber}
                  </span>

                  <div className="space-y-1">
                    {/* Events */}
{events.map((event, i) => (
  <div 
    key={'event-' + i} 
    className={'text-xs px-2 py-1 rounded font-medium truncate cursor-pointer ' +
      (event.event_type === 'break' || event.event_type === 'holiday' ? 'bg-gray-200 text-gray-700' :
       event.event_type === 'exam_period' ? 'bg-orange-100 text-orange-700' :
       event.event_type === 'term_start' ? 'bg-green-100 text-green-700' :
       'bg-blue-100 text-blue-700')}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                      >
                        {event.title}
                      </div>
                    ))}

                    {/* Tests (read-only) */}
                    {tests.map((test, i) => (
                      <div
                        key={"test-" + i}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-medium truncate"
                        title={
                          "Teacher: " + (test.teachers?.full_name || "Unknown")
                        }
                      >
                        {test.class_name}: {test.title}
                      </div>
                    ))}
                  </div>

                  {/* Hover tooltip */}
                  {(events.length > 0 || tests.length > 0) && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded-lg p-3 whitespace-nowrap shadow-xl max-w-[250px]">
                        {events.map((event, i) => (
                          <div key={"tooltip-event-" + i} className="mb-2">
                            <span className="font-semibold text-blue-300">
                              {event.title}
                            </span>
                            <div className="text-gray-300 text-xs">
                              {event.start_date === event.end_date
                                ? formatDateSafe(event.start_date)
                                : formatDateSafe(event.start_date) +
                                  " - " +
                                  formatDateSafe(event.end_date)}
                            </div>
                            {event.scope === "specific" && (
                              <div className="text-yellow-300 text-xs">
                                Classes: {event.affected_classes?.join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                        {tests.map((test, i) => (
                          <div key={"tooltip-test-" + i} className="mb-1">
                            <span className="font-semibold text-red-300">
                              {test.subject} - {test.title}
                            </span>
                            <div className="text-gray-300 text-xs">
                              {test.class_name}
                            </div>
                            <div className="text-gray-400 text-xs">
                              Teacher: {test.teachers?.full_name || "Unknown"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
<div className="flex flex-wrap justify-center gap-4 mt-6 pt-6 border-t border-gray-200">
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 bg-green-100 rounded"></div>
    <span className="text-sm text-gray-600 font-medium">School Starts</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 bg-gray-200 rounded"></div>
    <span className="text-sm text-gray-600 font-medium">Break/Holiday</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 bg-orange-100 rounded"></div>
    <span className="text-sm text-gray-600 font-medium">Exam Period</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 bg-blue-100 rounded"></div>
    <span className="text-sm text-gray-600 font-medium">School Event</span>
  </div>
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 bg-red-100 rounded"></div>
    <span className="text-sm text-gray-600 font-medium">Scheduled Test</span>
  </div>
</div>
      </div>

      {/* Add/Edit Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <CalendarIcon size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {editingEvent ? "Edit Event" : "Add School Event"}
                  </h3>
                  <p className="text-emerald-100 text-sm">
                    Manage school calendar
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAddEventModal(false);
                  setEditingEvent(null);
                }}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form
              onSubmit={handleSaveEvent}
              className="flex-1 overflow-y-auto p-6 space-y-4"
            >
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                  placeholder="e.g., Winter Break, Sports Day"
                  required
                />
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Type *
                </label>
                <select
  value={formData.event_type}
  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
  required
>
  <option value="event">School Event</option>
  <option value="term_start">School Starts/Resumes</option>
  <option value="break">School Break</option>
  <option value="holiday">Public Holiday</option>
  <option value="exam_period">Exam Period</option>
</select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    required
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    min={formData.start_date}
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"
                  rows="3"
                  placeholder="Additional details about this event"
                />
              </div>

              {/* Scope */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Applies To *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="scope"
                      value="all"
                      checked={formData.scope === "all"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scope: e.target.value,
                          affected_classes: [],
                        })
                      }
                      className="w-4 h-4 text-emerald-600"
                    />
                    <div>
                      <p className="font-medium text-gray-900">All School</p>
                      <p className="text-xs text-gray-600">
                        Applies to all classes
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="scope"
                      value="specific"
                      checked={formData.scope === "specific"}
                      onChange={(e) =>
                        setFormData({ ...formData, scope: e.target.value })
                      }
                      className="w-4 h-4 text-emerald-600"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        Specific Classes
                      </p>
                      <p className="text-xs text-gray-600">
                        Select which classes this affects
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Class Selection */}
              {formData.scope === "specific" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Classes *
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto p-2 border border-gray-300 rounded-xl">
                    {availableClasses.map((className) => (
                      <label
                        key={className}
                        className={
                          "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors " +
                          (formData.affected_classes.includes(className)
                            ? "bg-emerald-100 border border-emerald-300"
                            : "bg-gray-50 hover:bg-gray-100")
                        }
                      >
                        <input
                          type="checkbox"
                          checked={formData.affected_classes.includes(
                            className,
                          )}
                          onChange={() => toggleClass(className)}
                          className="w-4 h-4 text-emerald-600"
                        />
                        <span className="text-sm font-medium">{className}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {editingEvent && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(editingEvent.id)}
                    className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center gap-2"
                  >
                    <X size={16} />
                    Delete Event
                  </button>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4 bg-gray-50 flex gap-3">
              <button
                type="submit"
                onClick={handleSaveEvent}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                {editingEvent ? "Update Event" : "Add Event"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddEventModal(false);
                  setEditingEvent(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-300 transition-all font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCalendarPage;
