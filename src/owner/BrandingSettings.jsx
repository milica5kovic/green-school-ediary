import React, { useState, useRef } from 'react';
import supabase from '../core/infrastructure/supabaseClient';
import {
  Palette, Upload, Eye, Save, X, Check, AlertCircle,
  Image, Globe, FileText, ToggleLeft,
  RefreshCw, Camera, Trash2,
  Home, GraduationCap,
  BarChart3,
} from 'lucide-react';

// ============================================================================
// SCHOOL BRANDING SETTINGS - Full customization panel
// ============================================================================

const BrandingSettings = ({ school, onSave, onClose }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('identity');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoInputRef = useRef(null);
  const faviconInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    // Identity
    name: school?.name || '',
    tagline: school?.tagline || '',
    logo_url: school?.logo_url || '',
    favicon_url: school?.favicon_url || '',
    
    // Colors
    primary_color: school?.primary_color || '#10b981',
    secondary_color: school?.secondary_color || '#0d9488',
    accent_color: school?.accent_color || '#f59e0b',
    
    // Contact
    email: school?.email || '',
    phone: school?.phone || '',
    website: school?.website || '',
    address: school?.address || '',
    
    // Academic
    grading_system: school?.grading_system || 'cambridge',
    academic_year: school?.academic_year || '2025-26',
    default_language: school?.default_language || 'en',
    
    // PDF
    pdf_header_text: school?.pdf_header_text || school?.name || '',
    pdf_footer_text: school?.pdf_footer_text || '',
    show_logo_in_pdf: school?.show_logo_in_pdf ?? true,
    
    // Plan
    plan: school?.plan || 'pro',
    status: school?.status || 'active',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  // Logo Upload Handler
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    setError(null);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${school.id}/logo_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('school-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('school-assets')
        .getPublicUrl(fileName);

      handleChange('logo_url', publicUrl);
    } catch (err) {
      console.error('Logo upload error:', err);
      setError('Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Favicon Upload Handler
  const handleFaviconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    if (file.size > 500 * 1024) {
      setError('Favicon must be less than 500KB');
      return;
    }

    setUploadingFavicon(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${school.id}/favicon_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('school-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('school-assets')
        .getPublicUrl(fileName);

      handleChange('favicon_url', publicUrl);
    } catch (err) {
      console.error('Favicon upload error:', err);
      setError('Failed to upload favicon.');
    } finally {
      setUploadingFavicon(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const { error: updateError } = await supabase
        .from('schools')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', school.id);

      if (updateError) throw updateError;

      setSuccess(true);
      if (onSave) onSave(formData);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving branding:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'identity', label: 'Identity', icon: Image },
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'contact', label: 'Contact', icon: Globe },
    { id: 'academic', label: 'Academic', icon: GraduationCap },
    { id: 'pdf', label: 'PDF', icon: FileText },
    { id: 'subscription', label: 'Plan', icon: BarChart3 },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg overflow-hidden"
              style={{ backgroundColor: formData.primary_color }}
            >
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                formData.name?.charAt(0) || 'S'
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">School Settings</h2>
              <p className="text-sm text-slate-400">{school?.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 overflow-x-auto flex-shrink-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'text-violet-400 border-b-2 border-violet-400 bg-violet-500/5'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
              <Check size={18} />
              Settings saved successfully!
            </div>
          )}

          {/* Identity Tab */}
          {activeTab === 'identity' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">School Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Tagline</label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    placeholder="e.g., Cambridge International School"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">School Logo</label>
                <div className="flex items-start gap-4">
                  <div 
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden bg-slate-700/30"
                    style={{ borderColor: formData.logo_url ? formData.primary_color : undefined }}
                  >
                    {formData.logo_url ? (
                      <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Camera size={32} className="text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {uploadingLogo ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          Upload Logo
                        </>
                      )}
                    </button>
                    <p className="text-xs text-slate-500 mt-2">PNG, JPG up to 2MB. Recommended: 200x200px</p>
                    {formData.logo_url && (
                      <button
                        onClick={() => handleChange('logo_url', '')}
                        className="text-xs text-red-400 hover:text-red-300 mt-1 flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Favicon Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Favicon (Browser Tab Icon)</label>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden bg-slate-700/30">
                    {formData.favicon_url ? (
                      <img src={formData.favicon_url} alt="Favicon" className="w-8 h-8 object-contain" />
                    ) : formData.logo_url ? (
                      <img src={formData.logo_url} alt="Logo as favicon" className="w-8 h-8 object-contain opacity-50" />
                    ) : (
                      <Image size={20} className="text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={faviconInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFaviconUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => faviconInputRef.current?.click()}
                      disabled={uploadingFavicon}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {uploadingFavicon ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={16} />
                          Upload Favicon
                        </>
                      )}
                    </button>
                    <p className="text-xs text-slate-500 mt-2">Leave empty to use logo. Recommended: 32x32px</p>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-8 p-6 bg-slate-900/50 rounded-xl">
                <p className="text-sm font-medium text-slate-400 mb-4 flex items-center gap-2">
                  <Eye size={16} /> Live Preview
                </p>
                <div className="bg-white rounded-lg p-4">
                  <div className="flex items-center gap-3 border-b pb-3" style={{ borderColor: formData.primary_color }}>
                    {formData.logo_url ? (
                      <img src={formData.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain" />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: formData.primary_color }}
                      >
                        {formData.name?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900">{formData.name || 'School Name'} E-Diary</p>
                      <p className="text-xs" style={{ color: formData.primary_color }}>
                        {formData.tagline || 'Your tagline here'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">E-Diary · School Management</p>
                </div>
              </div>
            </div>
          )}

          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                {[
                  { key: 'primary_color', label: 'Primary Color', desc: 'Navbar, buttons, sidebar hover' },
                  { key: 'secondary_color', label: 'Secondary Color', desc: 'Supporting accents' },
                  { key: 'accent_color', label: 'Accent Color', desc: 'Warnings, highlights' },
                ].map(({ key, label, desc }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData[key]}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="w-14 h-14 rounded-lg border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData[key]}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{desc}</p>
                  </div>
                ))}
              </div>

              {/* Sidebar Preview */}
              <div className="mt-8 p-6 bg-slate-900/50 rounded-xl">
                <p className="text-sm font-medium text-slate-400 mb-4">Sidebar Preview</p>
                <div className="bg-white rounded-lg p-4 w-64">
                  {['Home', 'Schedule', 'Grading', 'Settings'].map((item, i) => (
                    <div 
                      key={item}
                      className={`px-3 py-2 rounded-lg mb-1 flex items-center gap-2 transition-all cursor-pointer ${
                        i === 0 ? 'text-white' : 'text-gray-600 hover:bg-opacity-10'
                      }`}
                      style={{ 
                        backgroundColor: i === 0 ? formData.primary_color : 'transparent',
                        ...(i !== 0 && { ':hover': { backgroundColor: `${formData.primary_color}15` } })
                      }}
                      onMouseEnter={(e) => {
                        if (i !== 0) e.target.style.backgroundColor = `${formData.primary_color}15`;
                      }}
                      onMouseLeave={(e) => {
                        if (i !== 0) e.target.style.backgroundColor = 'transparent';
                      }}
                    >
                      <Home size={16} />
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    placeholder="https://"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Academic Tab */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Grading System</label>
                  <select
                    value={formData.grading_system}
                    onChange={(e) => handleChange('grading_system', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  >
                    <option value="cambridge">Cambridge (A*-U / Band 1-6)</option>
                    <option value="serbian">Serbian (1-5)</option>
                    <option value="american">American (A-F)</option>
                    <option value="percentage">Percentage (0-100%)</option>
                    <option value="custom">Custom</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">Affects how grades are displayed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Academic Year</label>
                  <input
                    type="text"
                    value={formData.academic_year}
                    onChange={(e) => handleChange('academic_year', e.target.value)}
                    placeholder="2025-26"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Default Language</label>
                  <select
                    value={formData.default_language}
                    onChange={(e) => handleChange('default_language', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  >
                    <option value="en">English</option>
                    <option value="sr">Serbian</option>
                  </select>
                </div>
              </div>

              {/* Grading System Info */}
              <div className="p-4 bg-slate-700/30 rounded-xl">
                <h4 className="font-medium text-white mb-2">Grading System Details</h4>
                {formData.grading_system === 'cambridge' && (
                  <p className="text-sm text-slate-400">
                    <strong>Primary:</strong> Band 1-6 (6 = Outstanding, 1 = Below minimum)<br/>
                    <strong>IGCSE:</strong> A*-U (A* = Highest, U = Ungraded)
                  </p>
                )}
                {formData.grading_system === 'serbian' && (
                  <p className="text-sm text-slate-400">
                    <strong>Scale:</strong> 1-5 (5 = Odličan, 1 = Nedovoljan)
                  </p>
                )}
                {formData.grading_system === 'american' && (
                  <p className="text-sm text-slate-400">
                    <strong>Scale:</strong> A-F (A = Excellent, F = Fail)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* PDF Tab */}
          {activeTab === 'pdf' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">PDF Header Text</label>
                  <input
                    type="text"
                    value={formData.pdf_header_text}
                    onChange={(e) => handleChange('pdf_header_text', e.target.value)}
                    placeholder={formData.name}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">PDF Footer Text</label>
                  <input
                    type="text"
                    value={formData.pdf_footer_text}
                    onChange={(e) => handleChange('pdf_footer_text', e.target.value)}
                    placeholder="e.g., Excellence in Education"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => handleChange('show_logo_in_pdf', !formData.show_logo_in_pdf)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      formData.show_logo_in_pdf ? 'bg-violet-500' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      formData.show_logo_in_pdf ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                  <span className="text-slate-300">Show logo in PDFs</span>
                </label>
              </div>

              {/* PDF Preview */}
              <div className="mt-8 p-6 bg-white rounded-xl">
                <div className="border-b-2 pb-4 mb-4" style={{ borderColor: formData.primary_color }}>
                  <div className="flex items-center gap-3">
                    {formData.show_logo_in_pdf && formData.logo_url && (
                      <img src={formData.logo_url} alt="" className="h-8 object-contain" />
                    )}
                    <span className="font-bold" style={{ color: formData.primary_color }}>
                      {formData.pdf_header_text || formData.name}
                    </span>
                  </div>
                </div>
                <div className="text-gray-400 text-sm text-center py-8">
                  [PDF Content Here]
                </div>
                <div className="border-t pt-4 text-center text-gray-400 text-xs">
                  {formData.pdf_footer_text || `© ${new Date().getFullYear()} ${formData.name}`}
                </div>
              </div>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Select the plan tier for this school. Status is managed from the school card on the main dashboard.</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'basic',      name: 'Basic',      limit: 'Up to 50 students',   desc: 'Essential features' },
                  { id: 'pro',        name: 'Pro',        limit: 'Up to 200 students',  desc: 'Full feature set' },
                  { id: 'enterprise', name: 'Enterprise', limit: 'Unlimited students',  desc: 'Custom & priority support' },
                ].map(plan => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => handleChange('plan', plan.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.plan === plan.id
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <p className="font-bold text-white">{plan.name}</p>
                    <p className="text-xs text-violet-300 mt-1">{plan.limit}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{plan.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-slate-400 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandingSettings;