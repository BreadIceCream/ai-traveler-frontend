import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types/api';

interface AuthState {
    token: string | null;
    user: User | null;
    isAuthenticated: boolean;

    // Actions
    setToken: (token: string) => void;
    setUser: (user: User) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            isAuthenticated: false,

            setToken: (token: string) => {
                localStorage.setItem('token', token);
                set({ token, isAuthenticated: true });
            },

            setUser: (user: User) => {
                set({ user });
            },

            logout: () => {
                localStorage.removeItem('token');
                set({ token: null, user: null, isAuthenticated: false });
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);
