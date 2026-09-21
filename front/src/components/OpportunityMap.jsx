// components/OpportunityMap.jsx — Phase 12.5: Opportunity Map.
//
// A real interactive Leaflet map (OpenStreetMap tiles — free, no API
// key) plotting three genuinely live-sourced layers from
// GET /api/analytics/opportunity-map: demand hotspots (real buyers
// currently seeking this crop), high-price markets (today's live
// data.gov.in prices), and nearby warehouses. Every marker's
// coordinates come from a real geocoding lookup — nothing is placed by
// guesswork.
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { Flame, ArrowUpCircle, Warehouse, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { api } from '../api/client.js';

const CROPS = ['Tomato', 'Onion', 'Potato', 'Paddy', 'Wheat', 'Cotton', 'Maize', 'Soybean'];
const LAYER_STYLE = {
  demand: { color: '#ea580c', label: 'Demand Hotspot (Buyer)', Icon: Flame },
  market: { color: '#1e8450', label: 'High-Price Market', Icon: ArrowUpCircle },
  storage: { color: '#274bd1', label: 'Warehouse / Cold Storage', Icon: Warehouse },
};

export default function OpportunityMap() {
  const [crop, setCrop] = useState('Tomato');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getOpportunityMap({ crop }).then(setData).finally(() => setLoading(false));
  }, [crop]);

  const allPoints = data ? [
    ...(data.demandHotspots || []).map((p) => ({ ...p, layer: 'demand' })),
    ...(data.highPriceMarkets || []).map((p) => ({ ...p, layer: 'market' })),
    ...(data.nearbyWarehouses || []).map((p) => ({ ...p, layer: 'storage' })),
  ] : [];

  const center = allPoints.length
    ? [allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length, allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length]
    : [22.9734, 78.6569]; // India centroid fallback while data loads

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Opportunity Map</h1>
        <select value={crop} onChange={(e) => setCrop(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
          {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <p className="text-xs text-slate-400">Real, live-geocoded data — demand hotspots from active buyer requirements, prices from today's live market fetch, warehouses from the storage directory.</p>

      <div className="flex flex-wrap gap-3 text-xs">
        {Object.values(LAYER_STYLE).map(({ color, label, Icon }) => (
          <span key={label} className="flex items-center gap-1.5"><Icon size={13} style={{ color }} /> {label}</span>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="h-[420px] flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" /></div>
        ) : (
          <MapContainer center={center} zoom={allPoints.length ? 6 : 4} style={{ height: '420px', width: '100%' }}>
            <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {allPoints.map((p, i) => {
              const style = LAYER_STYLE[p.layer];
              return (
                <CircleMarker key={i} center={[p.lat, p.lng]} radius={8} pathOptions={{ color: style.color, fillColor: style.color, fillOpacity: 0.7 }}>
                  <Popup>
                    <strong>{p.label}</strong><br />
                    {p.layer === 'demand' && `Seeking ${p.quantityRequiredTonnes ?? '?'}T · ₹${p.offerPricePerKg ?? '?'}/kg`}
                    {p.layer === 'market' && `₹${p.modalPrice}/kg · ${p.state}`}
                    {p.layer === 'storage' && `${p.type || 'Storage'} · ${p.capacityTonnes ? `${p.capacityTonnes}T capacity` : ''}`}
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>
      {!loading && allPoints.length === 0 && (
        <p className="text-sm text-slate-400 text-center">No mappable data found for {crop} yet — try another crop or check back once more buyers/markets have real data.</p>
      )}
    </div>
  );
}
