import React, { useState } from 'react';
import { Settings, User, Users as UsersIcon, BookOpen, GraduationCap, Archive as ArchiveIcon, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StudentsPage from '../students/StudentsPage';
import ProfileManagementPage from './ProfileManagementPage';
import AnalyticsTab from '../analytics/AnalyticsTab';

// Import helper components for Settings tabs
import ClassesTabContent from '../settings/ClassesTabContent';
import SubjectsTabContent from '../settings/SubjectsTabContent';
import ArchiveTabContent from '../settings/ArchiveTabContent';
import AccountTabContent from '../settings/AccountTabContent';

const ManagementPage = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('account');

  // Redirect if not admin
  if (!isAdmin()) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-red-100">
        <p className="text-red-600 font-medium">Access Denied: Admin Only</p>
      </div>
    );
  }

  const tabs = [
    { id: 'account', label: 'My Account', icon: User },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'profiles', label: 'Profiles', icon: UsersIcon },
    { id: 'classes', label: 'Classes', icon: UsersIcon },
    { id: 'subjects', label: 'Subjects', icon: BookOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'archive', label: 'Archive & Export', icon: ArchiveIcon }
  ];

  return (
    <div className="space-y-6">
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

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <tab.icon size={18} />
                {tab.label}
              </div>
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'account' && <AccountTabContent />}
          {activeTab === 'students' && <StudentsPage />}
          {activeTab === 'profiles' && <ProfileManagementPage />}
          {activeTab === 'classes' && <ClassesTabContent />}
          {activeTab === 'subjects' && <SubjectsTabContent />}
          {activeTab === 'analytics' && <AnalyticsTab />}
          {activeTab === 'archive' && <ArchiveTabContent />}
        </div>
      </div>
    </div>
  );
};

export default ManagementPage;