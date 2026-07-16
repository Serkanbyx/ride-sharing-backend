import api, { handleRequest } from './axios';

export const getMyDriverProfile = () =>
  handleRequest(() => api.get('/drivers/me'));

export const updateLocation = (data) =>
  handleRequest(() => api.patch('/drivers/location', data));

export const toggleAvailability = (isAvailable) =>
  handleRequest(() => api.patch('/drivers/availability', { isAvailable }));
