import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  X,
  BookOpen,
  AlertCircle,
  FileText,
  Clock
} from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';

const TeacherCalendarPage = () => {
  const { supabase } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [myTests, setMyTests] = useState([]);
  const [showAddTestModal, setShowAddTestModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    subject: '',
    class_name: '',
    title: '',
    topics_covered: '',
    study_materials: ''
  });
  const [editingTest, setEditingTest] = useState(null);

  
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Load teacher info
      const { data: teacher } = await supabase
        .from('teachers')
        .select('subjects')
        .eq('user_id', user.id)
        .single();
      
      setTeacherSubjects(teacher?.subjects || []);
      
      // Load available classes
      const { data: classes } = await supabase
        .from('custom_classes')
        .select('class_name')
        .eq('is_active', true)
        .order('class_name');
      
      setAvailableClasses(classes?.map(c => c.class_name) || []);
      
      // Load school events
      const { data: events } = await supabase
        .from('school_events')
        .select('*')
        .order('start_date');
      
      setSchoolEvents(events || []);
      
      // Load my tests
      const { data: tests } = await supabase
        .from('scheduled_tests')
        .select('*')
        .eq('teacher_id', user.id)
        .order('test_date');
      
      setMyTests(tests || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ✅ HELPER FUNCTION - Format date without timezone issues
const formatDateSafe = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

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
const isDateBlocked = (date) => {
  if (!date) return false;
  
  // ✅ Format date manually
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  return schoolEvents.some(event => {
    if (event.event_type !== 'break' && event.event_type !== 'holiday') return false;
    return dateStr >= event.start_date && dateStr <= event.end_date;
  });
};

const getEventsForDate = (date) => {
  if (!date) return { events: [], tests: [], isBlocked: false };
  
  // ✅ Format date manually without timezone conversion
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  const events = schoolEvents.filter(event => {
    return dateStr >= event.start_date && dateStr <= event.end_date;
  });
  
  const tests = myTests.filter(test => test.test_date === dateStr);
  const isBlocked = events.some(e => e.event_type === 'break' || e.event_type === 'holiday');
  
  return { events, tests, isBlocked };
};

const handleEditTest = (test) => {
  setEditingTest(test);
  
  // ✅ Parse date safely from string
  const [year, month, day] = test.test_date.split('-');
  const testDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  setSelectedDate(testDate);
  setFormData({
    subject: test.subject,
    class_name: test.class_name,
    title: test.title,
    topics_covered: test.topics_covered || '',
    study_materials: test.study_materials || ''
  });
  setShowAddTestModal(true);
};



const handleDayClick = (date) => {
  if (isDateBlocked(date)) {
    alert('Cannot schedule tests on breaks or holidays');
    return;
  }
  
  // ✅ Format date safely
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  setSelectedDate(date);
  setShowAddTestModal(true);
  setFormData({
    subject: '',
    class_name: '',
    title: '',
    topics_covered: '',
    study_materials: ''
  });
  setEditingTest(null);
};

  // const handleEditTest = (test) => {
  //   setEditingTest(test);
  //   setSelectedDate(new Date(test.test_date));
  //   setFormData({
  //     subject: test.subject,
  //     class_name: test.class_name,
  //     title: test.title,
  //     topics_covered: test.topics_covered || '',
  //     study_materials: test.study_materials || ''
  //   });
  //   setShowAddTestModal(true);
  // };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Delete this test? This cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('scheduled_tests')
        .delete()
        .eq('id', testId);
      
      if (error) throw error;
      
      await loadData();
    } catch (error) {
      console.error('Error deleting test:', error);
      alert('Failed to delete test');
    }
  };

  const handleSaveTest = async (e) => {
    e.preventDefault();
    
    if (!selectedDate) return;
    if (!formData.subject || !formData.class_name || !formData.title) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // ✅ Format date safely
const year = selectedDate.getFullYear();
const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
const day = String(selectedDate.getDate()).padStart(2, '0');
const dateStr = `${year}-${month}-${day}`;

const testData = {
  teacher_id: user.id,
  subject: formData.subject,
  class_name: formData.class_name,
  test_date: dateStr,
  title: formData.title,
  topics_covered: formData.topics_covered,
  study_materials: formData.study_materials
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
      
      await loadData();
      setShowAddTestModal(false);
      setEditingTest(null);
    } catch (error) {
      console.error('Error saving test:', error);
      alert('Failed to save test');
    }
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <CalendarIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-purple-600" size={24} />
        </div>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentMonth);
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-3xl shadow-2xl p-8 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Calendar</h1>
                  <p className="text-purple-100 text-sm">Schedule tests & view school events</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => {
                setSelectedDate(new Date());
                setShowAddTestModal(true);
                setEditingTest(null);
                setFormData({
                  subject: '',
                  class_name: '',
                  title: '',
                  topics_covered: '',
                  study_materials: ''
                });
              }}
              className="bg-white text-purple-600 px-6 py-3 rounded-xl flex items-center gap-2 hover:shadow-lg transition-all font-semibold"
            >
              <Plus size={20} />
              Schedule Test
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarIcon size={24} className="text-purple-600" />
            {monthName}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="p-2 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
            >
              <ChevronLeft size={20} className="text-purple-600" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
            >
              <ChevronRight size={20} className="text-purple-600" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Week Days */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
              <div key={day} className="text-center text-sm font-bold text-gray-700 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.map((date, idx) => {
              if (!date) {
                return <div key={'empty-' + idx} className="aspect-square" />;
              }
              
              const { events, tests, isBlocked } = getEventsForDate(date);
              const dayNumber = date.getDate();
              const today = isToday(date);
              
              // Check if this is part of a multi-day event
              const multiDayEvents = events.filter(e => 
                (e.event_type === 'break' || e.event_type === 'holiday') &&
                e.start_date !== e.end_date
              );
              
              return (
                <div
                  key={idx}
                  onClick={() => !isBlocked && handleDayClick(date)}
                  className={'min-h-[100px] rounded-xl border-2 p-2 transition-all relative group ' + 
                    (isBlocked ? 'bg-gray-100 border-gray-300 cursor-not-allowed' :
                     today ? 'border-purple-500 bg-purple-50 cursor-pointer hover:shadow-lg' :
                     'border-gray-200 cursor-pointer hover:border-purple-300 hover:shadow-md')}
                >
                  <span className={'text-sm font-bold mb-1 block ' + 
                    (today ? 'text-purple-600' : isBlocked ? 'text-gray-400' : 'text-gray-700')}>
                    {dayNumber}
                  </span>
                  
                  <div className="space-y-1">
                    {/* Multi-day event banner */}
                    {multiDayEvents.map((event, i) => (
                      <div key={'event-' + i} className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded font-medium truncate">
                        {event.title}
                      </div>
                    ))}
                    
                    {/* Single day events */}
{events.filter(e => e.start_date === e.end_date).map((event, i) => (
  <div 
    key={'event-' + i} 
    className={'text-xs px-2 py-1 rounded font-medium truncate ' +
      (event.event_type === 'term_start' ? 'bg-green-100 text-green-700' :
       event.event_type === 'exam_period' ? 'bg-orange-100 text-orange-700' :
       'bg-blue-100 text-blue-700')}
  >
    {event.title}
  </div>
))}
                    
                    {/* Tests */}
                    {tests.map((test, i) => (
                      <div 
                        key={'test-' + i} 
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-medium truncate group-hover:bg-red-200 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTest(test);
                        }}
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
                          <div key={'tooltip-event-' + i} className="mb-1">
                            <span className="font-semibold text-blue-300">{event.title}</span>
                            {event.description && <div className="text-gray-300 text-xs">{event.description}</div>}
                          </div>
                        ))}
                        {tests.map((test, i) => (
                          <div key={'tooltip-test-' + i} className="mb-1">
                            <span className="font-semibold text-red-300">{test.subject} - {test.title}</span>
                            <div className="text-gray-300 text-xs">{test.class_name}</div>
                            {test.topics_covered && <div className="text-gray-400 text-xs mt-1">Topics: {test.topics_covered}</div>}
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
    <span className="text-sm text-gray-600 font-medium">School Break/Holiday</span>
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

      {/* Add/Edit Test Modal */}
      {showAddTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <FileText size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {editingTest ? 'Edit Test' : 'Schedule Test'}
                  </h3>
                  <p className="text-purple-100 text-sm">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowAddTestModal(false);
                  setEditingTest(null);
                }}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTest} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Select Subject</option>
                    {teacherSubjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                {/* Class */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class *
                  </label>
                  <select
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    required
                  >
                    <option value="">Select Class</option>
                    {availableClasses.map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="e.g., Mid-term Exam, Chapter 5 Test"
                  required
                />
              </div>

              {/* Topics Covered */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Topics Covered
                </label>
                <textarea
                  value={formData.topics_covered}
                  onChange={(e) => setFormData({ ...formData, topics_covered: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                  rows="3"
                  placeholder="List the main topics that will be covered in this test"
                />
              </div>

              {/* Study Materials */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Study Materials
                </label>
                <textarea
                  value={formData.study_materials}
                  onChange={(e) => setFormData({ ...formData, study_materials: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                  rows="3"
                  placeholder="e.g., Review chapters 3-5, practice exercises on page 45, study guide available on classroom"
                />
              </div>

              {editingTest && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleDeleteTest(editingTest.id)}
                    className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center gap-2"
                  >
                    <X size={16} />
                    Delete Test
                  </button>
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4 bg-gray-50 flex gap-3">
              <button
                type="submit"
                onClick={handleSaveTest}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                {editingTest ? 'Update Test' : 'Schedule Test'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddTestModal(false);
                  setEditingTest(null);
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

export default TeacherCalendarPage;