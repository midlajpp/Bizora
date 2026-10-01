import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

// Helper to check basic JWT token validity client-side
const isTokenValid = (tokenStr) => {
  if (!tokenStr || typeof tokenStr !== 'string') return false;
  const parts = tokenStr.split('.');
  if (parts.length !== 3) return false;
  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (payload.exp && typeof payload.exp === 'number') {
      // payload.exp is in seconds. Compare with Date.now() + 10s buffer for clock skew
      if (payload.exp * 1000 <= Date.now() + 10000) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
};

const purgeAuthStorage = () => {
  try {
    localStorage.removeItem('bizora_token');
    localStorage.removeItem('bizora_user');
    localStorage.removeItem('kanakku_token');
    localStorage.removeItem('kanakku_user');
  } catch (e) {
    // Ignore storage clear errors
  }
};

const getStoredToken = () => {
  try {
    const token = localStorage.getItem('bizora_token') || localStorage.getItem('kanakku_token') || '';
    if (token && isTokenValid(token)) {
      return token;
    }
    if (token) {
      purgeAuthStorage();
    }
    return '';
  } catch {
    return '';
  }
};

const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('bizora_user') || localStorage.getItem('kanakku_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const initialToken = getStoredToken();
  const initialUser = initialToken ? getStoredUser() : null;

  const [user, setUser] = useState(initialUser);
  const [token, setToken] = useState(initialToken);
  // Only set initial loading to true if we have a valid token BUT no cached user profile.
  // If no token exists, or if both token & cached user exist, loading is false immediately!
  const [loading, setLoading] = useState(Boolean(initialToken && !initialUser));

  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    // Prevent duplicate calls caused by StrictMode, re-renders, or route changes
    if (hasVerifiedRef.current) {
      setLoading(false);
      return;
    }
    hasVerifiedRef.current = true;

    const verifySession = async () => {
      try {
        // Set a 10s timeout so slow backend (Render) doesn't hang UI indefinitely
        const res = await axiosClient.get('/auth/me', { timeout: 10000 });
        if (res.data?.success) {
          const userData = res.data.user || res.data.data;
          setUser(userData);
          localStorage.setItem('bizora_user', JSON.stringify(userData));
        }
      } catch (error) {
        if (error.response?.status === 401) {
          console.error('Session expired or unauthorized');
          logout();
        } else {
          console.warn('Background session verification notice:', error.message);
          // If we had no cached user to begin with, fail auth to avoid stuck UI
          if (!user) {
            logout();
          }
        }
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [token]);

  const login = async (email, password) => {
    const res = await axiosClient.post('/auth/login', { email, password });
    if (res.data?.success) {
      const userObj = res.data.user || res.data.data;
      const newToken = res.data.token || res.data.data?.token;
      localStorage.setItem('bizora_token', newToken);
      localStorage.setItem('bizora_user', JSON.stringify(userObj));
      hasVerifiedRef.current = true;
      setToken(newToken);
      setUser(userObj);
      setLoading(false);
      return res.data;
    }
    return res.data;
  };

  const register = async (formData) => {
    const res = await axiosClient.post('/auth/register', formData);
    if (res.data?.success) {
      const userObj = res.data.user || res.data.data;
      const newToken = res.data.token || res.data.data?.token;
      localStorage.setItem('bizora_token', newToken);
      localStorage.setItem('bizora_user', JSON.stringify(userObj));
      hasVerifiedRef.current = true;
      setToken(newToken);
      setUser(userObj);
      setLoading(false);
      return res.data;
    }
    return res.data;
  };

  const logout = () => {
    purgeAuthStorage();
    hasVerifiedRef.current = false;
    setToken('');
    setUser(null);
    setLoading(false);
  };

  const updateProfileState = (updatedUser) => {
    setUser((prev) => {
      const nextUser = { ...prev, ...updatedUser };
      localStorage.setItem('bizora_user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      updateProfileState
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
