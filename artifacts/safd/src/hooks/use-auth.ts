import { create } from 'zustand';

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('safd_token'),
  setToken: (token: string | null) => {
    if (token) {
      localStorage.setItem('safd_token', token);
    } else {
      localStorage.removeItem('safd_token');
    }
    set({ token });
  },
  logout: () => {
    localStorage.removeItem('safd_token');
    set({ token: null });
  },
}));
