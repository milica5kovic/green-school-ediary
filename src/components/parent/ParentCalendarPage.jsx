import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  AlertCircle,
  BookOpen,
  FileText,
  Clock,
  Award
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ParentCalendarPage = () => {
  const { supabase } = useApp();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [scheduledTests, setScheduledTests] = useState([]);
  const [homeworkDue, setHomeworkDue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);

  const loadChildren = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!parent) return;
      
      const { data: studentParents } = await supabase
        .from('student_parents')
        .select('students(*)')
        .eq('parent_id', parent.id);
      
      const childrenList = studentParents?.map(sp => sp.students).filter(Boolean) || [];
      setChildren(childrenList);
      
      if (childrenList.length > 0) {
        setSelectedChild(childrenList[0]);
      }
      
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const loadCalendarData = useCallback(async () => {
    if (!selectedChild) return;
    
    try {
      // Load school events
      const { data: events } = await supabase
        .from('school_events')
        .select('*')
        .order('start_date');
      
      // Filter events that apply to this child's class
      const relevantEvents = events?.filter(event => {
        if (event.scope === 'all') return true;
        if (event.scope === 'specific' && event.affected_classes) {
          return event.affected_classes.includes(selectedChild.class_name);
        }
        return false;
      }) || [];
      
      setSchoolEvents(relevantEvents);
      
      // Load scheduled tests for this class
      const { data: tests } = await supabase
        .from('scheduled_tests')
        .select('*')
        .eq('class_name', selectedChild.class_name)
        .order('test_date');
      
      setScheduledTests(tests || []);
      
      // Load homework for this class
      const { data: homework } = await supabase
        .from('homework')
        .select('*')
        .eq('class_name', selectedChild.class_name)
        .order('due_date');
      
      setHomeworkDue(homework || []);
      
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  }, [selectedChild, supabase]);

  useEffect(() => {
    if (selectedChild) {
      loadCalendarData();
    }
  }, [selectedChild, loadCalendarData]);

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
    if (!date) return { events: [], tests: [], homework: [], isBreak: false };
    const dateStr = date.toISOString().split('T')[0];
    
    const events = schoolEvents.filter(event => {
      return dateStr >= event.start_date && dateStr <= event.end_date;
    });
    
    const tests = scheduledTests.filter(test => test.test_date === dateStr);
    const homework = homeworkDue.filter(hw => hw.due_date === dateStr);
    
    const isBreak = events.some(e => e.event_type === 'break' || e.event_type === 'holiday');
    
    return { events, tests, homework, isBreak };
  };

  const handleDayClick = (date) => {
    const dayData = getEventsForDate(date);
    if (dayData.events.length === 0 && dayData.tests.length === 0 && dayData.homework.length === 0) {
      return;
    }
    setSelectedDayEvents({ date, ...dayData });
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

  if (children.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CalendarIcon size={40} className="text-gray-400" />
        </div>
        <p className="text-gray-600 text-lg">No student data available</p>
        <p className="text-gray-400 text-sm mt-2">Please contact your school administrator</p>
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
                  <h1 className="text-3xl font-bold">School Calendar</h1>
                  <p className="text-purple-100 text-sm">Events, tests, homework & breaks</p>
                </div>
              </div>
            </div>
            
            {children.length > 1 && (
              <div className="relative">
                <select
                  value={selectedChild?.id || ''}
                  onChange={(e) => setSelectedChild(children.find(c => c.id === e.target.value))}
                  className="appearance-none bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 rounded-xl px-4 py-3 pr-10 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 cursor-pointer"
                >
                  {children.map(child => (
                    <option key={child.id} value={child.id} className="text-gray-900">
                      {child.name} - {child.class_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" size={16} />
              </div>
            )}
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
              
              const { events, tests, homework, isBreak } = getEventsForDate(date);
              const dayNumber = date.getDate();
              const today = isToday(date);
              const hasEvents = events.length > 0 || tests.length > 0 || homework.length > 0;
              
              // Multi-day break spanning
              const multiDayBreaks = events.filter(e => 
                (e.event_type === 'break' || e.event_type === 'holiday') &&
                e.start_date !== e.end_date
              );
              
              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(date)}
                  className={'min-h-[100px] rounded-xl border-2 p-2 transition-all relative cursor-pointer ' + 
                    (isBreak ? 'bg-gray-100 border-gray-300' :
                     today ? 'border-purple-500 bg-purple-50 hover:shadow-lg' :
                     hasEvents ? 'border-gray-200 hover:border-purple-300 hover:shadow-md' :
                     'border-gray-200 hover:border-gray-300')}
                >
                  <span className={'text-sm font-bold mb-1 block ' + 
                    (today ? 'text-purple-600' : isBreak ? 'text-gray-400' : 'text-gray-700')}>
                    {dayNumber}
                  </span>
                  
                  <div className="space-y-1">
                    {/* Multi-day breaks */}
                    {multiDayBreaks.map((event, i) => (
                      <div key={'break-' + i} className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded font-medium truncate">
                        {event.title}
                      </div>
                    ))}
                    
                    {/* Single day events */}
                    {events.filter(e => e.start_date === e.end_date && e.event_type !== 'break' && e.event_type !== 'holiday').map((event, i) => (
                      <div key={'event-' + i} className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium truncate">
                        {event.title}
                      </div>
                    ))}
                    
                    {/* Tests */}
                    {tests.map((test, i) => (
                      <div key={'test-' + i} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded font-medium truncate">
                        {test.subject}
                      </div>
                    ))}
                    
                    {/* Homework */}
                    {homework.map((hw, i) => (
                      <div key={'hw-' + i} className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-medium truncate">
                        {hw.subject} HW
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <span className="text-sm text-gray-600 font-medium">School Break</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 rounded"></div>
            <span className="text-sm text-gray-600 font-medium">School Event</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 rounded"></div>
            <span className="text-sm text-gray-600 font-medium">Test</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-100 rounded"></div>
            <span className="text-sm text-gray-600 font-medium">Homework Due</span>
          </div>
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDayEvents && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                  <CalendarIcon size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedDayEvents.date.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                  <p className="text-purple-100 text-sm">
                    {selectedDayEvents.events.length + selectedDayEvents.tests.length + selectedDayEvents.homework.length} events
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDayEvents(null)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors text-white"
              >
                <AlertCircle size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* School Events */}
              {selectedDayEvents.events.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <BookOpen size={18} className="text-blue-600" />
                    School Events
                  </h4>
                  <div className="space-y-2">
                    {selectedDayEvents.events.map((event, i) => (
                      <div key={i} className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{event.title}</p>
                            <p className="text-sm text-blue-700 mt-1">
                              {event.event_type === 'break' ? 'School Break' :
                               event.event_type === 'holiday' ? 'Public Holiday' :
                               event.event_type === 'exam_period' ? 'Exam Period' :
                               'School Event'}
                            </p>
                            {event.description && (
                              <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tests */}
              {selectedDayEvents.tests.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Award size={18} className="text-red-600" />
                    Scheduled Tests
                  </h4>
                  <div className="space-y-2">
                    {selectedDayEvents.tests.map((test, i) => (
                      <div key={i} className="p-4 bg-red-50 rounded-xl border border-red-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">
                                {test.subject}
                              </span>
                            </div>
                            <p className="font-semibold text-gray-900">{test.title}</p>
                            {test.topics_covered && (
                              <p className="text-sm text-gray-600 mt-2">
                                <strong>Topics:</strong> {test.topics_covered}
                              </p>
                            )}
                            {test.study_materials && (
                              <p className="text-sm text-gray-600 mt-2">
                                <strong>Study:</strong> {test.study_materials}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Homework */}
              {selectedDayEvents.homework.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText size={18} className="text-yellow-600" />
                    Homework Due
                  </h4>
                  <div className="space-y-2">
                    {selectedDayEvents.homework.map((hw, i) => (
                      <div key={i} className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold">
                                {hw.subject}
                              </span>
                              <span className={'px-2 py-1 rounded-lg text-xs font-semibold ' + 
                                (hw.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>
                                {hw.status === 'completed' ? 'Completed' : 'Pending'}
                              </span>
                            </div>
                            <p className="font-semibold text-gray-900">{hw.title}</p>
                            {hw.description && (
                              <p className="text-sm text-gray-600 mt-2">{hw.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t px-6 py-4 bg-gray-50">
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl hover:shadow-lg transition-all font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentCalendarPage;