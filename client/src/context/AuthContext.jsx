import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const getInitialUser = () => {
    try {
      const stored = localStorage.getItem('bizora_user') || localStorage.getItem('kanakku_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const [user, setUser] = useState(getInitialUser);
  const [token, setToken] = useState(localStorage.getItem('bizora_token') || localStorage.getItem('kanakku_token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await axiosClient.get('/auth/me');
          if (res.data.success) {
            const userData = res.data.user || res.data.data;
            setUser(userData);
            localStorage.setItem('bizora_user', JSON.stringify(userData));
          }
        } catch (error) {
          console.error('Failed to restore session:', error);
          logout();
        }
      } else {
        setUser(null);
        localStorage.removeItem('bizora_user');
        localStorage.removeItem('kanakku_user');
      }
      setLoading(false);
    };

    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await axiosClient.post('/auth/login', { email, password });
    if (res.data.success) {
      const userObj = res.data.user || res.data.data;
      const newToken = res.data.token || res.data.data?.token;
      localStorage.setItem('bizora_token', newToken);
      localStorage.setItem('bizora_user', JSON.stringify(userObj));
      setToken(newToken);
      setUser(userObj);
      return res.data;
    }
    return res.data;
  };

  const register = async (formData) => {
    const res = await axiosClient.post('/auth/register', formData);
    if (res.data.success) {
      const userObj = res.data.user || res.data.data;
      const newToken = res.data.token || res.data.data?.token;
      localStorage.setItem('bizora_token', newToken);
      localStorage.setItem('bizora_user', JSON.stringify(userObj));
      setToken(newToken);
      setUser(userObj);
      return res.data;
    }
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('bizora_token');
    localStorage.removeItem('bizora_user');
    localStorage.removeItem('kanakku_token');
    localStorage.removeItem('kanakku_user');
    setToken('');
    setUser(null);
  };

  const updateProfileState = (updatedUser) => {
    setUser((prev) => {
      const nextUser = { ...prev, ...updatedUser };
      localStorage.setItem('bizora_user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user && !!token,
        isAdmin: user?.role === 'admin',
        login,
        register,
        logout,
        updateProfileState
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
