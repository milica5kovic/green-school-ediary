import React, { useState } from 'react';
import { useBranding } from '../../../core/context/BrandingContext';
import { withAlpha, getTabStyles, getTableStyles } from './theme';
import { Spinner } from './Badge';

/**
 * Branded Tabs Component
 * 
 * Horizontal tabs with school branding.
 * 
 * @example
 * const tabs = [
 *   { id: 'staff', label: 'Staff', icon: <Users /> },
 *   { id: 'parents', label: 'Parents', icon: <Heart /> },
 * ];
 * 
 * <Tabs 
 *   tabs={tabs}
 *   activeTab={activeTab}
 *   onChange={setActiveTab}
 * />
 */
export const Tabs = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  fullWidth = false,
  className = '',
}) => {
  const { primaryColor } = useBranding();
  
  const variants = {
    default: {
      container: 'border-b border-gray-200',
      tab: (isActive) => getTabStyles(primaryColor, isActive),
    },
    pills: {
      container: 'bg-gray-100 p-1 rounded-xl',
      tab: (isActive) => ({
        className: `px-4 py-2 text-sm font-medium rounded-lg transition-all ${
          isActive ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'
        }`,
        style: isActive ? { backgroundColor: primaryColor } : {},
      }),
    },
    buttons: {
      container: 'flex gap-2',
      tab: (isActive) => ({
        className: `px-4 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
          isActive ? 'text-white' : 'bg-transparent hover:bg-gray-50'
        }`,
        style: isActive 
          ? { backgroundColor: primaryColor, borderColor: primaryColor }
          : { borderColor: '#e5e7eb', color: '#6b7280' },
      }),
    },
  };
  
  const v = variants[variant] || variants.default;

  return (
    <div className={`flex ${fullWidth ? '' : 'inline-flex'} ${v.container} ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const tabStyles = v.tab(isActive);
        
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            disabled={tab.disabled}
            className={`
              ${tabStyles.className}
              ${fullWidth ? 'flex-1' : ''}
              ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
              flex items-center justify-center gap-2
            `.trim()}
            style={tabStyles.style}
          >
            {tab.icon && (
              <span className="flex-shrink-0">
                {React.isValidElement(tab.icon) 
                  ? React.cloneElement(tab.icon, { size: 16 })
                  : tab.icon
                }
              </span>
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span 
                className={`
                  px-1.5 py-0.5 text-[10px] font-bold rounded-full
                  ${isActive ? 'bg-white/20' : 'bg-gray-200 text-gray-600'}
                `}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Tab Panels - Content container for tabs
 */
export const TabPanels = ({ children, activeTab, className = '' }) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null;
        if (child.props.tabId !== activeTab) return null;
        return child;
      })}
    </div>
  );
};

export const TabPanel = ({ children, tabId, className = '' }) => {
  return <div className={className}>{children}</div>;
};

// ============================================================================
// TABLE COMPONENT
// ============================================================================

/**
 * Branded Table Component
 * 
 * Fully featured table with sorting, selection, and school branding.
 * 
 * @example
 * <Table
 *   columns={[
 *     { key: 'name', label: 'Name', sortable: true },
 *     { key: 'email', label: 'Email' },
 *     { key: 'actions', label: 'Actions', align: 'center' },
 *   ]}
 *   data={students}
 *   onRowClick={(row) => openDetail(row)}
 *   renderCell={(key, value, row) => {
 *     if (key === 'actions') return <Button size="xs">Edit</Button>;
 *     return value;
 *   }}
 * />
 */
export const Table = ({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  emptyIcon,
  onRowClick,
  renderCell,
  rowKey = 'id',
  sortable = false,
  selectable = false,
  selectedRows = [],
  onSelectRows,
  className = '',
  stickyHeader = false,
}) => {
  const { primaryColor } = useBranding();
  const tableStyles = getTableStyles(primaryColor);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [hoveredRow, setHoveredRow] = useState(null);

  // Handle sorting
  const handleSort = (key) => {
    if (!sortable) return;
    
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      
      if (typeof aVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortConfig]);

  // Handle selection
  const allSelected = selectable && data.length > 0 && selectedRows.length === data.length;
  const someSelected = selectable && selectedRows.length > 0 && selectedRows.length < data.length;

  const toggleAll = () => {
    if (allSelected) {
      onSelectRows?.([]);
    } else {
      onSelectRows?.(data.map(row => row[rowKey]));
    }
  };

  const toggleRow = (id) => {
    if (selectedRows.includes(id)) {
      onSelectRows?.(selectedRows.filter(r => r !== id));
    } else {
      onSelectRows?.([...selectedRows, id]);
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* Header */}
          <thead className={stickyHeader ? 'sticky top-0 z-10' : ''}>
            <tr style={tableStyles.header.style}>
              {selectable && (
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => el && (el.indeterminate = someSelected)}
                    onChange={toggleAll}
                    className="rounded border-gray-300"
                    style={{ accentColor: primaryColor }}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`
                    ${tableStyles.header.className}
                    px-4 py-3
                    ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}
                    ${col.sortable || sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''}
                    ${col.width ? '' : ''}
                  `}
                  style={{ width: col.width }}
                  onClick={() => (col.sortable || sortable) && handleSort(col.key)}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : ''}`}>
                    <span>{col.label}</span>
                    {(col.sortable || sortable) && sortConfig.key === col.key && (
                      <span className="text-gray-400">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center">
                  <Spinner size="lg" className="mx-auto" />
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center">
                  {emptyIcon && (
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      {React.isValidElement(emptyIcon) 
                        ? React.cloneElement(emptyIcon, { size: 24, className: 'text-gray-400' })
                        : emptyIcon
                      }
                    </div>
                  )}
                  <p className="text-gray-500">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              sortedData.map((row, rowIndex) => {
                const rowId = row[rowKey];
                const isSelected = selectedRows.includes(rowId);
                const isHovered = hoveredRow === rowIndex;
                
                return (
                  <tr
                    key={rowId}
                    className={`
                      ${tableStyles.row.className}
                      ${onRowClick ? 'cursor-pointer' : ''}
                      ${isSelected ? 'bg-blue-50' : ''}
                    `}
                    style={isHovered && !isSelected ? tableStyles.row.hoverStyle : {}}
                    onClick={() => onRowClick?.(row)}
                    onMouseEnter={() => setHoveredRow(rowIndex)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(rowId)}
                          className="rounded border-gray-300"
                          style={{ accentColor: primaryColor }}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`
                          ${tableStyles.cell.className}
                          ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}
                        `}
                      >
                        {renderCell 
                          ? renderCell(col.key, row[col.key], row)
                          : row[col.key]
                        }
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Simple Table - For basic tables without all the features
 */
export const SimpleTable = ({ children, className = '' }) => {
  const { primaryColor } = useBranding();
  
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        {children}
      </table>
    </div>
  );
};

export const Th = ({ children, className = '', align = 'left' }) => {
  const { primaryColor } = useBranding();
  
  return (
    <th 
      className={`
        px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider
        ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}
        ${className}
      `}
      style={{ backgroundColor: withAlpha(primaryColor, 0.05) }}
    >
      {children}
    </th>
  );
};

export const Td = ({ children, className = '', align = 'left' }) => {
  return (
    <td 
      className={`
        px-4 py-3 text-sm text-gray-700
        ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : ''}
        ${className}
      `}
    >
      {children}
    </td>
  );
};

export default Tabs;
