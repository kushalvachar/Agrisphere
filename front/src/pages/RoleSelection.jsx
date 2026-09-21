// pages/RoleSelection.jsx — default entry point ("/").
// Shows the 3 role cards, plus a "Nearby Market Prices" section that:
//  - Requests the user's geolocation via the browser API
//  - Fetches up to 10 nearby markets from the backend (with distance)
//  - Supports crop-type filters so farmers can quickly check their crop
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Sprout, Wheat, Users2, Factory, ArrowRight, LayoutGrid,
  MapPin, TrendingUp, TrendingDown, Minus, Navigation, Loader2,
  RefreshCw, AlertCircle, Filter,
} from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { api } from '../api/client.js';

const ROLES = [
  { key: 'farmer', to: '/farmer/select', icon: Wheat, tone: 'agri' },
  { key: 'fpo', to: '/auth/fpo', icon: Users2, tone: 'intel' },
  { key: 'buyer', to: '/auth/buyer', icon: Factory, tone: 'warn' },
];

const TONE_STYLES = {
  agri: { icon: 'bg-agri-50 text-agri-700', button: 'btn-primary' },
  intel: {
    icon: 'bg-intel-50 text-intel-700',
    button: 'bg-intel-600 hover:bg-intel-700 text-white font-semibold px-5 py-2.5 rounded-xl inline-flex items-center gap-2 transition-colors',
  },
  warn: {
    icon: 'bg-warn-50 text-warn-700',
    button: 'bg-warn-500 hover:bg-warn-600 text-white font-semibold px-5 py-2.5 rounded-xl inline-flex items-center gap-2 transition-colors',
  },
};

const TREND_ICON = { up: TrendingUp, down: TrendingDown, stable: Minus };
const TREND_COLOR = { up: 'text-warn-600', down: 'text-agri-600', stable: 'text-slate-400' };

const CROP_FILTERS = [
  'All', 'Tomato', 'Onion', 'Potato', 'Paddy', 'Wheat', 'Cotton', 'Maize', 'Soybean',
];

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDistance(km) {
  if (km == null) return null;
  if (km < 1) return `<1 km`;
  return `${Math.round(km)} km`;
}

