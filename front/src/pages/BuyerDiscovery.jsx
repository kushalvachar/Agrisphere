import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Loader2, TrendingUp } from 'lucide-react';
import { api } from '../api/client.js';
import BuyerCard from '../components/BuyerCard.jsx';
import QualityGradeModal from '../components/QualityGradeModal.jsx';
import DemandForecastPanel from '../components/DemandForecastPanel.jsx';

const CROPS = ['Tomato', 'Onion', 'Potato', 'Paddy'];
// Feature 4: institutional buyer types the farmer can filter by, alongside plain traders
const BUYER_TYPES = ['All Types', 'Trader/Aggregator', 'Processor', 'Retail Chain', 'Exporter', 'Government Agency'];

// initialCrop/initialQuantityTonnes/initialGrade let a caller seed this
// with a specific harvest — used by the Farmer role so Buyer Discovery
// (and "Run Smart Matching") reflects THAT farmer's actual crop/quantity/
// grade instead of the previous hardcoded Tomato/10T/Grade A.
export default function BuyerDiscovery({
  farmerName = 'Ramesh Kumar',
  offersPath = '/demo/offers',
  initialCrop = 'Tomato',
  initialQuantityTonnes = 10,
  initialGrade = 'A',
}) {
  const navigate = useNavigate();
  // "View Details" on the Farmer dashboard links here with ?buyer=<name>
  // for the specific buyer the farmer clicked on — used below to scroll
  // to and highlight that one buyer's card instead of leaving the farmer
  // to hunt for it in the full list.
  const [searchParams] = useSearchParams();
  const highlightBuyerName = searchParams.get('buyer');
  const highlightedCardRef = useRef(null);
  const [crop, setCrop] = useState(initialCrop);
  const [buyerType, setBuyerType] = useState('All Types');
  const [buyers, setBuyers] = useState([]);
  const [matches, setMatches] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);

  // Feature 2: Buyer Demand Forecasting
  const [forecast, setForecast] = useState(null);
  const [forecastAI, setForecastAI] = useState(null);
  const [forecastMessage, setForecastMessage] = useState('');

  useEffect(() => {
    const params = buyerType !== 'All Types' ? { crop, buyerType } : { crop };
    api.getBuyers(params).then((res) => setBuyers(res.buyers));
    setMatches(null);
    setAiExplanation(null);
  }, [crop, buyerType]);

  useEffect(() => {
    api.getDemandForecast({ crop }).then((res) => {
      setForecast(res.forecast);
      setForecastAI(res.aiExplanation);
      setForecastMessage(res.message || '');
    });
  }, [crop]);

  useEffect(() => {
    window.__agrisphereContext = {
      ...(window.__agrisphereContext || {}),
      buyerMatches: matches, aiExplanation, demandForecast: forecast,
    };
  }, [matches, aiExplanation, forecast]);

  const runMatch = async () => {
    setLoadingMatch(true);
    try {
      const res = await api.matchBuyers({ crop, quantityTonnes: initialQuantityTonnes, grade: initialGrade });
      setMatches(res.matches);
      setAiExplanation(res.aiExplanation);
    } finally {
      setLoadingMatch(false);
    }
  };

  // Feature 3: kick off a digital offer thread against a buyer's listed
  // price, then jump to the Offers tab to negotiate it.
  const createOffer = async (buyer) => {
    await api.createOffer({
      farmerName,
      buyerName: buyer.name,
      crop: buyer.cropRequired,
      grade: buyer.gradeRequired,
      quantityTonnes: Math.min(initialQuantityTonnes, buyer.quantityRequiredTonnes || initialQuantityTonnes),
      pricePerKg: buyer.offerPricePerKg,
    });
    navigate(offersPath);
  };

  const displayList = matches ? matches.map((m) => ({ ...m.buyer, matchPercent: m.matchPercent })) : buyers;

  // Once the targeted buyer's card is actually in the DOM, scroll it into
  // view. Depends on displayList.length so it re-runs after the buyers
  // for this crop finish loading (the ref isn't set on the first render).
  useEffect(() => {
    if (highlightBuyerName && highlightedCardRef.current) {
      highlightedCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightBuyerName, displayList.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Buyer Discovery & Matching</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select value={crop} onChange={(e) => setCrop(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
            {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={buyerType} onChange={(e) => setBuyerType(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
            {BUYER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={runMatch} disabled={loadingMatch} className="btn-primary">
            {loadingMatch ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            Run Smart Matching
          </button>
          <button onClick={() => setQualityOpen(true)} className="btn-secondary">Grade My Crop</button>
        </div>
      </div>

      {aiExplanation && (
        <div className="card bg-intel-50/50 border-intel-100">
          <p className="text-sm font-semibold text-intel-800 mb-1">AI Match Explanation</p>
          <p className="text-sm text-slate-700">{aiExplanation.summary}</p>
          {aiExplanation.topBuyerReasoning?.length > 0 && (
            <ul className="text-sm text-slate-600 mt-2 list-disc list-inside">
              {aiExplanation.topBuyerReasoning.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4 content-start">
          {displayList.map((b) => {
            const isHighlighted = !!highlightBuyerName && b.name === highlightBuyerName;
            return (
              <BuyerCard
                key={b._id || b.name}
                ref={isHighlighted ? highlightedCardRef : null}
                buyer={b}
                matchPercent={b.matchPercent}
                highlighted={isHighlighted}
                onViewMatch={() => {}}
                onCreateOffer={createOffer}
              />
            );
          })}
          {!displayList.length && <p className="text-slate-500 text-sm">No buyers currently seeking {crop} in this category.</p>}
        </div>
        <div>
          <DemandForecastPanel forecast={forecast} aiExplanation={forecastAI} message={forecastMessage} />
        </div>
      </div>

      <QualityGradeModal open={qualityOpen} onClose={() => setQualityOpen(false)} cropHint={crop} />
    </div>
  );
}