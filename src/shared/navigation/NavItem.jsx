import React, { useState } from 'react';
import { useApp } from '../../core/context/AppContext';
import { useBranding } from '../../core/context/BrandingContext';

// ============================================================================
// NAV ITEM - Sa dinamičkim bojama iz branding sistema
// ============================================================================

const NavItem = ({ icon: Icon, label, page, disabled = false }) => {
  const { currentPage, setCurrentPage } = useApp();
  const { primaryColor } = useBranding();
  const [isHovered, setIsHovered] = useState(false);
  
  const isActive = currentPage === page;

  // If disabled (feature turned off), don't render
  if (disabled) return null;

  // Compute styles based on state
  const getStyles = () => {
    if (isActive) {
      return {
        backgroundColor: primaryColor,
        color: '#ffffff',
        boxShadow: `0 4px 14px ${primaryColor}40`,
      };
    }
    
    if (isHovered) {
      return {
        backgroundColor: `${primaryColor}15`,
        color: primaryColor,
      };
    }
    
    return {
      backgroundColor: 'transparent',
      color: '#4b5563', // gray-600
    };
  };

  const styles = getStyles();

  return (
    <button
      onClick={() => setCurrentPage(page)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full px-4 py-2.5 rounded-xl flex items-center gap-3 transition-all font-medium text-sm"
      style={styles}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
};

export default NavItem;