import api, { handleRequest } from './axios';

export const rateTrip = (tripId, data) =>
  handleRequest(() => api.post(`/trips/${tripId}/rate`, data));
