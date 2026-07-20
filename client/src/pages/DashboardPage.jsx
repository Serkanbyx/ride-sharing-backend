import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Car, Navigation } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import * as tripService from '../api/tripService';
import * as driverService from '../api/driverService';
import AvailabilityToggle from '../components/AvailabilityToggle';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import TripCard from '../components/TripCard';

const TripListSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((item) => (
      <div key={item} className="card animate-pulse space-y-3">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    ))}
  </div>
);

const ActiveTripCard = ({ trip }) => {
  const fare = trip.finalFare ?? trip.estimatedFare;

  return (
    <div className="card border-primary/20 bg-primary/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">
            Active Trip
          </p>
          <p className="mt-2 font-medium text-gray-900 dark:text-gray-100">
            {trip.pickupAddress}
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            to {trip.destinationAddress}
          </p>
        </div>
        <StatusBadge status={trip.status} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        {fare != null ? (
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            ${fare.toFixed(2)}
          </span>
        ) : (
          <span />
        )}
        <Link
          to={`/trip/${trip._id}`}
          className="text-sm font-medium text-primary hover:text-primary-dark"
        >
          View trip
        </Link>
      </div>
    </div>
  );
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, isDriver, isPassenger } = useAuth();
  const [activeTrip, setActiveTrip] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [driverProfile, setDriverProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      try {
        const requests = [
          tripService.getActiveTrip(),
          tripService.getMyTrips({ limit: 5 }),
        ];

        if (isDriver) {
          requests.push(driverService.getMyDriverProfile());
        }

        const [activeResponse, tripsResponse, driverResponse] =
          await Promise.all(requests);

        setActiveTrip(activeResponse.data);
        setRecentTrips(tripsResponse.data?.items || []);

        if (driverResponse) {
          setDriverProfile(driverResponse.data);
        }
      } catch (error) {
        toast.error(error.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [isDriver]);

  const handleAvailabilityChange = async (isAvailable) => {
    setAvailabilityLoading(true);

    try {
      const response = await driverService.toggleAvailability(isAvailable);
      setDriverProfile(response.data);
      toast.success(isAvailable ? 'You are now online' : 'You are now offline');
    } catch (error) {
      toast.error(error.message || 'Failed to update availability');
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const renderActiveTripSection = () => {
    if (loading) {
      return (
        <div className="card animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      );
    }

    if (activeTrip) {
      return <ActiveTripCard trip={activeTrip} />;
    }

    if (isPassenger) {
      return (
        <EmptyState
          icon={Car}
          title="Ready for your next ride?"
          message="You do not have an active trip right now."
          actionLabel="Request a Ride"
          onAction={() => navigate('/request-ride')}
        />
      );
    }

    return (
      <EmptyState
        icon={Navigation}
        title="No active trip"
        message="Go online in the driver panel to receive ride offers."
        actionLabel="Open Driver Panel"
        onAction={() => navigate('/driver')}
      />
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1>Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Welcome back, {user?.name}
        </p>
      </div>

      {isDriver && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Driver shortcuts</h2>
            <Link to="/driver" className="btn-secondary">
              Open Driver Panel
            </Link>
          </div>

          {driverProfile && (
            <AvailabilityToggle
              isAvailable={driverProfile.isAvailable}
              onChange={handleAvailabilityChange}
              disabled={availabilityLoading || driverProfile.isOnTrip}
            />
          )}
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Active trip</h2>
        {renderActiveTripSection()}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recent trips</h2>
        {loading ? (
          <TripListSkeleton />
        ) : recentTrips.length > 0 ? (
          <div className="space-y-4">
            {recentTrips.map((trip) => (
              <TripCard key={trip._id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="card text-center text-sm text-gray-600 dark:text-gray-400">
            No recent trips yet.
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardPage;
