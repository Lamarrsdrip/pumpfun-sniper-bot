import { create } from 'zustand';

type SessionState = {
  authenticated: boolean;
  profileComplete: boolean;
  mode: 'DEMO' | 'LIVE';
  setAuthenticated: (value: boolean) => void;
  setProfileComplete: (value: boolean) => void;
  setMode: (value: 'DEMO' | 'LIVE') => void;
};

export const useSession = create<SessionState>((set) => ({
  authenticated: false,
  profileComplete: false,
  mode: 'DEMO',
  setAuthenticated: (authenticated) => set({ authenticated }),
  setProfileComplete: (profileComplete) => set({ profileComplete }),
  setMode: (mode) => set({ mode })
}));
