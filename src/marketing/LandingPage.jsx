import React, { useState } from 'react';
import {
  GraduationCap, BookOpen, Users, ClipboardList,
  Calendar, BarChart2, Bell, Shield, ChevronRight,
  CheckCircle, Menu, X, Star
} from 'lucide-react';

// ============================================================================
// LANDING PAGE — shown at main domain (no school subdomain)
// ============================================================================

const DEMO_URL = 'https://ediary-prototype.id/?school=greenschool';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Digital Grades',
    desc: 'Enter and track grades instantly. Cambridge and national grading systems supported.',
    color: '#10b981',
  },
  {
    icon: ClipboardList,
    title: 'Attendance Tracking',
    desc: 'Mark attendance per class, view monthly reports, and flag absences automatically.',
    color: '#3b82f6',
  },
  {
    icon: Calendar,
    title: 'Timetable & Schedule',
    desc: 'Interactive weekly timetable for teachers and students. Always up to date.',
    color: '#8b5cf6',
  },
  {
    icon: Users,
    title: 'Parent Portal',
    desc: 'Parents see their child\'s grades, homework, and attendance in real time.',
    color: '#f59e0b',
  },
  {
    icon: Bell,
    title: 'Homework & Events',
    desc: 'Assign homework, set deadlines, publish school events — all in one place.',
    color: '#ef4444',
  },
  {
    icon: Shield,
    title: 'Multi-school Ready',
    desc: 'Each school has its own isolated tenant. Secure, branded, independent.',
    color: '#06b6d4',
  },
];

const TESTIMONIAL = {
  text: "Prelazak na E-Diary nam je uštedeoa sate papirnatog rada nedeljno. Roditelji su oduševljeni što sve vide u realnom vremenu.",
  name: "Marija Petrović",
  role: "Direktorka, Osnovna škola Vuk Karadžić",
};

// ─── Header ──────────────────────────────────────────────────────────────────
const Header = ({ menuOpen, setMenuOpen }) => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
          <GraduationCap size={18} className="text-white" />
        </div>
        <span className="font-bold text-gray-900 text-lg tracking-tight">E-Diary</span>
        <span className="hidden sm:inline-block text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          Beta
        </span>
      </div>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
        <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
        <a href="#how-it-works" className="hover:text-gray-900 transition-colors">How it works</a>
        <a
          href={DEMO_URL}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
        >
          Try Demo →
        </a>
      </nav>

      {/* Mobile hamburger */}
      <button
        className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
    </div>

    {/* Mobile menu */}
    {menuOpen && (
      <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
        <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">Features</a>
        <a href="#how-it-works" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-gray-700 py-2">How it works</a>
        <a
          href={DEMO_URL}
          className="block w-full text-center px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium"
        >
          Try Demo →
        </a>
      </div>
    )}
  </header>
);

