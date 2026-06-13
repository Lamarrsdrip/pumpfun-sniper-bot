import { create } from 'zustand';

type SessionState = {
  authenticated: boolean;
  profileComplete: boolean;
  mode: 'DEMO' | 'LIVE';
  balancesVisible: boolean;
  theme: 'DARK' | 'LIGHT';
  enabledAssets: string[];
  setAuthenticated: (value: boolean) => void;
  setProfileComplete: (value: boolean) => void;
  setMode: (value: 'DEMO' | 'LIVE') => void;
  setBalancesVisible: (value: boolean) => void;
  setTheme: (value: 'DARK' | 'LIGHT') => void;
  toggleAsset: (symbol: string) => void;
};

export const useSession = create<SessionState>((set) => ({
  authenticated: false,
  profileComplete: false,
  mode: 'DEMO',
  balancesVisible: true,
  theme: 'DARK',
  enabledAssets: ['NGN', 'USDT', 'USDC', 'BTC', 'ETH', 'SOL', 'BNB', 'TRX', 'XRP', 'DOGE'],
  setAuthenticated: (authenticated) => set({ authenticated }),
  setProfileComplete: (profileComplete) => set({ profileComplete }),
  setMode: (mode) => set({ mode }),
  setBalancesVisible: (balancesVisible) => set({ balancesVisible }),
  setTheme: (theme) => set({ theme }),
  toggleAsset: (symbol) => set((state) => ({
    enabledAssets: state.enabledAssets.includes(symbol)
      ? state.enabledAssets.filter((item) => item !== symbol)
      : [...state.enabledAssets, symbol]
  }))
}));
