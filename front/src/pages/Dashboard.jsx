import { useEffect, useState,useCallback } from 'react';
import { Sparkles, MapPin, Wheat, Warehouse, Loader2 } from 'lucide-react';
import { api } from '../api/client.js';
import StatCard from '../components/StatCard.jsx';
import RecommendationPanel from '../components/RecommendationPanel.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getLanguageMeta } from '../i18n/index.js';

export default function Dashboard() {
  const { lang } = useLanguage(); // Feature: AI Recommendation Translation — reasoning/risks come back already localized
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [bestOption, setBestOption] = useState(null);
  const [priceTrend, setPriceTrend] = useState(null);
  const [error, setError] = useState('');
  const analyzing = loading || (farmer && !recommendation && !error);

  useEffect(() => {
    api.getDemoFarmer().then((res) => setFarmer(res.farmer)).catch(() => {});
  }, []);

  useEffect(() => {
    // Keep the floating assistant grounded in whatever this page knows.
    window.__agrisphereContext = { farmer, bestOption, recommendation };
  }, [farmer, bestOption, recommendation]);

  const analyze = async (silent = false) => {
    if (!farmer) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await api.getRecommendation({
        crop: farmer.currentCrop.crop,
        quantityTonnes: farmer.currentCrop.quantityTonnes,
        grade: farmer.currentCrop.grade,
        storageAvailable: farmer.currentCrop.storageAvailable,
        language: getLanguageMeta(lang).englishName, // Feature: AI Recommendation Translation
      });
      setRecommendation(res.aiRecommendation);
      setBestOption(res.bestOption);
      setPriceTrend({ prediction: res.priceTrend30Days, daysCollected: res.daysOfRealHistoryAvailable });
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // Smart fetch: as soon as the farmer loads, kick off the best-selling-option
    // analysis right away (in parallel with rendering) instead of waiting for a click.
    if (farmer && !recommendation) analyze(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmer]);

  if (!farmer) {
    return <p className="text-slate-500">Loading demo farmer… (run <code>npm run seed</code> in backend/ if this never loads)</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Welcome back, {farmer.name}</h1>
          {[farmer.location?.village, farmer.location?.district, farmer.location?.state].some(Boolean) && (
            <p className="text-slate-500 flex items-center gap-1 text-sm mt-1">
              <MapPin size={14} /> {[farmer.location?.village, farmer.location?.district, farmer.location?.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <button onClick={() => analyze()} disabled={loading} className="btn-primary">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          Find My Best Selling Option
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Current Crop" value={farmer.currentCrop.crop} sub={`Grade ${farmer.currentCrop.grade}`} icon={Wheat} tone="agri" />
        <StatCard label="Quantity Ready" value={`${farmer.currentCrop.quantityTonnes} T`} icon={Warehouse} tone="intel" />
        <StatCard
          label="Best Net Realization"
          value={bestOption ? `₹${bestOption.breakdown.netRealization}/kg` : (analyzing ? '…' : '—')}
          sub={bestOption ? bestOption.label : (analyzing ? 'Analyzing…' : 'Run analysis to see')}
          tone="agri"
        />
        <StatCard
          label="AI Recommendation"
          value={recommendation ? recommendation.decision?.replace('_', ' ') : (analyzing ? '…' : '—')}
          sub={recommendation ? `${recommendation.confidence}% confidence` : (analyzing ? 'Analyzing…' : 'Not yet analyzed')}
          tone="warn"
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {bestOption && (
        <div className="card">
          <h2 className="font-bold text-slate-800 mb-3">Your Best Option</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 text-sm">
              <Row label="Buyer / Market" value={bestOption.label} />
              <Row label="Raw Price" value={`₹${bestOption.breakdown.rawPrice}/kg`} />
              <Row label="Transport" value={`-₹${bestOption.breakdown.transportCost}/kg`} negative />
              <Row label="Storage" value={`-₹${bestOption.breakdown.storageCost}/kg`} negative />
              <Row label="Transaction" value={`-₹${bestOption.breakdown.transactionCost}/kg`} negative />
              <div className="border-t border-slate-100 pt-2">
                <Row label="Net Realisation" value={`₹${bestOption.breakdown.netRealization}/kg`} bold />
              </div>
            </div>
            {bestOption.trust && (
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm font-semibold text-slate-700 mb-2">{bestOption.trust.label}</p>
                <p className="text-3xl font-extrabold text-agri-700">{bestOption.trust.score}/100</p>
                <ul className="text-xs text-slate-500 mt-2 space-y-1">
                  {bestOption.trust.factors.map((f, i) => <li key={i}>• {f}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <RecommendationPanel recommendation={recommendation} priceTrend={priceTrend?.prediction} daysCollected={priceTrend?.daysCollected} />
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