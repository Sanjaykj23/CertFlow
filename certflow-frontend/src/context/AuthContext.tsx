import { store } from '../lib/storage';
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

export interface OrgMembership {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  organizations: OrgMembership[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  activeOrg: OrgMembership | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  switchOrg: (org: OrgMembership) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(store.getItem('certflow_token'));
  const [activeOrg, setActiveOrg] = useState<OrgMembership | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        const userData: User = res.data.data;
        setUser(userData);
        if (userData.organizations && userData.organizations.length > 0) {
          const savedOrgId = store.getItem('certflow_active_org');
          const matched = userData.organizations.find((o) => o.organizationId === savedOrgId);
          setActiveOrg(matched || userData.organizations[0]);
        }
      }
    } catch {
      store.removeItem('certflow_token');
      setToken(null);
      setUser(null);
      setActiveOrg(null);
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
  }, [token]);

  const login = (newToken: string, newUser: User) => {
    store.setItem('certflow_token', newToken);
    setToken(newToken);
    setUser(newUser);
    if (newUser.organizations && newUser.organizations.length > 0) {
      setActiveOrg(newUser.organizations[0]);
      store.setItem('certflow_active_org', newUser.organizations[0].organizationId);
    }
  };

  const logout = () => {
    store.removeItem('certflow_token');
    store.removeItem('certflow_active_org');
    setToken(null);
    setUser(null);
    setActiveOrg(null);
    window.location.href = '/login';
  };

  const switchOrg = (org: OrgMembership) => {
    setActiveOrg(org);
    store.setItem('certflow_active_org', org.organizationId);
  };

  return (
    <AuthContext.Provider value={{ user, token, activeOrg, loading, login, logout, switchOrg, refreshUser }}>
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
