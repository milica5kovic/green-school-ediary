import React from 'react';
import { ShieldAlert, Home } from 'lucide-react';
import { useApp } from '../../core/context/AppContext';

const UnauthorizedPage = () => {
  const { setCurrentPage } = useApp();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center border border-red-200">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={40} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          You don't have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <button
          onClick={() => setCurrentPage('home')}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2 mx-auto"
        >
          <Home size={20} />
          Go to Homepage
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedPage;