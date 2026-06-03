import apiClient from './api';

export const login = (email, password) =>
  apiClient.post('/auth/login', { email, password });

export const refreshToken = () =>
  apiClient.post('/auth/refresh'); // cookies sent automatically

export const getMe = () =>
  apiClient.get('/auth/me');