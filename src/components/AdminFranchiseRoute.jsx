import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminFranchiseRoute({ children }) {
  const { user, isAdmin, isFranchise } = useAuth();

  if (!user || !(isAdmin || isFranchise)) {
    return <Navigate to="/" />;
  }

  return children;
}