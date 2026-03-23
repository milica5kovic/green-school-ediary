import React, { useState } from 'react';
import {
  Calendar, Settings, Zap, CheckCircle, AlertTriangle,
  Download, Send, Trash2, RefreshCw, UserX, ShieldCheck, Layers,
} from 'lucide-react';
import { useBranding } from '../../../../core/context/BrandingContext';
import { useTenant } from '../../../../core/context/TenantContext';
import { useTimetable } from '../hooks/useTimetable';
import { exportTimetablePDF } from '../services/timetablePdfExport';
import { exportDutiesPDF } from '../services/dutiesPdfExport';
import { DutyService } from '../services/dutyService';
import { tenantSupabase } from '../../../../core/infrastructure/supabaseClient';
import TimeSlotsSetup from './TimeSlotsSetup';
import TeacherAssignmentsSetup from './TeacherAssignmentsSetup';
import TeacherAvailabilitySetup from './TeacherAvailabilitySetup';
import TimetableGrid from './TimetableGrid';
import SubstitutionSchedule from './SubstitutionSchedule';
import DutySetup from './DutySetup';

const TABS = [
  { id: 'setup', label: 'Setup', icon: Settings },
  { id: 'timetable', label: 'Timetable', icon: Calendar },
  { id: 'duties', label: 'Duties', icon: ShieldCheck },
  { id: 'substitutions', label: 'Substitutions', icon: UserX },
];
const SETUP_SECTIONS = [
  { id: 'slots', label: 'Time Slots' },
  { id: 'assignments', label: 'Assignments' },
  { id: 'availability', label: 'Availability' },
];

