import React, { useState, useEffect } from 'react';
import { Palette, Snowflake, Flower2, Sun, Check, RotateCcw, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { useApp } from '../../../../core/context/AppContext';
import { useBranding } from '../../../../core/context/BrandingContext';
import { toast } from '../../../../core/components/Toast';

// ════════════════════════════════════════════════════════════════════════════
// TERM COLORS TAB v2 - With toggle for term colors vs primary color
// Add this to your Settings page / Owner Dashboard
// ════════════════════════════════════════════════════════════════════════════

// Preset palettes
const COLOR_PRESETS = [
  {
    id: 'classic',
    name: 'Classic',
    colors: { term1: '#3b82f6', term2: '#ec4899', term3: '#f59e0b' },
    names: { term1: 'Winter', term2: 'Spring', term3: 'Summer' }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: { term1: '#0ea5e9', term2: '#06b6d4', term3: '#14b8a6' },
    names: { term1: 'Winter', term2: 'Spring', term3: 'Summer' }
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: { term1: '#059669', term2: '#84cc16', term3: '#22c55e' },
    names: { term1: 'Winter', term2: 'Spring', term3: 'Summer' }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: { term1: '#8b5cf6', term2: '#f43f5e', term3: '#fb923c' },
    names: { term1: 'Winter', term2: 'Spring', term3: 'Summer' }
  },
  {
    id: 'royal',
    name: 'Royal',
    colors: { term1: '#6366f1', term2: '#a855f7', term3: '#d946ef' },
    names: { term1: 'Winter', term2: 'Spring', term3: 'Summer' }
  },
  {
    id: 'earth',
    name: 'Earth',
    colors: { term1: '#78716c', term2: '#a3a3a3', term3: '#d4d4d4' },
    names: { term1: 'Winter', term2: 'Spring', term3: 'Summer' }
  },
];

const TERM_ICONS = {
  1: Snowflake,
  2: Flower2,
  3: Sun
};

const TermColorsTab = () => {
  const { supabase, schoolId } = useApp();
  const branding = useBranding();
  
  const [useTermColors, setUseTermColors] = useState(branding.useTermColors || false);
  const [colors, setColors] = useState({
    term1: branding.term1Color || '#3b82f6',
    term2: branding.term2Color || '#ec4899',
    term3: branding.term3Color || '#f59e0b',
  });
  const [names, setNames] = useState({
    term1: branding.term1Name || 'Winter',
    term2: branding.term2Name || 'Spring',
    term3: branding.term3Name || 'Summer',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync with branding on load
  useEffect(() => {
    setUseTermColors(branding.useTermColors || false);
    setColors({
      term1: branding.term1Color || '#3b82f6',
      term2: branding.term2Color || '#ec4899',
      term3: branding.term3Color || '#f59e0b',
    });
    setNames({
      term1: branding.term1Name || 'Winter',
      term2: branding.term2Name || 'Spring',
      term3: branding.term3Name || 'Summer',
    });
  }, [branding]);

  // Real-time preview
  const handleColorChange = (term, value) => {
    setColors(prev => ({ ...prev, [term]: value }));
    branding.updateBranding?.({ [`${term}Color`]: value });
  };

  const handleNameChange = (term, value) => {
    setNames(prev => ({ ...prev, [term]: value }));
  };

  const handleToggleChange = (enabled) => {
    setUseTermColors(enabled);
    branding.updateBranding?.({ useTermColors: enabled });
  };

  const applyPreset = (preset) => {
    setColors(preset.colors);
    setNames(preset.names);
    branding.updateBranding?.({
      term1Color: preset.colors.term1,
      term2Color: preset.colors.term2,
      term3Color: preset.colors.term3,
    });
  };

  const resetToDefaults = () => {
    const defaults = COLOR_PRESETS[0];
    setColors(defaults.colors);
    setNames(defaults.names);
    setUseTermColors(false);
    branding.updateBranding?.({
      term1Color: defaults.colors.term1,
      term2Color: defaults.colors.term2,
      term3Color: defaults.colors.term3,
      useTermColors: false,
    });
  };

  const handleSave = async () => {
    if (!schoolId) {
      toast.warning('No school context');
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('schools')
        .update({
          term1_color: colors.term1,
          term2_color: colors.term2,
          term3_color: colors.term3,
          term1_name: names.term1,
          term2_name: names.term2,
          term3_name: names.term3,
          use_term_colors: useTermColors,
        })
        .eq('id', schoolId);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving term colors:', error);
      toast.error('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${branding.primaryColor}15` }}>
            <Palette size={20} style={{ color: branding.primaryColor }} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Term Colors</h3>
            <p className="text-sm text-gray-500">Customize seasonal branding for your school</p>
          </div>
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>

      {/* ═══ MODE TOGGLE ═══ */}
      <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-5 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-1">Color Mode</h4>
            <p className="text-sm text-gray-500">
              {useTermColors 
                ? 'Using seasonal term colors that change with each academic term'
                : 'Using your primary brand color across all pages'
              }
            </p>
          </div>
          
          <button
            onClick={() => handleToggleChange(!useTermColors)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all"
            style={{
              backgroundColor: useTermColors ? `${branding.primaryColor}15` : '#f3f4f6',
              borderWidth: '2px',
              borderColor: useTermColors ? branding.primaryColor : '#e5e7eb'
            }}
          >
            {useTermColors ? (
              <ToggleRight size={24} style={{ color: branding.primaryColor }} />
            ) : (
              <ToggleLeft size={24} className="text-gray-400" />
            )}
            <span className={`font-medium ${useTermColors ? '' : 'text-gray-500'}`}
              style={useTermColors ? { color: branding.primaryColor } : {}}>
              {useTermColors ? 'Term Colors ON' : 'Term Colors OFF'}
            </span>
          </button>
        </div>

        {/* Visual comparison */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg border-2 transition-all ${!useTermColors ? 'border-gray-400 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
            <p className="text-xs font-medium text-gray-500 mb-2">Primary Color Mode</p>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex-1 h-8 rounded"
                  style={{ backgroundColor: branding.primaryColor }} />
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Same color all year</p>
          </div>
          
          <div className={`p-3 rounded-lg border-2 transition-all ${useTermColors ? 'border-gray-400 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
            <p className="text-xs font-medium text-gray-500 mb-2">Term Colors Mode</p>
            <div className="flex gap-1">
              <div className="flex-1 h-8 rounded" style={{ backgroundColor: colors.term1 }} />
              <div className="flex-1 h-8 rounded" style={{ backgroundColor: colors.term2 }} />
              <div className="flex-1 h-8 rounded" style={{ backgroundColor: colors.term3 }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Changes by term</p>
          </div>
        </div>
      </div>

      {/* ═══ TERM COLOR SETTINGS (only show if enabled) ═══ */}
      <div className={`space-y-4 transition-all ${useTermColors ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        {/* Quick Presets */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Quick Presets</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
              >
                <div className="flex gap-0.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.colors.term1 }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.colors.term2 }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.colors.term3 }} />
                </div>
                <span className="text-sm text-gray-700">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Individual Term Settings */}
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map(termNum => {
            const TermIcon = TERM_ICONS[termNum];
            const termKey = `term${termNum}`;
            
            return (
              <div key={termNum} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Term Header */}
                <div className="px-4 py-3 flex items-center gap-2"
                  style={{ backgroundColor: `${colors[termKey]}15` }}>
                  <TermIcon size={18} style={{ color: colors[termKey] }} />
                  <span className="font-semibold text-sm" style={{ color: colors[termKey] }}>
                    Term {termNum}
                  </span>
                </div>
                
                <div className="p-4 space-y-3">
                  {/* Color Picker */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colors[termKey]}
                        onChange={(e) => handleColorChange(termKey, e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={colors[termKey]}
                        onChange={(e) => handleColorChange(termKey, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:outline-none"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                  
                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Name</label>
                    <input
                      type="text"
                      value={names[termKey]}
                      onChange={(e) => handleNameChange(termKey, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:outline-none"
                      placeholder="e.g., Winter"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <Eye size={14} />
            Live Preview
          </label>
          <div className="grid md:grid-cols-3 gap-3">
            {[1, 2, 3].map(termNum => {
              const TermIcon = TERM_ICONS[termNum];
              const termKey = `term${termNum}`;
              
              return (
                <div key={termNum} 
                  className="rounded-xl p-4 text-white relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${colors[termKey]} 0%, ${colors[termKey]}dd 100%)` }}>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <TermIcon size={20} />
                      <span className="font-bold">{names[termKey]} Term</span>
                    </div>
                    <p className="text-sm text-white/80">Sample banner preview</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-white/50 rounded-full" />
                      <span className="text-xs text-white/70">Active indicator</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
          style={{ backgroundColor: saved ? '#10b981' : branding.primaryColor }}
        >
          {saved ? (
            <>
              <Check size={18} />
              Saved!
            </>
          ) : saving ? (
            'Saving...'
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  );
};

export default TermColorsTab;