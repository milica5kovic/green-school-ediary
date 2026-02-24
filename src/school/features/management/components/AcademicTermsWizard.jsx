import React, { useState, useEffect } from 'react';
import { Calendar, ChevronRight, ChevronLeft, Check, AlertCircle, Snowflake, Sun, Flower2, Loader2, X } from 'lucide-react';
import { createAcademicTerms, validateTermDates, fetchAcademicTerms } from '../../settings/service/academicTermsService';

const TERM_CONFIG = [
  { term_number: 1, term_name: 'Winter', icon: Snowflake, color: 'blue', description: 'September – December' },
  { term_number: 2, term_name: 'Spring', icon: Flower2, color: 'pink', description: 'January – April' },
  { term_number: 3, term_name: 'Summer', icon: Sun, color: 'amber', description: 'April – June' }
];

const STEPS = [
  { id: 'year', label: 'Academic Year' },
  { id: 'term1', label: 'Winter Term' },
  { id: 'term2', label: 'Spring Term' },
  { id: 'term3', label: 'Summer Term' },
  { id: 'review', label: 'Review & Save' }
];

const generateAcademicYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const options = [];
  for (let y = currentYear - 1; y <= currentYear + 2; y++) {
    options.push(`${y}-${String(y + 1).slice(2)}`);
  }
  return options;
};

const getStartYear = (academicYear) => parseInt(academicYear.split('-')[0]);

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
};

const countWeekdays = (startDate, endDate, halfTermStart, halfTermEnd) => {
  if (!startDate || !endDate) return 0;
  let count = 0;
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const htStart = halfTermStart ? new Date(halfTermStart + 'T00:00:00') : null;
  const htEnd = halfTermEnd ? new Date(halfTermEnd + 'T00:00:00') : null;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 0 || day === 6) continue;
    if (htStart && htEnd && d >= htStart && d <= htEnd) continue;
    count++;
  }
  return count;
};

