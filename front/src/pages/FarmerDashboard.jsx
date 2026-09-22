// pages/FarmerDashboard.jsx — Farmer role home screen.
//
// Deliberately simple: the farmer's only question is "I have produce
// ready — what should I do?". All numbers shown here come straight from
// existing deterministic endpoints (POST /api/recommendation, which
// already runs the net-realization profit maximizer — see
// backend/src/controllers/recommendationController.js). This page adds
// NO new calculations; it only translates the existing response into
// plain-language cards and badges instead of raw tables.
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MapPin, Loader2, ShieldCheck, Truck, TrendingUp, TrendingDown, Minus, Clock3 } from 'lucide-react';
import { api } from '../api/client.js';
import { useFarmer } from '../context/FarmerContext.jsx';
import { useLanguage, useTranslation } from '../context/LanguageContext.jsx';
import { getLanguageMeta } from '../i18n/index.js';
import StorageDiscovery from '../components/StorageDiscovery.jsx';

export default function FarmerDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // farmer here comes from the URL's :farmerId (see App.jsx / FarmerProvider) —
  // this is what makes the dashboard "one template, many farmers", the
  // same way a scorecard component is keyed by matchId instead of
  // hardcoding a single match.
  const { farmerId, farmer, loading: farmerLoading, error: farmerError } = useFarmer();
  const { lang } = useLanguage(); // Feature: AI Recommendation Translation
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { recommended, alternatives, why }
  const [error, setError] = useState('');

  const PRESSURE_BADGE = {
    up: { icon: TrendingUp, text: t('farmerPressureUp'), tone: 'bg-warn-50 text-warn-700' },
    down: { icon: TrendingDown, text: t('farmerPressureDown'), tone: 'bg-agri-50 text-agri-700' },
    stable: { icon: Minus, text: t('farmerPressureStable'), tone: 'bg-slate-100 text-slate-600' },
  };

  // Reset any previous farmer's recommendation when switching farmers.
  useEffect(() => { setResult(null); setError(''); }, [farmer?._id]);

  useEffect(() => {
    window.__agrisphereContext = { ...(window.__agrisphereContext || {}), farmer, farmerRecommendation: result };
  }, [farmer, result]);


  const findBestOption = useCallback(async () => {
    if (!farmer) return;
    setLoading(true); setError('');
    try {
      const { crop, quantityTonnes, grade, storageAvailable } = farmer.currentCrop;

      // Existing deterministic endpoints — reused as-is, not reimplemented.
      const [recRes, marketsRes, buyersRes] = await Promise.all([
        api.getRecommendation({ crop, quantityTonnes, grade, storageAvailable, farmerId, language: getLanguageMeta(lang).englishName }),
        api.getMarkets({ crop }),
        api.getBuyers({ crop }),
      ]);

      if (!recRes.bestOption) {
        setError(recRes.message || t('farmerNoSellingOptions'));
        setResult(null);
        return;
      }

      // Enrich each ranked option (label/type/net realization only, from
      // the recommendation endpoint) with the extra display details
      // (distance, verified, trend) already present on the matching
      // market/buyer document — no new backend logic, just a lookup.
      const enrich = (opt) => {
        if (opt.type === 'market') {
          const m = marketsRes.markets.find((x) => x.name === opt.label);
          return { ...opt, meta: m, kind: 'market' };
        }
        const b = buyersRes.buyers.find((x) => x.name === opt.label);
        return { ...opt, meta: b, kind: 'buyer' };
      };

      const recommended = enrich({ label: recRes.bestOption.label, type: recRes.bestOption.type, breakdown: recRes.bestOption.breakdown, trust: recRes.bestOption.trust });
      const alternatives = recRes.allOptions.slice(1, 4).map(enrich);

      setResult({
        recommended,
        alternatives,
        aiRecommendation: recRes.aiRecommendation,
        // Phase 2: real, dynamically-collected 30-day trend — not the AI's
        // own guess. See priceTrendService for how this is computed.
        priceTrend30Days: recRes.priceTrend30Days,
        daysOfRealHistoryAvailable: recRes.daysOfRealHistoryAvailable,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [farmer, farmerId, lang, t]);

  useEffect(() => {
  window.__runBestSellingOption = findBestOption;

  console.log(
    "Best selling option registered",
    typeof window.__runBestSellingOption
  );

  return () => {
    delete window.__runBestSellingOption;
  };
}, [findBestOption]);
  // "View Details" used to just dump the farmer on the generic Buyers
  // list/Market Intelligence tab with no indication of which option they'd
  // clicked. For a buyer option, carry that buyer's name over as a
  // ?buyer= query param so the Buyers tab can scroll to and highlight
  // that exact buyer's card instead of just showing the full list.
  const goToOptionDetails = (option) => {
    if (option.kind === 'market') {
      navigate(`/farmer/${farmerId}/market`);
    } else {
      navigate(`/farmer/${farmerId}/buyers?buyer=${encodeURIComponent(option.label)}`);
    }
  };

  if (farmerError) return <p className="text-sm text-red-500">{farmerError}</p>;
  if (farmerLoading || !farmer) return <p className="text-slate-500">{t('farmerLoadingDashboard')}</p>;

  const { crop, quantityTonnes, grade } = farmer.currentCrop;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{t('farmerWelcome')} {farmer.name.split(' ')[0]}</h1>
        <p className="text-slate-500 flex items-center gap-1 text-sm mt-1">
          <MapPin size={14} /> {farmer.location.district}, {farmer.location.state}
        </p>
      </div>

      <div className="card flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{t('farmerCurrentCrop')}</p>
          <p className="text-2xl font-extrabold text-slate-800">{crop}</p>
          <p className="text-sm text-slate-500">{quantityTonnes}T · {t('farmerGradeLabel')} {grade}</p>
        </div>
        <button onClick={findBestOption} disabled={loading} className="btn-primary text-base px-6 py-3">
          {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
          {t('farmerFindBestOption')}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {result && (
        <>
          <OptionCard option={result.recommended} highlight onDetails={() => goToOptionDetails(result.recommended)} t={t} pressureBadge={PRESSURE_BADGE} />

          <PriceTrendBadge prediction={result.priceTrend30Days} daysCollected={result.daysOfRealHistoryAvailable} t={t} />

          {result.aiRecommendation && (
            <div className="card bg-intel-50/40 border-intel-100">
              <p className="text-sm font-semibold text-intel-800 mb-2">{t('farmerWhyRecommended')}</p>
              <ul className="text-sm text-slate-700 space-y-1">
                {result.aiRecommendation.reasoning?.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
              <p className="text-[11px] text-slate-400 mt-3">{t('farmerAiDisclaimer')}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-slate-600 mb-2">{t('farmerOtherOptions')}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {result.alternatives.map((opt) => (
                <OptionCard key={opt.label} option={opt} compact onDetails={() => goToOptionDetails(opt)} t={t} pressureBadge={PRESSURE_BADGE} />
              ))}
            </div>
          </div>
        </>
      )}

      <StorageDiscovery farmerId={farmerId} />
    </div>
  );
}

function PriceTrendBadge({ prediction, daysCollected, t }) {
  if (!prediction) return null;

  if (prediction.direction === 'insufficient_data') {
    return (
      <div className="card bg-slate-50 border-slate-100 flex items-center gap-3">
        <Clock3 size={18} className="text-slate-400 shrink-0" />
        <p className="text-sm text-slate-500">{t('farmerTrackingStarted')}</p>
      </div>
    );
  }

  const STYLE = {
    rising: { Icon: TrendingUp, tone: 'bg-intel-50 border-intel-100 text-intel-800', label: t('farmerPricesRising'), hint: t('farmerHintRising') },
    falling: { Icon: TrendingDown, tone: 'bg-warn-50 border-warn-100 text-warn-800', label: t('farmerPricesFalling'), hint: t('farmerHintFalling') },
    stable: { Icon: Minus, tone: 'bg-slate-50 border-slate-100 text-slate-600', label: t('farmerPricesStable'), hint: t('farmerHintStable') },
  }[prediction.direction];
  const { Icon, tone, label, hint } = STYLE;

  return (
    <div className={`card border flex items-start gap-3 ${tone}`}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold">
          {label}
          {' '}({prediction.changePct > 0 ? '+' : ''}{prediction.changePct}% {t('farmerOverLastDays')} {daysCollected} {t('farmerRealDaysTracked')})
        </p>
        <p className="text-sm mt-0.5">{hint}</p>
        <p className="text-[11px] opacity-70 mt-1">{t('farmerBasedOnReal')}</p>
      </div>
    </div>
  );
}

function OptionCard({ option, highlight, compact, onDetails, t, pressureBadge }) {
  const { label, breakdown, meta, kind, trust } = option;
  const pressure = kind === 'market' && meta ? pressureBadge[meta.trend] : null;
  const PressureIcon = pressure?.icon;

  return (
    <div className={`card ${highlight ? 'border-2 border-agri-200' : ''}`}>
      <div className="flex items-start justify-between">
        <div>
          {highlight && <p className="text-xs font-semibold text-agri-600 mb-1">{t('farmerRecommendedOption')}</p>}
          <h3 className={`font-bold text-slate-800 ${compact ? 'text-sm' : 'text-lg'}`}>{label}</h3>
          <p className={`font-extrabold text-agri-700 ${compact ? 'text-lg' : 'text-2xl'}`}>₹{breakdown.netRealization}/kg <span className="text-xs font-normal text-slate-400">{t('farmerEstNetRealization')}</span></p>
        </div>
      </div>

      <ul className={`mt-2 space-y-1 ${compact ? 'text-xs' : 'text-sm'} text-slate-600`}>
        {meta?.distanceKm != null && <li className="flex items-center gap-1"><MapPin size={12} /> {meta.distanceKm} {t('farmerKmAway')}</li>}
        {kind === 'buyer' && meta?.verified && <li className="flex items-center gap-1"><ShieldCheck size={12} /> {t('farmerVerifiedBuyer')}</li>}
        {kind === 'buyer' && meta?.gradeRequired && <li>{t('farmerGradeLabel')} {meta.gradeRequired} {t('farmerGradeAccepted')}</li>}
        {kind === 'buyer' && <li className="flex items-center gap-1"><Truck size={12} /> {meta?.distanceKm <= 50 ? t('farmerImmediatePickup') : t('farmerPickupScheduling')}</li>}
        {pressure && <li className={`inline-flex items-center gap-1 badge ${pressure.tone} mt-1`}><PressureIcon size={12} /> {pressure.text}</li>}
        {trust && !compact && <li className="text-xs text-slate-400 mt-1">{trust.label}: {trust.score}/100</li>}
      </ul>

      {onDetails && (
        <button onClick={onDetails} className="text-sm font-semibold text-intel-700 hover:underline mt-3">
          {t('farmerViewDetails')} →
        </button>
      )}
    </div>
  );
}