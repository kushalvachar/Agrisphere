// pages/FPODashboard.jsx — FPO role home screen.
//
// Aggregation-oriented: "how can we combine and sell our produce?".
// Overview numbers are derived from real Lot/Offer documents already
// returned by existing endpoints (GET /api/lots, GET /api/offers) — not
// invented — so the dashboard stays honest even before an FPO has any
// activity yet (it will simply show zeros).
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Users2, Package, Handshake, ArrowRight, Receipt } from 'lucide-react';
import { api } from '../api/client.js';
import StatCard from '../components/StatCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../context/LanguageContext.jsx';

export const FPO_NAME = 'Kolar Tomato Producers FPO'; // fallback only — see useAuth().displayName below
const CROP = 'Tomato'; // demo FPO deals primarily in Tomato, matching the seeded Smart Lot story

export default function FPODashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { displayName, profile } = useAuth();
  // Phase 5: every registered FPO sees its OWN offers/transactions, not
  // a shared demo identity — RequireAuth guarantees `profile` is set by
  // the time this renders, so the FPO_NAME fallback here is defensive
  // only (e.g. a fast render before context settles).
  const fpoName = displayName || FPO_NAME;
  const [lots, setLots] = useState([]);
  const [offers, setOffers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [settlementTxId, setSettlementTxId] = useState('');

  const load = () => {
    api.listLots({ crop: CROP }).then((res) => setLots(res.lots || []));
    api.listOffers({ farmerName: fpoName }).then((res) => setOffers(res.offers || []));
    api.listTransactions().then((res) => setTransactions((res.transactions || []).filter((t) => t.farmerName === fpoName)));
  };
  useEffect(() => { load(); }, [fpoName]);

  useEffect(() => {
    window.__agrisphereContext = { ...(window.__agrisphereContext || {}), fpoLots: lots, fpoOffers: offers };
  }, [lots, offers]);

  const activeFarmers = new Set(lots.flatMap((l) => l.contributions.map((c) => c.farmerName))).size;
  const produceAvailable = lots.reduce((sum, l) => sum + (l.totalQuantityTonnes || 0), 0);
  const activeLots = lots.length;
  const pendingOffers = offers.filter((o) => o.status === 'PENDING' || o.status === 'COUNTERED').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{fpoName}</h1>
          {profile?.verificationStatus && (
            <span className={`badge mt-1 ${profile.verificationStatus === 'verified' ? 'bg-agri-50 text-agri-700' : 'bg-warn-50 text-warn-700'}`}>
              {profile.verificationStatus === 'verified' ? t('fpoVerified') : t('fpoPendingVerification')}
            </span>
          )}
          <p className="text-slate-500 text-sm mt-1">{t('fpoTagline')}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('fpoActiveFarmers')} value={activeFarmers} sub={t('fpoActiveFarmersSub')} icon={Users2} tone="agri" />
        <StatCard label={t('fpoProduceAvailable')} value={`${produceAvailable} T`} sub={CROP} icon={Package} tone="intel" />
        <StatCard label={t('fpoActiveSmartLots')} value={activeLots} icon={Boxes} tone="agri" />
        <StatCard label={t('fpoPendingOffers')} value={pendingOffers} icon={Handshake} tone="warn" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <ActionCard title={t('fpoCreateLotsTitle')} desc={t('fpoCreateLotsDesc')} onClick={() => navigate('/fpo/lot')} t={t} />
        <ActionCard title={t('fpoBuyerMatchesTitle')} desc={t('fpoBuyerMatchesDesc')} onClick={() => navigate('/fpo/buyers')} t={t} />
        <ActionCard title={t('fpoOffersTitle')} desc={t('fpoOffersDesc')} onClick={() => navigate('/fpo/offers')} t={t} />
      </div>

      {lots.length > 0 && (
        <div className="card">
          <h2 className="font-bold text-slate-800 mb-3">{t('fpoCurrentLots')}</h2>
          <ul className="divide-y divide-slate-100">
            {lots.map((l) => (
              <li key={l._id} className="py-2 flex items-center justify-between text-sm">
                <span>{l.crop} · {l.totalQuantityTonnes}T · {t('fpoGradeLabel')} {l.grade} · {l.contributions.length} {t('fpoFarmersSuffix')}</span>
                <span className="badge bg-slate-100 text-slate-600">{l.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {transactions.length > 0 && (
        <SettlementView
          transactions={transactions}
          lots={lots}
          selectedId={settlementTxId}
          onSelect={setSettlementTxId}
          t={t}
        />
      )}
    </div>
  );
}

// Settlement is computed purely from fields the Transaction model already
// stores (quantityTonnes, agreedPricePerKg, netRealizationPerKg) — no new
// backend calculation is added. Per-farmer share is a simple proportional
// split against a matching Lot's real contribution ratios, shown only
// when a lot with the same quantity is available to link against.
function SettlementView({ transactions, lots, selectedId, onSelect, t }) {
  const tx = transactions.find((t) => t._id === selectedId) || transactions[0];
  const matchingLot = lots.find((l) => l.totalQuantityTonnes === tx.quantityTonnes && l.crop === tx.crop);

  const totalSaleValue = Math.round(tx.quantityTonnes * 1000 * tx.agreedPricePerKg);
  const netSettlement = Math.round(tx.quantityTonnes * 1000 * tx.netRealizationPerKg);
  const costsDeducted = totalSaleValue - netSettlement;

  return (
    <div className="card">
      <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Receipt size={18} className="text-intel-600" /> {t('fpoSettlementSummary')}</h2>
      <select value={tx._id} onChange={(e) => onSelect(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm mb-4">
        {transactions.map((tItem) => (
          <option key={tItem._id} value={tItem._id}>{tItem.crop} — {tItem.quantityTonnes}T → {tItem.buyerName} ({tItem.status})</option>
        ))}
      </select>

      <div className="space-y-1 text-sm max-w-sm">
        <Row label={t('fpoTotalSaleValue')} value={`₹${totalSaleValue.toLocaleString('en-IN')}`} />
        <Row label={t('fpoCostsDeducted')} value={`-₹${costsDeducted.toLocaleString('en-IN')}`} negative />
        <div className="border-t border-slate-200 pt-1">
          <Row label={t('fpoNetSettlement')} value={`₹${netSettlement.toLocaleString('en-IN')}`} bold />
        </div>
      </div>

      {matchingLot ? (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-2">{t('fpoContributionsHeading')}</p>
          <ul className="text-sm space-y-1">
            {matchingLot.contributions.map((c) => {
              const share = c.quantityTonnes / matchingLot.totalQuantityTonnes;
              return (
                <li key={c.farmerName} className="flex justify-between">
                  <span>{c.farmerName} ({c.quantityTonnes}T)</span>
                  <span className="font-semibold text-agri-700">₹{Math.round(netSettlement * share).toLocaleString('en-IN')}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-slate-400 mt-3">{t('fpoNoMatchingLot')}</p>
      )}
    </div>
  );
}

function Row({ label, value, negative, bold }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`${bold ? 'font-extrabold text-agri-700' : 'font-medium'} ${negative ? 'text-red-500' : 'text-slate-800'}`}>{value}</span>
    </div>
  );
}

function ActionCard({ title, desc, onClick, t }) {
  return (
    <button onClick={onClick} className="card text-left hover:shadow-md transition-shadow">
      <h3 className="font-bold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 mt-1">{desc}</p>
      <span className="text-sm font-semibold text-intel-700 flex items-center gap-1 mt-3">{t('actionCardOpen')} <ArrowRight size={14} /></span>
    </button>
  );
}