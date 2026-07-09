const TRIP_STATUSES = [
  'requested',
  'accepted',
  'driver_arriving',
  'in_progress',
  'completed',
  'cancelled',
];

const TRIP_STATUS_TRANSITIONS = new Map([
  ['requested', ['accepted', 'cancelled']],
  ['accepted', ['driver_arriving', 'cancelled']],
  ['driver_arriving', ['in_progress', 'cancelled']],
  ['in_progress', ['completed', 'cancelled']],
  ['completed', []],
  ['cancelled', []],
]);

const ROLES = ['passenger', 'driver'];

const REDIS_CHANNELS = {
  TRIP_OFFERS: 'trip:offers',
  TRIP_CANCEL: 'trip:cancel',
};

const PAYMENT_STATUSES = ['pending', 'processing', 'succeeded', 'failed'];

const CANCELLED_BY = ['passenger', 'driver', 'system'];

module.exports = {
  TRIP_STATUSES,
  TRIP_STATUS_TRANSITIONS,
  ROLES,
  REDIS_CHANNELS,
  PAYMENT_STATUSES,
  CANCELLED_BY,
};
