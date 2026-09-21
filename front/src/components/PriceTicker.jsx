// components/PriceTicker.jsx — Enhancement 4 (live price trends on landing page).
// A horizontally auto-scrolling strip of crop / price / %change, styled
// like a stock-market ticker tape (green up, red down, small sparkline),
// backed by GET /api/markets/ticker. Polls every 30s so it feels "live"
// without needing a websocket for a demo. Renders nothing (rather than
// an empty bar) if there's no price history seeded yet.
import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { api } from '../api/client.js';

function Sparkline({ points, trend }) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 48, h = 18;
  const step = w / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - ((p - min) / range) * h}`).join(' ');
  const color = trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#64748b';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TickerItem({ item }) {
  const Icon = item.trend === 'up' ? TrendingUp : item.trend === 'down' ? TrendingDown : Minus;
  const tone = item.trend === 'up' ? 'text-green-600' : item.trend === 'down' ? 'text-red-600' : 'text-slate-400';
  return (
    <div className="flex items-center gap-2.5 px-5 py-2.5 border-r border-slate-100 shrink-0">
      <span className="font-bold text-slate-800 text-sm">{item.crop}</span>
      <span className="text-slate-600 text-sm">₹{item.price}/kg</span>
      <Sparkline points={item.sparkline} trend={item.trend} />
      <span className={`flex items-center gap-0.5 text-xs font-semibold ${tone}`}>
        <Icon size={13} /> {item.changePct > 0 ? '+' : ''}{item.changePct}%
      </span>
    </div>
  );
}

export default function PriceTicker() {
  const [ticker, setTicker] = useState(null);

  useEffect(() => {
    const load = () => api.getPriceTicker().then((res) => setTicker(res.ticker)).catch(() => setTicker([]));
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  if (!ticker || !ticker.length) return null;

  // Duplicated once so the CSS scroll animation can loop seamlessly.
  const loop = [...ticker, ...ticker];

  return (
    <div className="bg-white border-y border-slate-200 overflow-hidden">
      <div className="flex items-center">
        <span className="badge bg-agri-50 text-agri-700 shrink-0 mx-4 my-2">● LIVE MANDI PRICES</span>
        <div className="overflow-hidden flex-1">
          <div className="flex ticker-scroll">
            {loop.map((item, i) => <TickerItem key={`${item.crop}-${i}`} item={item} />)}
          </div>
        </div>
      </div>
    </div>
  );
}