import React, { useState } from "react";
import { Settings, User, Users as UsersIcon, UserPlus, BookOpen, GraduationCap, Archive as ArchiveIcon, BarChart3, Calendar } from 'lucide-react';
import { useAuth } from '../../../../core/context/AuthContext';
import StudentsPage from '../../students/components/StudentsPage';
import ProfileManagementPage from './ProfileManagementPage';
import AnalyticsTab from '../../grading/components/AnalyticsTab';
import ClassesTabContent from '../../settings/components/ClassesTabContent';
import SubjectsTabContent from '../../settings/components/SubjectsTabContent';
import ArchiveTabContent from '../../settings/components/ArchiveTabContent';
import AccountTabContent from '../../settings/components/AccountTabContent';
// import EnrollmentTabContent from "../../settings/components/EnrollmentTabContent";
import AcademicTermsManager from './AcademicTermsManager';

const tabs = [
  { id: 'account', label: 'My Account', icon: User },
  { id: 'students', label: 'Students', icon: GraduationCap },
  { id: 'profiles', label: 'Profiles', icon: UsersIcon },
  { id: 'classes', label: 'Classes', icon: UsersIcon },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  // { id: 'enrollment', label: 'Enrollment', icon: UserPlus },
  { id: 'terms', label: 'Academic Terms', icon: Calendar },
  { id: 'archive', label: 'Archive & Export', icon: ArchiveIcon },
];

const ManagementPage = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('account');

  if (!isAdmin()) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-red-100">
        <p className="text-red-600 font-medium">Access Denied: Admin Only</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-emerald-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center">
            <Settings size={24} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Management</h2>
        </div>
        <p className="text-gray-600 ml-13">School administration and system settings</p>
      </div>

      {/* Tabs + Content */}
      <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
        {/* Tab Buttons - flex-wrap so they go to second row on smaller screens */}
        <div className="flex flex-wrap border-b border-gray-200">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                    : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={16} />
                  <span className="text-sm">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 overflow-x-auto max-w-full">
          {activeTab === 'account' && <AccountTabContent />}
          {activeTab === 'students' && <StudentsPage />}
          {activeTab === 'profiles' && <ProfileManagementPage />}
          {activeTab === 'classes' && <ClassesTabContent />}
          {activeTab === 'subjects' && <SubjectsTabContent />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {/* {activeTab === 'enrollment' && <EnrollmentTabContent />} */}
          {activeTab === 'terms' && <AcademicTermsManager />}
          {activeTab === 'archive' && <ArchiveTabContent />}
        </div>
      </div>
    </div>
  );
};

export default ManagementPage;