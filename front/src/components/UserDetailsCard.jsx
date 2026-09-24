// components/UserDetailsCard.jsx
//
// Shared "account" popover opened from the "Add user" button in
// RoleLayout's header. Same trigger for all three roles, but the
// content adapts:
//   - farmer: read-only details pulled from FarmerContext (no login
//     session exists for a farmer — see FarmerContext.jsx — so there's
//     nothing to edit and nowhere to "sign out" back to).
//   - fpo / buyer: details pulled from AuthContext's `profile`, with
//     Edit (inline form, saved via AuthContext.updateProfile) and
//     Sign Out actions, since these two roles are real logged-in
//     accounts (see RequireAuth.jsx).
//
// Mirrors LanguageSwitcher.jsx's dropdown pattern (ref + click-outside
// listener) so it behaves consistently with the rest of the header.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, X, Pencil, LogOut, Save, Loader2, Phone, Mail, MapPin, Sprout } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useOptionalFarmer } from '../context/FarmerContext.jsx';

// Which profile fields are shown (and, for fpo/buyer, editable) per role.
// `path` supports one level of nesting (e.g. "location.district") since
// both fpo and buyer profiles store location as a nested object.
const FIELD_CONFIG = {
  fpo: [
    { key: 'organizationName', label: 'Organization', editable: false },
    { key: 'registrationNumber', label: 'Registration No.', editable: false },
    { key: 'contactPerson', label: 'Contact Person', editable: true },
    { key: 'phone', label: 'Phone', editable: true },
    { key: 'email', label: 'Email', editable: true },
    { key: 'memberCount', label: 'Members', editable: true, type: 'number' },
    { key: 'location.village', label: 'Village', editable: true },
    { key: 'location.district', label: 'District', editable: true },
    { key: 'location.state', label: 'State', editable: true },
  ],
  buyer: [
    { key: 'companyName', label: 'Company', editable: false },
    { key: 'gstin', label: 'GSTIN', editable: false },
    { key: 'contactPerson', label: 'Contact Person', editable: true },
    { key: 'phone', label: 'Phone', editable: true },
    { key: 'email', label: 'Email', editable: true },
    { key: 'businessType', label: 'Business Type', editable: true },
    { key: 'location.district', label: 'District', editable: true },
    { key: 'location.state', label: 'State', editable: true },
  ],
};

function getPath(obj, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  const out = { ...obj };
  if (keys.length === 1) { out[keys[0]] = value; return out; }
  const [head, ...rest] = keys;
  out[head] = setPath(out[head] || {}, rest.join('.'), value);
  return out;
}

function AccountRow({ icon: Icon, label, value, editable, editing, inputValue, onChange, type }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      {Icon && <Icon size={14} className="text-slate-400 mt-1.5 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        {editing && editable ? (
          <input
            type={type || 'text'}
            className="input !mt-0.5 !py-1.5 text-sm"
            value={inputValue ?? ''}
            onChange={onChange}
          />
        ) : (
          <p className="text-sm font-medium text-slate-800 break-words">{value || '—'}</p>
        )}
      </div>
    </div>
  );
}

export default function UserDetailsCard({ role }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);
  const navigate = useNavigate();

  const isAccountRole = role === 'fpo' || role === 'buyer';
  const { profile, displayName, updateProfile, logout } = useAuth();
  // Farmer has no auth session — useOptionalFarmer returns null (instead
  // of throwing) when there's no FarmerProvider above in the tree, so
  // this component stays safe to render from every role's RoleLayout.
  const farmerCtx = useOptionalFarmer();
  const farmer = farmerCtx?.farmer;

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setEditing(false); }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const fields = FIELD_CONFIG[role] || [];

  const startEdit = () => {
    setDraft(profile || {});
    setError('');
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setDraft(null); setError(''); };

  const handleFieldChange = (path) => (e) => {
    setDraft((d) => setPath(d || {}, path, e.target.value));
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await updateProfile(draft);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Could not save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  const name = isAccountRole
    ? (displayName || profile?.contactPerson || 'Account')
    : (farmer?.name || 'Farmer');

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Account details"
        aria-label="Account details"
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600 hover:bg-slate-100 rounded-lg px-2 py-1.5 border border-slate-200"
      >
        <User size={14} />
        <span className="hidden sm:inline max-w-[9rem] truncate">{name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-[28rem] overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-agri-50 text-agri-700 flex items-center justify-center shrink-0">
                {isAccountRole ? <User size={16} /> : <Sprout size={16} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
                <p className="text-[11px] text-slate-400 capitalize">{role} account</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setOpen(false); setEditing(false); }}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 shrink-0"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-4 py-2">
            {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-2.5 py-1.5 mb-1.5">{error}</p>}

            {isAccountRole ? (
              fields.map((f) => (
                <AccountRow
                  key={f.key}
                  label={f.label}
                  value={getPath(profile, f.key)}
                  editable={f.editable}
                  editing={editing}
                  type={f.type}
                  inputValue={getPath(draft, f.key)}
                  onChange={handleFieldChange(f.key)}
                />
              ))
            ) : (
              <>
                <AccountRow icon={Phone} label="Phone" value={farmer?.phone} />
                <AccountRow
                  icon={MapPin}
                  label="Location"
                  value={[farmer?.location?.village, farmer?.location?.district, farmer?.location?.state].filter(Boolean).join(', ')}
                />
                {farmer?.currentCrop?.crop && (
                  <AccountRow
                    icon={Sprout}
                    label="Current Crop"
                    value={`${farmer.currentCrop.crop} · ${farmer.currentCrop.quantityTonnes ?? '—'} t · Grade ${farmer.currentCrop.grade ?? '—'}`}
                  />
                )}
              </>
            )}
          </div>

          {/* Edit / Sign out are only offered for fpo and buyer — a farmer
              has no login session (see FarmerContext.jsx), so there is
              nothing to sign out of here. */}
          {isAccountRole && (
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-slate-100">
              {editing ? (
                <>
                  <button type="button" onClick={cancelEdit} className="btn-secondary !px-3 !py-1.5 text-xs">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary !px-3 !py-1.5 text-xs disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={startEdit} className="btn-secondary !px-3 !py-1.5 text-xs">
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl"
                  >
                    <LogOut size={13} /> Sign Out
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
