import { Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/guards/ProtectedRoute';
import DriverRoute from './components/guards/DriverRoute';
import PassengerRoute from './components/guards/PassengerRoute';
import GuestOnlyRoute from './components/guards/GuestOnlyRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import RequestRidePage from './pages/RequestRidePage';
import TripDetailPage from './pages/TripDetailPage';
import DriverDashboardPage from './pages/DriverDashboardPage';
import BecomeDriverPage from './pages/BecomeDriverPage';
import PaymentPage from './pages/PaymentPage';
import RateTripPage from './pages/RateTripPage';
import NotFoundPage from './pages/NotFoundPage';

const App = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />

        <Route element={<GuestOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<PassengerRoute />}>
          <Route path="/become-driver" element={<BecomeDriverPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<DashboardLayout />}>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/trip/:tripId" element={<TripDetailPage />} />
          <Route path="/rate/:tripId" element={<RateTripPage />} />
        </Route>

        <Route element={<PassengerRoute />}>
          <Route path="/request-ride" element={<RequestRidePage />} />
          <Route path="/payment/:tripId" element={<PaymentPage />} />
        </Route>

        <Route element={<DriverRoute />}>
          <Route path="/driver" element={<DriverDashboardPage />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;
