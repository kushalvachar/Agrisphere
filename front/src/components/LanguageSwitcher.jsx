// components/LanguageSwitcher.jsx — Phase 1: manual language override.
// Browser language is auto-detected on first load (see i18n/index.js);
// this lets the farmer switch manually at any time, and the choice is
// remembered (localStorage) for every future visit and page.
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n/index.js';

export default function LanguageSwitcher({ compact = false }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={t('language.choose')}
        className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 hover:bg-slate-100 rounded-lg px-2 py-1.5 border border-slate-200"
      >
        <Languages size={14} />
        {!compact && <span className="hidden sm:inline">{current.nativeName}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 max-h-72 overflow-y-auto">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                // localStorage.setItem(
                //   'language_manually_selected',
                //   'true'
                // );

                i18n.changeLanguage(lang.code);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 text-left"
            >
              <span>{lang.nativeName}</span>
              {lang.code === current.code && <Check size={14} className="text-agri-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
