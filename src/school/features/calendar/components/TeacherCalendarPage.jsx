import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  X,
  FileText,
  Trash2,
  Edit3,
  Clock,
  MapPin,
  Users,
  BookOpen,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useAuth } from '../../../../core/context/AuthContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';

// ════════════════════════════════════════════════════════════════════════════
// TEACHER CALENDAR PAGE - Production Ready
// Multi-tenant aware, uses useTermTheme for dynamic colors
// ════════════════════════════════════════════════════════════════════════════

const TeacherCalendarPage = () => {
  // ═══ HOOKS - Multi-tenant aware ═══
  const { supabase, schoolId } = useApp();
  const { teacher } = useAuth();
  const theme = useTermTheme();
  const TermIcon = theme.icon;

  // ═══ STATE ═══
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [myTests, setMyTests] = useState([]);
  const [allTests, setAllTests] = useState([]); // Tests from all teachers
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null); // For day detail modal
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    class_name: '',
    title: '',
    topics_covered: '',
    study_materials: ''
  });
  const [editingTest, setEditingTest] = useState(null);

  const teacherSubjects = teacher?.subjects || [];
  const teacherId = teacher?.user_id;

  // ═══ DATA LOADING ═══
  const loadData = useCallback(async (isRefresh = false) => {
    if (!supabase || !schoolId) {
      console.log('⏳ Waiting for tenant...');
      return;
    }
    
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      
      console.log('📅 Loading calendar for school:', schoolId);

      // Load available classes (tenant-filtered via RLS)
      const { data: classes, error: classError } = await supabase
        .from('custom_classes')
        .select('class_name')
        .eq('is_active', true)
        .order('class_name');
      
      if (classError) throw classError;
      setAvailableClasses(classes?.map(c => c.class_name) || []);
      
      // Load school events (tenant-filtered via RLS)
      const { data: events, error: eventError } = await supabase
        .from('school_events')
        .select('*')
        .order('start_date');
      
      if (eventError) throw eventError;
      setSchoolEvents(events || []);
      
      // Load MY tests (teacher's own tests)
      if (teacherId) {
        const { data: myTestsData, error: myTestError } = await supabase
          .from('scheduled_tests')
          .select('*')
          .eq('teacher_id', teacherId)
          .order('test_date');
        
        if (myTestError) throw myTestError;
        setMyTests(myTestsData || []);
      }

      // Load ALL tests (for conflict detection)
      const { data: allTestsData, error: allTestError } = await supabase
        .from('scheduled_tests')
        .select('*, teachers(full_name)') 
        .order('test_date');
      
      if (allTestError) throw allTestError;
      setAllTests(allTestsData || []);
      
      console.log('✅ Calendar loaded:', {
        events: events?.length || 0,
        myTests: myTests?.length || 0,
        allTests: allTestsData?.length || 0
      });
      
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, schoolId, teacherId]);

  useEffect(() => {
    if (schoolId) loadData();
  }, [schoolId, loadData]);

  // ═══ CALENDAR HELPERS ═══
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    let startPadding = firstDay.getDay() - 1;
    if (startPadding === -1) startPadding = 6;
    
    for (let i = 0; i < startPadding; i++) days.push(null);
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const toDateStr = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isDateBlocked = (date) => {
    if (!date) return false;
    const dateStr = toDateStr(date);
    return schoolEvents.some(event => {
      if (!['break', 'holiday', 'Holiday'].includes(event.event_type)) return false;
      return dateStr >= event.start_date && dateStr <= (event.end_date || event.start_date);
    });
  };

  const getEventsForDate = (date) => {
    if (!date) return { events: [], myTests: [], otherTests: [], isBlocked: false };
    const dateStr = toDateStr(date);
    
    const events = schoolEvents.filter(event => 
      dateStr >= event.start_date && dateStr <= (event.end_date || event.start_date)
    );
    
    const testsOnDate = allTests.filter(test => test.test_date === dateStr);
    const myTestsOnDate = testsOnDate.filter(t => t.teacher_id === teacherId);
    const otherTests = testsOnDate.filter(t => t.teacher_id !== teacherId);
    
    const isBlocked = events.some(e => ['break', 'holiday', 'Holiday'].includes(e.event_type));
    
    return { events, myTests: myTestsOnDate, otherTests, isBlocked };
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const isWeekend = (date) => {
    if (!date) return false;
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  const goToToday = () => setCurrentMonth(new Date());

  // ═══ EVENT HANDLERS ═══
  const handleDayClick = (date) => {
    const { events, myTests: myTestsOnDate, otherTests, isBlocked } = getEventsForDate(date);
    
    // Show day detail modal
    if (events.length > 0 || myTestsOnDate.length > 0 || otherTests.length > 0) {
      setSelectedDay({ date, events, myTests: myTestsOnDate, otherTests, isBlocked });
    } else if (!isBlocked) {
      // Open add test modal directly
      openAddTestModal(date);
    }
  };

  const openAddTestModal = (date) => {
    if (isDateBlocked(date)) {
      alert('Cannot schedule tests on breaks or holidays');
      return;
    }
    setSelectedDate(date);
    setFormData({
      subject: '',
      class_name: '',
      title: '',
      topics_covered: '',
      study_materials: ''
    });
    setEditingTest(null);
    setShowAddTestModal(true);
    setSelectedDay(null);
  };

  const handleEditTest = (test) => {
    setEditingTest(test);
    const [year, month, day] = test.test_date.split('-');
    setSelectedDate(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
    setFormData({
      subject: test.subject,
      class_name: test.class_name,
      title: test.title,
      topics_covered: test.topics_covered || '',
      study_materials: test.study_materials || ''
    });
    setShowAddTestModal(true);
    setSelectedDay(null);
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Delete this test? Students and parents will no longer see it.')) return;
    
    try {
      const { error } = await supabase
        .from('scheduled_tests')
        .delete()
        .eq('id', testId);
      
      if (error) throw error;
      await loadData(true);
      setSelectedDay(null);
    } catch (error) {
      console.error('Error deleting test:', error);
      alert('Failed to delete test');
    }
  };

  const handleSaveTest = async (e) => {
    e.preventDefault();
    
    if (!selectedDate || !teacherId) return;
    if (!formData.subject || !formData.class_name || !formData.title) {
      alert('Please fill in all required fields');
      return;
    }

    // Check for conflicts
    const dateStr = toDateStr(selectedDate);
    const existingTest = allTests.find(t => 
      t.test_date === dateStr && 
      t.class_name === formData.class_name &&
      t.id !== editingTest?.id
    );
    
    if (existingTest) {
      const confirmOverlap = window.confirm(
        `${formData.class_name} already has a test scheduled on this date:\n` +
        `"${existingTest.title}" (${existingTest.subject})\n\n` +
        `Do you want to schedule another test anyway?`
      );
      if (!confirmOverlap) return;
    }
    
    try {
      setSaving(true);

      const testData = {
        teacher_id: teacherId,
        subject: formData.subject,
        class_name: formData.class_name,
        test_date: dateStr,
        title: formData.title,
        topics_covered: formData.topics_covered || null,
        study_materials: formData.study_materials || null
      };
      
      if (editingTest) {
        const { error } = await supabase
          .from('scheduled_tests')
          .update(testData)
          .eq('id', editingTest.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('scheduled_tests')
          .insert([testData]);
        
        if (error) throw error;
      }
      
      await loadData(true);
      setShowAddTestModal(false);
      setEditingTest(null);
    } catch (error) {
      console.error('Error saving test:', error);
      alert('Failed to save test: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // ═══ LOADING STATE ═══
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: theme.withAlpha(0.3), borderTopColor: 'transparent' }} />
          <p className="text-gray-400 text-sm">Loading calendar...</p>
        </div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const today = new Date().toISOString().split('T')[0];

  // Upcoming tests (next 7 days)
  const upcomingTests = myTests
    .filter(t => t.test_date >= today)
    .slice(0, 5);

  // ═══ RENDER ═══
  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="rounded-2xl shadow-lg p-6 md:p-8 text-white relative overflow-hidden"
        style={theme.gradientStyle}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <CalendarIcon size={24} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Calendar</h1>
                <p className="text-white/80 text-sm">Schedule tests & view school events</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {theme.hasActiveTerm && (
                <div className="hidden sm:flex bg-white/15 backdrop-blur px-3 py-1.5 rounded-lg items-center gap-1.5">
                  <TermIcon size={14} />
                  <span className="text-xs font-medium">{theme.name} Term</span>
                </div>
              )}
              
              <button
                onClick={() => openAddTestModal(new Date())}
                disabled={teacherSubjects.length === 0}
                className="bg-white text-gray-800 px-4 md:px-6 py-2.5 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Schedule Test</span>
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex gap-4 mt-6 pt-4 border-t border-white/20">
            <div>
              <p className="text-2xl font-bold">{myTests.length}</p>
              <p className="text-white/60 text-xs">My Tests</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingTests.length}</p>
              <p className="text-white/60 text-xs">Upcoming</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{schoolEvents.filter(e => e.start_date >= today).length}</p>
              <p className="text-white/60 text-xs">Events</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ NO SUBJECTS WARNING ═══ */}
      {teacherSubjects.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">No subjects assigned</p>
            <p className="text-sm text-amber-700">
              You need subjects assigned to your profile to schedule tests. 
              Contact an administrator.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* ═══ CALENDAR ═══ */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon size={20} style={theme.textStyle} />
              {monthName}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={() => loadData(true)} disabled={refreshing}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
                <RefreshCw size={16} className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={goToToday} 
                className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                style={{ backgroundColor: theme.withAlpha(0.1), color: theme.color }}>
                Today
              </button>
              <div className="flex gap-1">
                <button onClick={prevMonth} className="p-2 rounded-lg transition-colors hover:bg-gray-100">
                  <ChevronLeft size={18} className="text-gray-600" />
                </button>
                <button onClick={nextMonth} className="p-2 rounded-lg transition-colors hover:bg-gray-100">
                  <ChevronRight size={18} className="text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {daysInMonth.map((date, idx) => {
              if (!date) return <div key={'empty-' + idx} className="aspect-square" />;
              
              const { events, myTests: myTestsOnDate, otherTests, isBlocked } = getEventsForDate(date);
              const dayNumber = date.getDate();
              const todayFlag = isToday(date);
              const weekend = isWeekend(date);
              const hasItems = events.length > 0 || myTestsOnDate.length > 0 || otherTests.length > 0;
              
              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(date)}
                  className={`min-h-[90px] rounded-xl border p-1.5 transition-all cursor-pointer group
                    ${isBlocked ? 'bg-gray-100 border-gray-200' :
                     weekend ? 'bg-gray-50/50 border-gray-100 hover:border-gray-200' :
                     'border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}
                  style={todayFlag ? { borderColor: theme.color, backgroundColor: theme.withAlpha(0.05) } : {}}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isBlocked || weekend ? 'text-gray-400' : 'text-gray-700'}`}
                      style={todayFlag ? theme.textStyle : {}}>
                      {dayNumber}
                    </span>
                    {!isBlocked && !hasItems && (
                      <Plus size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  
                  <div className="space-y-0.5 overflow-hidden">
                    {/* Events */}
                    {events.slice(0, 1).map((event, i) => (
                      <div key={'event-' + i} 
                        className={`text-[9px] px-1.5 py-0.5 rounded font-medium truncate
                          ${['break', 'holiday', 'Holiday'].includes(event.event_type) 
                            ? 'bg-gray-200 text-gray-600' 
                            : 'bg-blue-100 text-blue-700'}`}>
                        {event.title}
                      </div>
                    ))}
                    
                    {/* My Tests */}
                    {myTestsOnDate.slice(0, 1).map((test, i) => (
                      <div key={'mytest-' + i} 
                        className="text-[9px] px-1.5 py-0.5 rounded font-medium truncate"
                        style={{ backgroundColor: theme.withAlpha(0.15), color: theme.color }}>
                        {test.class_name}: {test.title}
                      </div>
                    ))}
                    
                    {/* Other teachers' tests */}
                    {otherTests.slice(0, 1).map((test, i) => (
                      <div key={'other-' + i} 
                        className="text-[9px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded font-medium truncate">
                        {test.class_name} (other)
                      </div>
                    ))}
                    
                    {/* More indicator */}
                    {(events.length + myTestsOnDate.length + otherTests.length) > 2 && (
                      <p className="text-[8px] text-gray-400 text-center">
                        +{events.length + myTestsOnDate.length + otherTests.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: theme.withAlpha(0.3) }} />
              <span className="text-xs text-gray-600">My Tests</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-orange-200 rounded" />
              <span className="text-xs text-gray-600">Other Tests</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-blue-200 rounded" />
              <span className="text-xs text-gray-600">Event</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-gray-200 rounded" />
              <span className="text-xs text-gray-600">Holiday</span>
            </div>
          </div>
        </div>

        {/* ═══ SIDEBAR: Upcoming Tests ═══ */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
              <BookOpen size={16} style={theme.textStyle} />
              My Upcoming Tests
            </h3>
            {upcomingTests.length > 0 ? (
              <div className="space-y-2">
                {upcomingTests.map(test => {
                  const testDate = new Date(test.test_date + 'T00:00:00');
                  const daysUntil = Math.ceil((testDate - new Date()) / 86400000);
                  
                  return (
                    <div key={test.id} 
                      className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors cursor-pointer"
                      onClick={() => handleEditTest(test)}>
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 border"
                          style={{ backgroundColor: theme.withAlpha(0.1), borderColor: theme.withAlpha(0.2) }}>
                          <span className="text-[8px] font-medium leading-none" style={theme.textStyle}>
                            {testDate.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
                          </span>
                          <span className="text-sm font-bold leading-none" style={theme.textStyle}>
                            {testDate.getDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{test.title}</p>
                          <p className="text-[11px] text-gray-500">{test.subject} • {test.class_name}</p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full flex-shrink-0"
                          style={{ 
                            backgroundColor: daysUntil <= 1 ? '#fef2f2' : theme.withAlpha(0.1),
                            color: daysUntil <= 1 ? '#dc2626' : theme.color
                          }}>
                          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <CalendarIcon size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-400">No upcoming tests</p>
              </div>
            )}
          </div>

          {/* Term Footer */}
          {theme.hasActiveTerm && (
            <div className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: theme.withAlpha(0.1), borderWidth: '1px', borderColor: theme.withAlpha(0.2) }}>
              <div className="flex items-center gap-2">
                <TermIcon size={14} style={theme.textStyle} />
                <span className="text-xs font-semibold" style={theme.textStyle}>
                  {theme.name} Term
                </span>
              </div>
              <span className="text-[10px] font-medium" style={theme.textStyle}>
                {theme.daysRemaining}d left
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ DAY DETAIL MODAL ═══ */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" 
          onClick={() => setSelectedDay(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col" 
            onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-5 py-4 rounded-t-2xl flex items-center justify-between text-white"
              style={theme.gradientStyle}>
              <div>
                <h3 className="text-lg font-bold">
                  {selectedDay.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <p className="text-white/80 text-xs mt-0.5">
                  {selectedDay.myTests.length + selectedDay.otherTests.length} tests • {selectedDay.events.length} events
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!selectedDay.isBlocked && (
                  <button onClick={() => openAddTestModal(selectedDay.date)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                    <Plus size={18} />
                  </button>
                )}
                <button onClick={() => setSelectedDay(null)} 
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* My Tests */}
              {selectedDay.myTests.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                    <BookOpen size={14} style={theme.textStyle} /> My Tests
                  </h4>
                  <div className="space-y-2">
                    {selectedDay.myTests.map(test => (
                      <div key={test.id} className="p-3 rounded-xl border group"
                        style={{ backgroundColor: theme.withAlpha(0.05), borderColor: theme.withAlpha(0.2) }}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                                style={{ backgroundColor: theme.withAlpha(0.15), color: theme.color }}>
                                {test.subject}
                              </span>
                              <span className="text-[10px] text-gray-500">{test.class_name}</span>
                            </div>
                            <p className="font-semibold text-gray-800 text-sm">{test.title}</p>
                            {test.topics_covered && (
                              <p className="text-xs text-gray-600 mt-1">
                                <strong>Topics:</strong> {test.topics_covered}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditTest(test)}
                              className="p-1.5 hover:bg-white rounded-lg transition-colors">
                              <Edit3 size={14} className="text-gray-500" />
                            </button>
                            <button onClick={() => handleDeleteTest(test.id)}
                              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={14} className="text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Teachers' Tests */}
              {selectedDay.otherTests.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                    <Users size={14} className="text-orange-600" /> Other Teachers' Tests
                  </h4>
                  <div className="space-y-2">
                    {selectedDay.otherTests.map(test => (
                      <div key={test.id} className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold">
                            {test.subject}
                          </span>
                          <span className="text-[10px] text-gray-500">{test.class_name}</span>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm">{test.title}</p>
                        <p className="text-[10px] text-orange-600 mt-1">
                          By: {test.teachers?.full_name || 'Unknown'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* School Events */}
              {selectedDay.events.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                    <CalendarIcon size={14} className="text-blue-600" /> School Events
                  </h4>
                  <div className="space-y-2">
                    {selectedDay.events.map((event, i) => (
                      <div key={i} className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="font-semibold text-gray-800 text-sm">{event.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-blue-600">
                          <span className="px-1.5 py-0.5 bg-blue-100 rounded">{event.event_type}</span>
                          {event.location && (
                            <span className="flex items-center gap-0.5">
                              <MapPin size={10} /> {event.location}
                            </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="text-xs text-gray-600 mt-1.5">{event.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {selectedDay.myTests.length === 0 && selectedDay.otherTests.length === 0 && selectedDay.events.length === 0 && (
                <div className="text-center py-8">
                  <CalendarIcon size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Nothing scheduled</p>
                  {!selectedDay.isBlocked && (
                    <button onClick={() => openAddTestModal(selectedDay.date)}
                      className="mt-3 text-sm font-medium px-4 py-2 rounded-lg"
                      style={{ backgroundColor: theme.withAlpha(0.1), color: theme.color }}>
                      Schedule a Test
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t px-5 py-3">
              <button onClick={() => setSelectedDay(null)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl transition-colors font-medium text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADD/EDIT TEST MODAL ═══ */}
      {showAddTestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 flex items-center justify-between text-white"
              style={theme.gradientStyle}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    {editingTest ? 'Edit Test' : 'Schedule Test'}
                  </h3>
                  <p className="text-white/80 text-xs">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <button onClick={() => { setShowAddTestModal(false); setEditingTest(null); }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTest} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:outline-none text-sm"
                    style={{ '--tw-ring-color': theme.color }}
                    required
                  >
                    <option value="">Select...</option>
                    {teacherSubjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Class *</label>
                  <select
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:outline-none text-sm"
                    required
                  >
                    <option value="">Select...</option>
                    {availableClasses.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Test Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:outline-none text-sm"
                  placeholder="e.g., Chapter 5 Test, Midterm Exam"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Topics Covered</label>
                <textarea
                  value={formData.topics_covered}
                  onChange={(e) => setFormData({ ...formData, topics_covered: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:outline-none text-sm resize-none"
                  rows="2"
                  placeholder="Students will see this - list main topics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Study Materials</label>
                <textarea
                  value={formData.study_materials}
                  onChange={(e) => setFormData({ ...formData, study_materials: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:outline-none text-sm resize-none"
                  rows="2"
                  placeholder="e.g., Review chapters 3-5, practice worksheet"
                />
              </div>

              {editingTest && (
                <button
                  type="button"
                  onClick={() => handleDeleteTest(editingTest.id)}
                  className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm py-2"
                >
                  <Trash2 size={16} />
                  Delete Test
                </button>
              )}
            </form>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4 bg-gray-50 flex gap-3">
              <button
                type="submit"
                onClick={handleSaveTest}
                disabled={saving}
                className="flex-1 text-white py-3 rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50"
                style={theme.gradientStyle}
              >
                {saving ? 'Saving...' : editingTest ? 'Update Test' : 'Schedule Test'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddTestModal(false); setEditingTest(null); }}
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

export default TeacherCalendarPage;