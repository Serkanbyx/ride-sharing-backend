import api, { handleRequest } from './axios';

export const register = (data) =>
  handleRequest(() => api.post('/auth/register', data));

export const login = (data) =>
  handleRequest(() => api.post('/auth/login', data));

export const getMe = () => handleRequest(() => api.get('/auth/me'));

export const updateProfile = (data) =>
  handleRequest(() => api.patch('/auth/profile', data));

export const changePassword = (data) =>
  handleRequest(() => api.patch('/auth/password', data));

export const becomeDriver = (vehicle) =>
  handleRequest(() => api.post('/auth/become-driver', { vehicle }));

export const deleteAccount = (password) =>
  handleRequest(() => api.delete('/auth/account', { data: { password } }));
