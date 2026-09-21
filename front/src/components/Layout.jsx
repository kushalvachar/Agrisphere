import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import AIAssistantWidget from './AIAssistantWidget.jsx';
import { useVoiceNavRegistration } from './VoiceAssistWidget.jsx';

// Same nav list Navbar renders, given to the assistant so voice
// commands like "open market" work here too (Phase 1).
const demoNavItems = [
  { to: '/demo/dashboard', labelKey: 'nav.dashboard' },
  { to: '/demo/market', labelKey: 'nav.market' },
  { to: '/demo/buyers', labelKey: 'nav.buyers' },
  { to: '/demo/channels', labelKey: 'nav.channels' },
  { to: '/demo/lot', labelKey: 'nav.lot' },
  { to: '/demo/offers', labelKey: 'nav.offers' },
  { to: '/demo/transaction', labelKey: 'nav.transactions' },
  { to: '/demo/assistant', labelKey: 'nav.assistant' },
];

export default function Layout() {
  // Task 2 (Global Voice Assistant): the floating widget itself is now
  // mounted ONCE at the app root (App.jsx) so it's visible on every
  // route, not just this one. This layout only registers ITS nav items
  // + basePath into the shared voice engine while it's the active
  // layout — no farmerId on this generic /demo route, so
  // findBestMarket() in the context gracefully asks the farmer to open
  // this from their real dashboard instead.
  useVoiceNavRegistration(demoNavItems, '/demo');

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
      <AIAssistantWidget navItems={demoNavItems} />
    </div>
  );
}