// components/BuyerCard.jsx
// Feature 4 (Institutional Buyer Integration): shows buyerType/channel as
// a badge, and — for institutional buyers — an expandable requirements
// panel (quality spec, delivery schedule, packaging, contract type).
import { forwardRef, useState } from 'react';
import { ShieldCheck, MapPin, ArrowRight, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';

const INSTITUTIONAL_TYPES = ['Processor', 'Retail Chain', 'Exporter', 'Government Agency'];

const TYPE_BADGE = {
  Processor: 'bg-warn-50 text-warn-700',
  'Retail Chain': 'bg-agri-50 text-agri-700',
  Exporter: 'bg-purple-50 text-purple-700',
  'Government Agency': 'bg-blue-50 text-blue-700',
  'Trader/Aggregator': 'bg-slate-100 text-slate-600',
};

const BuyerCard = forwardRef(function BuyerCard({ buyer, matchPercent, onViewMatch, onCreateOffer, highlighted }, ref) {
  // Starts pre-expanded when this is the specific buyer the farmer was
  // sent here to view (arrived via "View Details" with a matching name),
  // so its details are visible without an extra click.
  const [showRequirements, setShowRequirements] = useState(!!highlighted);
  const trust = buyer.trust?.score ?? buyer.trustScore;
  const isInstitutional = INSTITUTIONAL_TYPES.includes(buyer.buyerType);

  return (
    <div
      ref={ref}
      className={`card flex flex-col gap-3 ${highlighted ? 'border-2 border-intel-400 ring-2 ring-intel-100' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          {highlighted && <p className="text-xs font-semibold text-intel-600 mb-1">Buyer you selected</p>}
          <h3 className="font-bold text-slate-800">{buyer.name}</h3>
          <p className="text-sm text-slate-500">{buyer.cropRequired} — Grade {buyer.gradeRequired}</p>
        </div>
        {matchPercent != null && (
          <span className="badge bg-intel-50 text-intel-700 font-bold">{matchPercent}% match</span>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {buyer.buyerType && <span className={`badge ${TYPE_BADGE[buyer.buyerType] || 'bg-slate-100 text-slate-600'}`}>{buyer.buyerType}</span>}
        {buyer.channel && <span className="badge bg-slate-100 text-slate-500 text-[10px]">{buyer.channel}</span>}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-slate-400">Quantity: </span><span className="font-medium text-slate-700">{buyer.quantityRequiredTonnes} t</span></div>
        <div><span className="text-slate-400">Offer: </span><span className="font-bold text-agri-700">₹{buyer.offerPricePerKg}/kg</span></div>
        <div className="flex items-center gap-1 text-slate-500"><MapPin size={14} />{buyer.location}</div>
        <div><span className="text-slate-400">Required by: </span>{buyer.requiredByDate ? new Date(buyer.requiredByDate).toLocaleDateString() : '—'}</div>
      </div>

      {isInstitutional && buyer.requirements && (
        <div className="border-t border-slate-100 pt-2">
          <button onClick={() => setShowRequirements((s) => !s)} className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <ClipboardList size={12} /> Institutional Requirements {showRequirements ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showRequirements && (
            <ul className="text-xs text-slate-600 mt-2 space-y-1">
              <li><span className="text-slate-400">Quality: </span>{buyer.requirements.qualitySpec}</li>
              <li><span className="text-slate-400">Delivery: </span>{buyer.requirements.deliverySchedule}</li>
              <li><span className="text-slate-400">Packaging: </span>{buyer.requirements.packagingRequirement}</li>
              <li><span className="text-slate-400">Contract: </span>{buyer.requirements.contractType}</li>
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {buyer.verified && <span className="badge bg-agri-50 text-agri-700"><ShieldCheck size={12} /> Verified</span>}
          {trust != null && <span className="badge bg-slate-100 text-slate-600">Trust {trust}/100</span>}
        </div>
        <div className="flex items-center gap-3">
          {onCreateOffer && (
            <button onClick={() => onCreateOffer(buyer)} className="text-sm font-semibold text-agri-700 hover:underline">
              Make Offer
            </button>
          )}
          <button onClick={() => onViewMatch?.(buyer)} className="text-sm font-semibold text-intel-700 flex items-center gap-1 hover:underline">
            View Match <ArrowRight size={14} />
          </button>
        </div>
      </div>
      <p className="text-[11px] text-slate-400">Demo buyer for prototype purposes — not a real company.</p>
    </div>
  );
});

export default BuyerCard;