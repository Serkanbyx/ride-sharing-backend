import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../Spinner';

const DriverRoute = () => {
  const { loading, isAuthenticated, isDriver } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isDriver) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default DriverRoute;