const StepIndicator = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                isCompleted ? 'bg-emerald-500 text-white shadow-md'
                  : isActive ? 'bg-emerald-600 text-white shadow-lg ring-4 ring-emerald-100'
                  : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}>
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={`mt-1.5 text-xs font-medium hidden sm:block ${
                isActive ? 'text-emerald-700' : isCompleted ? 'text-emerald-500' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 sm:w-12 h-0.5 mx-1 transition-colors duration-300 ${
                index < currentStep ? 'bg-emerald-400' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const DateInputGroup = ({ label, value, onChange, required = false, helpText }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
      />
      {helpText && <p className="mt-1 text-xs text-gray-400">{helpText}</p>}
    </div>
  );
};

const AcademicTermsWizard = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [existingYears, setExistingYears] = useState([]);

  const [academicYear, setAcademicYear] = useState('');
  const [terms, setTerms] = useState([
    { term_number: 1, term_name: 'Winter', start_date: '', end_date: '', half_term_start: '', half_term_end: '' },
    { term_number: 2, term_name: 'Spring', start_date: '', end_date: '', half_term_start: '', half_term_end: '' },
    { term_number: 3, term_name: 'Summer', start_date: '', end_date: '', half_term_start: '', half_term_end: '' }
  ]);

  useEffect(() => {
    const loadYears = async () => {
      try {
        const allTerms = await fetchAcademicTerms();
        const years = [...new Set(allTerms.map(t => t.academic_year))];
        setExistingYears(years);
      } catch (err) {
        console.error('Failed to load existing years:', err);
      }
    };
    loadYears();
  }, []);

  const applyDefaults = (year) => {
    if (!year) return;
    const startY = getStartYear(year);
    const endY = startY + 1;

    setTerms([
      {
        term_number: 1, term_name: 'Winter',
        start_date: `${startY}-09-01`, end_date: `${startY}-12-19`,
        half_term_start: `${startY}-10-20`, half_term_end: `${startY}-10-24`
      },
      {
        term_number: 2, term_name: 'Spring',
        start_date: `${endY}-01-12`, end_date: `${endY}-04-02`,
        half_term_start: `${endY}-02-16`, half_term_end: `${endY}-02-20`
      },
      {
        term_number: 3, term_name: 'Summer',
        start_date: `${endY}-04-14`, end_date: `${endY}-06-19`,
        half_term_start: `${endY}-05-25`, half_term_end: `${endY}-05-29`
      }
    ]);
  };

  const updateTerm = (index, field, value) => {
    setTerms(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const canProceed = () => {
    if (currentStep === 0) return academicYear && !existingYears.includes(academicYear);
    if (currentStep >= 1 && currentStep <= 3) {
      const t = terms[currentStep - 1];
      return t.start_date && t.end_date && t.start_date < t.end_date;
    }
    return true;
  };

  const handleNext = () => {
    setErrors([]);
    if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setErrors([]);
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleSave = async () => {
    const validationErrors = validateTermDates(terms);
    if (validationErrors.length > 0) { setErrors(validationErrors); return; }

    setSaving(true);
    setErrors([]);

    try {
      const termsToInsert = terms.map((t, idx) => ({
        academic_year: academicYear,
        term_number: t.term_number,
        term_name: t.term_name,
        start_date: t.start_date,
        end_date: t.end_date,
        half_term_start: t.half_term_start || null,
        half_term_end: t.half_term_end || null,
        is_active: idx === 0,
        is_finalized: false,
        final_grade_weight: 33.33
      }));

      await createAcademicTerms(termsToInsert);
      if (onComplete) onComplete(academicYear);
    } catch (err) {
      console.error('Failed to save terms:', err);
      setErrors([`Failed to save: ${err.message}`]);
    } finally {
      setSaving(false);
    }
  };

  const renderYearStep = () => {
    const yearOptions = generateAcademicYearOptions();
    const isDuplicate = existingYears.includes(academicYear);

    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Choose Academic Year</h3>
        <p className="text-sm text-gray-500 mb-6">
          Select the academic year to set up. Default British calendar dates will be pre-filled.
        </p>
        <div className="max-w-xs mx-auto">
          <select
            value={academicYear}
            onChange={(e) => { setAcademicYear(e.target.value); applyDefaults(e.target.value); }}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">Select year...</option>
            {yearOptions.map(y => (
              <option key={y} value={y} disabled={existingYears.includes(y)}>
                {y} {existingYears.includes(y) ? '(already set up)' : ''}
              </option>
            ))}
          </select>
          {isDuplicate && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Terms already exist for {academicYear}.</span>
            </div>
          )}
          {academicYear && !isDuplicate && (
            <div className="mt-4 text-sm text-emerald-600 bg-emerald-50 rounded-lg p-3">
              <Check className="w-4 h-4 inline mr-1" />
              Default dates pre-filled. Adjust in the next steps.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTermStep = (termIndex) => {
    const config = TERM_CONFIG[termIndex];
    const term = terms[termIndex];
    const Icon = config.icon;
    const teachingDays = countWeekdays(term.start_date, term.end_date, term.half_term_start, term.half_term_end);

    const colorMap = {
      blue: { bg: 'bg-blue-50', icon: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' },
      pink: { bg: 'bg-pink-50', icon: 'text-pink-500', badge: 'bg-pink-100 text-pink-700' },
      amber: { bg: 'bg-amber-50', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-700' }
    };
    const colors = colorMap[config.color];

    return (
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${colors.icon}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Term {config.term_number}: {config.term_name}</h3>
            <p className="text-sm text-gray-500">{config.description}</p>
          </div>
          {teachingDays > 0 && (
            <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
              {teachingDays} teaching days
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <DateInputGroup label="Term Start Date" value={term.start_date} onChange={(val) => updateTerm(termIndex, 'start_date', val)} required />
          <DateInputGroup label="Term End Date" value={term.end_date} onChange={(val) => updateTerm(termIndex, 'end_date', val)} required />
        </div>
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-600 mb-3">Half-Term Break <span className="text-gray-400 font-normal">(optional)</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DateInputGroup label="Half-Term Start" value={term.half_term_start} onChange={(val) => updateTerm(termIndex, 'half_term_start', val)} helpText="First day of the break" />
            <DateInputGroup label="Half-Term End" value={term.half_term_end} onChange={(val) => updateTerm(termIndex, 'half_term_end', val)} helpText="Last day of the break" />
          </div>
        </div>
      </div>
    );
  };

  const renderReviewStep = () => {
    return (
      <div>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Review & Confirm</h3>
          <p className="text-sm text-gray-500">
            Academic Year <span className="font-semibold text-gray-700">{academicYear}</span>
          </p>
        </div>
        <div className="space-y-3">
          {terms.map((term, idx) => {
            const config = TERM_CONFIG[idx];
            const Icon = config.icon;
            const teachingDays = countWeekdays(term.start_date, term.end_date, term.half_term_start, term.half_term_end);
            return (
              <div key={idx} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-5 h-5 text-gray-500" />
                  <span className="font-semibold text-gray-800">Term {term.term_number}: {term.term_name}</span>
                  <span className="ml-auto text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{teachingDays} days</span>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm ml-8">
                  <div><span className="text-gray-400">Start:</span> <span className="text-gray-700">{formatDateDisplay(term.start_date)}</span></div>
                  <div><span className="text-gray-400">End:</span> <span className="text-gray-700">{formatDateDisplay(term.end_date)}</span></div>
                  {term.half_term_start && (
                    <>
                      <div><span className="text-gray-400">Half-term:</span> <span className="text-gray-700">{formatDateDisplay(term.half_term_start)}</span></div>
                      <div><span className="text-gray-400">to:</span> <span className="text-gray-700">{formatDateDisplay(term.half_term_end)}</span></div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 bg-emerald-50 rounded-xl p-3 text-center">
          <span className="text-sm text-emerald-700 font-medium">
            Total teaching days: <strong>{terms.reduce((sum, t) => sum + countWeekdays(t.start_date, t.end_date, t.half_term_start, t.half_term_end), 0)}</strong>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Academic Year Setup</h2>
          <p className="text-emerald-100 text-sm">Configure term dates for your school year</p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="text-white/70 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="px-6 py-6">
        <StepIndicator currentStep={currentStep} steps={STEPS} />
        <div className="min-h-[280px]">
          {currentStep === 0 && renderYearStep()}
          {currentStep === 1 && renderTermStep(0)}
          {currentStep === 2 && renderTermStep(1)}
          {currentStep === 3 && renderTermStep(2)}
          {currentStep === 4 && renderReviewStep()}
        </div>
        {errors.length > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
            {errors.map((err, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{err}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <button onClick={handleBack} disabled={currentStep === 0}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              currentStep === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {currentStep < STEPS.length - 1 ? (
            <button onClick={handleNext} disabled={!canProceed()}
              className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                canProceed() ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}>
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50">
              {saving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>) : (<><Check className="w-4 h-4" /> Save Academic Year</>)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcademicTermsWizard;