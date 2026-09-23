// components/VoiceAssistWidget.jsx — Feature: Intelligent Multilingual
// Voice Assistant.
//
// Floating, bottom-left assistant widget. All the actual speech/intent
// engine lives in context/VoiceAssistantContext.jsx — this component is
// the UI shell: mic / speaker(mute) / stop buttons, a status indicator,
// and a short conversation log.
//
// Task 2 (Global Voice Assistant) fix: this widget is now mounted
// EXACTLY ONCE, at the app root (see App.jsx), instead of once per
// layout (previously duplicated in Layout.jsx AND RoleLayout.jsx, and
// entirely ABSENT on "/", "/farmer/select" and "/auth/:role" — any page
// that didn't happen to render one of those two layouts). A single
// root mount means the widget survives every route change and appears
// on every page, satisfying "Widget must persist during navigation" /
// "Widget state must survive route changes". Per-route nav targets and
// the current farmer profile are registered separately by whichever
// layout is active, via useVoiceNavRegistration() below, rather than as
// props on this component — so this one instance never needs to know
// which route it's currently rendered under.
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Square, Loader2 } from 'lucide-react';
import { useTranslation, useLanguage } from '../context/LanguageContext.jsx';
import { useVoiceAssistant } from '../context/VoiceAssistantContext.jsx';
import { useOptionalFarmer } from '../context/FarmerContext.jsx';

const WELCOMED_SESSION_KEY = 'agrisphere_voice_welcomed';

/**
 * Call this once from any layout/page that has a nav list and/or a
 * farmer profile to register — keeps the shared voice engine's
 * navigation targets and farmer context in sync with whichever
 * route/role is currently mounted, WITHOUT that layout having to also
 * render (and thereby duplicate) the visual widget itself.
 * @param {Array<{to:string, labelKey:string, label?:string}>} [navItems]
 * @param {string} [basePath] - route prefix for this role, e.g. `/farmer/${farmerId}`
 */
