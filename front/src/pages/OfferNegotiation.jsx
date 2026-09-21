// pages/OfferNegotiation.jsx — Feature 3: Digital Offer & Negotiation System.
// Lists offer threads and lets either side counter, accept, or reject —
// all state transitions are validated deterministically on the backend
// (services/offerService.js); this page just renders them. Reused as-is
// by the all-in-one /demo view, the Farmer role, the FPO role, and the
// Buyer role — only the filter (which party's offers to show) and the
// "counter as" identity change per usage.
import { useEffect, useState } from 'react';
import { Handshake, RefreshCcw } from 'lucide-react';
import { api } from '../api/client.js';
import OfferCard from '../components/OfferCard.jsx';

export default function OfferNegotiation({ filterKey = 'farmerName', filterValue = 'Ramesh Kumar', counterAs = 'farmer' }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.listOffers({ [filterKey]: filterValue })
      .then((res) => setOffers(res.offers))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filterKey, filterValue]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.__agrisphereContext = { ...(window.__agrisphereContext || {}), openOffers: offers };
  }, [offers]);

  const handleCounter = async (id, body) => {
    await api.counterOffer(id, { ...body, by: counterAs });
    load();
  };
  const handleAccept = async (id) => { await api.acceptOffer(id); load(); };
  const handleReject = async (id) => { await api.rejectOffer(id); load(); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Handshake size={22} className="text-agri-600" /> Offers & Negotiation</h1>
          <p className="text-slate-500 text-sm mt-1">Create an offer from the Buyers/Find Produce tab, then negotiate it here.</p>
        </div>
        <button onClick={load} className="btn-secondary text-sm"><RefreshCcw size={14} /> Refresh</button>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading offers…</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {offers.map((o) => (
          <OfferCard key={o._id} offer={o} counterAs={counterAs} onCounter={handleCounter} onAccept={handleAccept} onReject={handleReject} />
        ))}
        {!loading && !offers.length && (
          <p className="text-slate-500 text-sm">No offers yet.</p>
        )}
      </div>
    </div>
  );
}