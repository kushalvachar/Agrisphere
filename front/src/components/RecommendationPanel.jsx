import { Sparkles, ShieldAlert, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function RecommendationPanel({ recommendation, priceTrend, daysCollected }) {
  if (!recommendation) return null;
  const { decision, expectedPrice, confidence, reasoning = [], risks = [], aiAvailable } = recommendation;

  const decisionColor = {
    SELL_NOW: 'bg-agri-600',
    WAIT: 'bg-intel-600',
    SELL_PARTIALLY: 'bg-warn-500',
  }[decision] || 'bg-slate-600';

  const TREND_ICON = { rising: TrendingUp, falling: TrendingDown, stable: Minus };
  const TrendIcon = priceTrend && TREND_ICON[priceTrend.direction];

  return (
    <div className="card border-2 border-agri-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-agri-600" />
          <h3 className="font-bold text-slate-800">AI Sale Timing Recommendation</h3>
        </div>
        {!aiAvailable && (
          <span className="badge bg-warn-50 text-warn-700"><ShieldAlert size={12} /> Rule-based fallback</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className={`${decisionColor} text-white font-extrabold px-4 py-2 rounded-xl text-lg`}>
          {decision?.replace('_', ' ')}
        </span>
        <span className="text-slate-600 text-sm">Expected price: <b>₹{expectedPrice}/kg</b> (not guaranteed)</span>
        <span className="text-slate-600 text-sm">Confidence: <b>{confidence}%</b></span>
      </div>

      {priceTrend && priceTrend.direction !== 'insufficient_data' && TrendIcon && (
        <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
          <TrendIcon size={12} /> Real 30-day price data: {priceTrend.direction} ({priceTrend.changePct > 0 ? '+' : ''}{priceTrend.changePct}% over {daysCollected} day{daysCollected === 1 ? '' : 's'} collected so far)
        </p>
      )}

      {reasoning.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-semibold text-slate-700 mb-1">Why?</p>
          <ul className="text-sm text-slate-600 space-y-1">
            {reasoning.map((r, i) => <li key={i}>✓ {r}</li>)}
          </ul>
        </div>
      )}

      {risks.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-1">Risks</p>
          <ul className="text-sm text-slate-500 space-y-1">
            {risks.map((r, i) => <li key={i}>⚠ {r}</li>)}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-100">
        AI-assisted recommendation. Prices are indicative and not guaranteed.
      </p>
    </div>
  );
}