export function useVoiceNavRegistration(navItems = [], basePath = '') {
  const { setNavContext, setFarmerContext } = useVoiceAssistant();
  const farmer = useOptionalFarmer(); // null outside a FarmerProvider (fpo/buyer/demo) — handled gracefully throughout

  useEffect(() => {
    setNavContext(basePath, navItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePath, navItems, setNavContext]);

  useEffect(() => {
    setFarmerContext(farmer ? {
      farmerId: farmer.farmerId,
      name: farmer.farmer?.name,
      crop: farmer.farmer?.currentCrop?.crop,
      quantityTonnes: farmer.farmer?.currentCrop?.quantityTonnes,
      grade: farmer.farmer?.currentCrop?.grade,
      storageAvailable: farmer.farmer?.currentCrop?.storageAvailable,
    } : null);
  }, [farmer, setFarmerContext]);
}

export default function VoiceAssistWidget() {
  const { t } = useTranslation();
  const { locationReady } = useLanguage();
  const {
    status, muted, log, supported,
    contextualWelcomeMessage, suggestions, processCommand,
    speak, stop, toggleMute, startListening, stopListening, clearLog,
  } = useVoiceAssistant();
  const [open, setOpen] = useState(false);
  const bottomRef = useRef(null);
  const hasAttemptedWelcomeRef = useRef(false);

  // Task ("voice assistance should start automatically in that regional
  // language"): gated on `locationReady` (see LanguageContext.jsx)
  // instead of firing on a fixed timeout after mount. Geolocation's
  // permission prompt + the reverse-geocode round trip are both
  // unpredictable in duration and can easily exceed a hardcoded delay —
  // greeting on a fixed timer risked speaking the OLD/default language
  // welcome message before region-based detection had actually finished
  // switching the language. Waiting for `locationReady` guarantees
  // `welcomeMessage` already reflects the final language (region-
  // detected, or the visitor's own saved choice, or the plain default —
  // whichever applies) by the time this ever fires. Still attempted
  // automatically, once per browser tab (sessionStorage guard so it
  // doesn't repeat on every route change/remount — moot anyway since
  // this component itself only mounts once per tab). Browsers may block
  // audio from SpeechSynthesis until the very first user gesture on the
  // page — if that happens here, this attempt is silently a no-op, and
  // opening the widget (below) is a guaranteed-to-work user gesture that
  // retries it.
  useEffect(() => {
    if (!locationReady) return;
    if (hasAttemptedWelcomeRef.current) return;
    if (typeof window === 'undefined' || sessionStorage.getItem(WELCOMED_SESSION_KEY)) return;
    hasAttemptedWelcomeRef.current = true;
    sessionStorage.setItem(WELCOMED_SESSION_KEY, '1');
    const timer = setTimeout(() => { if (!muted) { setOpen(true); speak(contextualWelcomeMessage); } }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const isListening = status === 'listening';
  const isBusy = status === 'processing' || status === 'speaking';

  
  const handleOpen = () => {
    const willOpen = !open;
    setOpen(willOpen);
    // Guaranteed-to-work fallback for the autoplay welcome above —
    // opening the widget IS a user gesture, so speech is never blocked
    // here even if the earlier automatic attempt was.
    if (willOpen && log.length === 0 && !muted) speak(contextualWelcomeMessage);
  };

  return (
    <div className="fixed bottom-5 left-5 z-50">
      {open && (
        <div className="w-80 bg-white rounded-2xl shadow-xl border border-slate-200 mb-3 flex flex-col overflow-hidden">
          {/* Header: title + status indicator + speaker(mute)/stop controls */}
          <div className="bg-agri-700 text-white px-4 py-3 flex items-center justify-between">
            <span className="font-semibold flex items-center gap-2 text-sm">
              <Mic size={16} /> {t('voiceAssistantTitle')}
              <StatusDot status={status} />
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleMute}
                title={muted ? t('voiceUnmute') : t('voiceMute')}
                className="p-1.5 rounded-lg hover:bg-agri-600"
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <button
                onClick={stop}
                title={t('voiceStop')}
                disabled={status === 'idle'}
                className="p-1.5 rounded-lg hover:bg-agri-600 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Square size={14} />
              </button>
            </div>
          </div>

          {/* Conversation log */}
          <div className="p-3 h-56 overflow-y-auto space-y-2 text-sm bg-slate-50">
            {!log.length && (
              <p className="text-slate-400 text-xs leading-relaxed">{contextualWelcomeMessage}</p>
            )}
            {log.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] px-3 py-2 rounded-xl ${
                  m.from === 'user'
                    ? 'bg-agri-50 text-agri-800 ml-auto text-right'
                    : 'bg-white border border-slate-200 text-slate-700'
                }`}
              >
                {m.text}
              </div>
            ))}
            {status === 'processing' && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Loader2 size={12} className="animate-spin" /> {t('voiceProcessing')}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Feature: Page-Aware Voice Assistance — suggestion chips.
              Tapping one runs it through the exact same intent pipeline
              a spoken utterance would (context/VoiceAssistantContext.jsx's
              processCommand === handleUtterance), so it navigates/speaks
              identically either way. */}
          {!!suggestions?.length && (
            <div className="px-3 pt-2 pb-1 border-t border-slate-100 flex flex-wrap gap-1.5 bg-white">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => processCommand(suggestion)}
                  disabled={status === 'processing'}
                  className="text-xs px-2.5 py-1.5 rounded-full bg-agri-50 text-agri-700 border border-agri-100 hover:bg-agri-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Mic control */}
          <div className="p-3 border-t border-slate-100 space-y-2">
            {!supported ? (
              <p className="text-xs text-red-500">{t('voiceNotSupported')}</p>
            ) : (
              <>
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={status === 'processing'}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-sm transition-colors ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                      : isBusy
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-agri-600 hover:bg-agri-700 text-white'
                  }`}
                >
                  {isListening ? (
                    <><MicOff size={16} /> {t('voiceListening')}</>
                  ) : status === 'processing' ? (
                    <><Loader2 size={16} className="animate-spin" /> {t('voiceProcessing')}</>
                  ) : (
                    <><Mic size={16} /> {t('voiceTapToSpeak')}</>
                  )}
                </button>
                {log.length > 0 && (
                  <button onClick={clearLog} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1">
                    Clear
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={handleOpen}
        className={`w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center transition-colors ${
          open ? 'bg-agri-700 hover:bg-agri-800' : 'bg-agri-600 hover:bg-agri-700'
        }`}
        title={t('voiceAssistantTitle')}
      >
        {open ? <MicOff size={22} /> : <Mic size={22} />}
      </button>
    </div>
  );
}

// Assistant status indicator (spec requirement) — a small colored dot
// next to the title, distinct from the big mic button's own state
// styling, so status is visible even while the panel is scrolled.
function StatusDot({ status }) {
  const color = {
    idle: 'bg-agri-300',
    listening: 'bg-red-400 animate-pulse',
    processing: 'bg-amber-300 animate-pulse',
    speaking: 'bg-sky-300 animate-pulse',
  }[status] || 'bg-agri-300';
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} title={status} />;
}