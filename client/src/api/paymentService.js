import api, { handleRequest } from './axios';

export const createPayment = (tripId) =>
  handleRequest(() => api.post('/payments/create', { tripId }));
