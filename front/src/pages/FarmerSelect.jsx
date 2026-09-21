// pages/FarmerSelect.jsx — "which farmer's dashboard am I viewing?"
//
// Shows tiles of existing farmers PLUS a "New Farmer" card.
// Clicking "New Farmer" opens a simple inline form: name (required),
// phone (optional), crop (required) — no password needed.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MapPin, Wheat, Plus, X, ChevronRight, UserRound } from 'lucide-react';
import { api } from '../api/client.js';

const COMMON_CROPS = [
  'Tomato', 'Onion', 'Potato', 'Paddy', 'Wheat', 'Cotton',
  'Maize', 'Soybean', 'Sugarcane', 'Groundnut', 'Banana', 'Mango',
  'Chilli', 'Turmeric', 'Brinjal', 'Cabbage', 'Cauliflower', 'Carrot',
];

export default function FarmerSelect() {
  const navigate = useNavigate();
  const [farmers, setFarmers] = useState(null);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', crop: '', quantityTonnes: '', grade: 'A' });
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);

  const loadFarmers = () => {
    api.listFarmers()
      .then((res) => setFarmers(res.farmers))
      .catch((err) => setError(err.message));
  };

  useEffect(() => { loadFarmers(); }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.crop.trim()) { setFormError('Crop is required'); return; }
    setCreating(true);
    try {
      const res = await api.quickCreateFarmer({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        crop: form.crop.trim(),
        quantityTonnes: form.quantityTonnes ? Number(form.quantityTonnes) : 1,
        grade: form.grade,
      });
      // Navigate directly to the new farmer's dashboard
      navigate(`/farmer/${res.farmer._id}`);
    } catch (err) {
      setFormError(err.message);
      setCreating(false);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setForm({ name: '', phone: '', crop: '', quantityTonnes: '', grade: 'A' });
    setFormError('');
  };

  if (error) return <p className="text-sm text-red-500 p-4">{error}</p>;
  if (!farmers) return (
    <div className="flex items-center gap-2 text-slate-500 p-4">
      <Loader2 className="animate-spin" size={16} /> Loading farmers…
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Whose dashboard?</h1>
        <p className="text-slate-500 text-sm mt-1">
          Select an existing farmer or add a new one to view their selling dashboard.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {/* Existing farmer tiles */}
        {farmers.map((f) => (
          <button
            key={f._id}
            onClick={() => navigate(`/farmer/${f._id}`)}
            className="card text-left hover:shadow-md hover:border-agri-300 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-agri-50 text-agri-700 flex items-center justify-center shrink-0">
                <Wheat size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 truncate">{f.name}</p>
                {(f.location?.district || f.location?.state) && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                    <MapPin size={10} />
                    {[f.location?.district, f.location?.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-agri-500 shrink-0 transition-colors" />
            </div>
            {f.currentCrop?.crop && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 text-xs bg-agri-50 text-agri-700 px-2 py-0.5 rounded-full font-medium">
                  {f.currentCrop.crop}
                </span>
                {f.currentCrop.quantityTonnes && (
                  <span className="text-xs text-slate-400">{f.currentCrop.quantityTonnes}T</span>
                )}
                {f.currentCrop.grade && (
                  <span className="text-xs text-slate-400">Grade {f.currentCrop.grade}</span>
                )}
              </div>
            )}
          </button>
        ))}

        {/* Add New Farmer tile / form */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="card text-left border-dashed border-2 border-slate-200 hover:border-agri-300 hover:bg-agri-50/30 transition-all group flex flex-col items-center justify-center gap-2 py-8"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 group-hover:bg-agri-100 group-hover:text-agri-600 flex items-center justify-center transition-colors">
              <Plus size={20} />
            </div>
            <p className="font-semibold text-slate-500 group-hover:text-agri-700 transition-colors">Add New Farmer</p>
            <p className="text-xs text-slate-400 text-center">Just name &amp; crop needed</p>
          </button>
        ) : (
          <div className="card col-span-full sm:col-span-2 border-agri-200 bg-agri-50/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-agri-100 text-agri-700 flex items-center justify-center">
                  <UserRound size={16} />
                </div>
                <h2 className="font-bold text-slate-800">New Farmer</h2>
              </div>
              <button onClick={cancelForm} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{formError}</p>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                {/* Name - mandatory */}
                <label className="block sm:col-span-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Farmer Name <span className="text-agri-600">*</span>
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={set('name')}
                    required
                    placeholder="e.g. Ramesh Kumar"
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-agri-400 bg-white"
                  />
                </label>

                {/* Phone - optional */}
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">
                    Phone Number <span className="text-slate-400 font-normal">(optional)</span>
                  </span>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="e.g. 9876543210"
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-agri-400 bg-white"
                  />
                </label>

                {/* Crop - mandatory */}
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">
                    Crop <span className="text-agri-600">*</span>
                  </span>
                  <select
                    value={form.crop}
                    onChange={set('crop')}
                    required
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-agri-400 bg-white"
                  >
                    <option value="">Select crop…</option>
                    {COMMON_CROPS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>

                {/* Quantity - optional */}
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">
                    Quantity (tonnes) <span className="text-slate-400 font-normal">(optional)</span>
                  </span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={form.quantityTonnes}
                    onChange={set('quantityTonnes')}
                    placeholder="e.g. 5"
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-agri-400 bg-white"
                  />
                </label>

                {/* Grade - optional */}
                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Grade</span>
                  <select
                    value={form.grade}
                    onChange={set('grade')}
                    className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-agri-400 bg-white"
                  >
                    <option value="A">Grade A (Best)</option>
                    <option value="B">Grade B (Good)</option>
                    <option value="C">Grade C (Standard)</option>
                  </select>
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1 justify-center"
                >
                  {creating ? (
                    <><Loader2 size={14} className="animate-spin" /> Creating…</>
                  ) : (
                    <><Plus size={14} /> Create &amp; Open Dashboard</>
                  )}
                </button>
                <button type="button" onClick={cancelForm} className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
