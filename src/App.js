import React from 'react';
import { BookOpen, CheckCircle } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        <BookOpen size={48} className="mx-auto text-emerald-600 mb-4" />
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-6">
          Green School E-Diary
        </h1>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-green-600">
            <CheckCircle size={20} />
            <span>✓ Ready to Build!</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;