export default function TimetableMakerPage() {
  const { primaryColor, name: schoolName, logoUrl } = useBranding();
  const tt = useTimetable();
  const { schoolId } = useTenant();

  const [activeTab, setActiveTab] = useState('setup');
  const [setupSection, setSetupSection] = useState('slots');
  const [viewMode, setViewMode] = useState('draft'); // 'draft' | 'published'
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [exportingDuties, setExportingDuties] = useState(false);
  const [genSeed, setGenSeed] = useState(0);

  // PDF export state
  const [pdfFilter, setPdfFilter] = useState({ type: 'all', value: '' });

  // ---- Derived ----
  const hasDraft = tt.draftEntries.length > 0;
  const hasPublished = tt.publishedEntries.length > 0;
  const hasConflicts = tt.conflicts.size > 0;
  const hasUnplaced = tt.unplacedTasks.length > 0;
  const entries = viewMode === 'draft' ? tt.draftEntries : tt.publishedEntries;

  // ---- Handlers ----
  const handlePublish = async () => {
    setPublishConfirm(false);
    const result = await tt.publishTimetable();
    if (result) {
      setPublishResult(result);
      setViewMode('published');
    }
  };

  const handleClear = async () => {
    setClearConfirm(false);
    await tt.clearDraft();
  };

  const handleExportPDF = async () => {
    const exportEntries = viewMode === 'draft' ? tt.draftEntries : tt.publishedEntries;
    const filterTeacher = tt.teachers.find(t => t.id === pdfFilter.value);
    await exportTimetablePDF({
      entries: exportEntries,
      timeSlots: tt.timeSlots,
      schoolName,
      logoUrl,
      primaryColor,
      filterType: pdfFilter.type,
      filterValue: pdfFilter.type === 'teacher' ? filterTeacher?.full_name : pdfFilter.value,
      teachers: tt.teachers,
    });
  };

  const handleExportDutiesPDF = async () => {
    setExportingDuties(true);
    try {
      const svc = new DutyService(tenantSupabase, schoolId);
      const [dutySlots, assignments] = await Promise.all([
        svc.getDutySlots(),
        svc.getDutyAssignments(),
      ]);
      await exportDutiesPDF({ dutySlots, assignments, schoolName, logoUrl, primaryColor });
    } catch (e) {
      console.error('Duties PDF error:', e);
    } finally {
      setExportingDuties(false);
    }
  };

  // ---- Loading ----
  if (tt.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-3"
            style={{ borderColor: `${primaryColor}40`, borderTopColor: primaryColor }}
          />
          <p className="text-gray-500 text-sm">Loading timetable data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ---- Page Header ---- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar size={22} style={{ color: primaryColor }} />
            Timetable Maker
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure assignments, generate and publish the school timetable.
          </p>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-2">
          {hasDraft && (
            <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full font-medium">
              <RefreshCw size={12} />
              Draft ready
            </span>
          )}
          {hasPublished && (
            <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full font-medium">
              <CheckCircle size={12} />
              Published
            </span>
          )}
          {hasConflicts && (
            <span className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-full font-medium">
              <AlertTriangle size={12} />
              {tt.conflicts.size} conflict{tt.conflicts.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ---- Error banner ---- */}
      {tt.error && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          <span>⚠ {tt.error}</span>
          <button onClick={() => tt.setError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ---- Publish success banner ---- */}
      {publishResult && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          <span>✓ Timetable published — {publishResult.published} entries synced to teacher schedules.</span>
          <button onClick={() => setPublishResult(null)} className="text-green-500 hover:text-green-700">✕</button>
        </div>
      )}

      {/* ---- Unplaced tasks warning ---- */}
      {hasUnplaced && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm">
          <strong>⚠ {tt.unplacedTasks.length} task{tt.unplacedTasks.length !== 1 ? 's' : ''} could not be auto-scheduled:</strong>
          <ul className="mt-1 ml-4 list-disc text-xs space-y-0.5">
            {tt.unplacedTasks.map((t, i) => (
              <li key={i}>{t.class_name} — {t.subject} ({t.teacherName})</li>
            ))}
          </ul>
          <p className="text-xs mt-1 text-amber-600">Add these manually in the Timetable tab.</p>
        </div>
      )}

      {/* ---- Main card ---- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tab nav */}
        <div className="flex border-b border-gray-200">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2
                  ${isActive
                    ? 'border-current text-current'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }
                `}
                style={isActive ? { borderColor: primaryColor, color: primaryColor } : {}}
              >
                <Icon size={16} />
                {tab.label}
                {tab.id === 'timetable' && hasConflicts && (
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* ========== SETUP TAB ========== */}
        {activeTab === 'setup' && (
          <div className="flex min-h-[500px]">
            {/* Left sub-nav */}
            <div className="w-44 border-r border-gray-100 bg-gray-50 p-3 space-y-1 flex-shrink-0">
              {SETUP_SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSetupSection(s.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all
                    ${setupSection === s.id ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200'}
                  `}
                  style={setupSection === s.id ? { backgroundColor: primaryColor } : {}}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Right content */}
            <div className="flex-1 p-6 overflow-auto">
              {setupSection === 'slots' && (
                <TimeSlotsSetup
                  timeSlots={tt.timeSlots}
                  onSave={tt.saveTimeSlots}
                  saving={tt.saving}
                />
              )}
              {setupSection === 'assignments' && (
                <TeacherAssignmentsSetup
                  assignments={tt.assignments}
                  teachers={tt.teachers}
                  classes={tt.classes}
                  onAdd={tt.addAssignment}
                  onUpdate={tt.updateAssignment}
                  onDelete={tt.deleteAssignment}
                  saving={tt.saving}
                />
              )}
              {setupSection === 'availability' && (
                <TeacherAvailabilitySetup
                  teachers={tt.teachers}
                  timeSlots={tt.timeSlots}
                  isTeacherAvailable={tt.isTeacherAvailable}
                  onToggle={tt.toggleAvailability}
                />
              )}
            </div>
          </div>
        )}

        {/* ========== DUTIES TAB ========== */}
        {activeTab === 'duties' && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Staff Duty Assignments</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Assign teachers to arrival, snack, lunch, late pick-up and other duties.
                </p>
              </div>
              <button
                onClick={handleExportDutiesPDF}
                disabled={exportingDuties}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors disabled:opacity-50"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                <Download size={13} />
                {exportingDuties ? 'Exporting…' : 'Export Duties PDF'}
              </button>
            </div>
            <DutySetup teachers={tt.teachers} />
          </div>
        )}

        {/* ========== SUBSTITUTIONS TAB ========== */}
        {activeTab === 'substitutions' && (
          <div className="p-6">
            <SubstitutionSchedule
              teachers={tt.teachers}
              publishedEntries={tt.publishedEntries}
              timeSlots={tt.timeSlots}
              availabilityRecords={tt.availabilityRecords}
              assignments={tt.assignments}
            />
          </div>
        )}

        {/* ========== TIMETABLE TAB ========== */}
        {activeTab === 'timetable' && (
          <div className="p-6 space-y-5">
            {/* Action bar */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Draft / Published toggle */}
              <div className="flex bg-gray-100 rounded-xl p-1 mr-2">
                <button
                  onClick={() => setViewMode('draft')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    viewMode === 'draft' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                  }`}
                >
                  Draft
                </button>
                <button
                  onClick={() => setViewMode('published')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
                    viewMode === 'published' ? 'bg-white shadow text-gray-800' : 'text-gray-500'
                  }`}
                >
                  Published
                </button>
              </div>

              {/* Auto-generate */}
              <button
                onClick={() => { setGenSeed(0); tt.autoGenerate(0); }}
                disabled={tt.generating || tt.assignments.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                <Zap size={15} />
                {tt.generating ? 'Generating…' : 'Auto-Generate'}
              </button>

              {/* Regenerate — tries a different seed to explore alternative schedules */}
              {hasDraft && (
                <button
                  onClick={() => { const s = genSeed + 3; setGenSeed(s); tt.autoGenerate(s); }}
                  disabled={tt.generating || tt.assignments.length === 0}
                  title={`Try a different schedule order (attempt ${Math.floor(genSeed / 3) + 2})`}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border-2 transition-opacity disabled:opacity-50"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  <RefreshCw size={15} />
                  Regenerate
                </button>
              )}

              {/* Fill Gaps */}
              <button
                onClick={tt.fillGaps}
                disabled={tt.generating || tt.assignments.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border-2 transition-opacity disabled:opacity-50"
                style={{ borderColor: primaryColor, color: primaryColor }}
              >
                <Layers size={15} />
                {tt.generating ? 'Generating…' : 'Fill Gaps'}
              </button>

              {/* Clear draft */}
              {hasDraft && !clearConfirm && (
                <button
                  onClick={() => setClearConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  <Trash2 size={15} />
                  Clear Draft
                </button>
              )}
              {clearConfirm && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
                  <span className="text-xs text-red-600">Clear all draft entries?</span>
                  <button onClick={handleClear} className="text-xs font-bold text-red-600 hover:text-red-800">Yes</button>
                  <button onClick={() => setClearConfirm(false)} className="text-xs text-gray-500 hover:text-gray-700">No</button>
                </div>
              )}

              {/* Publish */}
              {hasDraft && !hasConflicts && (
                <>
                  {!publishConfirm ? (
                    <button
                      onClick={() => setPublishConfirm(true)}
                      disabled={tt.publishing}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors ml-auto"
                    >
                      <Send size={15} />
                      {tt.publishing ? 'Publishing…' : 'Publish'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 rounded-xl ml-auto">
                      <span className="text-xs text-green-700">This will sync to all teacher schedules.</span>
                      <button onClick={handlePublish} className="text-xs font-bold text-green-700 hover:text-green-900">Confirm</button>
                      <button onClick={() => setPublishConfirm(false)} className="text-xs text-gray-500">Cancel</button>
                    </div>
                  )}
                </>
              )}
              {hasConflicts && hasDraft && (
                <div className="ml-auto flex items-center gap-1.5 text-xs text-red-500 font-medium">
                  <AlertTriangle size={13} />
                  Resolve conflicts to publish
                </div>
              )}

              {/* Export PDF */}
              {(hasDraft || hasPublished) && (
                <div className="flex items-center gap-2 ml-auto">
                  <select
                    value={`${pdfFilter.type}:${pdfFilter.value}`}
                    onChange={e => {
                      const [type, ...rest] = e.target.value.split(':');
                      setPdfFilter({ type, value: rest.join(':') });
                    }}
                    className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg"
                  >
                    <option value="all:">All classes</option>
                    <optgroup label="By Class">
                      {tt.classes.map(c => (
                        <option key={c} value={`class:${c}`}>Class {c}</option>
                      ))}
                    </optgroup>
                    <optgroup label="By Teacher">
                      {tt.teachers.map(t => (
                        <option key={t.id} value={`teacher:${t.id}`}>{t.full_name}</option>
                      ))}
                    </optgroup>
                  </select>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <Download size={13} />
                    Export PDF
                  </button>
                </div>
              )}
            </div>

            {/* Grid */}
            <TimetableGrid
              entries={entries}
              timeSlots={tt.timeSlots}
              teachers={tt.teachers}
              classes={tt.classes}
              assignments={tt.assignments}
              conflicts={viewMode === 'draft' ? tt.conflicts : new Set()}
              onSetCell={tt.manualSetCell}
              onDeleteCell={tt.deleteDraftEntry}
              onMoveCell={tt.moveDraftEntry}
              onMoveCells={tt.moveDraftGroup}
              onSwapCells={tt.swapDraftEntries}
              saving={tt.saving}
              viewMode={viewMode}
            />

            {/* Setup nudge */}
            {tt.assignments.length === 0 && (
              <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                Go to <button onClick={() => { setActiveTab('setup'); setSetupSection('assignments'); }} className="underline font-medium" style={{ color: primaryColor }}>Setup → Assignments</button> to define who teaches what before generating.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
