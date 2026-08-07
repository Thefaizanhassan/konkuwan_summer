import axios from 'axios';
import { supabase } from '../lib/supabase';

// Same-origin by default: the SPA and the API ship in one Worker, so a
// relative path is correct in dev (via the Vite proxy), preview and
// production. Override only for a split deployment.
const API_BASE = import.meta.env.VITE_API_URL || '/api';

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

// Sign out only when the session is genuinely gone.
//
// Previously any 401 signed the user out and hard-redirected. But a 401 can
// also mean "this account was deactivated" or come from one background query
// while the session is perfectly valid — and the redirect discarded whatever
// the user was typing. Ask Supabase whether a session still exists before
// throwing the session away; if it does, let the caller handle the error.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signOut();
        // replace(), not href: a dead session should not sit in the back stack.
        window.location.replace('/admin/login');
      }
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