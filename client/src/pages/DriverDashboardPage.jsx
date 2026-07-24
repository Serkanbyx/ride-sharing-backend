import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Radio } from 'lucide-react';
import * as driverService from '../api/driverService';
import * as tripService from '../api/tripService';
import AvailabilityToggle from '../components/AvailabilityToggle';
import EmptyState from '../components/EmptyState';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import TripOfferCard from '../components/TripOfferCard';
import { useDriverLocation } from '../hooks/useDriverLocation';
import { useSocket } from '../contexts/SocketContext';

const STATUS_ACTIONS = {
  accepted: {
    label: "I'm on my way",
    nextStatus: 'driver_arriving',
    successMessage: 'Status updated: driver arriving',
  },
  driver_arriving: {
    label: 'Start trip',
    nextStatus: 'in_progress',
    successMessage: 'Trip started',
  },
  in_progress: {
    label: 'Complete trip',
    nextStatus: 'completed',
    successMessage: 'Trip completed',
  },
};

const formatOfferCancelReason = (reason) => {
  if (reason === 'assigned_to_another_driver') {
    return 'Another driver accepted this trip';
  }

  return 'Ride offer is no longer available';
};

const DriverDashboardPage = () => {
  const { socket, isConnected, joinTrip, leaveTrip } = useSocket();
  const [driverProfile, setDriverProfile] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [acceptingTripId, setAcceptingTripId] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const isTrackingLocation = Boolean(
    driverProfile?.isAvailable && !driverProfile?.isOnTrip
  );

  useDriverLocation(isTrackingLocation);

  const loadDashboard = useCallback(async () => {
    setLoading(true);

    try {
      const [profileResponse, activeTripResponse] = await Promise.all([
        driverService.getMyDriverProfile(),
        tripService.getActiveTrip(),
      ]);

      setDriverProfile(profileResponse.data);
      setActiveTrip(activeTripResponse.data);
    } catch (error) {
      toast.error(error.message || 'Failed to load driver dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!activeTrip?._id || !isConnected) {
      return undefined;
    }

    joinTrip(activeTrip._id);

    return () => {
      leaveTrip(activeTrip._id);
    };
  }, [activeTrip?._id, isConnected, joinTrip, leaveTrip]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleTripOffer = (offer) => {
      if (driverProfile?.isOnTrip) {
        return;
      }

      setOffers((current) => {
        if (current.some((item) => item.tripId === offer.tripId)) {
          return current;
        }

        return [...current, { ...offer, receivedAt: Date.now() }];
      });
    };

    const handleOfferCancelled = ({ tripId, reason }) => {
      setOffers((current) => current.filter((offer) => offer.tripId !== tripId));
      toast.error(formatOfferCancelReason(reason));
    };

    const handleTripTimeout = ({ tripId, message }) => {
      setOffers((current) => current.filter((offer) => offer.tripId !== tripId));
      toast.error(message || 'Trip offer expired');
    };

    const handleStatusChange = async (data) => {
      if (!activeTrip || data.tripId !== activeTrip._id) {
        return;
      }

      setActiveTrip((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          status: data.status,
          ...(data.eta != null ? { eta: data.eta } : {}),
        };
      });

      if (data.status === 'completed') {
        try {
          const [profileResponse, activeTripResponse] = await Promise.all([
            driverService.getMyDriverProfile(),
            tripService.getActiveTrip(),
          ]);
          setDriverProfile(profileResponse.data);
          setActiveTrip(activeTripResponse.data);
        } catch {
          // Keep optimistic status update if refetch fails.
        }
      }
    };

    socket.on('trip_offer', handleTripOffer);
    socket.on('offer_cancelled', handleOfferCancelled);
    socket.on('trip_timeout', handleTripTimeout);
    socket.on('trip_status_change', handleStatusChange);

    return () => {
      socket.off('trip_offer', handleTripOffer);
      socket.off('offer_cancelled', handleOfferCancelled);
      socket.off('trip_timeout', handleTripTimeout);
      socket.off('trip_status_change', handleStatusChange);
    };
  }, [socket, activeTrip, driverProfile?.isOnTrip]);

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

  const handleDismissOffer = (tripId) => {
    setOffers((current) => current.filter((offer) => offer.tripId !== tripId));
  };

  const handleAcceptOffer = async (tripId) => {
    if (acceptingTripId) {
      return;
    }

    setAcceptingTripId(tripId);

    try {
      const response = await tripService.acceptTrip(tripId);
      setActiveTrip(response.data);
      setOffers([]);
      toast.success('Trip accepted');

      const profileResponse = await driverService.getMyDriverProfile();
      setDriverProfile(profileResponse.data);
    } catch (error) {
      toast.error(error.message || 'Unable to accept trip');
      setOffers((current) => current.filter((offer) => offer.tripId !== tripId));
    } finally {
      setAcceptingTripId(null);
    }
  };

  const handleStatusAction = async () => {
    if (!activeTrip) {
      return;
    }

    const action = STATUS_ACTIONS[activeTrip.status];

    if (!action) {
      return;
    }

    setStatusUpdating(true);

    try {
      const response = await tripService.updateTripStatus(
        activeTrip._id,
        action.nextStatus
      );
      setActiveTrip(response.data);
      toast.success(action.successMessage);

      if (action.nextStatus === 'completed') {
        const profileResponse = await driverService.getMyDriverProfile();
        setDriverProfile(profileResponse.data);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update trip status');
    } finally {
      setStatusUpdating(false);
    }
  };

  const activeTripAction = useMemo(() => {
    if (!activeTrip) {
      return null;
    }

    return STATUS_ACTIONS[activeTrip.status] || null;
  }, [activeTrip]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1>Driver Panel</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage availability, accept offers, and update active trips.
        </p>
      </div>

      {driverProfile && (
        <AvailabilityToggle
          isAvailable={driverProfile.isAvailable}
          onChange={handleAvailabilityChange}
          disabled={availabilityLoading || driverProfile.isOnTrip}
        />
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Active trip</h2>

        {activeTrip ? (
          <div className="card space-y-4 border-primary/20 bg-primary/5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-primary">
                  Active Trip
                </p>
                <p className="mt-2 font-medium text-gray-900 dark:text-gray-100">
                  {activeTrip.pickupAddress}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  to {activeTrip.destinationAddress}
                </p>
              </div>
              <StatusBadge status={activeTrip.status} />
            </div>

            {activeTripAction && (
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-2"
                onClick={handleStatusAction}
                disabled={statusUpdating}
              >
                {statusUpdating ? <Spinner size="sm" /> : null}
                {statusUpdating ? 'Updating...' : activeTripAction.label}
              </button>
            )}

            <Link
              to={`/trip/${activeTrip._id}`}
              className="inline-block text-sm font-medium text-primary hover:text-primary-dark"
            >
              View trip details
            </Link>
          </div>
        ) : (
          <div className="card text-sm text-gray-600 dark:text-gray-400">
            No active trip right now.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Incoming offers</h2>

        {offers.length > 0 ? (
          <div className="space-y-4">
            {offers.map((offer) => (
              <TripOfferCard
                key={offer.tripId}
                offer={offer}
                onAccept={handleAcceptOffer}
                onDismiss={handleDismissOffer}
                isAccepting={acceptingTripId === offer.tripId}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Radio}
            title="Waiting for ride requests..."
            message={
              driverProfile?.isAvailable
                ? 'Stay online to receive nearby trip offers in real time.'
                : 'Go online to start receiving ride offers.'
            }
          />
        )}
      </section>
    </div>
  );
};

export default DriverDashboardPage;
