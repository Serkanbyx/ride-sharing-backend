import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const TripCard = ({ trip }) => {
  const fare = trip.finalFare ?? trip.estimatedFare;
  const tripDate = trip.createdAt
    ? new Date(trip.createdAt).toLocaleDateString()
    : '';

  return (
    <Link
      to={`/trip/${trip._id}`}
      className="card block transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {trip.pickupAddress}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            to {trip.destinationAddress}
          </p>
        </div>
        <StatusBadge status={trip.status} />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>{tripDate}</span>
        {fare != null ? <span className="font-medium">${fare.toFixed(2)}</span> : null}
      </div>
    </Link>
  );
};

export default TripCard;
