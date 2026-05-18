import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  AlertCircle,
  Users,
  Trash2,
  Edit2,
  Loader2
} from "lucide-react";
import { supabase } from "../../../../core/infrastructure/supabaseClient";
import { useTenant } from "../../../../core/context/TenantContext";
import useTermTheme from "../../../../shared/hooks/useTermTheme";

// ============================================================================
// ADMIN CALENDAR PAGE - Production Ready
// Multi-tenant aware, uses useTermTheme
// ============================================================================

const EVENT_TYPES = {
  event: { label: 'School Event', color: 'bg-blue-100 text-blue-700', dotColor: 'bg-blue-500' },
  term_start: { label: 'School Starts', color: 'bg-green-100 text-green-700', dotColor: 'bg-green-500' },
  break: { label: 'School Break', color: 'bg-gray-200 text-gray-700', dotColor: 'bg-gray-500' },
  holiday: { label: 'Public Holiday', color: 'bg-gray-200 text-gray-700', dotColor: 'bg-gray-400' },
  exam_period: { label: 'Exam Period', color: 'bg-orange-100 text-orange-700', dotColor: 'bg-orange-500' },
};

const AdminCalendarPage = () => {
  const { schoolId } = useTenant();
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [allTests, setAllTests] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    event_type: "event",
    start_date: "",
    end_date: "",
    description: "",
    scope: "all",
    affected_classes: [],
  });

  // ─── Load Data ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!schoolId) return;
    
    try {
      setLoading(true);

      // Load available classes
      const { data: classes } = await supabase
        .from("custom_classes")
        .select("class_name")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .order("class_name");

      setAvailableClasses(classes?.map((c) => c.class_name) || []);

      // Load all school events
      const { data: events } = await supabase
        .from("school_events")
        .select("*")
        .eq("school_id", schoolId)
        .order("start_date");

      setSchoolEvents(events || []);

      // Load all scheduled tests
      const { data: tests } = await supabase
        .from("scheduled_tests")
        .select("*, teachers(full_name)")
        .eq("school_id", schoolId)
        .order("test_date");

      setAllTests(tests || []);
      
      console.log('📅 Calendar loaded:', { events: events?.length, tests: tests?.length });
    } catch (error) {
      console.error("Error loading calendar data:", error);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Calendar Helpers ──────────────────────────────────────────────────────

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

  const formatDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const getEventsForDate = (date) => {
    if (!date) return { events: [], tests: [] };
    const dateStr = formatDateStr(date);
    
    const events = schoolEvents.filter(event => 
      dateStr >= event.start_date && dateStr <= event.end_date
    );
    const tests = allTests.filter(test => test.test_date === dateStr);
    
    return { events, tests };
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // ─── Event Handlers ────────────────────────────────────────────────────────

  const handleDayClick = (date) => {
    const dateStr = formatDateStr(date);
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
    setShowModal(true);
  };

  const handleEditEvent = (event, e) => {
    e?.stopPropagation();
    setEditingEvent(event);
    setFormData({
      title: event.title,
      event_type: event.event_type,
      start_date: event.start_date,
      end_date: event.end_date,
      description: event.description || "",
      scope: event.scope,
      affected_classes: event.affected_classes || [],
    });
    setShowModal(true);
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent || !window.confirm("Delete this event? This cannot be undone.")) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("school_events")
        .delete()
        .eq("id", editingEvent.id)
        .eq("school_id", schoolId);

      if (error) throw error;

      await loadData();
      setShowModal(false);
      setEditingEvent(null);
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.start_date || !formData.end_date) {
      alert("Please fill in all required fields");
      return;
    }

    if (formData.scope === "specific" && formData.affected_classes.length === 0) {
      alert("Please select at least one class");
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();

      const eventData = {
        title: formData.title,
        event_type: formData.event_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        description: formData.description,
        scope: formData.scope,
        affected_classes: formData.scope === "all" ? null : formData.affected_classes,
        school_id: schoolId,
        created_by: user.id,
        academic_year: activeTerm?.academic_year ?? new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
      };

      if (editingEvent) {
        const { error } = await supabase
          .from("school_events")
          .update(eventData)
          .eq("id", editingEvent.id)
          .eq("school_id", schoolId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("school_events")
          .insert([eventData]);
        if (error) throw error;
      }

      await loadData();
      setShowModal(false);
      setEditingEvent(null);
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event: " + error.message);
    } finally {
      setSaving(false);
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

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const goToToday = () => setCurrentMonth(new Date());

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin" style={{ color: theme.color }} />
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
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
        className="rounded-2xl shadow-lg p-6 border bg-white"
        style={{ borderColor: theme.withAlpha(0.2) }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: theme.withAlpha(0.15) }}
            >
              <CalendarIcon size={24} style={{ color: theme.color }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">School Calendar</h2>
              <p className="text-gray-500 text-sm">Manage events, breaks & view scheduled tests</p>
            </div>
          </div>
          <button
            onClick={() => handleDayClick(new Date())}
            className="px-4 py-2 rounded-xl text-white font-medium flex items-center gap-2 hover:opacity-90 transition-all"
            style={{ backgroundColor: theme.color }}
          >
            <Plus size={18} /> Add Event
          </button>
        </div>
      </div>

      {/* ═══ CALENDAR ═══ */}
      <div 
        className="bg-white rounded-2xl shadow-lg border p-6"
        style={{ borderColor: theme.withAlpha(0.15) }}
      >
        {/* Month Navigation */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-800">{monthName}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
              style={{ color: theme.color, backgroundColor: theme.withAlpha(0.1) }}
            >
              Today
            </button>
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Week Headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-center text-xs font-bold text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {daysInMonth.map((date, idx) => {
            if (!date) return <div key={"empty-" + idx} className="aspect-square" />;

            const { events, tests } = getEventsForDate(date);
            const today = isToday(date);
            const hasBreak = events.some(e => e.event_type === "break" || e.event_type === "holiday");
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(date)}
                className={`min-h-[90px] rounded-xl border p-2 transition-all cursor-pointer hover:shadow-md ${
                  hasBreak ? "bg-gray-100 border-gray-300" :
                  today ? "border-2 shadow-sm" :
                  isWeekend ? "bg-gray-50 border-gray-200" :
                  "border-gray-200 hover:border-gray-300"
                }`}
                style={today ? { borderColor: theme.color, backgroundColor: theme.withAlpha(0.05) } : {}}
              >
                <span className={`text-sm font-bold block mb-1 ${
                  today ? '' : hasBreak ? "text-gray-400" : isWeekend ? "text-gray-400" : "text-gray-700"
                }`} style={today ? { color: theme.color } : {}}>
                  {date.getDate()}
                </span>

                <div className="space-y-0.5">
                  {/* Events */}
                  {events.slice(0, 2).map((event, i) => {
                    const type = EVENT_TYPES[event.event_type] || EVENT_TYPES.event;
                    return (
                      <div
                        key={'event-' + i}
                        onClick={(e) => handleEditEvent(event, e)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate ${type.color}`}
                      >
                        {event.title}
                      </div>
                    );
                  })}

                  {/* Tests */}
                  {tests.slice(0, 2).map((test, i) => (
                    <div
                      key={'test-' + i}
                      className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium truncate"
                      title={`${test.class_name}: ${test.title}`}
                    >
                      📝 {test.class_name}
                    </div>
                  ))}

                  {/* More indicator */}
                  {(events.length > 2 || tests.length > 2) && (
                    <div className="text-[9px] text-gray-400 font-medium">
                      +{events.length + tests.length - 4} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-6 pt-4 border-t border-gray-200">
          {Object.entries(EVENT_TYPES).map(([key, type]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${type.dotColor}`} />
              <span className="text-xs text-gray-600">{type.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-xs text-gray-600">Scheduled Test</span>
          </div>
        </div>
      </div>

      {/* ═══ ADD/EDIT EVENT MODAL ═══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="px-6 py-4 flex items-center justify-between text-white"
              style={{ backgroundColor: theme.color }}
            >
              <div className="flex items-center gap-3">
                <CalendarIcon size={20} />
                <h3 className="text-lg font-bold">
                  {editingEvent ? "Edit Event" : "Add Event"}
                </h3>
              </div>
              <button
                onClick={() => { setShowModal(false); setEditingEvent(null); }}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEvent} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': theme.withAlpha(0.3) }}
                  placeholder="e.g., Winter Break, Sports Day"
                  required
                />
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
                <select
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                >
                  {Object.entries(EVENT_TYPES).map(([key, type]) => (
                    <option key={key} value={key}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none"
                    min={formData.start_date}
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none resize-none"
                  rows="2"
                  placeholder="Additional details..."
                />
              </div>

              {/* Scope */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Applies To</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scope: 'all', affected_classes: [] })}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                      formData.scope === 'all' ? 'border-current' : 'border-gray-200'
                    }`}
                    style={formData.scope === 'all' ? { borderColor: theme.color, backgroundColor: theme.withAlpha(0.1), color: theme.color } : {}}
                  >
                    All School
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, scope: 'specific' })}
                    className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                      formData.scope === 'specific' ? 'border-current' : 'border-gray-200'
                    }`}
                    style={formData.scope === 'specific' ? { borderColor: theme.color, backgroundColor: theme.withAlpha(0.1), color: theme.color } : {}}
                  >
                    Specific Classes
                  </button>
                </div>
              </div>

              {/* Class Selection */}
              {formData.scope === "specific" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Classes *</label>
                  <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-xl">
                    {availableClasses.length === 0 ? (
                      <p className="col-span-3 text-sm text-gray-400 text-center py-2">No classes available</p>
                    ) : (
                      availableClasses.map((className) => (
                        <label
                          key={className}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
                            formData.affected_classes.includes(className)
                              ? 'bg-opacity-20' : 'bg-gray-50 hover:bg-gray-100'
                          }`}
                          style={formData.affected_classes.includes(className) ? { backgroundColor: theme.withAlpha(0.15) } : {}}
                        >
                          <input
                            type="checkbox"
                            checked={formData.affected_classes.includes(className)}
                            onChange={() => toggleClass(className)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="font-medium">{className}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4 flex gap-3">
              <button
                onClick={handleSaveEvent}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: theme.color }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {editingEvent ? "Update Event" : "Add Event"}
              </button>
              {editingEvent && (
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-red-600 font-medium bg-red-50 hover:bg-red-100 transition-all disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditingEvent(null); }}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-all"
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