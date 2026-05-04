import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe } from './store/slices/authSlice';
import { connectSocket, disconnectSocket } from './services/socket';

// Pages
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import BillingPage from './pages/BillingPage';
import DeliveryPage from './pages/DeliveryPage';

// Components
import ProtectedRoute from './components/common/ProtectedRoute';
import NotificationToast from './components/common/NotificationToast';
import LoadingScreen from './components/common/LoadingScreen';

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, token } = useSelector((s) => s.auth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (token) {
        await dispatch(fetchMe());
      }
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      connectSocket(user.role);
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated, user]);

  if (loading) return <LoadingScreen />;

  const getDefaultRoute = () => {
    if (!isAuthenticated) return '/login';
    switch (user?.role) {
      case 'admin': return '/admin';
      case 'billing': return '/billing';
      case 'delivery': return '/delivery';
      default: return '/login';
    }
  };

  return (
    <>
      <NotificationToast />
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <LoginPage />} />

        <Route path="/admin/*" element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/billing" element={
          <ProtectedRoute roles={['admin', 'billing']}>
            <BillingPage />
          </ProtectedRoute>
        } />

        <Route path="/delivery" element={
          <ProtectedRoute roles={['admin', 'delivery']}>
            <DeliveryPage />
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to={getDefaultRoute()} />} />
        <Route path="*" element={<Navigate to={getDefaultRoute()} />} />
      </Routes>
    </>
  );
}

export default App;
