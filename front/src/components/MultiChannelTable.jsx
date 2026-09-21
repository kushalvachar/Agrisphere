// components/MultiChannelTable.jsx — Feature 5: Multi-Channel Market Comparison.
// Renders the unified, deterministically-ranked list across every
// channel (APMC, eNAM, Processor, Retail Chain, Exporter, Government
// Procurement, Digital Marketplace, Direct Trader).
import { Landmark, Factory, Store, Ship, Building2, Smartphone, Users } from 'lucide-react';

const CHANNEL_ICON = {
  APMC: Landmark,
  eNAM: Landmark,
  Processor: Factory,
  'Retail Chain': Store,
  Exporter: Ship,
  'Government Procurement': Building2,
  'Digital Marketplace': Smartphone,
  'Direct Trader': Users,
};

const CHANNEL_COLOR = {
  APMC: 'bg-slate-100 text-slate-700',
  eNAM: 'bg-intel-50 text-intel-700',
  Processor: 'bg-warn-50 text-warn-700',
  'Retail Chain': 'bg-agri-50 text-agri-700',
  Exporter: 'bg-purple-50 text-purple-700',
  'Government Procurement': 'bg-blue-50 text-blue-700',
  'Digital Marketplace': 'bg-pink-50 text-pink-700',
  'Direct Trader': 'bg-slate-100 text-slate-700',
};

export default function MultiChannelTable({ ranked }) {
  if (!ranked?.length) return <p className="text-slate-500 text-sm">No opportunities found across any channel for this crop.</p>;
  const bestLabel = ranked[0]?.label;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            <th className="py-2 pr-4 font-medium">Opportunity</th>
            <th className="py-2 pr-4 font-medium">Channel</th>
            <th className="py-2 pr-4 font-medium">Price</th>
            <th className="py-2 pr-4 font-medium">Transport</th>
            <th className="py-2 pr-4 font-medium">Net Realisation</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((opt) => {
            const Icon = CHANNEL_ICON[opt.channel] || Users;
            const isBest = opt.label === bestLabel;
            return (
              <tr key={`${opt.channelGroup}-${opt.label}`} className={`border-b border-slate-100 ${isBest ? 'bg-agri-50/60' : ''}`}>
                <td className="py-3 pr-4 font-medium text-slate-800">
                  {opt.label} {isBest && <span className="badge bg-agri-100 text-agri-700 ml-1">Best</span>}
                  {opt.gradeMismatch && <span className="badge bg-warn-50 text-warn-700 ml-1 text-[10px]">Grade mismatch</span>}
                </td>
                <td className="py-3 pr-4">
                  <span className={`badge ${CHANNEL_COLOR[opt.channel] || 'bg-slate-100 text-slate-700'}`}><Icon size={12} /> {opt.channel}</span>
                </td>
                <td className="py-3 pr-4 text-slate-600">₹{opt.sellingPricePerKg}/kg</td>
                <td className="py-3 pr-4 text-slate-600">₹{opt.transportCostPerKg?.toFixed(2)}/kg</td>
                <td className="py-3 pr-4 font-bold text-agri-700">₹{opt.breakdown.netRealization}/kg</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}