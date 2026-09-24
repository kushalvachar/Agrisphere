// components/StorageDiscovery.jsx — Phase 10: Storage & Warehouse Discovery.
//
// Facility directory itself is reference data (see backend
// storageController.js comment on why); distance/sorting is computed
// live from the user's real location, same pattern as Phase 4's
// nearby-markets discovery.
import { useState } from 'react';
import { Warehouse, MapPin, Loader2, Phone } from 'lucide-react';
import { api } from '../api/client.js';

const RADII_KM = [50, 100, 200, 500];

export default function StorageDiscovery({ farmerId }) {
  const [radiusKm, setRadiusKm] = useState(100);
  const [location, setLocation] = useState(null);
  const [facilities, setFacilities] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const search = (loc, radius) => {
    setLoading(true);
    const params = { radiusKm: radius, ...(loc ? { lat: loc.lat, lng: loc.lng } : farmerId ? { farmerId } : {}) };
    api.getStorage(params).then((res) => setFacilities(res.facilities)).finally(() => setLoading(false));
  };

  const useMyLocation = () => {
    setError('');
    if (!navigator.geolocation) { setError('Geolocation is not supported by this browser.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }; setLocation(loc); search(loc, radiusKm); },
      (err) => setError(err.message || 'Could not get your location.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const changeRadius = (r) => { setRadiusKm(r); if (location || farmerId) search(location, r); };

  return (
    <div className="card">
      {/* Phones: title, then a full-width radius selector, then a full-width
          "Use my location" button, each on its own row. sm+: original single-row layout. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between mb-3">
        <h2 className="font-bold text-slate-800 flex items-center gap-2"><Warehouse size={17} className="text-agri-600 shrink-0" /> Nearby Storage &amp; Cold Storage</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex w-full sm:w-auto rounded-xl border border-slate-200 overflow-hidden">
            {RADII_KM.map((r) => (
              <button key={r} onClick={() => changeRadius(r)} className={`flex-1 sm:flex-none px-2.5 py-2 sm:py-1.5 text-xs font-medium ${radiusKm === r ? 'bg-agri-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>{r}km</button>
            ))}
          </div>
          <button onClick={useMyLocation} className="w-full sm:w-auto justify-center text-xs font-semibold text-intel-700 border border-intel-100 sm:border-0 rounded-xl py-2 sm:py-0 hover:bg-intel-50 sm:hover:bg-transparent sm:hover:underline flex items-center gap-1"><MapPin size={13} /> Use my location</button>
        </div>
      </div>
      {error && <p className="text-xs text-warn-700 bg-warn-50 rounded-lg px-3 py-2 mb-2">{error}</p>}
      {!facilities && !loading && !error && <p className="text-sm text-slate-400">Tap "Use my location" to find storage within {radiusKm}km.</p>}
      {loading && <Loader2 className="animate-spin text-slate-400 mx-auto my-4" size={20} />}
      {facilities && !loading && (
        facilities.length ? (
          <ul className="space-y-2">
            {facilities.map((f) => (
              <li key={f._id} className="flex items-center justify-between text-sm border-b border-slate-50 pb-2 last:border-0">
                <div>
                  <p className="font-semibold text-slate-700">{f.facilityName}</p>
                  <p className="text-xs text-slate-400">{f.location} · {f.capacityTonnes ? `${f.capacityTonnes}T capacity` : ''}{f.type ? ` · ${f.type}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{f.distanceKm != null ? `${Math.round(f.distanceKm)} km` : '—'}</p>
                  {f.contact && <p className="text-xs text-slate-400 flex items-center gap-1 justify-end"><Phone size={10} /> {f.contact}</p>}
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-slate-400">No storage facilities found within {radiusKm}km.</p>
      )}
    </div>
  );
}