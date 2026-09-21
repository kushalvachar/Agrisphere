import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircleQuestion, X, Send, Loader2, Sparkles, Mic, Volume2, VolumeX } from 'lucide-react';
import { api } from '../api/client.js';
import { getLanguageMeta } from '../i18n/index.js';

// Floating assistant available on every app page (spec section 16),
// extended in Phase 1 with:
//   - Speech-to-Text input (browser Web Speech API — free, no server
//     round trip needed to transcribe) so a farmer can ask by voice
//   - Text-to-Speech output (browser SpeechSynthesis API — also free)
//     so the answer is read back in the farmer's selected language
//   - basic voice navigation: "go to <page>" / "open <page>" matches
//     against the current role's nav items and routes directly,
//     without calling the AI at all
//
// It answers strictly from whatever `context` is passed in — by default
// it has no page-specific data, so on most pages it will honestly say
// it doesn't have enough verified data unless the page supplies context
// via window.__agrisphereContext (set by pages that have relevant data).
//
// navItems/basePath (optional) let voice navigation work — RoleLayout
// and Layout pass the same nav list they render in the header.
export default function AIAssistantWidget({ navItems = [] }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Ask me things like "Should I wait 3 days?" or "Why is this buyer the best match?" — or tap the mic to speak.' },
  ]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef(null);

  const speechLocale = getLanguageMeta(i18n.language).speechLocale;
  const languageEnglishName = getLanguageMeta(i18n.language).englishName;

  const speak = useCallback((text) => {
    if (!speakEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = speechLocale;
    window.speechSynthesis.speak(utter);
  }, [speakEnabled, speechLocale]);

  const ask = useCallback(async (overrideQuestion) => {
    const q = (overrideQuestion ?? question).trim();
    if (!q) return;
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setQuestion('');
    setLoading(true);
    try {
      const context = window.__agrisphereContext || {};
      const res = await api.askAssistant({ question: q, context, language: languageEnglishName });
      setMessages((m) => [...m, { role: 'assistant', text: res.answer }]);
      speak(res.answer);
    } catch (err) {
      const errText = `I ran into an error: ${err.message}`;
      setMessages((m) => [...m, { role: 'assistant', text: errText }]);
    } finally {
      setLoading(false);
    }
  }, [question, languageEnglishName, speak]);

  // Try to resolve a spoken phrase like "open market" / "go to offers"
  // against the current role's nav labels; returns true if it navigated
  // (and the AI call is skipped), false if it should be treated as a
  // real question instead.
  const tryVoiceNavigate = useCallback((transcript) => {
    const lower = transcript.toLowerCase();
    const navTriggers = ['go to', 'open', 'show me', 'navigate to', 'take me to'];
    const hasTrigger = navTriggers.some((trigger) => lower.startsWith(trigger));
    if (!hasTrigger || navItems.length === 0) return false;

    const match = navItems.find(({ labelKey, label }) => {
      const text = (label || t(labelKey) || '').toLowerCase();
      return text && lower.includes(text);
    });
    if (match) {
      navigate(match.to);
      setMessages((m) => [...m, { role: 'assistant', text: `Opening ${match.label || t(match.labelKey)}…` }]);
      setOpen(true);
      return true;
    }
    return false;
  }, [navItems, navigate, t]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }
    setOpen(true);
    const recognition = new SpeechRecognition();
    recognition.lang = speechLocale;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (!tryVoiceNavigate(transcript)) {
        ask(transcript);
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 mb-3 flex flex-col overflow-hidden">
          <div className="bg-agri-600 text-white px-4 py-3 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-2"><Sparkles size={16} /> Farmer AI Assistant</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSpeakEnabled((s) => !s)}
                title={speakEnabled ? t('voice.speakToggleOn') : t('voice.speakToggleOff')}
              >
                {speakEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
          </div>
          <div className="p-3 h-64 overflow-y-auto space-y-2 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] px-3 py-2 rounded-xl ${m.role === 'user' ? 'bg-intel-50 text-intel-800 ml-auto' : 'bg-slate-100 text-slate-700'}`}>
                {m.text}
              </div>
            ))}
            {loading && <Loader2 className="animate-spin text-slate-400" size={16} />}
            {listening && <div className="text-agri-600 text-xs flex items-center gap-1"><Mic size={12} className="animate-pulse" /> {t('voice.listening')}</div>}
            {!voiceSupported && <div className="text-warn-600 text-xs">{t('voice.notSupported')}</div>}
          </div>
          <div className="p-3 border-t border-slate-100 flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && ask()}
              placeholder="Ask a question…"
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-agri-400"
            />
            <button
              onClick={startListening}
              title={t('voice.tooltip')}
              className={`rounded-xl px-3 ${listening ? 'bg-warn-500 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            >
              <Mic size={16} />
            </button>
            <button onClick={() => ask()} className="bg-agri-600 hover:bg-agri-700 text-white rounded-xl px-3">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-agri-600 hover:bg-agri-700 text-white shadow-lg flex items-center justify-center"
      >
        <MessageCircleQuestion size={24} />
      </button>
    </div>
  );
}
