import React, { useState } from 'react';
import { Snowflake, Flower2, Sun, Palette, Check, RotateCcw } from 'lucide-react';
import { useBranding } from '../../../core/context/BrandingContext';
import { useApp } from '../../../core/context/AppContext';

// ════════════════════════════════════════════════════════════════════════════
// PRESET COLOR PALETTES
// ════════════════════════════════════════════════════════════════════════════

const PRESETS = [
  {
    name: 'Classic Seasons',
    term1: '#3b82f6', // Blue
    term2: '#ec4899', // Pink
    term3: '#f59e0b', // Amber
  },
  {
    name: 'Ocean Breeze',
    term1: '#0ea5e9', // Sky
    term2: '#14b8a6', // Teal
    term3: '#06b6d4', // Cyan
  },
  {
    name: 'Forest',
    term1: '#059669', // Emerald
    term2: '#84cc16', // Lime
    term3: '#22c55e', // Green
  },
  {
    name: 'Sunset',
    term1: '#f97316', // Orange
    term2: '#ef4444', // Red
    term3: '#eab308', // Yellow
  },
  {
    name: 'Royal',
    term1: '#6366f1', // Indigo
    term2: '#8b5cf6', // Violet
    term3: '#a855f7', // Purple
  },
  {
    name: 'Monochrome',
    term1: '#64748b', // Slate
    term2: '#475569', // Slate darker
    term3: '#334155', // Slate darkest
  },
];

const TERM_INFO = [
  { key: 'term1', nameKey: 'term1Name', icon: Snowflake, defaultName: 'Winter', defaultColor: '#3b82f6' },
  { key: 'term2', nameKey: 'term2Name', icon: Flower2, defaultName: 'Spring', defaultColor: '#ec4899' },
  { key: 'term3', nameKey: 'term3Name', icon: Sun, defaultName: 'Summer', defaultColor: '#f59e0b' },
];

// ════════════════════════════════════════════════════════════════════════════
// TERM COLORS TAB
// ════════════════════════════════════════════════════════════════════════════

const TermColorsTab = ({ schoolId, onSave }) => {
  const branding = useBranding();
  const { supabase } = useApp();
  
  const [colors, setColors] = useState({
    term1Color: branding.term1Color || '#3b82f6',
    term2Color: branding.term2Color || '#ec4899',
    term3Color: branding.term3Color || '#f59e0b',
    term1Name: branding.term1Name || 'Winter',
    term2Name: branding.term2Name || 'Spring',
    term3Name: branding.term3Name || 'Summer',
  });
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Apply preset
  const applyPreset = (preset) => {
    setColors(prev => ({
      ...prev,
      term1Color: preset.term1,
      term2Color: preset.term2,
      term3Color: preset.term3,
    }));
    
    // Update branding preview
    branding.updateBranding?.({
      term1Color: preset.term1,
      term2Color: preset.term2,
      term3Color: preset.term3,
    });
  };

  // Reset to defaults
  const resetToDefaults = () => {
    const defaults = {
      term1Color: '#3b82f6',
      term2Color: '#ec4899',
      term3Color: '#f59e0b',
      term1Name: 'Winter',
      term2Name: 'Spring',
      term3Name: 'Summer',
    };
    setColors(defaults);
    branding.updateBranding?.(defaults);
  };

  // Handle color change
  const handleColorChange = (key, value) => {
    setColors(prev => ({ ...prev, [key]: value }));
    branding.updateBranding?.({ [key]: value });
  };

  // Handle name change
  const handleNameChange = (key, value) => {
    setColors(prev => ({ ...prev, [key]: value }));
    branding.updateBranding?.({ [key]: value });
  };

  // Save to database
  const handleSave = async () => {
    if (!supabase || !schoolId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('schools')
        .update({
          term1_color: colors.term1Color,
          term2_color: colors.term2Color,
          term3_color: colors.term3Color,
          term1_name: colors.term1Name,
          term2_name: colors.term2Name,
          term3_name: colors.term3Name,
        })
        .eq('id', schoolId);

      if (error) throw error;
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSave?.();
    } catch (error) {
      console.error('Error saving term colors:', error);
      alert('Failed to save term colors');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Term Colors</h3>
          <p className="text-sm text-gray-500">
            Customize colors for each academic term. These colors will appear throughout the app.
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      {/* Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Quick Presets
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="p-3 rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-all text-left group"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex -space-x-1">
                  <div className="w-5 h-5 rounded-full border-2 border-white" style={{ backgroundColor: preset.term1 }} />
                  <div className="w-5 h-5 rounded-full border-2 border-white" style={{ backgroundColor: preset.term2 }} />
                  <div className="w-5 h-5 rounded-full border-2 border-white" style={{ backgroundColor: preset.term3 }} />
                </div>
              </div>
              <p className="text-sm font-medium text-gray-800 group-hover:text-gray-900">
                {preset.name}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Individual Term Colors */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          Individual Term Settings
        </label>
        
        {TERM_INFO.map((term, index) => {
          const Icon = term.icon;
          const colorKey = `${term.key}Color`;
          const color = colors[colorKey];
          
          return (
            <div 
              key={term.key}
              className="p-4 rounded-xl border-2 transition-all"
              style={{ borderColor: color + '40', backgroundColor: color + '08' }}
            >
              <div className="flex items-center gap-4">
                {/* Icon */}
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: color + '20' }}
                >
                  <Icon size={24} style={{ color }} />
                </div>

                {/* Name Input */}
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Term {index + 1} Name
                  </label>
                  <input
                    type="text"
                    value={colors[term.nameKey]}
                    onChange={(e) => handleNameChange(term.nameKey, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-opacity-50 focus:border-transparent outline-none text-sm font-medium"
                    style={{ focusRing: color }}
                    placeholder={term.defaultName}
                  />
                </div>

                {/* Color Picker */}
                <div className="flex-shrink-0">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => handleColorChange(colorKey, e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-200"
                      />
                    </div>
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => handleColorChange(colorKey, e.target.value)}
                      className="w-24 px-2 py-2 border border-gray-300 rounded-lg text-xs font-mono uppercase"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs text-gray-500">Preview:</span>
                <div 
                  className="px-3 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: color }}
                >
                  {colors[term.nameKey]} Term
                </div>
                <div 
                  className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: color + '20', color }}
                >
                  Badge Style
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Preview */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Live Preview - Term Banner
        </label>
        <div className="space-y-3">
          {TERM_INFO.map((term, index) => {
            const Icon = term.icon;
            const color = colors[`${term.key}Color`];
            const name = colors[term.nameKey];
            
            return (
              <div 
                key={term.key}
                className="p-4 rounded-xl text-white relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${color} 0%, ${darken(color, 20)} 100%)` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16" 
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
                
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className="font-bold">{name} Term</p>
                      <p className="text-white/70 text-xs">Term {index + 1}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">42</p>
                    <p className="text-white/60 text-xs">days left</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check size={18} />
              Saved!
            </>
          ) : (
            <>
              <Palette size={18} />
              Save Term Colors
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Helper function
const darken = (hex, percent) => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
  const B = Math.max((num & 0x0000FF) - amt, 0);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
};

export default TermColorsTab;