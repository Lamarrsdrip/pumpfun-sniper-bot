import { create } from 'zustand';
import { api } from './api';

export type AppMode = 'DEMO' | 'LIVE';
export type Theme = 'DARK' | 'LIGHT';

export type UserProfile = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  handle?: string;
  referralCode?: string;
  status: string;
  kycStatus: string;
  kycTier?: number;
  avatarUrl?: string;
  countryCode?: string;
};

export type BalanceSummary = {
  totalNgn: number;
  ngnBalance: number;
  cryptoValueNgn: number;
  pendingNgn: number;
  todayChangeNgn: number;
  todayChangePct: number;
};

type SessionState = {
  // Auth
  authenticated: boolean;
  mode: AppMode;
  // UI prefs
  balancesVisible: boolean;
  theme: Theme;
  enabledAssets: string[];
  // User data
  profile: UserProfile | null;
  balances: BalanceSummary | null;
  notifUnread: number;
  // Loading states
  profileLoading: boolean;
  balancesLoading: boolean;
  // Compat
  profileComplete: boolean;
  // Actions
  setAuthenticated: (value: boolean) => void;
  setProfileComplete: (value: boolean) => void;
  setMode: (value: AppMode) => void;
  setBalancesVisible: (value: boolean) => void;
  setTheme: (value: Theme) => void;
  toggleAsset: (symbol: string) => void;
  setProfile: (profile: UserProfile | null) => void;
  setBalances: (balances: BalanceSummary | null) => void;
  setNotifUnread: (count: number) => void;
  refreshProfile: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  logout: () => void;
};

export const useSession = create<SessionState>((set) => ({
  authenticated: false,
  profileComplete: false,
  mode: 'DEMO',
  balancesVisible: true,
  theme: 'DARK',
  enabledAssets: ['NGN', 'USDT', 'USDC', 'BTC', 'ETH', 'SOL', 'BNB', 'TRX', 'XRP', 'DOGE'],
  profile: null,
  balances: null,
  notifUnread: 0,
  profileLoading: false,
  balancesLoading: false,

  setAuthenticated: (authenticated) => set({ authenticated }),
  setProfileComplete: (profileComplete) => set({ profileComplete }),
  setMode: (mode) => set({ mode }),
  setBalancesVisible: (balancesVisible) => set({ balancesVisible }),
  setTheme: (theme) => set({ theme }),
  toggleAsset: (symbol) => set((state) => ({
    enabledAssets: state.enabledAssets.includes(symbol)
      ? state.enabledAssets.filter((item) => item !== symbol)
      : [...state.enabledAssets, symbol],
  })),
  setProfile: (profile) => set({ profile }),
  setBalances: (balances) => set({ balances }),
  setNotifUnread: (notifUnread) => set({ notifUnread }),

  refreshProfile: async () => {
    set({ profileLoading: true });
    try {
      const result = await api<{ user: UserProfile }>('/v1/me');
      set({ profile: result.user, profileLoading: false });
    } catch {
      set({ profileLoading: false });
    }
  },

  refreshBalances: async () => {
    set({ balancesLoading: true });
    try {
      const result = await api<BalanceSummary>('/v1/wallet/summary');
      set({ balances: result, balancesLoading: false });
    } catch {
      set({ balancesLoading: false });
    }
  },

  logout: () => set({
    authenticated: false,
    profile: null,
    balances: null,
    notifUnread: 0,
    mode: 'DEMO',
    profileComplete: false,
  }),
}));

export function getDisplayName(profile: UserProfile | null, fallback = 'User'): string {
  if (!profile) return fallback;
  return profile.firstName || profile.name.split(' ')[0] || fallback;
}

export function getInitials(profile: UserProfile | null): string {
  if (!profile) return 'MZ';
  const parts = profile.name.trim().split(' ');
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'MZ';
}

export function formatNgn(amount: number | string | undefined | null): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(n)) return '₦0.00';
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
