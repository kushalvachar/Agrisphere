// pages/Auth.jsx — Farmer + FPO + Buyer Authentication.
// Farmer onboarding is intentionally kept SIMPLE: just name (required),
// phone (optional), and crop (required) — no password, no account complexity.
// The farmer is created via quick-create and taken straight to their dashboard.
// FPO and Buyer roles still use full registration + login (they need accounts
// for data scoping and verification workflows).
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Sprout, Wheat, Users2, Factory, Loader2, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';

const ROLE_META = {
  farmer: { label: 'Farmer', icon: Wheat, tone: 'agri' },
  fpo: { label: 'FPO / Producer Group', icon: Users2, tone: 'intel' },
  buyer: { label: 'Buyer', icon: Factory, tone: 'warn' },
};

// One-click demo login (feature request: "easy login for explaining
// prototype"). These accounts are created by `npm run seed` in
// backend/src/seed/seed.js (see DEMO_FPO_LOGIN/DEMO_BUYER_LOGIN there —
// keep this in sync if that ever changes) and sign into a specific,
// already-populated FPO/Buyer profile, so a presenter can jump straight
// into a realistic dashboard without registering an account live.
// Deliberately NOT offered for the farmer role: farmer onboarding is
// already a single no-password form (FarmerQuickEntry below), so a demo
// credential would just be a second, more roundabout way to do the same
// thing.
const DEMO_LOGIN = {
  fpo: { identifier: 'fpo-demo@agrisphere.in', password: 'Demo@1234', accountLabel: 'Kolar Tomato Producers FPO' },
  buyer: { identifier: 'buyer-demo@agrisphere.in', password: 'Demo@1234', accountLabel: 'ABC Foods (Demo)' },
};

const COMMON_CROPS = [
  'Tomato', 'Onion', 'Potato', 'Paddy', 'Wheat', 'Cotton',
  'Maize', 'Soybean', 'Sugarcane', 'Groundnut', 'Banana', 'Mango',
  'Chilli', 'Turmeric', 'Brinjal', 'Cabbage', 'Cauliflower', 'Carrot',
];

