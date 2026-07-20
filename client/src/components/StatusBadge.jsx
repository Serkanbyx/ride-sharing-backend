import { TRIP_STATUS_COLORS, TRIP_STATUS_LABELS } from '../utils/constants';

const StatusBadge = ({ status }) => {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        TRIP_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'
      }`}
    >
      {TRIP_STATUS_LABELS[status] || status}
    </span>
  );
};

export default StatusBadge;
