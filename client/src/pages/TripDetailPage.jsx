import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Clock, MapPin, Navigation, Star } from 'lucide-react';
import * as tripService from '../api/tripService';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const formatEta = (etaSeconds) => {
  if (etaSeconds == null) {
    return null;
  }

  const minutes = Math.max(1, Math.round(etaSeconds / 60));
  return `${minutes} min`;
};

const formatCancelledBy = (cancelledBy) => {
  if (!cancelledBy) {
    return 'Unknown';
  }

  return cancelledBy.charAt(0).toUpperCase() + cancelledBy.slice(1);
};

const TripDetailPage = () => {
  const { tripId } = useParams();
  const { user, isPassenger } = useAuth();
  const { socket, isConnected, joinTrip, leaveTrip } = useSocket();
  const [trip, setTrip] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadTrip = useCallback(async () => {
    setLoading(true);
    setAccessError('');

    try {
      const response = await tripService.getTrip(tripId);
      setTrip(response.data);
    } catch (error) {
      if (error.status === 403 || error.status === 404) {
        setAccessError(error.message || 'Trip not accessible');
        setTrip(null);
      } else {
        toast.error(error.message || 'Failed to load trip');
      }
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  useEffect(() => {
    if (!tripId || !isConnected) {
      return undefined;
    }

    joinTrip(tripId);

    return () => {
      leaveTrip(tripId);
    };
  }, [tripId, isConnected, joinTrip, leaveTrip]);

  useEffect(() => {
    if (!socket || !tripId) {
      return undefined;
    }

    const handleStatusChange = async (data) => {
      if (data.tripId !== tripId) {
        return;
      }

      setTrip((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          status: data.status,
          ...(data.eta != null ? { eta: data.eta } : {}),
        };
      });

      if (['accepted', 'cancelled', 'completed'].includes(data.status)) {
        try {
          const response = await tripService.getTrip(tripId);
          setTrip(response.data);
        } catch {
          // Keep optimistic status update if refetch fails.
        }
      }
    };

    const handleDriverLocationUpdate = (data) => {
      if (data.tripId !== tripId) {
        return;
      }

      setDriverLocation({
        lng: data.lng,
        lat: data.lat,
        heading: data.heading,
      });
    };

    const handleEtaUpdate = (data) => {
      if (data.tripId !== tripId) {
        return;
      }

      setTrip((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          eta: data.etaSeconds,
        };
      });
    };

    socket.on('trip_status_change', handleStatusChange);
    socket.on('driver_location_update', handleDriverLocationUpdate);
    socket.on('eta_update', handleEtaUpdate);

    return () => {
      socket.off('trip_status_change', handleStatusChange);
      socket.off('driver_location_update', handleDriverLocationUpdate);
      socket.off('eta_update', handleEtaUpdate);
    };
  }, [socket, tripId]);

  const canCancelTrip = useMemo(() => {
    if (!isPassenger || !trip || !user) {
      return false;
    }

    const isTripOwner = trip.passenger?._id === user._id || trip.passenger === user._id;

    if (!isTripOwner) {
      return false;
    }

    return ['requested', 'accepted', 'driver_arriving'].includes(trip.status);
  }, [isPassenger, trip, user]);

  const fareAmount = trip?.finalFare ?? trip?.estimatedFare;
  const etaLabel = formatEta(trip?.eta);
  const showSurge = trip?.surgeMultiplier != null && trip.surgeMultiplier > 1;
  const paymentPending =
    trip?.paymentInfo?.status !== 'succeeded' &&
    trip?.paymentInfo?.status !== 'processing';

  const handleCancelTrip = async () => {
    setIsCancelling(true);

    try {
      const response = await tripService.cancelTrip(tripId);
      setTrip(response.data);
      toast.success('Trip cancelled');
      setIsCancelModalOpen(false);
    } catch (error) {
      toast.error(error.message || 'Unable to cancel trip');
    } finally {
      setIsCancelling(false);
    }
  };

  const renderStatusContent = () => {
    if (!trip) {
      return null;
    }

    switch (trip.status) {
      case 'requested':
        return (
          <div className="flex items-center gap-3 rounded-lg bg-warning/10 px-4 py-3 text-warning">
            <Spinner size="sm" />
            <p className="text-sm font-medium">Searching for drivers...</p>
          </div>
        );

      case 'accepted': {
        const driverName = trip.driver?.user?.name || 'Your driver';
        const vehicle = trip.driver?.vehicle;

        return (
          <div className="rounded-lg bg-primary/5 px-4 py-3">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              {driverName} accepted your trip
            </p>
            {vehicle && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {vehicle.color} {vehicle.make} {vehicle.model} ·{' '}
                {vehicle.plateNumber}
              </p>
            )}
          </div>
        );
      }

      case 'driver_arriving':
        return (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary/5 px-4 py-3">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              Driver is on the way
            </p>
            {etaLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                ETA {etaLabel}
              </span>
            )}
          </div>
        );

      case 'in_progress':
        return (
          <div className="rounded-lg bg-success/10 px-4 py-3">
            <p className="font-medium text-success">Trip in progress</p>
            {driverLocation && (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Driver location updated live
              </p>
            )}
          </div>
        );

      case 'completed':
        return (
          <div className="space-y-4 rounded-lg bg-success/10 px-4 py-4">
            <p className="font-medium text-success">Trip completed!</p>
            <div className="flex flex-wrap gap-3">
              {paymentPending && (
                <Link to={`/payment/${trip._id}`} className="btn-primary">
                  Pay Now
                </Link>
              )}
              <Link to={`/rate/${trip._id}`} className="btn-secondary">
                Rate Trip
              </Link>
            </div>
          </div>
        );

      case 'cancelled':
        return (
          <div className="rounded-lg bg-danger/10 px-4 py-3">
            <p className="font-medium text-danger">Trip cancelled</p>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              {trip.cancellationReason || 'No reason provided.'}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Cancelled by {formatCancelledBy(trip.cancelledBy)}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card text-center">
          <h1>Trip unavailable</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">{accessError}</p>
          <Link to="/dashboard" className="btn-primary mt-6 inline-flex">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card text-center">
          <h1>Trip not found</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            This trip could not be loaded.
          </p>
          <Link to="/dashboard" className="btn-primary mt-6 inline-flex">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1>Trip Details</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Trip ID: {trip._id}
            </p>
          </div>
          <StatusBadge status={trip.status} />
        </div>

        {renderStatusContent()}

        <section className="space-y-4">
          <div className="flex items-start gap-3">
            <MapPin
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Pickup
              </p>
              <p className="mt-1 text-gray-900 dark:text-gray-100">
                {trip.pickupAddress}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Navigation
              className="mt-0.5 h-5 w-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Destination
              </p>
              <p className="mt-1 text-gray-900 dark:text-gray-100">
                {trip.destinationAddress}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Estimated fare
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {fareAmount != null ? `$${fareAmount.toFixed(2)}` : '—'}
              </p>
            </div>

            {showSurge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
                <Star className="h-3.5 w-3.5" aria-hidden="true" />
                Surge {trip.surgeMultiplier}x
              </span>
            )}
          </div>
        </section>

        {canCancelTrip && (
          <button
            type="button"
            className="btn-secondary text-danger hover:bg-danger/10 dark:hover:bg-danger/10"
            onClick={() => setIsCancelModalOpen(true)}
          >
            Cancel Trip
          </button>
        )}
      </div>

      <ConfirmModal
        isOpen={isCancelModalOpen}
        title="Cancel trip?"
        message="Are you sure you want to cancel this trip? This action cannot be undone."
        confirmLabel="Cancel Trip"
        onConfirm={handleCancelTrip}
        onCancel={() => setIsCancelModalOpen(false)}
        loading={isCancelling}
      />
    </div>
  );
};

export default TripDetailPage;
