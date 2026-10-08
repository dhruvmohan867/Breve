import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const { data } = await API.get('/users/current-user');
      setUser(data.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUser(); }, []);

  const login = async (credentials) => {
    const { data } = await API.post('/users/login', credentials);
    setUser(data.data.user);
    return data;
  };

  const register = async (formData) => {
    const { data } = await API.post('/users/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  };

  const logout = async () => {
    try { await API.post('/users/logout'); } catch { /* session already cleared */ }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}
