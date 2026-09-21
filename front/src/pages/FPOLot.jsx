import { useState } from 'react';
import { Plus, Trash2, Boxes } from 'lucide-react';
import { api } from '../api/client.js';

export default function FPOLot() {
  const [crop, setCrop] = useState('Tomato');
  const [grade, setGrade] = useState('A');
  const [contributions, setContributions] = useState([
    { farmerName: 'Farmer A', quantityTonnes: 2 },
    { farmerName: 'Farmer B', quantityTonnes: 3 },
    { farmerName: 'Farmer C', quantityTonnes: 5 },
  ]);
  const [lot, setLot] = useState(null);
  const [compatibleBuyers, setCompatibleBuyers] = useState([]);

  const updateContribution = (i, field, value) => {
    setContributions((c) => c.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  };
  const addRow = () => setContributions((c) => [...c, { farmerName: '', quantityTonnes: 0 }]);
  const removeRow = (i) => setContributions((c) => c.filter((_, idx) => idx !== i));

  const total = contributions.reduce((s, c) => s + Number(c.quantityTonnes || 0), 0);

  const createLot = async () => {
    const res = await api.createLot({ crop, grade, contributions });
    const detail = await api.getLot(res.lot._id);
    setLot(detail.lot);
    setCompatibleBuyers(detail.compatibleBuyers);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">FPO Smart Lot Creation</h1>
      <p className="text-slate-500 text-sm -mt-4">Pool small individual quantities into one buyer-ready lot.</p>

      <div className="card space-y-4">
        <div className="flex gap-3">
          <div>
            <label className="text-xs text-slate-500">Crop</label>
            <select value={crop} onChange={(e) => setCrop(e.target.value)} className="block border border-slate-200 rounded-xl px-3 py-2 text-sm mt-1">
              {['Tomato', 'Onion', 'Potato', 'Paddy'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500">Grade</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="block border border-slate-200 rounded-xl px-3 py-2 text-sm mt-1">
              {['A', 'B', 'C'].map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {contributions.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={c.farmerName}
                onChange={(e) => updateContribution(i, 'farmerName', e.target.value)}
                placeholder="Farmer name"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="number"
                value={c.quantityTonnes}
                onChange={(e) => updateContribution(i, 'quantityTonnes', e.target.value)}
                placeholder="Tonnes"
                className="w-28 border border-slate-200 rounded-xl px-3 py-2 text-sm"
              />
              <button onClick={() => removeRow(i)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          ))}
          <button onClick={addRow} className="btn-secondary text-sm"><Plus size={14} /> Add farmer contribution</button>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-slate-600 text-sm">Total pooled: <b>{total} T</b> {crop} Grade {grade}</span>
          <button onClick={createLot} className="btn-primary"><Boxes size={16} /> Create Smart Lot</button>
        </div>
      </div>

      {lot && (
        <div className="card">
          <h2 className="font-bold text-slate-800 mb-2">Smart Lot Created</h2>
          <p className="text-3xl font-extrabold text-agri-700">{lot.totalQuantityTonnes} T {lot.crop}</p>
          <p className="text-slate-500 text-sm mb-4">Grade {lot.grade} · Status: {lot.status}</p>

          <h3 className="font-semibold text-slate-700 text-sm mb-2">Compatible Buyer Demand</h3>
          {compatibleBuyers.length ? (
            <ul className="space-y-2">
              {compatibleBuyers.map((b) => (
                <li key={b._id} className="flex justify-between text-sm border-b border-slate-100 pb-2">
                  <span>{b.name} — needs {b.quantityRequiredTonnes} T</span>
                  <span className="font-semibold text-agri-700">₹{b.offerPricePerKg}/kg</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No buyer currently needs a lot this size — try pooling more quantity.</p>
          )}
        </div>
      )}
    </div>
  );
}
