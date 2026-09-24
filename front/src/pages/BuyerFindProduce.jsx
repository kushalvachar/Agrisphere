// pages/BuyerFindProduce.jsx — buyer discovers BOTH FPO Smart Lots and
// standalone individual farmer produce, ranked together in one list.
//
// Uses two deterministic, architecturally-identical endpoints —
// POST /api/lots/match and POST /api/farmers/match — which both reuse
// the same crop/quantity/grade compatibility scoring (see
// backend/src/services/matchingService.js: matchLotsToBuyerRequirement
// and matchFarmersToBuyerRequirement). No new ranking algorithm.
//
// Offer attribution matters here: an offer against a Smart Lot is
// attributed to the FPO's name, and an offer against an individual
// farmer's produce is attributed to that farmer's actual name — so it
// shows up in the correct party's Offers tab (FPO or Farmer), never the
// Buyer's (the Buyer role has no Offers tab by design).
import { useEffect, useState } from 'react';
import { Search, Boxes, User } from 'lucide-react';
import { api } from '../api/client.js';
import { BUYER_NAME } from './BuyerDashboard.jsx';
import { FPO_NAME } from './FPODashboard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const CROPS = ['Tomato', 'Onion', 'Potato', 'Paddy'];

export default function BuyerFindProduce() {
  const { displayName } = useAuth();
  const buyerName = displayName || BUYER_NAME; // Phase 5: real per-account identity
  const [crop, setCrop] = useState('Tomato');
  const [quantityRequiredTonnes, setQuantityRequiredTonnes] = useState(10);
  const [gradeRequired, setGradeRequired] = useState('A');
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');

  const search = async () => {
    const requirement = { crop, quantityRequiredTonnes: Number(quantityRequiredTonnes), gradeRequired };
    const [lotRes, farmerRes] = await Promise.all([
      api.matchLotsForBuyer(requirement),
      api.matchFarmersForBuyer(requirement),
    ]);

    const lotResults = (lotRes.matches || []).map((m) => ({ kind: 'lot', matchPercent: m.matchPercent, data: m.lot }));
    const farmerResults = (farmerRes.matches || []).map((m) => ({ kind: 'farmer', matchPercent: m.matchPercent, data: m.farmer }));

    const merged = [...lotResults, ...farmerResults].sort((a, b) => b.matchPercent - a.matchPercent);
    setResults(merged);
    setMessage(!merged.length ? (lotRes.message || farmerRes.message || 'No produce matched your search.') : '');
  };

  useEffect(() => { search(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.__agrisphereContext = { ...(window.__agrisphereContext || {}), produceMatches: results };
  }, [results]);

  const makeOffer = async (item) => {
    if (item.kind === 'lot') {
      const lot = item.data;
      const lotFpoName = lot.fpoName || FPO_NAME; // older lots saved before FPO names were stored fall back to the demo FPO
      await api.createOffer({
        lotId: lot._id,
        farmerName: lotFpoName, // attributes the offer to the FPO that owns this Smart Lot
        buyerName: buyerName,
        crop: lot.crop,
        grade: lot.grade,
        quantityTonnes: Math.min(quantityRequiredTonnes, lot.totalQuantityTonnes),
        pricePerKg: 22,
      });
      alert(`Offer sent to ${lotFpoName} — they'll see it in their Offers tab.`);
    } else {
      const farmer = item.data;
      await api.createOffer({
        farmerName: farmer.name, // attributes the offer to the actual farmer
        buyerName: buyerName,
        crop: farmer.currentCrop.crop,
        grade: farmer.currentCrop.grade,
        quantityTonnes: Math.min(quantityRequiredTonnes, farmer.currentCrop.quantityTonnes),
        pricePerKg: 22,
      });
      alert(`Offer sent to ${farmer.name} — they'll see it in their Offers tab.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Search size={22} className="text-warn-600" /> Find Produce</h1>
        <div className="flex items-center gap-2">
          <select value={crop} onChange={(e) => setCrop(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
            {CROPS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="number" value={quantityRequiredTonnes} onChange={(e) => setQuantityRequiredTonnes(e.target.value)} className="w-20 border border-slate-200 rounded-xl px-2 py-2 text-sm" />
          <select value={gradeRequired} onChange={(e) => setGradeRequired(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
            {['A', 'B', 'C'].map((g) => <option key={g}>{g}</option>)}
          </select>
          <button onClick={search} className="btn-primary text-sm">Search</button>
        </div>
      </div>

      {message && <p className="text-sm text-slate-500">{message}</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((item) => (
          <div key={`${item.kind}-${item.data._id}`} className="card space-y-2">
            <div className="flex items-center justify-between">
              {item.kind === 'lot' ? (
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5 min-w-0">
                  <Boxes size={16} className="text-agri-600 shrink-0" />
                  <span className="truncate">{item.data.fpoName || `${item.data.crop} Smart Lot`}</span>
                </h3>
              ) : (
                <h3 className="font-bold text-slate-800 flex items-center gap-1.5"><User size={16} className="text-intel-600" /> {item.data.name}</h3>
              )}
              <span className="badge bg-intel-50 text-intel-700 font-bold shrink-0 ml-2">{item.matchPercent}% match</span>
            </div>

            {item.kind === 'lot' ? (
              <p className="text-sm text-slate-500">
                {item.data.crop} Smart Lot · {item.data.totalQuantityTonnes}T · Grade {item.data.grade} · {item.data.contributions.length} contributing farmers
                <span className="badge bg-slate-100 text-slate-500 text-[10px] ml-2">FPO Lot</span>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                {item.data.currentCrop.quantityTonnes}T · Grade {item.data.currentCrop.grade} · {item.data.location?.district}
                <span className="badge bg-slate-100 text-slate-500 text-[10px] ml-2">Individual Farmer</span>
              </p>
            )}

            <button onClick={() => makeOffer(item)} className="btn-secondary text-sm w-full justify-center mt-2">Make Offer</button>
          </div>
        ))}
        {!results.length && !message && <p className="text-slate-500 text-sm">No produce matched your search.</p>}
      </div>
    </div>
  );
}