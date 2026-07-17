import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../Spinner';

const PassengerRoute = () => {
  const { loading, isAuthenticated, isPassenger } = useAuth();

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

  if (!isPassenger) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PassengerRoute;
