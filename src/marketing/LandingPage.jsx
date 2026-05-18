import React from 'react';
import { GraduationCap, ChevronRight } from 'lucide-react';

const DEMO_URL = '/?school=greenschool';

const LandingPage = () => (
  <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
    {/* Background blobs */}
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-50" />
      <div className="absolute -bottom-20 -left-40 w-96 h-96 bg-teal-100 rounded-full blur-3xl opacity-50" />
    </div>

    {/* Logo */}
    <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-200 mb-8">
      <GraduationCap size={40} className="text-white" />
    </div>

    {/* Headline */}
    <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 text-center leading-tight mb-4">
      Green School
      <br />
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">
        E-Diary
      </span>
    </h1>

    <p className="text-gray-400 text-lg text-center mb-10 max-w-sm">
      Digital school management platform
    </p>

    {/* CTA */}
    <a
      href={DEMO_URL}
      className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-[1.02] transition-all text-base"
    >
      Open Demo
      <ChevronRight size={18} />
    </a>
  </div>
);

export default LandingPage;
