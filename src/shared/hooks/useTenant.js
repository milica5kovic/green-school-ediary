import { useContext } from 'react';
import TenantContext from '../../core/context/TenantContext';

// ============================================================================
// useTenant Hook
// Jednostavan pristup tenant (school) podacima
// ============================================================================

export const useTenant = () => {
  const context = useContext(TenantContext);
  
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  
  return context;
};

export default useTenant;
