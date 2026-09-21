// components/OfferCard.jsx — Feature 3: Digital Offer & Negotiation System.
// Shows one offer thread: current terms, status, and the negotiation
// history. Counter/accept/reject actions are handled by the parent page
// (OfferNegotiation.jsx) — this component only renders + emits events.
import { useState } from 'react';
import { CheckCircle2, XCircle, MessageSquarePlus, Clock } from 'lucide-react';

const STATUS_STYLE = {
  PENDING: 'bg-slate-100 text-slate-600',
  COUNTERED: 'bg-warn-50 text-warn-700',
  ACCEPTED: 'bg-agri-100 text-agri-700',
  REJECTED: 'bg-red-50 text-red-600',
  WITHDRAWN: 'bg-slate-100 text-slate-400',
};

export default function OfferCard({ offer, counterAs = 'farmer', onCounter, onAccept, onReject }) {
  const [showCounter, setShowCounter] = useState(false);
  const [price, setPrice] = useState(offer.currentPricePerKg);
  const [qty, setQty] = useState(offer.currentQuantityTonnes);
  const [note, setNote] = useState('');

  const isOpen = offer.status === 'PENDING' || offer.status === 'COUNTERED';

  const submitCounter = () => {
    onCounter(offer._id, { by: counterAs, pricePerKg: Number(price), quantityTonnes: Number(qty), note });
    setShowCounter(false);
    setNote('');
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-slate-800">{offer.buyerName}</p>
          <p className="text-sm text-slate-500">{offer.crop} {offer.grade ? `— Grade ${offer.grade}` : ''}</p>
        </div>
        <span className={`badge ${STATUS_STYLE[offer.status]}`}>{offer.status}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-slate-400">Current Price: </span><span className="font-bold text-agri-700">₹{offer.currentPricePerKg}/kg</span></div>
        <div><span className="text-slate-400">Current Qty: </span><span className="font-medium">{offer.currentQuantityTonnes} T</span></div>
      </div>

      <div className="border-t border-slate-100 pt-2">
        <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1"><Clock size={12} /> Negotiation History</p>
        <ul className="space-y-1 max-h-28 overflow-y-auto">
          {offer.negotiationHistory.map((h, i) => (
            <li key={i} className="text-xs text-slate-600 flex justify-between">
              <span>{h.by === 'buyer' ? 'Buyer' : 'You'}: ₹{h.pricePerKg}/kg × {h.quantityTonnes}T {h.note ? `— ${h.note}` : ''}</span>
            </li>
          ))}
        </ul>
      </div>

      {isOpen && (
        <div className="pt-2 border-t border-slate-100 space-y-2">
          {!showCounter ? (
            <div className="flex gap-2">
              <button onClick={() => setShowCounter(true)} className="btn-secondary text-xs flex-1 justify-center"><MessageSquarePlus size={14} /> Counter-offer</button>
              <button onClick={() => onAccept(offer._id)} className="btn-primary text-xs flex-1 justify-center"><CheckCircle2 size={14} /> Accept</button>
              <button onClick={() => onReject(offer._id)} className="text-xs flex-1 justify-center inline-flex items-center gap-1 text-red-500 hover:bg-red-50 rounded-xl px-3 py-2"><XCircle size={14} /> Reject</button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="₹/kg" className="w-24 border border-slate-200 rounded-xl px-2 py-1.5 text-sm" />
                <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Tonnes" className="w-24 border border-slate-200 rounded-xl px-2 py-1.5 text-sm" />
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="flex-1 border border-slate-200 rounded-xl px-2 py-1.5 text-sm" />
              </div>
              <div className="flex gap-2">
                <button onClick={submitCounter} className="btn-primary text-xs">Send Counter-offer</button>
                <button onClick={() => setShowCounter(false)} className="btn-secondary text-xs">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}