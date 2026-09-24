// components/DemandForecastPanel.jsx — Feature 2: Buyer Demand Forecasting.
// Shows the deterministic seasonal-average forecast plus its computation
// "basis" (transparent, not a black box), and the Gemini narrative on top.
import { TrendingUp, Sparkles, ShieldAlert } from 'lucide-react';

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Lightweight skeleton shown while the forecast + AI explanation are being
// fetched, so the panel doesn't flash "No forecast available yet." during
// the request and instead reads as "still loading" (mirrors the shape of
// the loaded card below: title, big number, 3-stat row, AI blurb).
function DemandForecastSkeleton() {
  return (
    <div className="card animate-pulse" aria-busy="true" aria-label="Loading forecast">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-32 bg-slate-200 rounded" />
        <div className="h-3 w-16 bg-slate-100 rounded" />
      </div>
      <div className="h-8 w-24 bg-slate-200 rounded mb-3" />
      <div className="h-3 w-48 bg-slate-100 rounded mb-3" />
      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
        <div className="h-8 bg-slate-100 rounded" />
        <div className="h-8 bg-slate-100 rounded" />
        <div className="h-8 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

export default function DemandForecastPanel({ forecast, aiExplanation, message, loading }) {
  if (loading) return <DemandForecastSkeleton />;
  if (!forecast) return <p className="text-slate-500 text-sm">{message || 'No forecast available yet.'}</p>;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp size={18} className="text-intel-600" /> Demand Forecast</h3>
        <span className="text-xs text-slate-400">{forecast.buyerName}</span>
      </div>

      <p className="text-3xl font-extrabold text-intel-700">{forecast.forecastQuantityTonnes} T</p>
      <p className="text-sm text-slate-500 mb-3">Expected procurement in {MONTH_NAMES[forecast.forecastMonth]} {forecast.forecastYear} for {forecast.crop}</p>

      <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
        <div><span className="text-slate-400 block">Overall Avg</span>{forecast.basis.overallAverageTonnes} T</div>
        <div><span className="text-slate-400 block">Seasonal Index</span>{forecast.basis.seasonalIndexForMonth}x</div>
        <div><span className="text-slate-400 block">Recent Trend</span>{forecast.basis.recentTrendPct}%</div>
      </div>

      {aiExplanation && (
        <div className="bg-intel-50/50 border border-intel-100 rounded-xl p-3 mt-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-intel-800 flex items-center gap-1"><Sparkles size={12} /> AI Explanation</p>
            {!aiExplanation.aiAvailable && <span className="badge bg-warn-50 text-warn-700 text-[10px]"><ShieldAlert size={10} /> fallback</span>}
          </div>
          <p className="text-sm text-slate-700">{aiExplanation.explanation}</p>
          <p className="text-xs text-slate-500 mt-1">{aiExplanation.farmerImplication}</p>
        </div>
      )}
      <p className="text-[11px] text-slate-400 mt-3">Forecast computed from seasonal averages over historical procurement — not a guarantee of future demand.</p>
    </div>
  );
}