// ── Farmer: Simple quick-entry form (no password/account) ────────────────────
function FarmerQuickEntry() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', crop: '', quantityTonnes: '', grade: 'A' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Your name is required'); return; }
    if (!form.crop) { setError('Please select your crop'); return; }
    setLoading(true);
    try {
      const res = await api.quickCreateFarmer({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        crop: form.crop,
        quantityTonnes: form.quantityTonnes ? Number(form.quantityTonnes) : 1,
        grade: form.grade,
      });
      navigate(`/farmer/${res.farmer._id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-700 bg-red-50 rounded-xl px-3 py-2">{error}</p>
      )}

      {/* Name - mandatory */}
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">
          Your Name <span className="text-agri-600">*</span>
        </span>
        <input
          type="text"
          value={form.name}
          onChange={set('name')}
          required
          placeholder="e.g. Ramesh Kumar"
          className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-agri-400 focus:ring-2 focus:ring-agri-100"
        />
      </label>

      {/* Phone - optional */}
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">
          Phone Number{' '}
          <span className="text-slate-400 font-normal text-xs">(optional)</span>
        </span>
        <input
          type="tel"
          value={form.phone}
          onChange={set('phone')}
          placeholder="e.g. 9876543210"
          className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-agri-400 focus:ring-2 focus:ring-agri-100"
        />
      </label>

      {/* Crop - mandatory */}
      <label className="block">
        <span className="text-sm font-semibold text-slate-700">
          Your Crop <span className="text-agri-600">*</span>
        </span>
        <select
          value={form.crop}
          onChange={set('crop')}
          required
          className="mt-1.5 w-full border border-slate-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-agri-400 focus:ring-2 focus:ring-agri-100 bg-white"
        >
          <option value="">Select your crop…</option>
          {COMMON_CROPS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      {/* Quantity + Grade row - optional */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">
            Quantity (T) <span className="text-slate-400 font-normal">(optional)</span>
          </span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={form.quantityTonnes}
            onChange={set('quantityTonnes')}
            placeholder="e.g. 5"
            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-agri-400"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">Grade</span>
          <select
            value={form.grade}
            onChange={set('grade')}
            className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-agri-400 bg-white"
          >
            <option value="A">A – Best</option>
            <option value="B">B – Good</option>
            <option value="C">C – Standard</option>
          </select>
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full justify-center mt-2 py-3 text-base"
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Setting up…</>
        ) : (
          <>Go to My Dashboard <ArrowRight size={16} /></>
        )}
      </button>

      <p className="text-xs text-slate-400 text-center">
        Already added? <Link to="/farmer/select" className="text-agri-600 hover:underline">Pick your profile</Link>
      </p>
    </form>
  );
}

// ── FPO / Buyer: Full registration + login ───────────────────────────────────
function FullAuth({ role }) {
  const navigate = useNavigate();
  const { login, registerFPO, registerBuyer, loading } = useAuth();
  const [mode, setMode] = useState('register');
  const [error, setError] = useState('');
  const [form, setForm] = useState({});
  const [demoLoading, setDemoLoading] = useState(false);
  const demoCreds = DEMO_LOGIN[role] || DEMO_LOGIN.buyer; // guard against an unexpected :role in the URL

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const goToDashboard = (user) => navigate(`/${user.role}`);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try { goToDashboard(await login(form.identifier, form.password)); }
    catch (err) { setError(err.message); }
  };

  // One-click demo login — signs straight in with the seeded demo
  // account instead of making the presenter type credentials on stage.
  // Uses the same `login()` call as the manual form, just with the demo
  // identifier/password filled in for them (and shown below the button,
  // so they can also type it manually if the seed data is ever different).
  const handleDemoLogin = async () => {
    setError(''); setDemoLoading(true);
    try { goToDashboard(await login(demoCreds.identifier, demoCreds.password)); }
    catch (err) { setError(`Demo login failed — has "npm run seed" been run on this backend? (${err.message})`); }
    finally { setDemoLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      let user;
      if (role === 'fpo') {
        user = await registerFPO({
          organizationName: form.organizationName, registrationNumber: form.registrationNumber,
          contactPerson: form.contactPerson, phone: form.phone, email: form.email, password: form.password,
          memberCount: form.memberCount ? Number(form.memberCount) : undefined,
          location: { village: form.village, district: form.district, state: form.state },
        });
      } else {
        user = await registerBuyer({
          companyName: form.companyName, gstin: form.gstin, contactPerson: form.contactPerson,
          phone: form.phone, email: form.email, password: form.password, businessType: form.businessType,
          location: { district: form.district, state: form.state },
        });
      }
      goToDashboard(user);
    } catch (err) { setError(err.message); }
  };

  return (
    <>
      {/* One-click demo login (see DEMO_LOGIN above) */}
      <button
        type="button"
        onClick={handleDemoLogin}
        disabled={demoLoading || loading}
        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-intel-300 bg-intel-50 text-intel-700 font-semibold text-sm py-2.5 mb-2 hover:bg-intel-100 disabled:opacity-60"
      >
        {demoLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        Try Demo {ROLE_META[role].label} Account
      </button>
      <p className="text-[11px] text-slate-400 text-center mb-4">
        Signs in as "{demoCreds.accountLabel}" · {demoCreds.identifier} / {demoCreds.password}
      </p>

      <div className="flex rounded-xl border border-slate-200 overflow-hidden mb-5">
        <button onClick={() => setMode('register')} className={`flex-1 py-2 text-sm font-medium ${mode === 'register' ? 'bg-agri-600 text-white' : 'bg-white text-slate-600'}`}>New here? Register</button>
        <button onClick={() => setMode('login')} className={`flex-1 py-2 text-sm font-medium ${mode === 'login' ? 'bg-agri-600 text-white' : 'bg-white text-slate-600'}`}>Login</button>
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>}

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="space-y-3">
          <Field label="Email" type="email" value={form.identifier} onChange={set('identifier')} required />
          <Field label="Password" type="password" value={form.password} onChange={set('password')} required />
          <SubmitButton loading={loading} label="Login" />
        </form>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3">
          {role === 'fpo' && (
            <>
              <Field label="Organization Name" value={form.organizationName} onChange={set('organizationName')} required />
              <Field label="Registration Number" value={form.registrationNumber} onChange={set('registrationNumber')} required />
              <Field label="Contact Person" value={form.contactPerson} onChange={set('contactPerson')} required />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" value={form.phone} onChange={set('phone')} required />
                <Field label="Email" type="email" value={form.email} onChange={set('email')} required />
              </div>
              <Field label="Password" type="password" value={form.password} onChange={set('password')} required />
              <Field label="Member Count (optional)" type="number" value={form.memberCount} onChange={set('memberCount')} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="District" value={form.district} onChange={set('district')} />
                <Field label="State" value={form.state} onChange={set('state')} />
              </div>
              <p className="text-xs text-slate-400">Account starts "Pending Verification" — you can use the platform immediately.</p>
            </>
          )}
          {role === 'buyer' && (
            <>
              <Field label="Company Name" value={form.companyName} onChange={set('companyName')} required />
              <Field label="GSTIN" value={form.gstin} onChange={set('gstin')} required placeholder="e.g. 27AAPFU0939F1ZV" />
              <Field label="Contact Person" value={form.contactPerson} onChange={set('contactPerson')} required />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" value={form.phone} onChange={set('phone')} required />
                <Field label="Email" type="email" value={form.email} onChange={set('email')} required />
              </div>
              <Field label="Password" type="password" value={form.password} onChange={set('password')} required />
              <Field label="Business Type (optional)" value={form.businessType} onChange={set('businessType')} placeholder="e.g. Private Limited" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="District" value={form.district} onChange={set('district')} />
                <Field label="State" value={form.state} onChange={set('state')} />
              </div>
              <p className="text-xs text-slate-400">GSTIN verified with government checksum. Full KYC review after registration.</p>
            </>
          )}
          <SubmitButton loading={loading} label="Create Account" />
        </form>
      )}
    </>
  );
}

// ── Page shell ───────────────────────────────────────────────────────────────
export default function Auth() {
  const { role } = useParams();
  const meta = ROLE_META[role] || ROLE_META.farmer;
  const Icon = meta.icon;
  const isFarmer = role === 'farmer';

  return (
    <div className="min-h-screen bg-gradient-to-b from-agri-50 via-white to-white flex flex-col">
      <header className="max-w-md w-full mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5">
          <ArrowLeft size={15} /> Back
        </Link>
        <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
          <Sprout size={16} className="text-agri-600" /> AgriSphere AI
        </span>
      </header>

      <div className="max-w-md w-full mx-auto px-6 pb-16 flex-1">
        <div className="card">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-agri-50 flex items-center justify-center text-agri-700">
              <Icon size={22} />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-800">
                {isFarmer ? 'Enter Your Details' : `${meta.label} ${meta.label === 'Farmer' ? '' : 'Portal'}`}
              </h1>
              <p className="text-xs text-slate-400">
                {isFarmer
                  ? 'Quick setup — no password needed'
                  : 'Real account — data is scoped to you'}
              </p>
            </div>
          </div>

          {isFarmer ? <FarmerQuickEntry /> : <FullAuth role={role} />}
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange, required, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input
        type={type}
        value={value || ''}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-agri-400"
      />
    </label>
  );
}

function SubmitButton({ loading, label }) {
  return (
    <button type="submit" disabled={loading} className="btn-primary w-full justify-center mt-2">
      {loading ? <Loader2 size={16} className="animate-spin" /> : label}
    </button>
  );
}