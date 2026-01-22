import React from 'react';
import { useApp } from '../../context/AppContext';

const NavItem = ({ icon: Icon, label, page }) => {
  const { currentPage, setCurrentPage } = useApp();

  return (
    <button
      onClick={() => setCurrentPage(page)}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all w-full ${
        currentPage === page
          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
          : 'text-gray-600 hover:bg-emerald-50'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );
};

export default NavItem;