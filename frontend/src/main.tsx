import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import './index.css';

// تنظیم جهت راست‌به‌چپ در سطح ریشه
document.documentElement.setAttribute('dir', 'rtl');
document.documentElement.setAttribute('lang', 'fa');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        richColors
        closeButton
        dir="rtl"
        toastOptions={{
          style: { fontFamily: 'Vazirmatn, Tahoma, sans-serif' },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);