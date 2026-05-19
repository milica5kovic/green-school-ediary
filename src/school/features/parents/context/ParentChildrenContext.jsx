import React, { createContext, useContext } from 'react';
import useParentChildren from '../../../../shared/hooks/useParentChildren';

// ============================================================================
// PARENT CHILDREN CONTEXT
// Provides shared selectedChild state across all parent portal pages
// and the app header child-selector. Wraps SchoolAppContent inside AppProvider.
// ============================================================================

const ParentChildrenContext = createContext({
  children: [],
  selectedChild: null,
  setSelectedChild: () => {},
  loading: true,
});

export const ParentChildrenProvider = ({ children: nodes }) => {
  const value = useParentChildren();
  return (
    <ParentChildrenContext.Provider value={value}>
      {nodes}
    </ParentChildrenContext.Provider>
  );
};

export const useParentChildrenCtx = () => useContext(ParentChildrenContext);

export default ParentChildrenContext;
