import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, Mail } from 'lucide-react';

// ============================================================================
// PRIVACY POLICY PAGE
// Accessible without login — linked from consent modal and login screen.
// Compliant with GDPR (EU) 2016/679.
// Last updated: May 2026
// ============================================================================

const LAST_UPDATED = 'May 2026';
const CONTACT_EMAIL = 'privacy@schoolhub.app';

const CARD_SHADOW = '0 1px 2px rgba(15,23,42,.04), 0 4px 16px rgba(15,23,42,.06)';

const Section = ({ id, title, children }) => (
  <div id={id} className="rounded-2xl bg-white border border-slate-100 p-6 sm:p-8 scroll-mt-24" style={{ boxShadow: CARD_SHADOW }}>
    <h2 className="text-base font-semibold text-slate-900 mb-4">{title}</h2>
    <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
      {children}
    </div>
  </div>
);

const TocItem = ({ href, label }) => (
  <a
    href={href}
    className="block text-sm text-slate-500 hover:text-slate-900 py-1 border-b border-slate-50 last:border-0 transition-colors"
  >
    {label}
  </a>
);

const TABLE_SECTIONS = [
  { href: '#who-we-are',       label: '1. Who We Are' },
  { href: '#what-we-collect',  label: '2. What Data We Collect' },
  { href: '#why-we-process',   label: '3. Why We Process Your Data' },
  { href: '#legal-basis',      label: '4. Legal Basis' },
  { href: '#who-sees-data',    label: '5. Who Sees Your Data' },
  { href: '#retention',        label: '6. Data Retention' },
  { href: '#your-rights',      label: '7. Your Rights' },
  { href: '#security',         label: '8. Security' },
  { href: '#children',         label: '9. Children\'s Data' },
  { href: '#cookies',          label: '10. Cookies' },
  { href: '#changes',          label: '11. Changes to This Policy' },
  { href: '#contact',          label: '12. Contact Us' },
];

const PrivacyPolicyPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 sm:p-10 text-white mb-8"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', boxShadow: '0 4px 24px rgba(15,23,42,.14)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center">
            <Shield size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Privacy Policy</h1>
            <p className="text-xs text-slate-300 mt-0.5">School Hub · Last updated {LAST_UPDATED}</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          This Privacy Policy explains how School Hub collects, uses, and protects your personal
          data in accordance with the General Data Protection Regulation (GDPR) EU 2016/679.
          Please read it carefully before using our platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Table of Contents (sticky sidebar) ─────────────────────────── */}
        <aside className="lg:col-span-1">
          <div
            className="rounded-2xl bg-white border border-slate-100 p-5 lg:sticky lg:top-6"
            style={{ boxShadow: CARD_SHADOW }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Contents</p>
            {TABLE_SECTIONS.map(s => <TocItem key={s.href} {...s} />)}
          </div>
        </aside>

        {/* ── Main Content ────────────────────────────────────────────────── */}
        <main className="lg:col-span-3 space-y-5">

          <Section id="who-we-are" title="1. Who We Are">
            <p>
              <strong className="text-slate-800">School Hub</strong> is a digital school management platform
              that enables schools to manage attendance, grades, homework, and parent communication.
            </p>
            <p>
              In the context of this Privacy Policy:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-slate-700">Data Controller</strong> — your school (the institution that enrolled your child and invited you to use this platform).</li>
              <li><strong className="text-slate-700">Data Processor</strong> — School Hub, which processes personal data on behalf of the school under a Data Processing Agreement (DPA).</li>
            </ul>
            <p>
              If you have questions about how your school uses your data, please contact your school
              administrator directly. For questions about how School Hub handles data at a platform
              level, contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </Section>

          <Section id="what-we-collect" title="2. What Data We Collect">
            <p>We collect and process the following categories of personal data:</p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-2.5 border border-slate-200 font-semibold text-slate-700 rounded-tl-lg">Category</th>
                    <th className="text-left p-2.5 border border-slate-200 font-semibold text-slate-700">Examples</th>
                    <th className="text-left p-2.5 border border-slate-200 font-semibold text-slate-700 rounded-tr-lg">Who it concerns</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Identity data', 'Full name, date of birth', 'Students, Parents, Teachers'],
                    ['Contact data', 'Email address, phone number', 'Parents, Teachers'],
                    ['Account data', 'Login email, password (hashed)', 'Parents, Teachers'],
                    ['Academic records', 'Grades, attendance, homework status', 'Students'],
                    ['Behavioural records', 'Teacher comments, behaviour logs', 'Students'],
                    ['Communication data', 'Announcements, notifications sent', 'Parents, Teachers'],
                    ['Technical data', 'Login timestamps, session tokens', 'All users'],
                  ].map(([cat, ex, who]) => (
                    <tr key={cat} className="hover:bg-slate-50/50">
                      <td className="p-2.5 border border-slate-200 font-medium text-slate-700">{cat}</td>
                      <td className="p-2.5 border border-slate-200 text-slate-500">{ex}</td>
                      <td className="p-2.5 border border-slate-200 text-slate-500">{who}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2">
              We do <strong className="text-slate-800">not</strong> collect special category data
              (health, religion, ethnicity) unless explicitly provided by the school administrator
              in notes fields, and only with appropriate consent.
            </p>
          </Section>

          <Section id="why-we-process" title="3. Why We Process Your Data">
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide school management services (attendance tracking, grade recording, homework management)</li>
              <li>To enable communication between school staff and parents</li>
              <li>To allow parents to monitor their child's academic progress</li>
              <li>To generate reports and analytics for school administration</li>
              <li>To ensure platform security and prevent unauthorised access</li>
              <li>To comply with legal obligations applicable to educational institutions</li>
            </ul>
          </Section>

          <Section id="legal-basis" title="4. Legal Basis for Processing">
            <p>We process your data under the following GDPR legal bases:</p>
            <div className="space-y-3 mt-2">
              {[
                { basis: 'Article 6(1)(b) — Contract', desc: 'Processing necessary to deliver the educational management service your school has contracted.' },
                { basis: 'Article 6(1)(c) — Legal obligation', desc: 'Attendance records and certain academic records are required by national education law.' },
                { basis: 'Article 6(1)(a) — Consent', desc: 'For optional features and communications. You may withdraw consent at any time via the Privacy page in your account.' },
                { basis: 'Article 6(1)(f) — Legitimate interests', desc: 'Platform security, fraud prevention, and service improvement — balanced against your rights.' },
              ].map(({ basis, desc }) => (
                <div key={basis} className="bg-slate-50 rounded-xl px-4 py-3">
                  <p className="font-semibold text-slate-700 text-xs mb-1">{basis}</p>
                  <p className="text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="who-sees-data" title="5. Who Sees Your Data">
            <p>Your data is accessible only to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-slate-700">You</strong> — you can view all your personal data at any time.</li>
              <li><strong className="text-slate-700">Authorised school staff</strong> — teachers and administrators at your specific school only. Cross-school access is technically prevented by Row Level Security at the database level.</li>
              <li><strong className="text-slate-700">School Hub technical staff</strong> — only when required for support or maintenance, with audit logging, and never without the school's knowledge.</li>
            </ul>
            <p className="mt-2">
              We do <strong className="text-slate-800">not</strong> sell, rent, or share your
              personal data with any third parties for marketing or commercial purposes.
            </p>
            <p>
              Our infrastructure provider is <strong className="text-slate-700">Supabase</strong> (EU region),
              which processes data under a signed DPA and is GDPR-compliant. No other sub-processors
              have access to personal data.
            </p>
          </Section>

          <Section id="retention" title="6. Data Retention">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-2.5 border border-slate-200 font-semibold text-slate-700">Data Type</th>
                    <th className="text-left p-2.5 border border-slate-200 font-semibold text-slate-700">Retention Period</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Account & contact details', 'Active account + 30 days after approved deletion request'],
                    ['Attendance records', 'Up to 2 years after child leaves school (legal requirement)'],
                    ['Grades & assessments', 'Up to 2 years after child leaves school (legal requirement)'],
                    ['Homework records', '1 academic year'],
                    ['Behavioural logs', '1 academic year'],
                    ['Login / access logs', '90 days (security purposes)'],
                    ['Consent records', 'Duration of account + 1 year (legal evidence)'],
                  ].map(([type, period]) => (
                    <tr key={type} className="hover:bg-slate-50/50">
                      <td className="p-2.5 border border-slate-200 font-medium text-slate-700">{type}</td>
                      <td className="p-2.5 border border-slate-200 text-slate-500">{period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="your-rights" title="7. Your Rights Under GDPR">
            <p>You have the following rights regarding your personal data:</p>
            <div className="space-y-2 mt-2">
              {[
                { right: 'Right of Access (Art. 15)', desc: 'Request a copy of all personal data we hold about you.' },
                { right: 'Right to Rectification (Art. 16)', desc: 'Request correction of inaccurate personal data.' },
                { right: 'Right to Erasure (Art. 17)', desc: 'Request deletion of your account and personal data. Submit via Privacy & Your Data in the app.' },
                { right: 'Right to Data Portability (Art. 20)', desc: 'Download a machine-readable copy of your data via Privacy & Your Data in the app.' },
                { right: 'Right to Restrict Processing (Art. 18)', desc: 'Request that we temporarily stop processing your data while a dispute is resolved.' },
                { right: 'Right to Object (Art. 21)', desc: 'Object to processing based on legitimate interests.' },
                { right: 'Right to Withdraw Consent (Art. 7)', desc: 'Withdraw previously given consent at any time. This does not affect processing already carried out.' },
              ].map(({ right, desc }) => (
                <div key={right} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0 mt-2" />
                  <div>
                    <p className="font-semibold text-slate-700 text-xs">{right}</p>
                    <p className="text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3">
              To exercise any of these rights, use the{' '}
              <strong className="text-slate-700">Privacy &amp; Your Data</strong> page in your account,
              or contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 hover:underline">{CONTACT_EMAIL}</a>.
              We will respond within <strong className="text-slate-700">30 days</strong>.
            </p>
            <p>
              You also have the right to lodge a complaint with your national data protection authority
              if you believe your data has been processed unlawfully.
            </p>
          </Section>

          <Section id="security" title="8. Security">
            <p>We apply the following technical and organisational measures to protect your data:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-slate-700">Encryption at rest</strong> — AES-256 encryption on all database storage.</li>
              <li><strong className="text-slate-700">Encryption in transit</strong> — TLS 1.2+ on all connections.</li>
              <li><strong className="text-slate-700">Row Level Security</strong> — database-level enforcement ensuring one school cannot access another school's data.</li>
              <li><strong className="text-slate-700">Multi-tenant isolation</strong> — every query is scoped to the authenticated school's ID.</li>
              <li><strong className="text-slate-700">JWT authentication</strong> — all API calls require a valid, time-limited token.</li>
              <li><strong className="text-slate-700">Hashed passwords</strong> — passwords are never stored in plain text (bcrypt via Supabase Auth).</li>
              <li><strong className="text-slate-700">Access logging</strong> — all sensitive administrative actions are logged.</li>
            </ul>
            <p className="mt-2">
              In the event of a data breach that poses a risk to your rights and freedoms, we will
              notify the relevant supervisory authority within <strong className="text-slate-700">72 hours</strong> and
              affected users without undue delay, as required by GDPR Article 33–34.
            </p>
          </Section>

          <Section id="children" title="9. Children's Data">
            <p>
              School Hub processes personal data about children (students) as part of its core function.
              This is carried out under the legal basis of <strong className="text-slate-700">contract (Art. 6(1)(b))</strong> and{' '}
              <strong className="text-slate-700">legal obligation (Art. 6(1)(c))</strong> — not consent —
              since schools are legally required to maintain educational records.
            </p>
            <p>
              Student data is accessible only to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The student's parent(s) or legal guardian(s) registered on the platform</li>
              <li>Authorised teaching and administrative staff at the enrolled school</li>
            </ul>
            <p>
              Student data is <strong className="text-slate-700">never</strong> used for advertising,
              profiling, or any purpose other than educational management.
            </p>
          </Section>

          <Section id="cookies" title="10. Cookies">
            <p>
              School Hub uses only <strong className="text-slate-700">strictly necessary cookies</strong> and
              browser storage to maintain your login session. These are:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-slate-700">Supabase session token</strong> — stores your authentication session so you remain logged in. Deleted on logout.</li>
              <li><strong className="text-slate-700">School identifier</strong> — remembers which school subdomain you are accessing. No personal data.</li>
            </ul>
            <p>
              We do <strong className="text-slate-800">not</strong> use analytics cookies, advertising
              cookies, or any third-party tracking scripts. There are no Google Analytics, Facebook
              Pixel, or similar trackers on this platform.
            </p>
          </Section>

          <Section id="changes" title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our practices
              or legal requirements. When we make significant changes:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The "Last updated" date at the top of this page will be revised.</li>
              <li>You will be shown a consent prompt on your next login asking you to review and accept the updated policy.</li>
              <li>For major changes affecting your rights, we will notify you by email (if provided).</li>
            </ul>
            <p>Continued use of the platform after notification constitutes acceptance of the updated policy.</p>
          </Section>

          <Section id="contact" title="12. Contact Us">
            <p>
              For any privacy-related questions, to exercise your rights, or to report a concern:
            </p>
            <div className="mt-3 flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <Mail size={16} className="text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Data Protection Contact</p>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm font-medium text-blue-600 hover:underline">
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
            <p className="mt-3">
              We aim to respond to all privacy enquiries within{' '}
              <strong className="text-slate-700">30 days</strong> as required by GDPR Article 12.
            </p>
            <p>
              If you are not satisfied with our response, you have the right to lodge a complaint
              with your national supervisory authority. In Bosnia and Herzegovina, this is the{' '}
              <strong className="text-slate-700">Agency for Personal Data Protection</strong>{' '}
              (<a href="https://azlp.ba" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">azlp.ba</a>).
              For EU member states, find your authority at{' '}
              <a href="https://edpb.europa.eu/about-edpb/about-edpb/members_en" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">edpb.europa.eu</a>.
            </p>
          </Section>

          {/* Footer note */}
          <div className="rounded-2xl bg-slate-50 border border-slate-100 px-5 py-4 text-xs text-slate-400 leading-relaxed">
            This Privacy Policy was last updated in <strong className="text-slate-500">{LAST_UPDATED}</strong> and
            applies to all users of the School Hub platform. It is written to comply with the General
            Data Protection Regulation (GDPR) EU 2016/679.
          </div>

        </main>
      </div>
    </div>
  </div>
);

export default PrivacyPolicyPage;
