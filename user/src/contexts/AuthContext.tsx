import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  following: string[];
  savedArtworks: string[];
  bio?: string;
  profilePic?: string;
  /** From server (updatedAt) — busts CDN/browser cache for avatars */
  profilePicVersion?: number;
  artistApplication?: {
    status: string;
    bio?: string;
    artStyle?: string;
    portfolioUrls?: string[];
    sampleArtworkUrls?: string[];
    passportPhoto?: string;
    appliedAt?: Date;
    reviewedAt?: Date;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  followArtist: (artistId: string) => void;
  unfollowArtist: (artistId: string) => void;
  saveArtwork: (artworkId: string) => void;
  unsaveArtwork: (artworkId: string) => void;
  updateProfile: (data: Partial<User>) => void;
  updateAvatar: (file: File) => Promise<boolean>;
  refreshUser: () => Promise<boolean>;
  applyForArtist: (formData: FormData) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<boolean>;
  sendChangePasswordOTP: () => Promise<boolean>;
  changePassword: (otp: string, newPassword: string) => Promise<boolean>;
  sendDeliveryOTP: (orderId: string) => Promise<boolean>;
  verifyDeliveryOTP: (orderId: string, otp: string) => Promise<boolean>;
  accounts: { email: string; name: string; profilePic?: string }[];
  switchAccount: (email: string) => Promise<boolean>;
  removeAccount: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'userToken';
const USER_KEY = 'userData';
const ACCOUNTS_KEY = 'userAccounts';

/** Old cached user JSON may omit these — prevents `.includes` crashes */
function normalizeUser(u: User): User {
  return {
    ...u,
    following: Array.isArray(u.following) ? u.following : [],
    savedArtworks: Array.isArray(u.savedArtworks) ? u.savedArtworks : [],
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<{ email: string; name: string; profilePic?: string; token: string }[]>(() => {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [user, setUser] = useState<User | null>(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const userData = localStorage.getItem(USER_KEY);
      if (!token || !userData) return null;
      return normalizeUser(JSON.parse(userData) as User);
    } catch {
      return null;
    }
  });

  const syncAccounts = useCallback((next: { email: string; name: string; profilePic?: string; token: string }[]) => {
    setAccounts(next);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
  }, []);

  const setCurrentSession = useCallback((token: string, nextUser: User) => {
    const u = normalizeUser(nextUser);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
    syncAccounts([
      { email: u.email, name: u.name, profilePic: u.profilePic, token },
      ...accounts.filter((a) => a.email !== u.email),
    ]);
  }, [accounts, syncAccounts]);

  const patchCurrentUser = useCallback((nextUser: User) => {
    const u = normalizeUser(nextUser);
    setUser(u);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    syncAccounts(
      accounts.map((a) =>
        a.email === u.email
          ? { ...a, email: u.email, name: u.name, profilePic: u.profilePic }
          : a
      )
    );
  }, [accounts, syncAccounts]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api<{ token: string; user: User }>('/api/user/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setCurrentSession(res.token, res.user);
      return true;
    } catch (error) {
      return false;
    }
  }, [setCurrentSession]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const res = await api<{ token: string; user: User }>('/api/user/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      setCurrentSession(res.token, res.user);
      return true;
    } catch (error) {
      return false;
    }
  }, [setCurrentSession]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const followArtist = useCallback(async (artistId: string) => {
    try {
      const res = await api<{ user?: User; following?: string[] }>(`/api/user/follow/${artistId}`, { method: 'POST' });
      if (res.user) {
        patchCurrentUser(res.user);
      } else if (user && res.following) {
        patchCurrentUser({ ...user, following: res.following });
      }
      return true;
    } catch (error) {
      return false;
    }
  }, [user, patchCurrentUser]);

  const unfollowArtist = useCallback(async (artistId: string) => {
    try {
      const res = await api<{ user?: User; following?: string[] }>(`/api/user/follow/${artistId}`, { method: 'DELETE' });
      if (res.user) {
        patchCurrentUser(res.user);
      } else if (user && res.following) {
        patchCurrentUser({ ...user, following: res.following });
      }
      return true;
    } catch (error) {
      return false;
    }
  }, [user, patchCurrentUser]);

  const saveArtwork = useCallback(async (artworkId: string) => {
    try {
      await api(`/api/user/artworks/${artworkId}/save`, { method: 'POST' });
      if (user) {
        patchCurrentUser({ ...user, savedArtworks: [...(user.savedArtworks ?? []), artworkId] });
      }
    } catch (error) {
      // handle error
    }
  }, [user, patchCurrentUser]);

  const unsaveArtwork = useCallback(async (artworkId: string) => {
    try {
      await api(`/api/user/artworks/${artworkId}/save`, { method: 'DELETE' });
      if (user) {
        patchCurrentUser({ ...user, savedArtworks: (user.savedArtworks ?? []).filter(id => id !== artworkId) });
      }
    } catch (error) {
      // handle error
    }
  }, [user, patchCurrentUser]);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    try {
      const res = await api<User>('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      patchCurrentUser(res);
    } catch (error) {
      // handle error
    }
  }, [patchCurrentUser]);

  const updateAvatar = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('profilePic', file);

      const res = await api<User>('/api/user/profile', {
        method: 'PUT',
        body: formData,
      });
      patchCurrentUser(res);
      return true;
    } catch (error) {
      return false;
    }
  }, [patchCurrentUser]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api<User>('/api/user/profile', {
        method: 'GET',
      });
      patchCurrentUser(res);
      return true;
    } catch (error) {
      const status =
        error && typeof error === 'object' && 'status' in error
          ? (error as { status?: number }).status
          : undefined;
      // Sirf auth failures par session clear — network/5xx par user ko logout mat karo
      if (status === 401 || status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      }
      return false;
    }
  }, [patchCurrentUser]);

  // Admin enable/disable ka effect turant dikhane ke liye background refresh.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    const id = window.setInterval(() => {
      refreshUser().catch(() => {});
    }, 10000);
    return () => window.clearInterval(id);
  }, [refreshUser]);

  const applyForArtist = useCallback(async (formData: FormData) => {
    try {
      const res = await api<User>('/api/user/apply-artist', {
        method: 'POST',
        body: formData,
      });
      patchCurrentUser(res);
      return true;
    } catch (error) {
      return false;
    }
  }, [patchCurrentUser]);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      await api('/api/user/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const resetPassword = useCallback(async (email: string, otp: string, newPassword: string) => {
    try {
      await api('/api/user/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, otp, newPassword }),
      });
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const sendChangePasswordOTP = useCallback(async () => {
    try {
      await api('/api/user/send-change-password-otp', {
        method: 'POST',
      });
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const changePassword = useCallback(async (otp: string, newPassword: string) => {
    try {
      await api('/api/user/change-password', {
        method: 'POST',
        body: JSON.stringify({ otp, newPassword }),
      });
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const sendDeliveryOTP = useCallback(async (orderId: string) => {
    try {
      await api(`/api/user/orders/${orderId}/delivery-otp`, {
        method: 'POST',
      });
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const verifyDeliveryOTP = useCallback(async (orderId: string, otp: string) => {
    try {
      await api(`/api/user/orders/${orderId}/verify-delivery-otp`, {
        method: 'POST',
        body: JSON.stringify({ otp }),
      });
      return true;
    } catch (error) {
      return false;
    }
  }, []);

  const switchAccount = useCallback(async (email: string) => {
    const selected = accounts.find((a) => a.email === email);
    if (!selected) return false;
    try {
      localStorage.setItem(TOKEN_KEY, selected.token);
      await refreshUser();
      return true;
    } catch {
      return false;
    }
  }, [accounts, refreshUser]);

  const removeAccount = useCallback((email: string) => {
    const next = accounts.filter((a) => a.email !== email);
    syncAccounts(next);
    if (user?.email === email) {
      logout();
    }
  }, [accounts, logout, syncAccounts, user?.email]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      followArtist,
      unfollowArtist,
      saveArtwork,
      unsaveArtwork,
      updateProfile,
      updateAvatar,
      refreshUser,
      applyForArtist,
      forgotPassword,
      resetPassword,
      sendChangePasswordOTP,
      changePassword,
      sendDeliveryOTP,
      verifyDeliveryOTP,
      accounts,
      switchAccount,
      removeAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
