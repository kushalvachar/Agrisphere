// pages/BuyerRequirements.jsx — Feature: buyer posts a procurement requirement.
// Reuses the existing Buyer model/schema exactly (POST /api/buyers) —
// no new backend model. Institutional buyer types (Processor, Retail
// Chain, Exporter, Government Agency) are the same ones already used
// elsewhere in the app.
import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { api } from '../api/client.js';
import { BUYER_NAME } from './BuyerDashboard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const CROPS = ['Tomato', 'Onion', 'Potato', 'Paddy'];
const BUYER_TYPES = ['Trader/Aggregator', 'Processor', 'Retail Chain', 'Exporter', 'Government Agency'];

const emptyForm = {
  cropRequired: 'Tomato',
  buyerType: 'Trader/Aggregator',
  gradeRequired: 'A',
  quantityRequiredTonnes: 20,
  offerPricePerKg: 22,
  location: 'Bengaluru',
  distanceKm: 70,
  requiredByDate: '',
  qualitySpec: '',
  maxMoisturePct: '',
  sizeSpec: '',
  minPurityPct: '',
  deliverySchedule: '',
};

export default function BuyerRequirements() {
  const { displayName } = useAuth();
  const buyerName = displayName || BUYER_NAME; // Phase 5: real per-account identity
  const [form, setForm] = useState(emptyForm);
  const [requirements, setRequirements] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.getBuyers({ name: buyerName }).then((res) => setRequirements(res.buyers || []));
  useEffect(() => { load(); }, [buyerName]);

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.createBuyerRequirement({
        name: buyerName,
        buyerType: form.buyerType,
        channel: form.buyerType === 'Trader/Aggregator' ? 'Direct Trader' : form.buyerType,
        cropRequired: form.cropRequired,
        gradeRequired: form.gradeRequired,
        quantityRequiredTonnes: Number(form.quantityRequiredTonnes),
        offerPricePerKg: Number(form.offerPricePerKg),
        location: form.location,
        distanceKm: Number(form.distanceKm),
        requiredByDate: form.requiredByDate || undefined,
        deliveryLocation: form.location,
        budgetPerKg: Number(form.offerPricePerKg),
        requirements: (form.qualitySpec || form.deliverySchedule || form.maxMoisturePct || form.sizeSpec || form.minPurityPct) ? {
          qualitySpec: form.qualitySpec,
          deliverySchedule: form.deliverySchedule,
          gradeRequired: form.gradeRequired,
          maxMoisturePct: form.maxMoisturePct ? Number(form.maxMoisturePct) : undefined,
          sizeSpec: form.sizeSpec || undefined,
          minPurityPct: form.minPurityPct ? Number(form.minPurityPct) : undefined,
        } : undefined,
      });
      setForm(emptyForm);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2"><ClipboardList size={22} className="text-warn-600" /> Post a Procurement Requirement</h1>

      <div className="card grid sm:grid-cols-2 gap-3">
        <Field label="Crop">
          <select value={form.cropRequired} onChange={(e) => update('cropRequired', e.target.value)} className="input">
            {CROPS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Buyer Type">
          <select value={form.buyerType} onChange={(e) => update('buyerType', e.target.value)} className="input">
            {BUYER_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Grade Required">
          <select value={form.gradeRequired} onChange={(e) => update('gradeRequired', e.target.value)} className="input">
            {['A', 'B', 'C'].map((g) => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Quantity (Tonnes)">
          <input type="number" value={form.quantityRequiredTonnes} onChange={(e) => update('quantityRequiredTonnes', e.target.value)} className="input" />
        </Field>
        <Field label="Target Price (₹/kg)">
          <input type="number" value={form.offerPricePerKg} onChange={(e) => update('offerPricePerKg', e.target.value)} className="input" />
        </Field>
        <Field label="Required By">
          <input type="date" value={form.requiredByDate} onChange={(e) => update('requiredByDate', e.target.value)} className="input" />
        </Field>
        <Field label="Delivery Location">
          <input value={form.location} onChange={(e) => update('location', e.target.value)} className="input" />
        </Field>
        <Field label="Distance (km)">
          <input type="number" value={form.distanceKm} onChange={(e) => update('distanceKm', e.target.value)} className="input" />
        </Field>
        <Field label="Quality Spec (optional)" full>
          <input value={form.qualitySpec} onChange={(e) => update('qualitySpec', e.target.value)} className="input" placeholder="e.g. Uniform size, <5% defects" />
        </Field>
        <Field label="Max Moisture % (optional)">
          <input type="number" value={form.maxMoisturePct} onChange={(e) => update('maxMoisturePct', e.target.value)} className="input" placeholder="e.g. 12" />
        </Field>
        <Field label="Size Spec (optional)">
          <input value={form.sizeSpec} onChange={(e) => update('sizeSpec', e.target.value)} className="input" placeholder="e.g. 50-65mm" />
        </Field>
        <Field label="Min Purity % (optional)">
          <input type="number" value={form.minPurityPct} onChange={(e) => update('minPurityPct', e.target.value)} className="input" placeholder="e.g. 95" />
        </Field>
        <Field label="Delivery Schedule (optional)" full>
          <input value={form.deliverySchedule} onChange={(e) => update('deliverySchedule', e.target.value)} className="input" placeholder="e.g. Weekly, Mon/Thu dispatch" />
        </Field>

        <button onClick={submit} disabled={submitting} className="btn-primary sm:col-span-2 justify-center mt-2">
          Post Requirement
        </button>
      </div>

      <div className="card">
        <h2 className="font-bold text-slate-800 mb-3">Your Requirements</h2>
        {requirements.length ? (
          <ul className="divide-y divide-slate-100 text-sm">
            {requirements.map((r) => (
              <li key={r._id} className="py-2 flex justify-between">
                <span>{r.cropRequired} — Grade {r.gradeRequired} · {r.quantityRequiredTonnes}T</span>
                <span className="font-semibold text-agri-700">₹{r.offerPricePerKg}/kg</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No requirements posted yet.</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <label className={`block text-sm ${full ? 'sm:col-span-2' : ''}`}>
      <span className="text-slate-500 text-xs">{label}</span>
      {children}
    </label>
  );
}