// pages/MultiChannelComparison.jsx — Feature 5: Multi-Channel Market Comparison.
// Single dashboard ranking APMC, eNAM, processors, exporters, retail
// chains, government procurement, and digital marketplaces together —
// all on the same deterministic net-realization formula.
import { useEffect, useState } from 'react';
import { Boxes } from 'lucide-react';
import { api } from '../api/client.js';
import MultiChannelTable from '../components/MultiChannelTable.jsx';

const CROPS = ['Tomato', 'Onion', 'Potato', 'Paddy'];

export default function MultiChannelComparison() {
  const [crop, setCrop] = useState('Tomato');
  const [quantityTonnes, setQuantityTonnes] = useState(10);
  const [grade, setGrade] = useState('A');
  const [ranked, setRanked] = useState([]);
  const [byChannel, setByChannel] = useState({});

  useEffect(() => {
    api.compareChannels({ crop, quantityTonnes, grade }).then((res) => {
      setRanked(res.ranked || []);
      setByChannel(res.byChannel || {});
    });
  }, [crop, quantityTonnes, grade]);

  useEffect(() => {
    window.__agrisphereContext = { ...(window.__agrisphereContext || {}), multiChannelComparison: ranked };
  }, [ranked]);

  const channelCounts = Object.entries(byChannel).map(([channel, opts]) => ({ channel, count: opts.length }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><Boxes size={22} className="text-intel-600" /> Multi-Channel Market Comparison</h1>
        <div className="flex items-center gap-2">
          <select value={crop} onChange={(e) => setCrop(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
            {CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" value={quantityTonnes} onChange={(e) => setQuantityTonnes(e.target.value)} className="w-20 border border-slate-200 rounded-xl px-2 py-2 text-sm" />
          <select value={grade} onChange={(e) => setGrade(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm">
            {['A', 'B', 'C'].map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {channelCounts.map(({ channel, count }) => (
          <span key={channel} className="badge bg-slate-100 text-slate-600">{channel}: {count}</span>
        ))}
      </div>

      <div className="card">
        <h2 className="font-bold text-slate-800 mb-1">All Channels Compared — {crop}</h2>
        <p className="text-xs text-slate-400 mb-3">
          APMC mandis, eNAM listings, and every buyer channel (Processor, Retail Chain, Exporter, Government
          Procurement, Digital Marketplace, Direct Trader) ranked on the same net-realization formula.
        </p>
        <MultiChannelTable ranked={ranked} />
      </div>
    </div>
  );
}