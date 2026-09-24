// context/AuthContext.jsx — Phase 5: Buyer + FPO + Farmer Authentication.
//
// Holds the real logged-in session (JWT + profile) for whichever role
// is currently signed in. Token is persisted to localStorage so a
// refresh doesn't log the user out; api/client.js reads the same key
// to attach the Authorization header on every request.
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../api/client.js';

export const AUTH_TOKEN_KEY = 'agrisphere_auth_token';
export const AUTH_USER_KEY = 'agrisphere_auth_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const persist = useCallback((token, userObj) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userObj));
    setUser(userObj);
  }, []);

  const login = useCallback(async (identifier, password) => {
    setLoading(true);
    try {
      const res = await api.login({ identifier, password });
      persist(res.token, res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const registerFarmer = useCallback(async (payload) => {
    setLoading(true);
    try {
      const res = await api.registerFarmer(payload);
      persist(res.token, res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const registerFPO = useCallback(async (payload) => {
    setLoading(true);
    try {
      const res = await api.registerFPO(payload);
      persist(res.token, res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const registerBuyer = useCallback(async (payload) => {
    setLoading(true);
    try {
      const res = await api.registerBuyer(payload);
      persist(res.token, res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  // Backs the "Edit" action in components/UserDetailsCard.jsx. Sends the
  // edited profile fields (fpo/buyer only) to the backend, then merges
  // the response — or, failing that, the optimistic draft — into both
  // the stored session and local state so the popover reflects the
  // change immediately without a full re-login.
  const updateProfile = useCallback(async (profilePatch) => {
    setLoading(true);
    try {
      const res = await api.updateProfile(profilePatch);
      const nextUser = { ...user, profile: { ...user?.profile, ...(res.user?.profile || profilePatch) } };
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      return nextUser;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setUser(null);
  }, []);

  // Re-validate the stored session once on load — if the token has
  // expired or the account was removed, sign the user out cleanly
  // instead of leaving a stale profile displayed.
  useEffect(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) return;
    api.me().catch(() => logout());
  }, [logout]);

  const profile = user?.profile || null;
  const displayName = profile?.name || profile?.organizationName || null;

  return (
    <AuthContext.Provider value={{ user, profile, displayName, loading, login, registerFarmer, registerFPO, registerBuyer, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
