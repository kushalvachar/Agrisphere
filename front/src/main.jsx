import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import './i18n/index.js';
import { AuthProvider } from './context/AuthContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { VoiceAssistantProvider } from './context/VoiceAssistantContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* LanguageProvider wasn't mounted anywhere — any component using
            useLanguage()/useTranslation() from LanguageContext (IVRWidget,
            PriceTiles, VoiceAssistWidget) crashed with "useLanguage must
            be used within a LanguageProvider" as soon as it rendered. */}
        <LanguageProvider>
          {/* Feature: Intelligent Multilingual Voice Assistant. Mounted
              here (inside BrowserRouter for useNavigate, inside
              LanguageProvider for language sync) so the SAME engine
              instance — and its session memory — persists across every
              route change instead of being recreated per page. */}
          <VoiceAssistantProvider>
            <App />
          </VoiceAssistantProvider>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);