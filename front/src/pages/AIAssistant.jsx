import { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useLanguage, useTranslation } from '../context/LanguageContext.jsx';
import { getLanguageMeta } from '../i18n/index.js';

export default function AIAssistant({ role = 'farmer' }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Role-specific sample questions (spec section 20) — purely a UX
  // prompt for the same underlying assistant; the assistant itself is
  // unchanged and still answers only from window.__agrisphereContext.
  // Sourced from the translation dictionary (not hardcoded English) so
  // these switch language along with the rest of the page.
  const SAMPLE_QUESTIONS = {
    farmer: [t('sampleQFarmer1'), t('sampleQFarmer2'), t('sampleQFarmer3'), t('sampleQFarmer4')],
    fpo: [t('sampleQFpo1'), t('sampleQFpo2'), t('sampleQFpo3')],
    buyer: [t('sampleQBuyer1'), t('sampleQBuyer2'), t('sampleQBuyer3')],
  };
  const sampleQuestions = SAMPLE_QUESTIONS[role] || SAMPLE_QUESTIONS.farmer;

  const TITLES = {
    farmer: t('aiAssistantTitleFarmer'),
    fpo: t('aiAssistantTitleFpo'),
    buyer: t('aiAssistantTitleBuyer'),
  };

  const ask = async (q) => {
    const text = q ?? question;
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setQuestion('');
    setLoading(true);
    try {
      const context = window.__agrisphereContext || {};
      // Feature: Intelligent Multilingual Voice Assistant / Task 3 —
      // pass the farmer's currently selected app language through so
      // Gemini answers in that language, not always English (this call
      // previously omitted `language` entirely).
      const res = await api.askAssistant({ question: text, context, language: getLanguageMeta(lang).englishName });
      setMessages((m) => [...m, { role: 'assistant', text: res.answer, aiAvailable: res.aiAvailable }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-agri-600 flex items-center justify-center mx-auto mb-3">
          <Sparkles size={26} className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">{TITLES[role] || TITLES.farmer}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('aiAssistantSubtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {sampleQuestions.map((q) => (
          <button key={q} onClick={() => ask(q)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full px-3 py-1.5">
            {q}
          </button>
        ))}
      </div>

      <div className="card min-h-[16rem] space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${m.role === 'user' ? 'bg-intel-50 text-intel-800 ml-auto' : 'bg-slate-100 text-slate-700'}`}>
            {m.text}
          </div>
        ))}
        {loading && <Loader2 className="animate-spin text-slate-400" size={18} />}
        {!messages.length && !loading && (
          <p className="text-slate-400 text-sm text-center pt-12">{t('aiAssistantEmptyState')}</p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask()}
          placeholder={t('aiAssistantPlaceholder')}
          className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-agri-400"
        />
        <button onClick={() => ask()} className="btn-primary"><Send size={16} /></button>
      </div>
    </div>
  );
}