import { useEffect, useState } from 'react';
import { MapPin, Navigation, Star, Timer } from 'lucide-react';
import Spinner from './Spinner';

const OFFER_COUNTDOWN_SECONDS = 30;

const TripOfferCard = ({
  offer,
  onAccept,
  onDismiss,
  isAccepting = false,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(OFFER_COUNTDOWN_SECONDS);

  useEffect(() => {
    const updateCountdown = () => {
      const elapsed = Math.floor((Date.now() - offer.receivedAt) / 1000);
      setSecondsLeft(Math.max(0, OFFER_COUNTDOWN_SECONDS - elapsed));
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [offer.receivedAt]);

  const pickupAddress =
    offer.addresses?.pickup || offer.pickupAddress || 'Pickup location';
  const destinationAddress =
    offer.addresses?.destination ||
    offer.destinationAddress ||
    'Destination';
  const passengerName = offer.passenger?.name || 'Passenger';
  const passengerRating = offer.passenger?.rating;

  return (
    <div className="card space-y-4 border-warning/30 bg-warning/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-warning">
            New ride offer
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {passengerName}
            {passengerRating != null && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Star
                  className="h-3.5 w-3.5 fill-warning text-warning"
                  aria-hidden="true"
                />
                {passengerRating.toFixed(1)}
              </span>
            )}
          </p>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" />
          {secondsLeft}s
        </span>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-start gap-2">
          <MapPin
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span className="text-gray-900 dark:text-gray-100">
            {pickupAddress}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Navigation
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span className="text-gray-900 dark:text-gray-100">
            {destinationAddress}
          </span>
        </div>
      </div>

      {offer.estimatedFare != null && (
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          ${offer.estimatedFare.toFixed(2)}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary inline-flex items-center gap-2"
          onClick={() => onAccept(offer.tripId)}
          disabled={isAccepting || secondsLeft === 0}
        >
          {isAccepting ? <Spinner size="sm" /> : null}
          {isAccepting ? 'Accepting...' : 'Accept'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onDismiss(offer.tripId)}
          disabled={isAccepting}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default TripOfferCard;
