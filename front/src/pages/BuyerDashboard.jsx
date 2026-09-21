// pages/BuyerDashboard.jsx — Buyer role home screen.
//
// Procurement-oriented: "how do I source the right produce at the right
// price?". Reuses GET /api/buyers (filtered by this buyer's name), GET
// /api/offers, and GET /api/transactions — no new backend calculations.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Handshake, Boxes, Truck, ArrowRight } from 'lucide-react';
import { api } from '../api/client.js';
import StatCard from '../components/StatCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTranslation } from '../context/LanguageContext.jsx';

export const BUYER_NAME = 'ABC Foods (Demo)'; // fallback only — see useAuth().displayName below

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { displayName, profile } = useAuth();
  const buyerName = displayName || BUYER_NAME; // Phase 5: real per-account identity
  const [requirements, setRequirements] = useState([]);
  const [offers, setOffers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [lotsSeen, setLotsSeen] = useState(0);

  useEffect(() => {
    api.getBuyers({ name: buyerName }).then((res) => setRequirements(res.buyers || []));
    api.listOffers({ buyerName }).then((res) => setOffers(res.offers || []));
    api.listTransactions().then((res) => setTransactions((res.transactions || []).filter((t) => t.buyerName === buyerName)));
    api.listLots({}).then((res) => setLotsSeen((res.lots || []).length));
  }, [buyerName]);

  useEffect(() => {
    window.__agrisphereContext = { ...(window.__agrisphereContext || {}), buyerRequirements: requirements, buyerOffers: offers };
  }, [requirements, offers]);

  const pendingOffers = offers.filter((o) => o.status === 'PENDING' || o.status === 'COUNTERED').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('buyerWelcome')} {buyerName}</h1>
        {profile?.verificationStatus && (
          <span className={`badge mt-1 ${profile.verificationStatus === 'verified' ? 'bg-agri-50 text-agri-700' : 'bg-warn-50 text-warn-700'}`}>
            {profile.verificationStatus === 'verified' ? t('buyerKycVerified') : t('buyerKycPending')}
          </span>
        )}
        <p className="text-slate-500 text-sm mt-1">{t('buyerTagline')}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('buyerActiveRequirements')} value={requirements.length} icon={ClipboardList} tone="warn" />
        <StatCard label={t('buyerPendingOffers')} value={pendingOffers} icon={Handshake} tone="intel" />
        <StatCard label={t('buyerSmartLotsAvailable')} value={lotsSeen} icon={Boxes} tone="agri" />
        <StatCard label={t('buyerActiveTransactions')} value={transactions.length} icon={Truck} tone="agri" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <ActionCard title={t('buyerPostRequirementTitle')} desc={t('buyerPostRequirementDesc')} onClick={() => navigate('/buyer/requirements')} t={t} />
        <ActionCard title={t('buyerFindProduceTitle')} desc={t('buyerFindProduceDesc')} onClick={() => navigate('/buyer/find-produce')} t={t} />
        <ActionCard title={t('buyerForecastTitle')} desc={t('buyerForecastDesc')} onClick={() => navigate('/buyer/forecast')} t={t} />
      </div>

      <div className="card">
        <h2 className="font-bold text-slate-800 mb-3">{t('buyerRequirementsHeading')}</h2>
        {requirements.length ? (
          <ul className="divide-y divide-slate-100">
            {requirements.map((r) => {
              const received = transactions
                .filter((t) => t.crop === r.cropRequired)
                .reduce((sum, t) => sum + t.quantityTonnes, 0);
              const remaining = Math.max(0, r.quantityRequiredTonnes - received);
              return (
                <li key={r._id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{r.cropRequired} — {t('fpoGradeLabel')} {r.gradeRequired}</span>
                    <span className="text-xs text-slate-400">{t('buyerRequiredBy')} {r.requiredByDate ? new Date(r.requiredByDate).toLocaleDateString() : '—'}</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {t('buyerRequired')}: {r.quantityRequiredTonnes}T · {t('buyerReceived')}: {received}T · {t('buyerRemaining')}: {remaining}T · {t('buyerTarget')}: ₹{r.offerPricePerKg}/kg
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">{t('buyerNoRequirements')}</p>
        )}
      </div>
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