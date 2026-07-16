import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authService from '../api/authService';
import { disconnectActiveSocket } from '../utils/socketManager';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    disconnectActiveSocket();
  }, []);

  const persistSession = useCallback((newToken, newUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');

      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await authService.getMe();
        setUser(response.data);
        setToken(storedToken);
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const response = await authService.login({ email, password });
    const { token: newToken, user: newUser } = response.data;
    persistSession(newToken, newUser);
    return newUser;
  }, [persistSession]);

  const register = useCallback(async (data) => {
    const response = await authService.register(data);
    const { token: newToken, user: newUser } = response.data;
    persistSession(newToken, newUser);
    return newUser;
  }, [persistSession]);

  const updateUser = useCallback(async (data) => {
    const response = await authService.updateProfile(data);
    setUser(response.data);
    return response.data;
  }, []);

  const becomeDriver = useCallback(async (vehicle) => {
    const response = await authService.becomeDriver(vehicle);
    const { user: updatedUser } = response.data;
    setUser(updatedUser);
    return response.data;
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      isDriver: user?.role === 'driver',
      isPassenger: user?.role === 'passenger',
      login,
      register,
      logout,
      updateUser,
      becomeDriver,
    }),
    [
      user,
      token,
      loading,
      login,
      register,
      logout,
      updateUser,
      becomeDriver,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};