// ─── Hero ─────────────────────────────────────────────────────────────────────
const Hero = () => (
  <section className="pt-32 pb-20 px-4 text-center relative overflow-hidden">
    {/* Background blobs */}
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-60" />
      <div className="absolute -bottom-20 -left-40 w-96 h-96 bg-teal-100 rounded-full blur-3xl opacity-60" />
    </div>

    <div className="max-w-4xl mx-auto">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
        <Star size={14} className="fill-emerald-500 text-emerald-500" />
        Digitalni dnevnik za moderne škole
      </div>

      {/* Headline */}
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
        Upravljanje školom{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">
          na jednom mestu
        </span>
      </h1>

      <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
        E-Diary je platforma koja nastavnicima, roditeljima i administraciji
        daje sve što im treba — ocene, prisustvo, raspored, domaće zadatke —
        u jednoj modernoj aplikaciji.
      </p>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={DEMO_URL}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-[1.02] transition-all text-base"
        >
          Isprobaj demo
          <ChevronRight size={18} />
        </a>
        <a
          href="#features"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-gray-700 font-semibold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all text-base"
        >
          Vidi funkcionalnosti
        </a>
      </div>

      {/* Social proof */}
      <p className="mt-8 text-sm text-gray-400">
        ✓ Bez kreditne kartice &nbsp;·&nbsp; ✓ Podešen za 5 minuta &nbsp;·&nbsp; ✓ Besplatno testiranje
      </p>
    </div>
  </section>
);

// ─── App Preview ──────────────────────────────────────────────────────────────
const AppPreview = () => (
  <section className="py-12 px-4">
    <div className="max-w-5xl mx-auto">
      <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-gray-200 bg-gradient-to-br from-emerald-50 to-teal-50">
        {/* Fake browser bar */}
        <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 ml-2">
            ediary-prototype.id
          </div>
        </div>

        {/* Mock dashboard */}
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Učenici', value: '247', color: '#10b981' },
              { label: 'Nastavnici', value: '18', color: '#3b82f6' },
              { label: 'Razreda', value: '12', color: '#8b5cf6' },
              { label: 'Avg. ocena', value: '4.2', color: '#f59e0b' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Recent grades */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-900 mb-3">Poslednje ocene</p>
              {[
                { name: 'Ana Jović', subject: 'Matematika', grade: '5', color: '#10b981' },
                { name: 'Marko Ilić', subject: 'Fizika', grade: '4', color: '#3b82f6' },
                { name: 'Sara Đorđić', subject: 'Hemija', grade: '3', color: '#f59e0b' },
              ].map(({ name, subject, grade, color }) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{name}</p>
                    <p className="text-xs text-gray-400">{subject}</p>
                  </div>
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: color }}>
                    {grade}
                  </span>
                </div>
              ))}
            </div>

            {/* Attendance */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-900 mb-3">Prisustvo danas</p>
              {[
                { class: '7A', present: 24, total: 26 },
                { class: '8B', present: 22, total: 23 },
                { class: '6C', present: 20, total: 25 },
              ].map(({ class: cls, present, total }) => {
                const pct = Math.round((present / total) * 100);
                return (
                  <div key={cls} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-gray-700">{cls}</span>
                      <span className="text-gray-500">{present}/{total}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: pct > 90 ? '#10b981' : '#f59e0b' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ─── Features ─────────────────────────────────────────────────────────────────
const Features = () => (
  <section id="features" className="py-20 px-4 bg-gray-50">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Sve što škola treba
        </h2>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Jedan sistem koji povezuje nastavnike, roditelje i administraciju.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {FEATURES.map(({ icon: Icon, title, desc, color }) => (
          <div
            key={title}
            className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon size={22} style={{ color }} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─── How it Works ─────────────────────────────────────────────────────────────
const HowItWorks = () => (
  <section id="how-it-works" className="py-20 px-4">
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-14">
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Gotovi za 5 minuta
        </h2>
        <p className="text-gray-500 text-lg">
          Bez komplikovane instalacije. Radi u browseru, na telefonu i tabletu.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-8">
        {[
          { step: '01', title: 'Kreiramo vašu školu', desc: 'Podešavamo logo, boje i listu nastavnika za vas.' },
          { step: '02', title: 'Uvozimo podatke', desc: 'Učenici, razredi i raspored se uvoze u par klikova.' },
          { step: '03', title: 'Sve je živo', desc: 'Nastavnici ocenjuju, roditelji prate, sve u realnom vremenu.' },
        ].map(({ step, title, desc }) => (
          <div key={step} className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
              {step}
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ─── Testimonial ─────────────────────────────────────────────────────────────
const Testimonial = () => (
  <section className="py-16 px-4 bg-gradient-to-r from-emerald-500 to-teal-600">
    <div className="max-w-3xl mx-auto text-center text-white">
      <div className="flex justify-center gap-1 mb-6">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={20} className="fill-white text-white" />
        ))}
      </div>
      <blockquote className="text-xl sm:text-2xl font-medium leading-relaxed mb-8 opacity-95">
        "{TESTIMONIAL.text}"
      </blockquote>
      <div>
        <p className="font-semibold">{TESTIMONIAL.name}</p>
        <p className="text-emerald-100 text-sm">{TESTIMONIAL.role}</p>
      </div>
    </div>
  </section>
);

// ─── CTA Banner ───────────────────────────────────────────────────────────────
const CTABanner = () => (
  <section className="py-20 px-4">
    <div className="max-w-3xl mx-auto text-center">
      <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
        Isprobajte odmah — besplatno
      </h2>
      <p className="text-gray-500 text-lg mb-8">
        Demo je živ i spreman. Prijavite se i vidite kako izgleda u praksi.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href={DEMO_URL}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-[1.02] transition-all text-base"
        >
          Otvori demo školu
          <ChevronRight size={18} />
        </a>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
        {['Ocene i prisustvo', 'Raspored', 'Portal za roditelje', 'Domaći zadaci'].map(f => (
          <span key={f} className="flex items-center gap-1.5">
            <CheckCircle size={14} className="text-emerald-500" />
            {f}
          </span>
        ))}
      </div>
    </div>
  </section>
);

// ─── Footer ───────────────────────────────────────────────────────────────────
const Footer = () => (
  <footer className="border-t border-gray-100 py-8 px-4">
    <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-md flex items-center justify-center">
          <GraduationCap size={13} className="text-white" />
        </div>
        <span className="font-semibold text-gray-600">E-Diary</span>
        <span>·</span>
        <span>© {new Date().getFullYear()}</span>
      </div>
      <div className="flex gap-4">
        <a href="/privacy" className="hover:text-gray-600 transition-colors">Privacy</a>
        <a href="/terms" className="hover:text-gray-600 transition-colors">Terms</a>
        <a href={DEMO_URL} className="hover:text-gray-600 transition-colors">Demo</a>
      </div>
    </div>
  </footer>
);

// ─── Main export ──────────────────────────────────────────────────────────────
const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <main>
        <Hero />
        <AppPreview />
        <Features />
        <HowItWorks />
        <Testimonial />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
