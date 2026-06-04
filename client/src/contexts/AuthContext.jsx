import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
// import { createClient } from '@supabase/supabase-js';
import apiClient from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// export const supabase = createClient(supabaseUrl, supabaseAnonKey);
import { supabase } from '../lib/supabase';
export { supabase };

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const setAuthData = (accessToken, userData) => {
    apiClient.defaults.headers.common[
      'Authorization'
    ] = `Bearer ${accessToken}`;
    setUser(userData);
  };

  const clearAuth = () => {
    delete apiClient.defaults.headers.common['Authorization'];
    setUser(null);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setAuthData(session.access_token, {
            ...session.user,
            profile,
          });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        setAuthData(session.access_token, {
          ...session.user,
          profile,
        });
      } else {
        clearAuth();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) throw error;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    setAuthData(data.session.access_token, {
      ...data.user,
      profile,
    });

    return data;
  };

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    clearAuth();
    window.location.href = '/admin/login';
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}