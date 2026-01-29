import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './context/AuthContext';
import { supabase } from './infrastructure/supabaseClient';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Remove StrictMode in development to avoid Supabase lock errors
// StrictMode causes components to mount twice, which conflicts with Supabase's lock mechanism
root.render(
  <AuthProvider supabase={supabase}>
    <App />
  </AuthProvider>
);

reportWebVitals();