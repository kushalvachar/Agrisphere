import { Routes, Route, Navigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, LineChart, Users, Boxes, Truck, MessagesSquare, Layers, Handshake, ClipboardList, Search, TrendingUp, ArrowLeft, BarChart3, Flame } from 'lucide-react';
import { FarmerProvider, useFarmer, getRememberedFarmerId } from './context/FarmerContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Auth from './pages/Auth.jsx';

// --- Shared chrome ---
import Layout from './components/Layout.jsx';           // existing all-in-one layout — unchanged
import RoleLayout from './components/RoleLayout.jsx';    // new — shared chrome for the 3 role experiences

// Task 2 (Global Voice Assistant): mounted ONCE here, outside <Routes>,
// so it renders on every page in the app — including "/" (RoleSelection),
// "/farmer/select" and "/auth/:role", which previously had NO voice
// widget at all because it used to be mounted separately inside
// Layout.jsx and RoleLayout.jsx only. Being outside <Routes> means it
// never unmounts/remounts on navigation, so its own open/closed UI
// state (and the shared VoiceAssistantContext engine state it reads —
// conversation log, mute, status) survives every route change.
import VoiceAssistWidget, { useVoiceNavRegistration } from './components/VoiceAssistWidget.jsx';

// --- Entry points ---
import RoleSelection from './pages/RoleSelection.jsx';   // new default entry point ("/")
import Landing from './pages/Landing.jsx';               // kept as the intro splash for /demo

// --- Existing all-in-one pages (unchanged, now mounted under /demo) ---
import Dashboard from './pages/Dashboard.jsx';
import MarketIntelligence from './pages/MarketIntelligence.jsx';
import BuyerDiscovery from './pages/BuyerDiscovery.jsx';
import FPOLot from './pages/FPOLot.jsx';
import TransactionTracking from './pages/Transaction.jsx';
import AIAssistant from './pages/AIAssistant.jsx';
import OfferNegotiation from './pages/OfferNegotiation.jsx';
import MultiChannelComparison from './pages/MultiChannelComparison.jsx';

// --- New role-specific dashboards ---
import FarmerSelect from './pages/FarmerSelect.jsx';      // "which farmer's dashboard?" picker
import FarmerDashboard from './pages/FarmerDashboard.jsx';
import FPODashboard, { FPO_NAME } from './pages/FPODashboard.jsx';
import BuyerDashboard, { BUYER_NAME } from './pages/BuyerDashboard.jsx';
import BuyerRequirements from './pages/BuyerRequirements.jsx';
import BuyerFindProduce from './pages/BuyerFindProduce.jsx';
import BuyerForecast from './pages/BuyerForecast.jsx';
import Analytics from './pages/Analytics.jsx';
import OpportunityMap from './components/OpportunityMap.jsx';

// Phase 1: labelKey (translation key) instead of a literal English
// label — RoleLayout/AIAssistantWidget translate it at render time so
// switching the app language updates every role's nav instantly.
const demoNav = [
  { to: '/demo/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/demo/market', labelKey: 'nav.market', icon: LineChart },
  { to: '/demo/buyers', labelKey: 'nav.buyers', icon: Users },
  { to: '/demo/channels', labelKey: 'nav.channels', icon: Layers },
  { to: '/demo/lot', labelKey: 'nav.lot', icon: Boxes },
  { to: '/demo/offers', labelKey: 'nav.offers', icon: Handshake },
  { to: '/demo/transaction', labelKey: 'nav.transactions', icon: Truck },
  { to: '/demo/assistant', labelKey: 'nav.assistant', icon: MessagesSquare },
];

