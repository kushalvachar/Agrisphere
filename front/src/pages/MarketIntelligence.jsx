// pages/MarketIntelligence.jsx — Phase 2: Market Intelligence Engine.
//
// Everything on this page is now backed by real, dynamically-collected
// data.gov.in prices (see backend/services/priceTrendService.js,
// marketActivityService.js) — there is no synthetic/seed data left in
// this flow. A crop that has just started being tracked will honestly
// show "collecting real history" instead of a fabricated 30/60-day
// chart, and fills in over real time as the backend's history
// scheduler keeps polling it daily.
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Layers, TrendingUp, TrendingDown, Minus, MapPin, ArrowUpCircle, ArrowDownCircle, Navigation, Loader2 } from 'lucide-react';
import { api } from '../api/client.js';
import MarketTable from '../components/MarketTable.jsx';
import ArrivalVolumeChart from '../components/ArrivalVolumeChart.jsx';
import { useTranslation, useDynamicTranslation } from '../context/LanguageContext.jsx';

const CROPS = ['Tomato', 'Onion', 'Potato', 'Paddy', 'Wheat', 'Cotton', 'Maize', 'Soybean'];
const WINDOWS = [7, 15, 30];
const RADII_KM = [50, 100, 200, 500];

const PREDICTION_STYLE = {
  rising: { Icon: TrendingUp, tone: 'text-intel-700 bg-intel-50 border-intel-100' },
  falling: { Icon: TrendingDown, tone: 'text-warn-700 bg-warn-50 border-warn-100' },
  stable: { Icon: Minus, tone: 'text-slate-600 bg-slate-50 border-slate-100' },
  insufficient_data: { Icon: Minus, tone: 'text-slate-500 bg-slate-50 border-slate-100' },
};
const TREND_LABEL_KEY = { rising: 'trendRising', falling: 'trendFalling', stable: 'trendStable' };

