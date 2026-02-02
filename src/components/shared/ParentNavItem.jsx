import React from 'react';
import { useApp } from '../../context/AppContext';

const ParentNavItem = ({ icon: Icon, label, page, badge = null }) => {
  const { currentPage, setCurrentPage } = useApp();
  const isActive = currentPage === page;

  return (
    <button
      onClick={() => setCurrentPage(page)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all relative ${
        isActive
          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
          : 'text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
      {badge && badge > 0 && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
};

export default ParentNavItem;