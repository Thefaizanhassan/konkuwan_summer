import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:5500/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Supabase access token to every request
apiClient.interceptors.request.use(
  async (config) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle unauthorized users
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
      window.location.href = '/admin/login';
    }

    return Promise.reject(error);
  }
);

export const fetchProducts = (params = {}) =>
  apiClient.get('/products', { params });

export const fetchProductBySlug = (slug) =>
  apiClient.get(`/products/${slug}`);

export const fetchCategories = () =>
  apiClient.get('/categories');

export const submitContact = (formData) =>
  apiClient.post('/contact', formData);

export default apiClient;