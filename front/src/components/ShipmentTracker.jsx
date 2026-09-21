// components/ShipmentTracker.jsx — Enhancement 1 (Logistics Engine).
// Per-transaction shipment tracking panel: shows a stage progress bar,
// current location/ETA, and the full update timeline; lets either side
// (or whoever is coordinating transport) create the shipment and push
// stage/location updates. Mounted inline under each transaction card in
// Transaction.jsx once that transaction has moved past OFFER_ACCEPTED.
import { useEffect, useState } from 'react';
import { Truck, MapPin, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/client.js';

const STAGES = ['SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const STAGE_LABEL = {
  SCHEDULED: 'Scheduled', PICKED_UP: 'Picked Up', IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out for Delivery', DELIVERED: 'Delivered',
};

export default function ShipmentTracker({ transactionId, source, destination }) {
  const [expanded, setExpanded] = useState(false);
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updateForm, setUpdateForm] = useState({ stage: 'PICKED_UP', locationLabel: '', note: '' });

  const load = () => {
    setLoading(true);
    api.getShipmentByTransaction(transactionId)
      .then((res) => setShipment(res.shipment))
      .catch(() => setShipment(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (expanded) load(); }, [expanded]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    setLoading(true);
    try {
      const res = await api.createShipment({ transactionId, source: source || 'Farm Gate', destination: destination || 'Buyer Location' });
      setShipment(res.shipment);
    } finally {
      setLoading(false);
    }
  };

  const pushUpdate = async () => {
    if (!shipment) return;
    await api.trackShipment(shipment._id, updateForm);
    setUpdateForm({ ...updateForm, note: '' });
    load();
  };

  const currentIdx = shipment ? STAGES.indexOf(shipment.stage) : -1;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button onClick={() => setExpanded((e) => !e)} className="text-sm font-semibold text-slate-600 flex items-center gap-1.5 hover:text-agri-700">
        <Truck size={15} /> Logistics / Shipment Tracking
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="mt-3 bg-slate-50 rounded-xl p-3 space-y-3">
          {loading && !shipment && <p className="text-xs text-slate-400">Loading…</p>}

          {!loading && !shipment && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">No shipment created yet for this deal.</p>
              <button onClick={create} className="btn-secondary text-xs"><Plus size={13} /> Create Shipment</button>
            </div>
          )}

          {shipment && (
            <>
              <div className="flex flex-wrap items-center gap-1">
                {STAGES.map((s, i) => (
                  <span key={s} className={`text-[11px] px-2 py-1 rounded-full font-medium ${i <= currentIdx ? 'bg-agri-100 text-agri-700' : 'bg-slate-200 text-slate-400'}`}>
                    {STAGE_LABEL[s]}
                  </span>
                ))}
              </div>

              <div className="text-xs text-slate-600 flex items-center gap-1.5">
                <MapPin size={12} />
                {shipment.source} → {shipment.destination}
                {shipment.currentLocation?.label && <span className="text-slate-400">· now at {shipment.currentLocation.label}</span>}
              </div>

              {shipment.trackingUpdates?.length > 0 && (
                <ul className="text-[11px] text-slate-500 space-y-1 border-l-2 border-slate-200 pl-2">
                  {shipment.trackingUpdates.slice().reverse().map((u, i) => (
                    <li key={i}>
                      <span className="font-semibold text-slate-600">{STAGE_LABEL[u.stage]}</span>
                      {u.locationLabel ? ` — ${u.locationLabel}` : ''}
                      {u.note ? ` (${u.note})` : ''}
                      <span className="text-slate-400"> · {new Date(u.at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}

              {shipment.stage !== 'DELIVERED' && (
                <div className="flex flex-wrap gap-1.5 items-center pt-1">
                  <select
                    value={updateForm.stage}
                    onChange={(e) => setUpdateForm({ ...updateForm, stage: e.target.value })}
                    className="input !mt-0 !py-1 !w-auto text-xs"
                  >
                    {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                  </select>
                  <input
                    placeholder="Location (e.g. NH-75, near Malur)"
                    value={updateForm.locationLabel}
                    onChange={(e) => setUpdateForm({ ...updateForm, locationLabel: e.target.value })}
                    className="input !mt-0 !py-1 text-xs flex-1 min-w-[140px]"
                  />
                  <button onClick={pushUpdate} className="btn-primary !px-3 !py-1.5 text-xs">Add Update</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}