// ── Nearby Market Prices section ─────────────────────────────────────────────
function NearbyMarkets() {
  const [tiles, setTiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | requesting | granted | denied | unavailable
  const [userCoords, setUserCoords] = useState(null);
  const [selectedCrop, setSelectedCrop] = useState('All');
  const [lastFetched, setLastFetched] = useState(null);
  const [error, setError] = useState('');

  const fetchMarkets = useCallback(async (coords, crop) => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 10 };
      if (coords) {
        params.lat = coords.lat;
        params.lng = coords.lng;
      }
      if (crop && crop !== 'All') {
        params.crop = crop;
      }
      const res = await api.getLiveMandiTiles(params);
      setTiles(res.tiles || []);
      setLastFetched(new Date());
    } catch (err) {
      setError('Could not load market prices. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      // Still fetch markets without geo
      fetchMarkets(null, selectedCrop);
      return;
    }
    setGeoStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setGeoStatus('granted');
        fetchMarkets(coords, selectedCrop);
      },
      () => {
        setGeoStatus('denied');
        // Still load markets without geo
        fetchMarkets(null, selectedCrop);
      },
      { timeout: 8000, maximumAge: 300000 },
    );
  }, [fetchMarkets, selectedCrop]);

  // Auto-request on mount
  useEffect(() => {
    requestLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch when crop filter changes (keep same coords)
  const handleCropChange = (crop) => {
    setSelectedCrop(crop);
    fetchMarkets(userCoords, crop);
  };

  const hasGeo = geoStatus === 'granted' && userCoords;

  return (
    <section className="max-w-6xl mx-auto px-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <MapPin size={18} className="text-agri-600" />
            {hasGeo ? 'Nearby Market Prices' : 'Live Market Prices'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {geoStatus === 'requesting' && 'Detecting your location…'}
            {geoStatus === 'granted' && 'Showing markets near your location · sorted by distance'}
            {geoStatus === 'denied' && 'Location access denied · showing general market prices'}
            {geoStatus === 'unavailable' && 'Location unavailable · showing general market prices'}
            {geoStatus === 'idle' && 'Live mandi prices from AGMARKNET'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {geoStatus === 'denied' && (
            <button
              onClick={requestLocation}
              className="text-xs text-agri-600 hover:text-agri-800 flex items-center gap-1 border border-agri-200 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Navigation size={12} /> Enable location
            </button>
          )}
          {lastFetched && !loading && (
            <button
              onClick={() => fetchMarkets(userCoords, selectedCrop)}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <RefreshCw size={12} /> {timeAgo(lastFetched)}
            </button>
          )}
        </div>
      </div>

      {/* Crop filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        <Filter size={13} className="text-slate-400 shrink-0" />
        {CROP_FILTERS.map((crop) => (
          <button
            key={crop}
            onClick={() => handleCropChange(crop)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium border transition-all ${
              selectedCrop === crop
                ? 'bg-agri-600 text-white border-agri-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-agri-300 hover:text-agri-700'
            }`}
          >
            {crop}
          </button>
        ))}
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
          <Loader2 size={16} className="animate-spin" /> Loading market prices…
        </div>
      )}
      {!loading && error && (
        <div className="flex items-center gap-2 text-slate-500 py-6 justify-center text-sm">
          <AlertCircle size={16} className="text-warn-500" /> {error}
        </div>
      )}

      {!loading && !error && tiles.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-8">
          No market data available for {selectedCrop === 'All' ? 'these crops' : selectedCrop} right now.
        </p>
      )}

      {/* Market tiles grid */}
      {!loading && tiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tiles.map((t, i) => {
            const TrendIcon = TREND_ICON[t.trend] || Minus;
            const dist = formatDistance(t.distanceKm);
            return (
              <div
                key={`${t.crop}-${t.market}-${i}`}
                className="card py-3 px-4 hover:shadow-md transition-shadow"
              >
                {/* Header: crop badge + distance */}
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="text-[11px] font-semibold text-agri-700 bg-agri-50 px-1.5 py-0.5 rounded-full truncate max-w-[60%]">
                    {t.crop}
                  </span>
                  {dist && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5 shrink-0">
                      <MapPin size={9} /> {dist}
                    </span>
                  )}
                </div>

                {/* Market name + state */}
                <p className="text-xs text-slate-400 truncate">{t.state}</p>
                <p className="font-bold text-slate-800 text-sm truncate leading-tight" title={t.market}>
                  {t.market}
                </p>

                {/* Price */}
                <div className="flex items-end justify-between mt-2">
                  <div>
                    <p className="text-xl font-extrabold text-slate-900 leading-none">
                      ₹{t.modalPrice}
                      <span className="text-xs font-normal text-slate-400">/kg</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      ₹{t.minPrice}–₹{t.maxPrice}
                    </p>
                  </div>
                  <TrendIcon size={16} className={TREND_COLOR[t.trend] || 'text-slate-400'} />
                </div>
                <p className="text-[10px] text-slate-300 mt-1">{timeAgo(t.lastUpdated)}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ── Main RoleSelection page ───────────────────────────────────────────────────
export default function RoleSelection() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-agri-50 via-white to-white">
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-agri-600 flex items-center justify-center">
            <Sprout size={20} className="text-white" />
          </div>
          <span className="font-extrabold text-lg text-slate-800">{t('app.name')}</span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <button
            onClick={() => navigate('/demo')}
            className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5"
          >
            <LayoutGrid size={15} /> {t('common.fullDemo')}
          </button>
        </div>
      </header>

      <section className="max-w-3xl mx-auto px-6 text-center pt-6 pb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          {t('app.name')}
        </h1>
        <p className="text-slate-600 mt-4 text-lg">{t('app.tagline')}</p>
        <p className="text-slate-400 mt-2 text-sm">{t('roleSelection.chooseUsage')}</p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20 grid sm:grid-cols-3 gap-5">
        {ROLES.map(({ key, to, icon: Icon, tone }) => (
          <div key={key} className="card flex flex-col items-start gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${TONE_STYLES[tone].icon}`}>
              <Icon size={24} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800">{t(`roleSelection.${key}.title`)}</h2>
              <p className="text-sm text-slate-500 mt-1">{t(`roleSelection.${key}.description`)}</p>
            </div>
            <button onClick={() => navigate(to)} className={`${TONE_STYLES[tone].button} mt-auto w-full justify-center`}>
              {t(`roleSelection.${key}.cta`)} <ArrowRight size={16} />
            </button>
          </div>
        ))}
      </section>

      {/* Nearby / Live Market Prices */}
      <NearbyMarkets />
    </div>
  );
}
