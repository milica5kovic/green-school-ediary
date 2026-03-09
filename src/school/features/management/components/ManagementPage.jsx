import React, { useState, useCallback, useMemo } from "react";
import { 
  Settings, 
  User, 
  Users as UsersIcon, 
  BookOpen, 
  GraduationCap, 
  Archive as ArchiveIcon, 
  BarChart3, 
  Calendar,
  Palette,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../../../core/context/AuthContext';
import { useBranding } from '../../../../core/context/BrandingContext';

// Tab Components
import StudentsPage from '../../students/components/StudentsPage';
import ProfileManagementPage from './ProfileManagementPage';
import AnalyticsTab from '../../grading/components/AnalyticsTab';
import ClassesTabContent from '../../settings/components/ClassesTabContent';
import SubjectsTabContent from '../../settings/components/SubjectsTabContent';
import ArchiveTabContent from '../../settings/components/ArchiveTabContent';
import AccountTabContent from '../../settings/components/AccountTabContent';
import AcademicTermsManager from './AcademicTermsManager';
import SchoolColorsTab from '../../settings/components/SchoolColorsTab';

// ============================================================================
// TAB CONFIGURATION
// ============================================================================

const TABS = [
  { id: 'account', label: 'My Account', icon: User, description: 'Profile and preferences' },
  { id: 'students', label: 'Students', icon: GraduationCap, description: 'Manage student records' },
  { id: 'profiles', label: 'Profiles', icon: UsersIcon, description: 'Staff and parent accounts' },
  { id: 'classes', label: 'Classes', icon: UsersIcon, description: 'Class configuration' },
  { id: 'subjects', label: 'Subjects', icon: BookOpen, description: 'Subject management' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Reports and insights' },
  { id: 'terms', label: 'Terms', icon: Calendar, description: 'Academic term dates' },
  { id: 'colors', label: 'Colors', icon: Palette, description: 'Brand and term colors' },
  { id: 'archive', label: 'Archive', icon: ArchiveIcon, description: 'Export and backup' },
];

const TAB_COMPONENTS = {
  account: AccountTabContent,
  students: StudentsPage,
  profiles: ProfileManagementPage,
  classes: ClassesTabContent,
  subjects: SubjectsTabContent,
  analytics: AnalyticsTab,
  terms: AcademicTermsManager,
  colors: SchoolColorsTab,
  archive: ArchiveTabContent,
};

// ============================================================================
// MANAGEMENT PAGE
// ============================================================================

const ManagementPage = () => {
  const { isAdmin } = useAuth();
  const { primaryColor } = useBranding();
  const [activeTab, setActiveTab] = useState('account');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handlers
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  }, []);

  // Current tab info
  const currentTab = useMemo(() => 
    TABS.find(t => t.id === activeTab) || TABS[0],
  [activeTab]);

  // Access control
  if (!isAdmin()) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 sm:p-12 text-center border border-red-100">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings size={32} className="text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h3>
        <p className="text-gray-600">Admin privileges required to access this page.</p>
      </div>
    );
  }

  // Render tab content
  const renderContent = () => {
    const Component = TAB_COMPONENTS[activeTab] || AccountTabContent;
    return <Component />;
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <div 
        className="rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 border"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}08, ${primaryColor}03)`,
          borderColor: `${primaryColor}20`
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${primaryColor}15` }}
          >
            <Settings size={22} style={{ color: primaryColor }} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Management</h2>
            <p className="text-gray-500 text-xs sm:text-sm">School administration and system settings</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Mobile Tab Selector */}
        <div className="sm:hidden border-b border-gray-200">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <currentTab.icon size={18} style={{ color: primaryColor }} />
              <span className="font-medium text-gray-800">{currentTab.label}</span>
            </div>
            <ChevronRight 
              size={18} 
              className={`text-gray-400 transition-transform ${isMobileMenuOpen ? 'rotate-90' : ''}`} 
            />
          </button>
          
          {isMobileMenuOpen && (
            <div className="border-t border-gray-100 bg-gray-50 max-h-64 overflow-y-auto">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-2 ${
                      isActive 
                        ? 'bg-white' 
                        : 'hover:bg-gray-100 border-transparent'
                    }`}
                    style={isActive ? { borderColor: primaryColor, color: primaryColor } : {}}
                  >
                    <Icon size={16} className={isActive ? '' : 'text-gray-400'} />
                    <div>
                      <p className={`text-sm font-medium ${isActive ? '' : 'text-gray-700'}`}>
                        {tab.label}
                      </p>
                      <p className="text-xs text-gray-400">{tab.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop Tab Navigation */}
        <nav 
          className="hidden sm:flex flex-wrap border-b border-gray-200" 
          role="tablist"
        >
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                className={`px-3 lg:px-4 py-3 font-medium transition-all whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'border-current'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                style={isActive ? { 
                  color: primaryColor,
                  backgroundColor: `${primaryColor}05`
                } : {}}
              >
                <div className="flex items-center gap-1.5 lg:gap-2">
                  <Icon size={15} />
                  <span className="text-xs lg:text-sm">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <div 
          className="p-4 sm:p-6 overflow-x-auto"
          role="tabpanel"
          id={`panel-${activeTab}`}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ManagementPage;