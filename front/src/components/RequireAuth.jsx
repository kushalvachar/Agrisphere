// components/RequireAuth.jsx — Phase 5: gates a role's dashboard behind
// a real logged-in session for that exact role. Anyone not logged in,
// or logged in as a different role, is sent to that role's login page
// instead of seeing someone else's dashboard shell render emptily.
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RequireAuth({ role, children }) {
  const { user } = useAuth();
  if (!user || user.role !== role) {
    return <Navigate to={`/auth/${role}`} replace />;
  }
  return children;
}
