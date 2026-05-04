import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useSelector((s) => s.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    // Redirect to appropriate dashboard
    const routes = { admin: '/admin', billing: '/billing', delivery: '/delivery' };
    return <Navigate to={routes[user?.role] || '/login'} replace />;
  }

  return children;
}
