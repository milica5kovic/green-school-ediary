import React, { useState, useEffect } from 'react';
import { 
  Palette, Snowflake, Flower2, Sun, Save, RotateCcw, Eye, Info, 
  Sparkles, Check
} from 'lucide-react';
import { useBranding } from '../../../../core/context/BrandingContext';
import { useTenant } from '../../../../core/context/TenantContext';
// ═══ USE RAW SUPABASE FOR SCHOOLS TABLE ═══
import { supabase } from '../../../../core/infrastructure/supabaseClient';

// ============================================================================
// SCHOOL COLORS TAB
// Admin chooses: Brand Colors OR Term Colors (seasonal)
// Selected mode affects entire app via useTermTheme hook
// ============================================================================

const SchoolColorsTab = () => {
  const { schoolId } = useTenant();
  const branding = useBranding();
  
  // ══════════════════════════════════════════════════════════════════════════
  // STATE
  // ══════════════════════════════════════════════════════════════════════════
  
  const [settings, setSettings] = useState({
    // Mode: false = use brand colors everywhere, true = use term colors (seasonal)
    useTermColors: false,
    
    // Brand colors (used when useTermColors = false)
    primaryColor: '#10b981',
    secondaryColor: '#0d9488',
    
    // Term colors (used when useTermColors = true)
    term1Color: '#3b82f6',
    term2Color: '#ec4899',
    term3Color: '#f59e0b',
    term1Name: 'Winter',
    term2Name: 'Spring',
    term3Name: 'Summer',
  });
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewTerm, setPreviewTerm] = useState(1);

  // ══════════════════════════════════════════════════════════════════════════
  // SYNC WITH BRANDING CONTEXT
  // ══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (branding) {
      setSettings({
        useTermColors: branding.useTermColors || false,
        primaryColor: branding.primaryColor || '#10b981',
        secondaryColor: branding.secondaryColor || '#0d9488',
        term1Color: branding.term1Color || '#3b82f6',
        term2Color: branding.term2Color || '#ec4899',
        term3Color: branding.term3Color || '#f59e0b',
        term1Name: branding.term1Name || 'Winter',
        term2Name: branding.term2Name || 'Spring',
        term3Name: branding.term3Name || 'Summer',
      });
    }
  }, [branding]);

  // Term configuration
  const termConfig = [
    { num: 1, icon: Snowflake, months: 'Sep - Dec' },
    { num: 2, icon: Flower2, months: 'Jan - Mar' },
    { num: 3, icon: Sun, months: 'Apr - Jun' },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ══════════════════════════════════════════════════════════════════════════

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!schoolId) {
      alert('School context not loaded');
      return;
    }

    try {
      setSaving(true);
      
      console.log('💾 Saving colors:', { schoolId, useTermColors: settings.useTermColors });
      
      const { data, error } = await supabase
        .from('schools')
        .update({
          use_term_colors: settings.useTermColors,
          primary_color: settings.primaryColor,
          secondary_color: settings.secondaryColor,
          term1_color: settings.term1Color,
          term2_color: settings.term2Color,
          term3_color: settings.term3Color,
          term1_name: settings.term1Name,
          term2_name: settings.term2Name,
          term3_name: settings.term3Name,
        })
        .eq('id', schoolId)
        .select();

      if (error) {
        console.error('❌ Save error:', error);
        throw error;
      }
      
      console.log('✅ Saved:', data);

      setSaved(true);
      
      // Reload to apply changes
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error saving colors:', error);
      alert('Failed to save: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      useTermColors: false,
      primaryColor: '#10b981',
      secondaryColor: '#0d9488',
      term1Color: '#3b82f6',
      term2Color: '#ec4899',
      term3Color: '#f59e0b',
      term1Name: 'Winter',
      term2Name: 'Spring',
      term3Name: 'Summer',
    });
    setSaved(false);
  };

  // Current preview color based on mode
  const getActiveColor = () => {
    if (settings.useTermColors) {
      return settings[`term${previewTerm}Color`];
    }
    return settings.primaryColor;
  };
  
  const activeColor = getActiveColor();

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${activeColor}20` }}
        >
          <Palette size={20} style={{ color: activeColor }} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">App Colors</h3>
          <p className="text-sm text-gray-500">Choose how colors appear throughout your school dashboard</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODE SELECTOR - The main toggle */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
          Color Mode
        </h4>
        
        <div className="grid md:grid-cols-2 gap-4">
          {/* Brand Colors Option */}
          <button
            onClick={() => handleChange('useTermColors', false)}
            className={`relative p-5 rounded-xl border-2 text-left transition-all ${
              !settings.useTermColors 
                ? 'border-emerald-500 bg-white shadow-lg' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {!settings.useTermColors && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${settings.primaryColor}20` }}
              >
                <Sparkles size={20} style={{ color: settings.primaryColor }} />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Brand Colors</p>
                <p className="text-xs text-gray-500">Same colors all year</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Use your primary brand color consistently across all pages and terms.
            </p>
            {/* Preview */}
            <div 
              className="mt-4 h-2 rounded-full"
              style={{ backgroundColor: settings.primaryColor }}
            />
          </button>

          {/* Term Colors Option */}
          <button
            onClick={() => handleChange('useTermColors', true)}
            className={`relative p-5 rounded-xl border-2 text-left transition-all ${
              settings.useTermColors 
                ? 'border-emerald-500 bg-white shadow-lg' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {settings.useTermColors && (
              <div className="absolute top-3 right-3 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                <Check size={14} className="text-white" />
              </div>
            )}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex -space-x-1">
                <div className="w-6 h-6 rounded-full border-2 border-white" style={{ backgroundColor: settings.term1Color }} />
                <div className="w-6 h-6 rounded-full border-2 border-white" style={{ backgroundColor: settings.term2Color }} />
                <div className="w-6 h-6 rounded-full border-2 border-white" style={{ backgroundColor: settings.term3Color }} />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Seasonal Colors</p>
                <p className="text-xs text-gray-500">Changes with each term</p>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Colors automatically change based on the current academic term (Winter, Spring, Summer).
            </p>
            {/* Preview */}
            <div className="mt-4 h-2 rounded-full flex overflow-hidden">
              <div className="flex-1" style={{ backgroundColor: settings.term1Color }} />
              <div className="flex-1" style={{ backgroundColor: settings.term2Color }} />
              <div className="flex-1" style={{ backgroundColor: settings.term3Color }} />
            </div>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BRAND COLORS SETTINGS (shown when useTermColors = false) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!settings.useTermColors && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Brand Colors
          </h4>
          
          <div className="grid md:grid-cols-2 gap-6">
            <ColorPicker
              label="Primary Color"
              description="Main color for buttons, links, headers"
              value={settings.primaryColor}
              onChange={(v) => handleChange('primaryColor', v)}
            />
            <ColorPicker
              label="Secondary Color"
              description="Used for gradients and hover states"
              value={settings.secondaryColor}
              onChange={(v) => handleChange('secondaryColor', v)}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TERM COLORS SETTINGS (shown when useTermColors = true) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {settings.useTermColors && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Term Colors
          </h4>
          
          <div className="grid md:grid-cols-3 gap-4">
            {termConfig.map(({ num, icon: Icon, months }) => (
              <div
                key={num}
                onClick={() => setPreviewTerm(num)}
                className={`rounded-xl border-2 p-4 transition-all cursor-pointer ${
                  previewTerm === num 
                    ? 'shadow-md bg-white' 
                    : 'bg-gray-50 hover:bg-white'
                }`}
                style={{ borderColor: previewTerm === num ? settings[`term${num}Color`] : '#e5e7eb' }}
              >
                {/* Term Header */}
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${settings[`term${num}Color`]}20` }}
                  >
                    <Icon size={18} style={{ color: settings[`term${num}Color`] }} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Term {num}</p>
                    <p className="font-semibold text-gray-800 text-sm">{settings[`term${num}Name`]}</p>
                  </div>
                </div>

                {/* Color Picker */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings[`term${num}Color`]}
                        onChange={(e) => handleChange(`term${num}Color`, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={settings[`term${num}Color`]}
                        onChange={(e) => handleChange(`term${num}Color`, e.target.value)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={settings[`term${num}Name`]}
                      onChange={(e) => handleChange(`term${num}Name`, e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                    />
                  </div>
                </div>

                {/* Color Bar */}
                <div
                  className="mt-3 h-1.5 rounded-full"
                  style={{ backgroundColor: settings[`term${num}Color`] }}
                />
                <p className="text-xs text-gray-400 mt-2 text-center">{months}</p>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl mt-4">
            <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700">
              The app will automatically use the color of the current active term. 
              Term dates are set in <strong>Academic Terms</strong> settings.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* LIVE PREVIEW */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Eye size={16} className="text-gray-500" />
          <p className="text-sm font-semibold text-gray-700">
            Live Preview 
            {settings.useTermColors && (
              <span className="font-normal text-gray-500">
                {' '}— {settings[`term${previewTerm}Name`]} Term
              </span>
            )}
          </p>
          {settings.useTermColors && (
            <div className="flex gap-1 ml-auto">
              {[1, 2, 3].map(num => (
                <button
                  key={num}
                  onClick={() => setPreviewTerm(num)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    previewTerm === num ? 'scale-110 border-gray-800' : 'border-white'
                  }`}
                  style={{ backgroundColor: settings[`term${num}Color`] }}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Mock UI */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header bar */}
          <div 
            className="h-12 flex items-center px-4"
            style={{ 
              background: `linear-gradient(135deg, ${activeColor}, ${settings.useTermColors ? activeColor : settings.secondaryColor})` 
            }}
          >
            <div className="w-24 h-3 bg-white/30 rounded" />
          </div>
          
          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Banner */}
            <div 
              className="rounded-lg px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: `${activeColor}10`, borderLeft: `3px solid ${activeColor}` }}
            >
              <div className="flex items-center gap-2">
                {settings.useTermColors ? (
                  React.createElement(termConfig[previewTerm - 1].icon, { size: 16, style: { color: activeColor } })
                ) : (
                  <Sparkles size={16} style={{ color: activeColor }} />
                )}
                <span className="text-sm font-medium" style={{ color: activeColor }}>
                  {settings.useTermColors ? `${settings[`term${previewTerm}Name`]} Term` : 'Dashboard'}
                </span>
              </div>
              <span className="text-xs" style={{ color: activeColor }}>Active</span>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                className="px-4 py-2 text-white text-sm font-medium rounded-lg"
                style={{ backgroundColor: activeColor }}
              >
                Primary Action
              </button>
              <button
                className="px-4 py-2 text-sm font-medium rounded-lg border"
                style={{ borderColor: activeColor, color: activeColor }}
              >
                Secondary
              </button>
              <span
                className="px-3 py-2 text-xs font-medium rounded-full"
                style={{ backgroundColor: `${activeColor}15`, color: activeColor }}
              >
                Badge
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ACTIONS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RotateCcw size={16} />
          Reset to Defaults
        </button>
        
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
              <Check size={16} />
              Saved! Refresh to see changes.
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 text-white font-medium rounded-lg disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
            style={{ backgroundColor: activeColor }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COLOR PICKER COMPONENT
// ============================================================================

const ColorPicker = ({ label, description, value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {description && <p className="text-xs text-gray-500 mb-3">{description}</p>}
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      />
    </div>
  </div>
);

export default SchoolColorsTab;