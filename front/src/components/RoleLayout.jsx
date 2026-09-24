// components/RoleLayout.jsx
// Shared chrome for the three role-based experiences (Farmer/FPO/Buyer).
// Deliberately mirrors Layout.jsx + Navbar.jsx (same header height, card
// styles, AI assistant widget) so the role pages feel like part of the
// same product, just with a role-specific nav and a "Switch Role" link
// back to "/" instead of the full all-in-one nav.
//
// Phase 1: nav items carry a translation key (labelKey) instead of a
// literal English label, so switching the app language updates every
// role's navigation instantly. A LanguageSwitcher sits next to
// "Switch Role".
//
// Task 2 (Global Voice Assistant): the floating voice widget itself is
// mounted ONCE at the app root (App.jsx), not here — this layout only
// registers its own nav items/basePath into the shared voice engine
// (useVoiceNavRegistration) so voice commands like "open market" still
// resolve correctly while a Farmer/FPO/Buyer route is active.
import { useState } from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, ArrowLeftRight, Menu, X } from 'lucide-react';
import AIAssistantWidget from './AIAssistantWidget.jsx';
import { useVoiceNavRegistration } from './VoiceAssistWidget.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import UserDetailsCard from './UserDetailsCard.jsx';

const ROLE_BADGE_KEY = {
  farmer: 'roleBadge.farmer',
  fpo: 'roleBadge.fpo',
  buyer: 'roleBadge.buyer',
};

export default function RoleLayout({ role, basePath, navItems }) {
  const { t } = useTranslation();
  const badgeKey = ROLE_BADGE_KEY[role];
  // Below md the pill-nav is hidden, so this drawer is the only way to
  // switch tabs on a phone — without it mobile visitors couldn't reach
  // any page but the one they landed on.
  const [mobileOpen, setMobileOpen] = useState(false);

  useVoiceNavRegistration(navItems, basePath);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <Link to={basePath} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-agri-600 flex items-center justify-center">
                <Sprout size={20} className="text-white" />
              </div>
              <span className="font-extrabold text-lg text-slate-800 tracking-tight hidden sm:inline">{t('app.name')}</span>
            </Link>
            {badgeKey && <span className="badge bg-agri-50 text-agri-700">{t(badgeKey)}</span>}
          </div>

          <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
            {navItems.map(({ to, labelKey, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === basePath}
                className={({ isActive }) =>
                  `pill-nav flex items-center gap-1.5 whitespace-nowrap ${
                    isActive ? 'bg-agri-50 text-agri-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Icon size={16} /> {labelKey ? t(labelKey) : label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <LanguageSwitcher compact />
            </div>
            {/* "Add user" — opens the account details card for this role
                (edit + sign out are fpo/buyer only, see UserDetailsCard.jsx) */}
            <UserDetailsCard role={role} />
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
            {navItems.map(({ to, labelKey, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === basePath}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive ? 'bg-agri-50 text-agri-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                <Icon size={18} /> {labelKey ? t(labelKey) : label}
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
      <AIAssistantWidget navItems={navItems.map((n) => ({ to: n.to, labelKey: n.labelKey, label: n.label }))} />
    </div>
  );
}