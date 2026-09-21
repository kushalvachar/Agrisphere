// components/PriceTiles.jsx
// Live mandi price tiles — shows ALL crops from the ticker endpoint.
// Includes a commodity filter dropdown so users can narrow by crop.
// Always attempts live data first; shows cached data with a label if live fails.
import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Filter } from 'lucide-react';
import { api } from '../api/client.js';
import { useTranslation } from 'react-i18next';

function Sparkline({ points, trend }) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 60, h = 22;
  const step = w / (points.length - 1);
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${h - ((p - min) / range) * (h - 2) - 1}`)
    .join(' ');
  const color = trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#64748b';
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block shrink-0">
      <path d={d} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PriceTile({ item }) {
  const Icon = item.trend === 'up' ? TrendingUp : item.trend === 'down' ? TrendingDown : Minus;
  const toneClass =
    item.trend === 'up'   ? 'text-green-600 bg-green-50' :
    item.trend === 'down' ? 'text-red-600 bg-red-50'     :
                            'text-slate-500 bg-slate-50';
  const borderClass =
    item.trend === 'up'   ? 'border-green-100' :
    item.trend === 'down' ? 'border-red-100'   :
                            'border-slate-100';
  return (
    <div className={`border ${borderClass} rounded-xl bg-white p-3 flex flex-col gap-1.5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold text-slate-800 text-sm leading-tight truncate">{item.crop}</span>
        <span className={`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${toneClass}`}>
          <Icon size={11} /> {item.changePct > 0 ? '+' : ''}{item.changePct}%
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className="text-lg font-extrabold text-slate-900">₹{item.price}</span>
          <span className="text-xs text-slate-400 ml-1">/kg</span>
        </div>
        <Sparkline points={item.sparkline} trend={item.trend} />
      </div>
      {item.asOf && (
        <p className="text-[10px] text-slate-300 leading-none">{item.asOf}</p>
      )}
    </div>
  );
}

export default function PriceTiles({ className = '' }) {
  const { t } = useTranslation();
  const [allTicker, setAllTicker] = useState(null); // null = loading, [] = empty
  const [lastRefresh, setLastRefresh] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState(''); // '' = All

  const load = () =>
    api.getPriceTicker()
      .then((res) => {
        setAllTicker(res.ticker || []);
        setIsLive(res.source !== 'MONGO_CACHE' && res.source !== 'FALLBACK');
        setLastRefresh(new Date());
      })
      .catch(() => setAllTicker([]));

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  // All unique crop names for the filter dropdown.
  const cropOptions = useMemo(() => {
    if (!allTicker?.length) return [];
    return [...new Set(allTicker.map((item) => item.crop))].sort();
  }, [allTicker]);

  // Apply commodity filter.
  const ticker = useMemo(() => {
    if (!allTicker) return null;
    if (!selectedCrop) return allTicker;
    return allTicker.filter((item) => item.crop === selectedCrop);
  }, [allTicker, selectedCrop]);

  if (!ticker) {
    return (
      <div className={`text-center py-6 text-slate-400 text-sm ${className}`}>
        <RefreshCw size={16} className="inline animate-spin mr-2" />
        {t('widget.loadingPrices') || 'Loading live mandi prices…'}
      </div>
    );
  }

  if (!allTicker?.length) return null;

  return (
    <div className={className}>
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full inline-block ${isLive ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`} />
          {t('widget.liveMandiPrices') || 'Live Mandi Prices'}
          {!isLive && (
            <span className="text-[10px] text-amber-600 font-normal ml-1">(cached)</span>
          )}
        </h2>

        <div className="flex items-center gap-2">
          {/* Commodity filter */}
          <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-xs text-slate-600">
            <Filter size={12} className="text-slate-400 shrink-0" />
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="outline-none bg-transparent cursor-pointer max-w-[140px]"
              aria-label={t('widget.filterCommodities') || 'Filter Commodities'}
            >
              <option value="">{t('widget.allCommodities') || 'All Commodities'}</option>
              {cropOptions.map((crop) => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>

          {lastRefresh && (
            <span className="text-[10px] text-slate-400 shrink-0">
              {t('widget.updatedAt') || 'Updated'} {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Tiles grid */}
      {ticker.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {ticker.map((item) => (
            <PriceTile key={item.crop} item={item} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-4">
          {t('widget.noData') || 'No data available.'}
        </p>
      )}
    </div>
  );
}