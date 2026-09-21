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
import { NavLink, Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sprout, ArrowLeftRight } from 'lucide-react';
import AIAssistantWidget from './AIAssistantWidget.jsx';
import { useVoiceNavRegistration } from './VoiceAssistWidget.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

const ROLE_BADGE_KEY = {
  farmer: 'roleBadge.farmer',
  fpo: 'roleBadge.fpo',
  buyer: 'roleBadge.buyer',
};

export default function RoleLayout({ role, basePath, navItems }) {
  const { t } = useTranslation();
  const badgeKey = ROLE_BADGE_KEY[role];

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
            <LanguageSwitcher compact />
            <Link to="/" className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
              <ArrowLeftRight size={13} /> {t('common.switchRole')}
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
      <AIAssistantWidget navItems={navItems.map((n) => ({ to: n.to, labelKey: n.labelKey, label: n.label }))} />
    </div>
  );
}