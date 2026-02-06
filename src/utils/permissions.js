/**
 * Centralized permission checks
 * ONE place to control ALL security logic!
 */

/**
 * Can user view this teacher's schedule?
 */
export const canViewSchedule = (currentUser, targetTeacherId) => {
  // Teachers can only view their own
  if (currentUser.profile.role === 'teacher') {
    return currentUser.teacher?.user_id === targetTeacherId;
  }
  
  // Admins can view any schedule
  if (currentUser.profile.role === 'admin') {
    return true;
  }
  
  return false;
};

/**
 * Can user edit this schedule entry?
 */
export const canEditScheduleEntry = (currentUser, scheduleEntry) => {
  // Only the teacher who owns the entry can edit it
  if (!currentUser.teacher) return false;
  return scheduleEntry.teacherId === currentUser.teacher.user_id;
};

/**
 * Can user delete this schedule entry?
 */
export const canDeleteScheduleEntry = (currentUser, scheduleEntry) => {
  // Teacher can delete their own
  if (currentUser.teacher?.user_id === scheduleEntry.teacherId) {
    return true;
  }
  
  // Admin can delete any (cleanup)
  if (currentUser.profile.role === 'admin') {
    return true;
  }
  
  return false;
};

/**
 * Can user add schedule for this teacher?
 */
export const canAddScheduleFor = (currentUser, targetTeacherId) => {
  // Teachers can only add for themselves
  if (currentUser.profile.role === 'teacher') {
    return currentUser.teacher?.user_id === targetTeacherId;
  }
  
  // Admins can add for anyone (including themselves if they have teacher_id)
  if (currentUser.profile.role === 'admin') {
    return true;
  }
  
  return false;
};

/**
 * Should show admin dropdown?
 */
export const showAdminDropdown = (currentUser) => {
  return currentUser.profile.role === 'admin';
};

/**
 * Get default schedule view
 */
export const getDefaultScheduleView = (currentUser) => {
  // If user has teacher_id, show their schedule
  if (currentUser.teacher?.user_id) {
    return {
      mode: 'own',
      teacherId: currentUser.teacher.user_id,
      label: 'My Schedule'
    };
  }
  
  // Admin without teacher_id → show all
  if (currentUser.profile.role === 'admin') {
    return {
      mode: 'all',
      teacherId: null,
      label: 'All Teachers'
    };
  }
  
  // Fallback
  return {
    mode: 'none',
    teacherId: null,
    label: 'No Schedule'
  };
};

/**
 * Can user view student data?
 */
export const canViewStudent = (currentUser, studentId) => {
  // Admins can view all students
  if (currentUser.profile.role === 'admin') {
    return true;
  }
  
  // Teachers can view students in their classes
  // TODO: Check if student is in teacher's class
  if (currentUser.profile.role === 'teacher') {
    return true; // For now, all teachers can see all students
  }
  
  // Parents can only view their own children
  if (currentUser.profile.role === 'parent') {
    // TODO: Check if studentId is linked to this parent
    return false;
  }
  
  return false;
};

/**
 * Get teacher color for "All Teachers" view
 */
export const getTeacherColor = (teacherId, allTeachers) => {
  const colors = [
    'bg-blue-100 border-blue-500 text-blue-900',
    'bg-pink-100 border-pink-500 text-pink-900',
    'bg-purple-100 border-purple-500 text-purple-900',
    'bg-green-100 border-green-500 text-green-900',
    'bg-yellow-100 border-yellow-500 text-yellow-900',
    'bg-indigo-100 border-indigo-500 text-indigo-900',
    'bg-red-100 border-red-500 text-red-900',
    'bg-teal-100 border-teal-500 text-teal-900'
  ];
  
  const index = allTeachers.findIndex(t => t.user_id === teacherId);
  return colors[index % colors.length];
};