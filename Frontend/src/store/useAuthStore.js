  // store/useAuthStore.js
  import { create } from "zustand";
  import { persist } from "zustand/middleware";

  const useAuthStore = create(
    persist(
      (set, get) => ({
        user: null,
        loading: false,
        isRestoring: true, // Track restoration state

        login: async (credential) => {
          try {
            set({ loading: true });

            // Send credential to backend - backend will set httpOnly cookie
            const authResponse = await fetch(`${import.meta.env.VITE_API_URL}/auth/google`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              credentials: 'include', // Send/receive cookies
              body: JSON.stringify({ credential })
            });

            if (!authResponse.ok) {
              throw new Error('Authentication failed');
            }

            const authData = await authResponse.json();
            
            // Store token in localStorage as fallback for cookie issues
            if (authData.token) {
              localStorage.setItem('token', authData.token);
            }

            // Fetch user data using cookie
            const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
              credentials: 'include', // Send cookies automatically
              headers: authData.token ? { 'Authorization': `Bearer ${authData.token}` } : {}
            });

            if (!response.ok) {
              throw new Error('Failed to fetch user data');
            }

            const data = await response.json();
            // Store user in memory only
            set({ user: data.user, loading: false });
            return { success: true };
          } catch (error) {
            console.error('Login error:', error);
            set({ user: null, loading: false });
            return { success: false, error: error.message };
          }
        },

        logout: async () => {
          // Clear httpOnly cookie on server
          try {
            await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
              method: 'POST',
              credentials: 'include'
            });
          } catch (err) {
            console.warn('Logout request failed:', err);
          }
          // Clear localStorage token
          localStorage.removeItem('token');
          set({ user: null });
        },

        restore: async () => {
          try {
            // Get token from localStorage as fallback
            const token = localStorage.getItem('token');
            
            // Fetch user data using httpOnly cookie or Authorization header
            const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
              credentials: 'include', // Send cookies automatically
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            
            if (response.ok) {
              const data = await response.json();
              set({ user: data.user, isRestoring: false });
            } else {
              // Cookie/token invalid or expired
              localStorage.removeItem('token');
              set({ user: null, isRestoring: false });
            }
          } catch {
            set({ user: null, isRestoring: false });
          }
        },

        // Method to get fresh user data when needed
        refreshUser: async () => {
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
              credentials: 'include'
            });
            
            if (response.ok) {
              const data = await response.json();
              set({ user: data.user });
            }
          } catch (err) {
            console.warn('Could not refresh user data:', err);
          }
        },
      }),
      {
        name: "auth-storage", // localStorage key  
        partialize: (state) => ({}), // Don't persist anything - cookies handle authentication
      }
    )
  );

  export default useAuthStore;