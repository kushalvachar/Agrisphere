// components/LiveMandiTiles.jsx — Phase 3: Live Mandi Tiles on the
// landing page.
//
// Every tile comes from GET /api/markets/live-tiles, which itself is
// just the same live data.gov.in fetch the rest of the app uses (see
// marketController.getLiveMandiTiles) — no static/seed values. Polls
// every REFRESH_MS so the landing page visibly stays "live" without a
// manual refresh; the backend's own 10-minute per-filter cache means
// this polling never hammers the government API.
import { useEffect, useState, useCallback } from 'react';
import { RadioTower, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { api } from '../api/client.js';
import { useTranslation } from 'react-i18next';

const REFRESH_MS = 60 * 1000;

const TREND_ICON = { up: TrendingUp, down: TrendingDown, stable: Minus };
const TREND_TONE = { up: 'text-warn-600', down: 'text-agri-600', stable: 'text-slate-400' };

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function LiveMandiTiles({ limit = 8 }) {
  const { t } = useTranslation();
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);

  const load = useCallback(() => {
    api.getLiveMandiTiles({ limit }).then((res) => {
      setTiles(res.tiles || []);
      setLastFetched(new Date());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [limit]);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return <p className="text-center text-sm text-slate-400 py-6">{t('widget.loadingLivePrices')}</p>;
  }
  if (!tiles.length) {
    return null; // don't show an empty/broken section on the landing page if the live source is down
  }

  return (
    <section className="max-w-6xl mx-auto px-6 pb-16">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <RadioTower size={18} className="text-agri-600" /> {t('widget.liveMandiPrices')}
        </h2>
        {lastFetched && (
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <RefreshCw size={12} /> updated {timeAgo(lastFetched)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {tiles.map((t, i) => {
          const Icon = TREND_ICON[t.trend] || Minus;
          return (
            <div key={`${t.crop}-${t.market}-${i}`} className="card py-3 px-4">
              <p className="text-xs text-slate-400">{t.state}</p>
              <p className="font-bold text-slate-800 text-sm truncate" title={t.market}>{t.market}</p>
              <p className="text-xs text-agri-700 font-semibold">{t.crop}</p>
              <div className="flex items-end justify-between mt-2">
                <div>
                  <p className="text-lg font-extrabold text-slate-900">₹{t.modalPrice}<span className="text-xs font-normal text-slate-400">/kg</span></p>
                  <p className="text-[11px] text-slate-400">₹{t.minPrice}–₹{t.maxPrice} range</p>
                </div>
                <Icon size={16} className={TREND_TONE[t.trend] || 'text-slate-400'} />
              </div>
              <p className="text-[10px] text-slate-300 mt-1">{timeAgo(t.lastUpdated)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}