const fpoNav = [
  { to: '/fpo', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/fpo/lot', labelKey: 'nav.lot', icon: Boxes },
  { to: '/fpo/buyers', labelKey: 'nav.buyers', icon: Users },
  { to: '/fpo/offers', labelKey: 'nav.offers', icon: Handshake },
  { to: '/fpo/transactions', labelKey: 'nav.transactions', icon: Truck },
  { to: '/fpo/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { to: '/fpo/assistant', labelKey: 'nav.assistant', icon: MessagesSquare },
];

const buyerNav = [
  { to: '/buyer', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/buyer/requirements', labelKey: 'nav.requirements', icon: ClipboardList },
  { to: '/buyer/find-produce', labelKey: 'nav.findProduce', icon: Search },
  { to: '/buyer/forecast', labelKey: 'nav.forecast', icon: TrendingUp },
  { to: '/buyer/transactions', labelKey: 'nav.transactions', icon: Truck },
  { to: '/buyer/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { to: '/buyer/assistant', labelKey: 'nav.assistant', icon: MessagesSquare },
];

// /farmer (no id) — same idea as landing on a sports app with no match
// selected: if we already know which farmer this browser was looking
// at, go straight back to their dashboard; otherwise send them to pick
// one, like choosing a match before its scorecard.
function FarmerEntry() {
  const remembered = getRememberedFarmerId();
  return <Navigate to={remembered ? `/farmer/${remembered}` : '/farmer/select'} replace />;
}

// Simple chrome around the picker so it doesn't feel orphaned.
function FarmerSelectShell() {
  const { t } = useTranslation();
  // Task 2: register an (empty) nav context here too so the globally-
  // mounted voice widget behaves sensibly on this page instead of still
  // carrying over whichever role's nav list was registered last.
  useVoiceNavRegistration([], '/farmer/select');
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 h-16 flex items-center px-4 sm:px-6">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5">
          <ArrowLeft size={15} /> {t('common.back')}
        </Link>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <FarmerSelect />
      </main>
    </div>
  );
}

// /farmer/:farmerId/* — everything the Farmer role shows is scoped to
// this one farmerId via FarmerProvider (context), and the nav links are
// built with that id baked in so switching tabs stays on the same
// farmer. This is the "one dashboard template, many farmers" piece.
function FarmerRoleShell() {
  const { farmerId } = useParams();
  const base = `/farmer/${farmerId}`;
  const navItems = [
    { to: base, labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { to: `${base}/market`, labelKey: 'nav.market', icon: LineChart },
    { to: `${base}/buyers`, labelKey: 'nav.buyers', icon: Users },
    { to: `${base}/transactions`, labelKey: 'nav.transactions', icon: Truck },
    { to: `${base}/offers`, labelKey: 'nav.offers', icon: Handshake },
    { to: `${base}/analytics`, labelKey: 'nav.analytics', icon: BarChart3 },
    { to: `${base}/opportunities`, labelKey: 'nav.opportunities', icon: Flame },
    { to: `${base}/assistant`, labelKey: 'nav.assistant', icon: MessagesSquare },
  ];
  return (
    <FarmerProvider farmerId={farmerId}>
      <RoleLayout role="farmer" basePath={base} navItems={navItems} />
    </FarmerProvider>
  );
}

// Downstream pages (BuyerDiscovery/OfferNegotiation/TransactionTracking)
// take a farmerName prop rather than an id — they're shared with FPO/
// Buyer roles too — so these small wrappers pull the CURRENT farmer's
// name out of context instead of a literal "Ramesh Kumar" string.
// Market Intelligence isn't shared with other roles the way Buyers/
// Offers/Transactions are, but it still shouldn't always open on
// Tomato — seed it with the current farmer's actual harvest crop.
// Guarded on `farmer` being loaded first: initialCrop is only read once
// (useState initializer), so mounting it before the farmer loads would
// permanently seed it as undefined.
function FarmerScopedMarketIntelligence() {
  const { farmerId, farmer, loading } = useFarmer();
  if (loading || !farmer) return <p className="text-slate-500">Loading market data…</p>;
  return <MarketIntelligence key={farmerId} initialCrop={farmer.currentCrop?.crop} farmerId={farmerId} />;
}
function FarmerScopedBuyerDiscovery() {
  const { farmerId, farmer, loading } = useFarmer();
  if (loading || !farmer) return <p className="text-slate-500">Loading buyers…</p>;
  const crop = farmer.currentCrop || {};
  return (
    <BuyerDiscovery
      key={farmerId}
      farmerName={farmer.name}
      offersPath={`/farmer/${farmerId}/offers`}
      initialCrop={crop.crop}
      initialQuantityTonnes={crop.quantityTonnes}
      initialGrade={crop.grade}
    />
  );
}
function FarmerScopedOfferNegotiation() {
  const { farmerId, farmer, loading } = useFarmer();
  if (loading || !farmer) return <p className="text-slate-500">Loading offers…</p>;
  return <OfferNegotiation key={farmerId} filterKey="farmerName" filterValue={farmer.name} counterAs="farmer" />;
}
function FarmerScopedTransactions() {
  const { farmerId, farmer, loading } = useFarmer();
  if (loading || !farmer) return <p className="text-slate-500">Loading transactions…</p>;
  return <TransactionTracking key={farmerId} filterFarmerName={farmer.name} />;
}

// Phase 5: FPO/Buyer identity now comes from the real authenticated
// account (useAuth().displayName) instead of the old shared hardcoded
// FPO_NAME/BUYER_NAME demo constants — each registered FPO/buyer sees
// only their own buyers/offers/transactions. The constants remain as a
// fallback only for the brief moment before the profile is loaded.
function FPOScopedBuyerDiscovery() {
  const { displayName } = useAuth();
  return <BuyerDiscovery farmerName={displayName || FPO_NAME} offersPath="/fpo/offers" />;
}
function FPOScopedOfferNegotiation() {
  const { displayName } = useAuth();
  return <OfferNegotiation filterKey="farmerName" filterValue={displayName || FPO_NAME} counterAs="farmer" />;
}
function FPOScopedTransactions() {
  const { displayName } = useAuth();
  const name = displayName || FPO_NAME;
  return (
    <TransactionTracking
      filterFarmerName={name}
      demoTransactionDefaults={{ farmerName: name, buyerName: 'ABC Foods (Demo)', crop: 'Tomato', quantityTonnes: 10, agreedPricePerKg: 24, netRealizationPerKg: 21.6 }}
    />
  );
}
function BuyerScopedTransactions() {
  const { displayName } = useAuth();
  const name = displayName || BUYER_NAME;
  return (
    <TransactionTracking
      filterBuyerName={name}
      demoTransactionDefaults={{ farmerName: 'Ramesh Kumar', buyerName: name, crop: 'Tomato', quantityTonnes: 10, agreedPricePerKg: 24, netRealizationPerKg: 21.6 }}
    />
  );
}

export default function App() {
  return (
    <>
    <Routes>
      {/* New default entry point */}
      <Route path="/" element={<RoleSelection />} />

      {/* Existing all-in-one dashboard — fully preserved, just moved under /demo */}
      <Route path="/demo" element={<Layout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="intro" element={<Landing />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="market" element={<MarketIntelligence />} />
        <Route path="buyers" element={<BuyerDiscovery farmerName="Ramesh Kumar" offersPath="/demo/offers" />} />
        <Route path="channels" element={<MultiChannelComparison />} />
        <Route path="lot" element={<FPOLot />} />
        <Route path="offers" element={<OfferNegotiation filterKey="farmerName" filterValue="Ramesh Kumar" counterAs="farmer" />} />
        <Route path="transaction" element={<TransactionTracking />} />
        <Route path="assistant" element={<AIAssistant role="farmer" />} />
      </Route>

      {/* Farmer role: decision-oriented — "what should I do?"
          /farmer redirects to either the last-viewed farmer or the
          picker; /farmer/:farmerId is that one farmer's full dashboard —
          same shape for every farmer, scorecard-style. */}
      <Route path="/farmer" element={<FarmerEntry />} />
      <Route path="/farmer/select" element={<FarmerSelectShell />} />
      <Route path="/farmer/:farmerId" element={<FarmerRoleShell />}>
        <Route index element={<FarmerDashboard />} />
        <Route path="market" element={<FarmerScopedMarketIntelligence />} />
        <Route path="buyers" element={<FarmerScopedBuyerDiscovery />} />
        <Route path="offers" element={<FarmerScopedOfferNegotiation />} />
        <Route path="transactions" element={<FarmerScopedTransactions />} />
        <Route path="analytics" element={<Analytics role="farmer" />} />
        <Route path="opportunities" element={<OpportunityMap />} />
        <Route path="assistant" element={<AIAssistant role="farmer" />} />
      </Route>

      {/* Phase 5: Authentication */}
      <Route path="/auth/:role" element={<Auth />} />

      {/* FPO role: aggregation-oriented — "how can we combine and sell our produce?" */}
      <Route path="/fpo" element={<RequireAuth role="fpo"><RoleLayout role="fpo" basePath="/fpo" navItems={fpoNav} /></RequireAuth>}>
        <Route index element={<FPODashboard />} />
        <Route path="lot" element={<FPOLot />} />
        <Route path="buyers" element={<FPOScopedBuyerDiscovery />} />
        <Route path="offers" element={<FPOScopedOfferNegotiation />} />
        <Route path="transactions" element={<FPOScopedTransactions />} />
        <Route path="analytics" element={<Analytics role="fpo" />} />
        <Route path="assistant" element={<AIAssistant role="fpo" />} />
      </Route>

      {/* Buyer role: procurement-oriented — "how do I source the right produce?"
          Note: no Offers tab here by design — an offer a Buyer makes is
          attributed to the FPO or Farmer identity it was made against, and
          is negotiated from THEIR Offers tab, not the Buyer's. */}
      <Route path="/buyer" element={<RequireAuth role="buyer"><RoleLayout role="buyer" basePath="/buyer" navItems={buyerNav} /></RequireAuth>}>
        <Route index element={<BuyerDashboard />} />
        <Route path="requirements" element={<BuyerRequirements />} />
        <Route path="find-produce" element={<BuyerFindProduce />} />
        <Route path="forecast" element={<BuyerForecast />} />
        <Route path="transactions" element={<BuyerScopedTransactions />} />
        <Route path="analytics" element={<Analytics role="buyer" />} />
        <Route path="assistant" element={<AIAssistant role="buyer" />} />
      </Route>
    </Routes>
    {/* Task 2 (Global Voice Assistant): single global mount — see the
        import comment above for why this lives outside <Routes>. */}
    <VoiceAssistWidget />
    </>
  );
}