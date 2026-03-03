import React, { forwardRef, useState } from 'react';
import { ChevronDown, Eye, EyeOff, Search, X } from 'lucide-react';
import { useBranding } from '../../../core/context/BrandingContext';
import { withAlpha } from './theme';

/**
 * Branded Input Component
 * 
 * Automatically uses school branding for focus states.
 * Supports icons, validation states, and various types.
 * 
 * @example
 * // Basic input
 * <Input placeholder="Enter name" />
 * 
 * // With label and error
 * <Input 
 *   label="Email"
 *   type="email"
 *   error="Invalid email address"
 * />
 * 
 * // With icon
 * <Input icon={<Search />} placeholder="Search..." />
 */
export const Input = forwardRef(({
  label,
  error,
  hint,
  icon,
  iconRight,
  type = 'text',
  size = 'md',
  fullWidth = true,
  className = '',
  containerClassName = '',
  required = false,
  disabled = false,
  ...props
}, ref) => {
  const { primaryColor } = useBranding();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };
  
  const hasError = !!error;
  
  const focusStyle = !hasError ? {
    borderColor: primaryColor,
    boxShadow: `0 0 0 3px ${withAlpha(primaryColor, 0.15)}`,
  } : {
    borderColor: '#ef4444',
    boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.15)',
  };

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {React.isValidElement(icon) ? React.cloneElement(icon, { size: 16 }) : icon}
          </div>
        )}
        
        <input
          ref={ref}
          type={inputType}
          disabled={disabled}
          className={`
            ${fullWidth ? 'w-full' : ''}
            ${sizes[size]}
            ${icon ? 'pl-9' : ''}
            ${iconRight || isPassword ? 'pr-9' : ''}
            border rounded-lg bg-white
            transition-all duration-200
            focus:outline-none
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
            ${hasError ? 'border-red-300' : 'border-gray-200'}
            ${className}
          `.trim()}
          style={isFocused ? focusStyle : {}}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
        
        {iconRight && !isPassword && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {React.isValidElement(iconRight) ? React.cloneElement(iconRight, { size: 16 }) : iconRight}
          </div>
        )}
      </div>
      
      {(error || hint) && (
        <p className={`mt-1 text-xs ${hasError ? 'text-red-500' : 'text-gray-500'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

/**
 * Branded Search Input
 * 
 * Pre-configured input with search icon and clear button.
 */
export const SearchInput = forwardRef(({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className = '',
  ...props
}, ref) => {
  const { primaryColor } = useBranding();
  const [isFocused, setIsFocused] = useState(false);
  
  const focusStyle = {
    borderColor: primaryColor,
    boxShadow: `0 0 0 3px ${withAlpha(primaryColor, 0.15)}`,
  };

  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none transition-all"
        style={isFocused ? focusStyle : {}}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

/**
 * Branded Select Component
 * 
 * Styled select dropdown with school branding.
 * 
 * @example
 * <Select label="Class" value={classId} onChange={setClassId}>
 *   <option value="">Select class...</option>
 *   <option value="Y1">Year 1</option>
 * </Select>
 */
export const Select = forwardRef(({
  label,
  error,
  hint,
  children,
  size = 'md',
  fullWidth = true,
  className = '',
  containerClassName = '',
  required = false,
  disabled = false,
  ...props
}, ref) => {
  const { primaryColor } = useBranding();
  const [isFocused, setIsFocused] = useState(false);
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base',
  };
  
  const hasError = !!error;
  
  const focusStyle = !hasError ? {
    borderColor: primaryColor,
    boxShadow: `0 0 0 3px ${withAlpha(primaryColor, 0.15)}`,
  } : {};

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      
      <div className="relative">
        <select
          ref={ref}
          disabled={disabled}
          className={`
            ${fullWidth ? 'w-full' : ''}
            ${sizes[size]}
            pr-8
            appearance-none
            border rounded-lg bg-white
            transition-all duration-200
            focus:outline-none
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
            cursor-pointer
            ${hasError ? 'border-red-300' : 'border-gray-200'}
            ${className}
          `.trim()}
          style={isFocused ? focusStyle : {}}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        >
          {children}
        </select>
        
        <ChevronDown 
          size={14} 
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" 
        />
      </div>
      
      {(error || hint) && (
        <p className={`mt-1 text-xs ${hasError ? 'text-red-500' : 'text-gray-500'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

/**
 * Branded Textarea Component
 */
export const Textarea = forwardRef(({
  label,
  error,
  hint,
  rows = 3,
  fullWidth = true,
  className = '',
  containerClassName = '',
  required = false,
  disabled = false,
  ...props
}, ref) => {
  const { primaryColor } = useBranding();
  const [isFocused, setIsFocused] = useState(false);
  
  const hasError = !!error;
  
  const focusStyle = !hasError ? {
    borderColor: primaryColor,
    boxShadow: `0 0 0 3px ${withAlpha(primaryColor, 0.15)}`,
  } : {};

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={`
          ${fullWidth ? 'w-full' : ''}
          px-3 py-2 text-sm
          border rounded-lg bg-white resize-y
          transition-all duration-200
          focus:outline-none
          disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
          ${hasError ? 'border-red-300' : 'border-gray-200'}
          ${className}
        `.trim()}
        style={isFocused ? focusStyle : {}}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      
      {(error || hint) && (
        <p className={`mt-1 text-xs ${hasError ? 'text-red-500' : 'text-gray-500'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

/**
 * Branded Checkbox Component
 */
export const Checkbox = forwardRef(({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const { primaryColor } = useBranding();
  
  return (
    <label className={`flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
          {...props}
        />
        <div 
          className={`
            w-4 h-4 border-2 rounded transition-all
            peer-focus:ring-2 peer-focus:ring-offset-1
            ${checked ? 'border-transparent' : 'border-gray-300 bg-white'}
          `}
          style={{ 
            backgroundColor: checked ? primaryColor : undefined,
            '--tw-ring-color': withAlpha(primaryColor, 0.3),
          }}
        >
          {checked && (
            <svg className="w-full h-full text-white" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>
      
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      )}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';

/**
 * Branded Radio Group Component
 */
export const RadioGroup = ({ options, value, onChange, name, disabled = false, className = '' }) => {
  const { primaryColor } = useBranding();
  
  return (
    <div className={`space-y-2 ${className}`}>
      {options.map((option) => (
        <label 
          key={option.value}
          className={`flex items-start gap-3 cursor-pointer ${disabled || option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              disabled={disabled || option.disabled}
              className="sr-only peer"
            />
            <div 
              className={`
                w-4 h-4 border-2 rounded-full transition-all
                peer-focus:ring-2 peer-focus:ring-offset-1
                ${value === option.value ? '' : 'border-gray-300 bg-white'}
              `}
              style={{ 
                borderColor: value === option.value ? primaryColor : undefined,
                '--tw-ring-color': withAlpha(primaryColor, 0.3),
              }}
            >
              {value === option.value && (
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
            </div>
          </div>
          
          <div>
            <p className="text-sm font-medium text-gray-700">{option.label}</p>
            {option.description && (
              <p className="text-xs text-gray-500 mt-0.5">{option.description}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
};

export default Input;
