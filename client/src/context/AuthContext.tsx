import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User, UserRole } from '../types';
import { useNotification } from './NotificationContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  register: (data: any, rememberMe?: boolean) => Promise<boolean>;
  demoLogin: (role: UserRole, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  verifyCollege: (collegeId: string, department: string, studentOrStaff: string) => Promise<boolean>;
  topupWallet: (amount: number) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('campuscommute_token') || sessionStorage.getItem('campuscommute_token');
  });
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useNotification();

  const saveToken = (tokenStr: string, remember: boolean = true) => {
    if (remember) {
      localStorage.setItem('campuscommute_token', tokenStr);
      sessionStorage.removeItem('campuscommute_token');
    } else {
      sessionStorage.setItem('campuscommute_token', tokenStr);
      localStorage.removeItem('campuscommute_token');
    }
    setToken(tokenStr);
  };

  const clearToken = () => {
    localStorage.removeItem('campuscommute_token');
    sessionStorage.removeItem('campuscommute_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const res = await api.get('/api/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error('Failed to fetch user:', err);
      clearToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = true): Promise<boolean> => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { access_token, user: userData } = res.data;
      saveToken(access_token, rememberMe);
      setUser(userData);
      showToast(`Welcome back, ${userData.full_name}!`, 'success');
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Login failed. Please check credentials.';
      showToast(msg, 'error');
      return false;
    }
  };

  const register = async (data: any, rememberMe: boolean = true): Promise<boolean> => {
    try {
      const res = await api.post('/api/auth/register', data);
      const { access_token, user: userData } = res.data;
      saveToken(access_token, rememberMe);
      setUser(userData);
      showToast(`Account created successfully! Welcome to RIDO.`, 'success');
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Registration failed.';
      showToast(msg, 'error');
      return false;
    }
  };

  const demoLogin = async (role: UserRole, rememberMe: boolean = true): Promise<boolean> => {
    try {
      const res = await api.post('/api/auth/demo-login', { role });
      const { access_token, user: userData } = res.data;
      saveToken(access_token, rememberMe);
      setUser(userData);
      showToast(`Switched to Demo ${role.replace('_', ' ')} (${userData.full_name})`, 'success');
      return true;
    } catch (err: any) {
      showToast('Demo login failed.', 'error');
      return false;
    }
  };

  const verifyCollege = async (collegeId: string, department: string, studentOrStaff: string): Promise<boolean> => {
    try {
      const res = await api.post('/api/auth/verify-college', {
        college_id: collegeId,
        department,
        student_or_staff: studentOrStaff,
      });
      setUser(res.data);
      showToast('Institutional verification approved! Verified student badge unlocked.', 'success');
      return true;
    } catch (err: any) {
      showToast('Institutional verification failed.', 'error');
      return false;
    }
  };

  const topupWallet = async (amount: number): Promise<boolean> => {
    try {
      const res = await api.post('/api/auth/wallet-topup', { amount });
      setUser(res.data);
      showToast(`Simulated Top-Up: +₹${amount.toFixed(2)} added! New Balance: ₹${res.data.wallet_balance.toFixed(2)}`, 'success');
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Wallet top-up failed.';
      showToast(msg, 'error');
      return false;
    }
  };

  const logout = () => {
    clearToken();
    showToast('Logged out successfully.', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        demoLogin,
        logout,
        verifyCollege,
        topupWallet,
        refreshUser,
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
