// context/FarmerContext.jsx
//
// Makes the Farmer role "per farmer" instead of hardcoded to one farmer.
// Same idea as a cricket scorecard component being keyed by matchId:
// this context holds the selected farmerId, everything under /farmer/*
// reads the CURRENT farmer from here instead of a literal name/string.
//
// farmerId is persisted to sessionStorage so a refresh doesn't bounce
// you back to the picker, and it's also reflected in the URL
// (/farmer/:farmerId/...) so a dashboard link is shareable/bookmarkable.
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const FarmerContext = createContext(null);
const STORAGE_KEY = 'agrisphere.farmerId';

// Guards against the literal strings "undefined"/"null" — these show up
// in the URL (and then get persisted to sessionStorage) whenever some
// upstream code interpolates a missing id into a template string, e.g.
// `/farmer/${maybeUndefined}`. Treating them as "no id" here stops that
// bad value from being remembered and re-used on every future visit.
function isValidFarmerId(id) {
  return !!id && id !== 'undefined' && id !== 'null';
}

export function FarmerProvider({ farmerId, children }) {
  const valid = isValidFarmerId(farmerId);
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(valid);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!valid) {
      setFarmer(null);
      setLoading(false);
      // Self-heal: never let a bad id linger and get picked up again by
      // getRememberedFarmerId() on the next visit.
      sessionStorage.removeItem(STORAGE_KEY);
      if (farmerId) setError(`Invalid farmer link ("${farmerId}") — please log in again.`);
      return;
    }
    setLoading(true);
    setError('');
    sessionStorage.setItem(STORAGE_KEY, farmerId);
    api.getFarmer(farmerId)
      .then((res) => setFarmer(res.farmer))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [farmerId, valid]);

  return (
    <FarmerContext.Provider value={{ farmerId, farmer, loading, error }}>
      {children}
    </FarmerContext.Provider>
  );
}

export function useFarmer() {
  const ctx = useContext(FarmerContext);
  if (!ctx) throw new Error('useFarmer must be used within a FarmerProvider');
  return ctx;
}

// Feature: Voice Assistant. Same as useFarmer() but returns null instead
// of throwing when there's no FarmerProvider above in the tree — lets a
// globally-mounted component (the voice assistant widget, rendered on
// every role's layout, not just the Farmer role's) safely ask "is there
// a current farmer?" without needing to know in advance whether it's
// being rendered under /farmer/:farmerId or under /fpo, /buyer, /demo.
export function useOptionalFarmer() {
  return useContext(FarmerContext);
}

// Last-selected farmer, if any — lets "Continue as Farmer" skip straight
// back to the same dashboard on a return visit instead of always
// re-showing the picker.
export function getRememberedFarmerId() {
  const id = sessionStorage.getItem(STORAGE_KEY);
  return isValidFarmerId(id) ? id : null;
}