export default function MarketIntelligence({ initialCrop = 'Tomato', farmerId }) {
  const { t } = useTranslation();
  // Feature: Multilingual Voice AGENT — a voice command like "Show
  // tomato prices" (SHOW_MARKET_PRICES/SHOW_TREND/SHOW_NEAREST_MARKET,
  // see context/VoiceAssistantContext.jsx's goTo()) navigates here with
  // a `?crop=` query param; picked up once on mount so the page opens
  // straight on that crop instead of always defaulting to `initialCrop`.
  // Ignored when farmerId-scoped (Market Intelligence Auto Flow already
  // derives the crop from the farmer's own registered profile there,
  // same precedence as the manual dropdown below).
  const [searchParams] = useSearchParams();
  const cropFromVoice = !farmerId ? searchParams.get('crop') : null;
  const [crop, setCrop] = useState(cropFromVoice || initialCrop);
  const [days, setDays] = useState(30);
  const [markets, setMarkets] = useState([]);
  const [message, setMessage] = useState('');

  const [trendSeries, setTrendSeries] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [daysCollected, setDaysCollected] = useState(0);

  const [intelligence, setIntelligence] = useState(null);

  const [activitySeries, setActivitySeries] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const [activityMessage, setActivityMessage] = useState('');

  // Feature: Historical Market Data & Price Trend Charts — a SEPARATE
  // pre-loaded dataset (backend MONGO_URI2), last 7 days per market.
  // Independent of the trendSeries/prediction above (which come from
  // this app's own live-collected PriceHistory) — either can be empty
  // without affecting the other.
  const [historicalMarkets, setHistoricalMarkets] = useState([]);
  const [historicalAvailable, setHistoricalAvailable] = useState(true); // true until we know otherwise — avoids a "no data" flash on first render

  // Phase 4: Distance-Based Market Discovery
  const [userLocation, setUserLocation] = useState(null); // { lat, lng } from navigator.geolocation
  const [radiusKm, setRadiusKm] = useState(50);
  const [nearbyMarkets, setNearbyMarkets] = useState(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Dynamic (backend-generated, per-crop/data-state) content — these are
  // NOT part of the fixed UI dictionary, so they're translated through
  // the runtime dynamic-translation path instead of t().
  const [dynMessage, dynPredictionMessage, dynGeoError] = useDynamicTranslation([
    message || null,
    prediction?.message || null,
    geoError || null,
  ]);

  useEffect(() => {
    // Handles the same-page case: voice says "show onion prices" while
    // already sitting on the market page for tomato — React Router
    // won't remount this component just because the query string
    // changed, so the useState initializer above alone wouldn't catch
    // a second voice-driven crop switch. This keeps `crop` in sync with
    // `?crop=` on every change, not just the first mount.
    if (cropFromVoice) setCrop(cropFromVoice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropFromVoice]);

  useEffect(() => {
    // Market Intelligence Auto Flow: when this page is farmer-scoped
    // (farmerId present), the backend ignores any manually-picked crop
    // and derives it from the farmer's own registered crop instead —
    // see marketController.js. We still send the current `crop` state
    // along (harmless/ignored server-side in that mode) and then adopt
    // whatever crop the response says is authoritative, so the UI never
    // drifts out of sync with the farmer's real profile.
    api.getMarkets({ crop, ...(farmerId ? { farmerId } : {}) })
      .then((res) => {
        setMarkets(res.markets);
        setMessage(res.message || '');
        if (farmerId && res.crop && res.crop !== crop) setCrop(res.crop);
      })
      .catch((err) => {
        // Previously uncaught — a backend 500 (DB hiccup, bad query, etc.)
        // silently left `markets` empty with no visible reason at all.
        console.error('MarketIntelligence: getMarkets failed:', err.message);
        setMarkets([]);
        setMessage(`Could not load market data: ${err.message}`);
      });
    api.getCommodityIntelligence({ crop, ...(farmerId ? { farmerId } : {}) })
      .then(setIntelligence)
      .catch((err) => console.error('MarketIntelligence: getCommodityIntelligence failed:', err.message));
  }, [crop, farmerId]);

  useEffect(() => {
    api.getMarketTrends({ crop, days })
      .then((res) => {
        setTrendSeries(res.series || []);
        setPrediction(res.prediction || null);
        setDaysCollected(res.daysOfDataCollected || 0);
      })
      .catch((err) => console.error('MarketIntelligence: getMarketTrends failed:', err.message));
    api.getMarketActivity({ crop, days })
      .then((res) => {
        setActivitySeries(res.series || []);
        setActivityStats(res.stats || null);
        setActivityMessage(res.message || '');
      })
      .catch((err) => console.error('MarketIntelligence: getMarketActivity failed:', err.message));
  }, [crop, days]);

  // Feature: Historical Market Data (MONGO_URI2) — only depends on
  // `crop`, not on `days`: this is always a fixed last-7-days window
  // regardless of the 7/15/30-day toggle used by the live trend chart
  // above. Never lets a failure (network, or MONGO_URI2 not configured)
  // surface as an error to the farmer — it just renders as "unavailable".
  useEffect(() => {
    api.getMarketHistory({ crop, ...(farmerId ? { farmerId } : {}) })
      .then((res) => {
        setHistoricalMarkets(res.markets || []);
        setHistoricalAvailable(!!res.available);
      })
      .catch((err) => {
        console.error('MarketIntelligence: getMarketHistory failed:', err.message);
        setHistoricalMarkets([]);
        setHistoricalAvailable(false);
      });
  }, [crop, farmerId]);

  useEffect(() => {
    if (!userLocation) return;
    setNearbyLoading(true);
    api.getMarkets({ crop, lat: userLocation.lat, lng: userLocation.lng, radiusKm })
      .then((res) => setNearbyMarkets(res.markets))
      .catch(() => setNearbyMarkets([]))
      .finally(() => setNearbyLoading(false));
  }, [crop, userLocation, radiusKm]);

  const requestLocation = useCallback(() => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => setGeoError(err.message || 'Could not get your location.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // Task: nearby markets should populate automatically on page load,
  // not wait for the farmer to click "Use My Location" first. Runs
  // once on mount — the browser's own geolocation permission prompt is
  // allowed to appear without a user gesture (unlike, say, audio
  // autoplay), and if it's already been granted/denied for this site
  // the browser resolves instantly with no prompt at all. The button
  // below (relabeled "Update My Location" once a location is set)
  // still lets the farmer manually re-fetch — e.g. after actually
  // travelling somewhere else — using the exact same function.
  useEffect(() => {
    requestLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.__agrisphereContext = {
      ...(window.__agrisphereContext || {}),
      marketComparison: markets,
      priceTrendPrediction: prediction,
      commodityIntelligence: intelligence,
      historicalTrend7Day: historicalMarkets, // Feature: Historical Market Data — lets the AI assistant reason over it too
    };
  }, [markets, prediction, intelligence, historicalMarkets]);

  const chartData = trendSeries.map((s) => ({
    date: new Date(s.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    ...s.markets,
  }));
  const marketNames = [...new Set(trendSeries.flatMap((s) => Object.keys(s.markets)))].slice(0, 5);
  const colors = ['#1e8450', '#274bd1', '#ea580c', '#8bb0ff', '#a855f7'];

  // Task ("increase scale" / "easy to understand"): recharts' default
  // auto-domain fits the Y-axis tightly to the data's own min/max, which
  // on a real price series (e.g. ₹18.20–₹19.40) draws a nearly-flat line
  // that LOOKS dramatic or unreadable depending on rounding, with almost
  // no headroom for the tooltip dot at the top/bottom of the chart. This
  // computes a padded, round-number domain instead — e.g. that same
  // series becomes a ₹15–₹22 axis with clearly-spaced ₹ gridlines — so
  // the actual shape of the trend (rising/falling/flat) is honestly
  // legible rather than either exaggerated or invisible.
  const computeYDomain = (rows, keys) => {
    const values = rows.flatMap((row) => keys.map((k) => row[k]).filter((v) => typeof v === 'number'));
    if (!values.length) return ['auto', 'auto'];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min;
    // Pad by ~20% of the span (or a flat ₹2 minimum for an almost-flat
    // line) so the line never touches the top/bottom edge, then round
    // to whole rupees so the axis ticks read as clean numbers.
    const pad = Math.max(span * 0.2, 2);
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
  };
  const priceTooltipFormatter = (value, name) => [`₹${value}/kg`, name];

  // Feature: Historical Market Data (MONGO_URI2) — merge each market's
  // independent {date, price} trend into one date-indexed table so a
  // single multi-line chart can plot up to 5 markets at once, same
  // pattern as the live-history chartData above. A market with fewer
  // than 7 days of historical rows simply has fewer points on its
  // line — recharts + connectNulls handles that without special-casing.
  const topHistoricalMarkets = historicalMarkets.slice(0, 5);
  const historicalChartData = (() => {
    const byDate = new Map();
    for (const m of topHistoricalMarkets) {
      for (const point of m.trend) {
        if (!byDate.has(point.date)) byDate.set(point.date, { date: point.date });
        byDate.get(point.date)[m.marketName] = point.price;
      }
    }
    return [...byDate.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({ ...row, date: new Date(row.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) }));
  })();
  const historicalMarketNames = topHistoricalMarkets.map((m) => m.marketName);

  const PredStyle = prediction ? PREDICTION_STYLE[prediction.direction] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">{t('marketIntelligence')}</h1>
        <div className="flex items-center gap-2">
          {farmerId ? (
            // Market Intelligence Auto Flow: crop is auto-derived from the
            // farmer's registered profile (Farmer.currentCrop.crop) —
            // there's nothing to pick, so no dropdown here. The generic
            // /demo route (no farmerId, no backing Farmer document) still
            // gets the manual picker below so that existing flow keeps working.
            <span className="border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 bg-slate-50">
              {crop}
            </span>
          ) : (
            <select value={crop} onChange={(e) => setCrop(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
              {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <div className="flex rounded-xl border border-slate-200 overflow-hidden">
            {WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setDays(w)}
                className={`px-3 py-2 text-sm font-medium ${days === w ? 'bg-agri-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {w}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {message && <p className="text-sm text-warn-700 bg-warn-50 rounded-lg px-3 py-2">{dynMessage || message}</p>}

      {/* Commodity Intelligence: highest/lowest price market + nearby markets */}
      {intelligence && (
        <div className="grid sm:grid-cols-3 gap-4">
          <IntelCard
            icon={ArrowUpCircle}
            tone="text-agri-700 bg-agri-50"
            label={t('highestPriceMarket')}
            market={intelligence.highestPriceMarket}
          />
          <IntelCard
            icon={ArrowDownCircle}
            tone="text-warn-700 bg-warn-50"
            label={t('lowestPriceMarket')}
            market={intelligence.lowestPriceMarket}
          />
          <div className="card">
            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><MapPin size={13} /> {t('nearbyMarkets')}</p>
            {intelligence.nearbyMarkets?.length ? (
              <ul className="text-sm space-y-1.5">
                {intelligence.nearbyMarkets.slice(0, 4).map((m) => (
                  <li key={m.name} className="flex justify-between">
                    <span className="text-slate-700">{m.name}</span>
                    <span className="text-slate-400">{m.distanceKm != null ? `${Math.round(m.distanceKm)} km` : m.district}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-400">{t('noNearbyMarketData')}</p>}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><Navigation size={17} className="text-agri-600" /> {t('nearbyMarketsForCrop')} — {crop}</h2>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              {RADII_KM.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadiusKm(r)}
                  className={`px-2.5 py-1.5 text-xs font-medium ${radiusKm === r ? 'bg-agri-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {r}km
                </button>
              ))}
            </div>
            <button onClick={requestLocation} className="text-xs font-semibold text-intel-700 hover:underline flex items-center gap-1">
              <MapPin size={13} /> {userLocation ? t('updateMyLocation') : t('useMyLocation')}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-3">{t('nearbyMarketsHint')}</p>
        {geoError && <p className="text-xs text-warn-700 bg-warn-50 rounded-lg px-3 py-2 mb-2">{dynGeoError || geoError}</p>}
        {!userLocation && !geoError && (
          <p className="text-sm text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> {t('detectingYourLocation')}</p>
        )}
        {nearbyLoading && <Loader2 className="animate-spin text-slate-400 mx-auto my-4" size={20} />}
        {userLocation && !nearbyLoading && <MarketTable markets={nearbyMarkets || []} />}
      </div>

      <div className="card">
        <h2 className="font-bold text-slate-800 mb-1">{t('marketComparison')} — {crop}</h2>
        <p className="text-xs text-slate-400 mb-3">{t('marketComparisonHint')}</p>
        <MarketTable markets={markets} />
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-slate-800">
            {t('priceTrend')} — {t('lastDays')} {days} {t('daysSuffix')} ({daysCollected} {t('realDaysCollectedLabelShort')})
          </h2>
          {prediction && prediction.direction !== 'insufficient_data' && PredStyle && (
            <span className={`badge border ${PredStyle.tone}`}>
              <PredStyle.Icon size={13} /> {t(TREND_LABEL_KEY[prediction.direction]) || prediction.direction} ({prediction.changePct > 0 ? '+' : ''}{prediction.changePct}%)
            </span>
          )}
        </div>
        {prediction?.direction === 'insufficient_data' ? (
          <p className="text-sm text-slate-500 py-6 text-center">{dynPredictionMessage || prediction.message || t('insufficientTrendData')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} interval={Math.max(0, Math.floor(chartData.length / 8))} />
              <YAxis
                domain={computeYDomain(chartData, marketNames)}
                tick={{ fontSize: 12 }}
                tickCount={7}
                tickFormatter={(v) => `₹${v}`}
                label={{ value: t('priceAxisLabel'), angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }}
              />
              <Tooltip formatter={priceTooltipFormatter} contentStyle={{ fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {marketNames.map((name, i) => (
                <Line
                  key={name} type="monotone" dataKey={name} stroke={colors[i % colors.length]}
                  strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Feature: Historical Market Data & Price Trend Charts — a
          separate pre-loaded dataset (backend MONGO_URI2), always a
          fixed last-7-days window, independent of the live-collected
          trend chart above. Renders gracefully (no crash, just a plain
          message) when the dataset isn't configured or has no rows yet
          for this crop — see historicalMarketService.js. */}
      <div className="card">
        <h2 className="font-bold text-slate-800 mb-1">{t('historicalPriceTrend')} — {crop}</h2>
        <p className="text-xs text-slate-400 mb-3">{t('historicalPriceTrendHint')}</p>
        {!historicalAvailable || !topHistoricalMarkets.length ? (
          <p className="text-sm text-slate-400 py-6 text-center">{t('noHistoricalDataYet')}</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicalChartData} margin={{ top: 8, right: 16, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                domain={computeYDomain(historicalChartData, historicalMarketNames)}
                tick={{ fontSize: 12 }}
                tickCount={7}
                tickFormatter={(v) => `₹${v}`}
                label={{ value: t('priceAxisLabel'), angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#64748b' } }}
              />
              <Tooltip formatter={priceTooltipFormatter} contentStyle={{ fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {historicalMarketNames.map((name, i) => (
                <Line
                  key={name} type="monotone" dataKey={name} stroke={colors[i % colors.length]}
                  strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Layers size={18} className="text-intel-600" /> {t('marketReportingActivity')} — {crop}</h2>
        <p className="text-xs text-slate-400 mb-3">{t('marketReportingActivityHint')}</p>
        <ArrivalVolumeChart series={activitySeries} stats={activityStats} message={activityMessage} />
      </div>
    </div>
  );
}

function IntelCard({ icon: Icon, tone, label, market }) {
  const { t } = useTranslation();
  return (
    <div className="card">
      <p className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg mb-2 ${tone}`}>
        <Icon size={13} /> {label}
      </p>
      {market ? (
        <>
          <p className="font-bold text-slate-800">{market.name}</p>
          <p className="text-sm text-slate-500">{market.district}, {market.state}</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1">₹{market.modalPrice}/kg</p>
        </>
      ) : <p className="text-sm text-slate-400">{t('noLiveDataYet')}</p>}
    </div>
  );
}