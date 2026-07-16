export const LOCATION_UPDATE_INTERVAL_MS = 5000;

export const TRIP_STATUS_LABELS = {
  requested: 'Requested',
  accepted: 'Accepted',
  driver_arriving: 'Driver Arriving',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const TRIP_STATUS_COLORS = {
  requested: 'bg-warning/10 text-warning',
  accepted: 'bg-primary/10 text-primary',
  driver_arriving: 'bg-primary/10 text-primary',
  in_progress: 'bg-success/10 text-success',
  completed: 'bg-success/10 text-success',
  cancelled: 'bg-danger/10 text-danger',
};

export const DEFAULT_MAP_CENTER = {
  lat: 37.7749,
  lng: -122.4194,
};
