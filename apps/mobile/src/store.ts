import { create } from 'zustand';

type SessionState = {
  authenticated: boolean;
  profileComplete: boolean;
  setAuthenticated: (value: boolean) => void;
  setProfileComplete: (value: boolean) => void;
};

export const useSession = create<SessionState>((set) => ({
  authenticated: false,
  profileComplete: false,
  setAuthenticated: (authenticated) => set({ authenticated }),
  setProfileComplete: (profileComplete) => set({ profileComplete })
}));
