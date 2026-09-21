// components/IVRWidget.jsx — Enhancement 3 (Multi-language + IVR).
// A phone-call simulator, mirroring the real IVR flow a farmer without
// a smartphone would hear over a plain voice call: pick a language,
// "dial in", press number keys to hear crop prices or buyer offers,
// spoken aloud via the browser's speech synthesis. It talks to the same
// /api/ivr endpoints a real telephony provider (Exotel/Twilio-style)
// would call into, so the phone-tree logic lives in one place
// (services/ivrService.js) whether the caller is this widget or a real
// phone line. Placed bottom-left so it never collides with the
// AI Assistant widget docked bottom-right.
import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Volume2 } from 'lucide-react';
import { api } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

function speak(text, lang) {
  if (!('speechSynthesis' in window) || !text) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang === 'hi' ? 'hi-IN' : lang === 'kn' ? 'kn-IN' : 'en-IN';
  window.speechSynthesis.speak(utter);
}

export default function IVRWidget() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [onCall, setOnCall] = useState(false);
  const [menu, setMenu] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [pendingCrop, setPendingCrop] = useState(null); // 'prices' | 'offers' | null
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [transcript]);

  const say = (text) => {
    setTranscript((t) => [...t, { from: 'ivr', text }]);
    speak(text, lang);
  };

  const startCall = async () => {
    setOnCall(true);
    setTranscript([]);
    setPendingCrop(null);
    const res = await api.getIvrMenu(lang);
    setMenu(res);
    say(res.welcomeText);
    setTimeout(() => say(res.menuText), 300);
  };

  const endCall = async () => {
    const res = await api.ivrGoodbye(lang);
    say(res.text);
    setOnCall(false);
    setMenu(null);
    setPendingCrop(null);
  };

  const press = async (key) => {
    setTranscript((t) => [...t, { from: 'user', text: `Key ${key}` }]);

    if (pendingCrop) {
      const res = pendingCrop === 'prices' ? await api.ivrPrices({ lang, crop: key }) : await api.ivrOffers({ lang, crop: key });
      say(res.text);
      setPendingCrop(null);
      return;
    }

    if (key === '1') {
      const res = await api.ivrPrices({ lang, crop: null });
      say(res.text);
      if (res.crops?.length) setPendingCrop('prices');
    } else if (key === '2') {
      const res = await api.ivrOffers({ lang, crop: null });
      say(res.text);
      if (res.crops?.length) setPendingCrop('offers');
    } else if (key === '3') {
      say(menu?.menuText || '');
    } else if (key === '9') {
      say(menu?.menuText || '');
    }
  };

  // A crop typed/tapped in response to "please say your crop" — reuses
  // the same numeric keypad's text input rather than a separate control,
  // since a real caller would just speak the crop name.
  const [cropInput, setCropInput] = useState('');
  const submitCrop = async () => {
    if (!cropInput.trim()) return;
    await press(cropInput.trim());
    setCropInput('');
  };

  return (
    <div className="fixed bottom-5 left-5 z-50">
      {open && (
        <div className="w-80 bg-white rounded-2xl shadow-xl border border-slate-200 mb-3 flex flex-col overflow-hidden">
          <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-2"><Volume2 size={16} /> Voice Helpline (IVR)</span>
            {!onCall && (
              <select value={lang} onChange={(e) => setLang(e.target.value)} className="bg-slate-700 text-xs rounded-lg px-1.5 py-1 outline-none">
                <option value="en">EN</option>
                <option value="hi">HI</option>
                <option value="kn">KN</option>
              </select>
            )}
          </div>

          <div className="p-3 h-56 overflow-y-auto space-y-2 text-sm bg-slate-50">
            {!onCall && <p className="text-slate-400 text-xs">Simulates a phone call to the AgriSphere voice helpline — for farmers without a smartphone. Pick a language, then call.</p>}
            {transcript.map((m, i) => (
              <div key={i} className={`max-w-[85%] px-3 py-2 rounded-xl ${m.from === 'user' ? 'bg-intel-50 text-intel-800 ml-auto' : 'bg-white border border-slate-200 text-slate-700'}`}>
                {m.text}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-slate-100">
            {!onCall ? (
              <button onClick={startCall} className="btn-primary w-full justify-center">
                <Phone size={16} /> Call Helpline
              </button>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-1.5">
                  {['1', '2', '3', '9'].map((k) => (
                    <button key={k} onClick={() => press(k)} className="bg-slate-100 hover:bg-slate-200 rounded-lg py-1.5 text-sm font-semibold text-slate-700">
                      {k}
                    </button>
                  ))}
                </div>
                {pendingCrop && (
                  <div className="flex gap-1.5">
                    <input
                      value={cropInput}
                      onChange={(e) => setCropInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitCrop()}
                      placeholder="Say your crop, e.g. Tomato"
                      className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none"
                    />
                    <button onClick={submitCrop} className="btn-secondary text-xs px-2">Say</button>
                  </div>
                )}
                <button onClick={endCall} className="w-full justify-center flex items-center gap-2 text-red-600 hover:bg-red-50 rounded-xl py-2 text-sm font-medium">
                  <PhoneOff size={15} /> End Call
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-14 h-14 rounded-full bg-slate-800 hover:bg-slate-900 text-white shadow-lg flex items-center justify-center"
        title="Voice Helpline"
      >
        <Phone size={22} />
      </button>
    </div>
  );
}