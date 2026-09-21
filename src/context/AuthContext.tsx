import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  quickDemoLogin: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('doc_retrieval_jwt'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = async () => {
    const storedToken = localStorage.getItem('doc_retrieval_jwt');
    if (storedToken) {
      try {
        const { user: profileUser } = await api.getMe();
        setUser(profileUser);
        setIsLoading(false);
        return;
      } catch (err) {
        console.warn('Stored token invalid or expired, resetting:', err);
        localStorage.removeItem('doc_retrieval_jwt');
        setToken(null);
      }
    }

    // Auto-login with default demo researcher account for seamless out-of-the-box exploration
    try {
      await quickDemoLogin();
    } catch (demoErr) {
      console.warn('Demo login failed on init:', demoErr);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    localStorage.setItem('doc_retrieval_jwt', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, pass: string) => {
    const res = await api.register(name, email, pass);
    localStorage.setItem('doc_retrieval_jwt', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const quickDemoLogin = async () => {
    setIsLoading(true);
    const demoEmail = 'researcher@docunderstanding.ai';
    const demoPass = 'DocMaster2025!';
    try {
      await login(demoEmail, demoPass);
    } catch {
      // If user doesn't exist yet, register demo researcher
      await register('Research Fellow', demoEmail, demoPass);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('doc_retrieval_jwt');
    setToken(null);
    setUser(null);
  };

  const refreshProfile = async () => {
    if (token) {
      try {
        const { user: profileUser } = await api.getMe();
        setUser(profileUser);
      } catch (err) {
        console.error('Failed to refresh profile:', err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        quickDemoLogin,
        refreshProfile,
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
