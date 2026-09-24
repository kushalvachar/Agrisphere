import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sprout, LayoutDashboard, LineChart, Users, Boxes, Truck, MessagesSquare,
  Layers, Handshake, ArrowLeftRight, Menu, X,
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher.jsx';

// Nav for the preserved all-in-one "Existing Full Dashboard / Demo View"
// (see App.jsx: everything here is now mounted under /demo). Untouched
// otherwise — this is the original nav, just re-pathed. Phase 1: labels
// are translation keys so this nav also responds to the language switcher.
const links = [
  { to: '/demo/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/demo/market', labelKey: 'nav.market', icon: LineChart },
  { to: '/demo/buyers', labelKey: 'nav.buyers', icon: Users },
  { to: '/demo/channels', labelKey: 'nav.channels', icon: Layers },     // Feature 5
  { to: '/demo/lot', labelKey: 'nav.lot', icon: Boxes },
  { to: '/demo/offers', labelKey: 'nav.offers', icon: Handshake },      // Feature 3
  { to: '/demo/transaction', labelKey: 'nav.transactions', icon: Truck },
  { to: '/demo/assistant', labelKey: 'nav.assistant', icon: MessagesSquare },
];

export default function Navbar() {
  const { t } = useTranslation();
  // Below the md breakpoint the pill-nav is hidden (no room for 8 items),
  // so this drawer is the only way to reach other pages on a phone —
  // without it, mobile visitors were stuck on whatever page they landed on.
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <NavLink to="/demo/dashboard" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-agri-600 flex items-center justify-center">
            <Sprout size={20} className="text-white" />
          </div>
          <span className="font-extrabold text-lg text-slate-800 tracking-tight">{t('app.name')}</span>
        </NavLink>

        <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
          {links.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `pill-nav flex items-center gap-1.5 whitespace-nowrap ${
                  isActive ? 'bg-agri-50 text-agri-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon size={16} /> {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block">
            <LanguageSwitcher compact />
          </div>
          <Link to="/" className="hidden md:flex text-xs text-slate-400 hover:text-slate-600 items-center gap-1">
            <ArrowLeftRight size={13} /> {t('common.switchRole')}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden p-2 -mr-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-slate-200 px-4 py-3 space-y-1 bg-white">
          {links.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium ${
                  isActive ? 'bg-agri-50 text-agri-700' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon size={18} /> {t(labelKey)}
            </NavLink>
          ))}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 px-3">
            <LanguageSwitcher compact menuPlacement="above-left" />
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <ArrowLeftRight size={13} /> {t('common.switchRole')}
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}