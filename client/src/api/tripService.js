import api, { handleRequest } from './axios';

export const requestTrip = (data) =>
  handleRequest(() => api.post('/trips/request', data));

export const acceptTrip = (tripId) =>
  handleRequest(() => api.post(`/trips/${tripId}/accept`));

export const updateTripStatus = (tripId, status, reason) =>
  handleRequest(() =>
    api.patch(`/trips/${tripId}/status`, {
      status,
      ...(reason !== undefined && { reason }),
    })
  );

export const cancelTrip = (tripId, reason) =>
  handleRequest(() =>
    api.post(`/trips/${tripId}/cancel`, {
      ...(reason !== undefined && { reason }),
    })
  );

export const getActiveTrip = () =>
  handleRequest(() => api.get('/trips/active'));

export const getMyTrips = (params) =>
  handleRequest(() => api.get('/trips/my', { params }));

export const getTrip = (tripId) =>
  handleRequest(() => api.get(`/trips/${tripId}`));
