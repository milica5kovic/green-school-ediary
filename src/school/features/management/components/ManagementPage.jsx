import React, { useState, useCallback, useMemo } from "react";
import { 
  Settings, User, Users as UsersIcon, GraduationCap, 
  Archive as ArchiveIcon, BarChart3, Calendar, Palette, ChevronRight,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../../../../core/context/AuthContext';
import useTermTheme from '../../../../shared/hooks/useTermTheme';

// Tab Components
import StudentsPage from '../../students/components/StudentsPage';
import ProfileManagementPage from './ProfileManagementPage';
import AnalyticsTab from '../../grading/components/AnalyticsTab';
import CurriculumSettingsTab from '../../settings/components/CurriculumSettingsTab';
import ArchiveTabContent from '../../settings/components/ArchiveTabContent';
import AccountTabContent from '../../settings/components/AccountTabContent';
import AcademicTermsManager from './AcademicTermsManager';
import SchoolColorsTab from '../../settings/components/SchoolColorsTab';

// ============================================================================
// MANAGEMENT PAGE - Multi-tenant with useTermTheme
// ============================================================================

const TABS = [
  { id: 'account', label: 'My Account', icon: User, description: 'Profile and preferences' },
  { id: 'students', label: 'Students', icon: GraduationCap, description: 'Manage student records' },
  { id: 'profiles', label: 'Profiles', icon: UsersIcon, description: 'Staff and parent accounts' },
  { id: 'curriculum', label: 'Curriculum', icon: BookOpen, description: 'Classes, subjects & grading' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Reports and insights' },
  { id: 'terms', label: 'Terms', icon: Calendar, description: 'Academic term dates' },
  { id: 'colors', label: 'Colors', icon: Palette, description: 'Brand and term colors' },
  { id: 'archive', label: 'Archive', icon: ArchiveIcon, description: 'Export and backup' },
];

const TAB_COMPONENTS = {
  account: AccountTabContent,
  students: StudentsPage,
  profiles: ProfileManagementPage,
  curriculum: CurriculumSettingsTab,
  analytics: AnalyticsTab,
  terms: AcademicTermsManager,
  colors: SchoolColorsTab,
  archive: ArchiveTabContent,
};

const ManagementPage = () => {
  const { isAdmin } = useAuth();
  const theme = useTermTheme();
  const TermIcon = theme.icon;
  
  const [activeTab, setActiveTab] = useState('account');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  }, []);

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

  const renderContent = () => {
    const Component = TAB_COMPONENTS[activeTab] || AccountTabContent;
    return <Component />;
  };

  return (
    <div className="space-y-5">
      {/* ═══ TERM BANNER ═══ */}
      {theme.hasActiveTerm && (
        <div 
          className="rounded-xl px-4 py-2.5 flex items-center justify-between"
          style={{ 
            backgroundColor: theme.withAlpha(0.1),
            borderWidth: '1px',
            borderColor: theme.withAlpha(0.2)
          }}
        >
          <div className="flex items-center gap-2">
            <TermIcon size={16} style={theme.textStyle} />
            <span className="text-sm font-semibold" style={theme.textStyle}>
              {theme.name} Term
            </span>
            <span className="text-xs text-gray-500">
              {new Date(theme.activeTerm.start_date + 'T00:00:00')
                .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(theme.activeTerm.end_date + 'T00:00:00')
                .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <span className="text-xs font-medium" style={theme.textStyle}>
            {theme.daysRemaining} days left
          </span>
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div 
        className="rounded-2xl shadow-lg p-6 border bg-white"
        style={{ borderColor: theme.withAlpha(0.2) }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: theme.withAlpha(0.15) }}
          >
            <Settings size={24} style={{ color: theme.color }} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Management</h2>
            <p className="text-gray-500 text-sm">School administration and settings</p>
          </div>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div 
        className="bg-white rounded-2xl shadow-lg border overflow-hidden"
        style={{ borderColor: theme.withAlpha(0.15) }}
      >
        {/* Mobile Tab Selector */}
        <div className="sm:hidden border-b border-gray-200">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <currentTab.icon size={18} style={{ color: theme.color }} />
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
                      isActive ? 'bg-white' : 'hover:bg-gray-100 border-transparent'
                    }`}
                    style={isActive ? { borderColor: theme.color, color: theme.color } : {}}
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
        <nav className="hidden sm:flex flex-wrap border-b border-gray-200" role="tablist">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                role="tab"
                aria-selected={isActive}
                className={`px-4 py-3 font-medium transition-all whitespace-nowrap border-b-2 ${
                  isActive ? 'border-current' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
                style={isActive ? { color: theme.color, backgroundColor: theme.withAlpha(0.05) } : {}}
              >
                <div className="flex items-center gap-2">
                  <Icon size={16} />
                  <span className="text-sm">{tab.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ManagementPage;