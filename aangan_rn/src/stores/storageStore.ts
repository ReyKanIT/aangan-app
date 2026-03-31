import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { STORAGE_TIERS } from '../config/constants';
import type {
  UserStorage,
  FamilyStoragePool,
  StoragePurchase,
  Referral,
  StorageTier,
} from '../types/database';

interface UsageBreakdown {
  usedGb: number;
  totalGb: number;
  usedPercent: number;
  baseGb: number;
  referralBonusGb: number;
  purchasedGb: number;
}

interface StorageState {
  userStorage: UserStorage | null;
  pool: FamilyStoragePool | null;
  purchases: StoragePurchase[];
  referrals: Referral[];
  isLoading: boolean;
  error: string | null;

  fetchStorage: () => Promise<void>;
  fetchPool: () => Promise<void>;
  createPool: (poolName: string) => Promise<boolean>;
  joinPool: (poolId: string) => Promise<boolean>;
  leavePool: () => Promise<boolean>;
  generateReferralCode: () => Promise<string | null>;
  fetchReferrals: () => Promise<void>;
  purchaseStorage: (purchaseType: 'individual' | 'pool', storageGb: number, billingCycle: 'monthly' | 'annual', amountInr: number) => Promise<boolean>;
  getUsageBreakdown: () => UsageBreakdown;
  setError: (error: string | null) => void;
}

function determineTier(verifiedCount: number): StorageTier {
  if (verifiedCount >= STORAGE_TIERS.gold.referrals) return 'gold';
  if (verifiedCount >= STORAGE_TIERS.silver.referrals) return 'silver';
  if (verifiedCount >= STORAGE_TIERS.bronze.referrals) return 'bronze';
  return 'base';
}

function tierStorageGb(tier: StorageTier): number {
  return STORAGE_TIERS[tier].gb;
}

export const useStorageStore = create<StorageState>((set, get) => ({
  userStorage: null,
  pool: null,
  purchases: [],
  referrals: [],
  isLoading: false,
  error: null,

  fetchStorage: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ isLoading: false, error: 'Not authenticated' });
        return;
      }

      const { data, error } = await supabase
        .from('user_storage')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      // Check for tier auto-upgrade
      if (data) {
        const expectedTier = determineTier(data.verified_referral_count);
        if (expectedTier !== data.storage_tier) {
          const newBaseGb = tierStorageGb(expectedTier);
          await supabase
            .from('user_storage')
            .update({
              storage_tier: expectedTier,
              base_storage_gb: newBaseGb,
              updated_at: new Date().toISOString(),
            })
            .eq('id', data.id);

          data.storage_tier = expectedTier;
          data.base_storage_gb = newBaseGb;
        }
      }

      // Also fetch purchases
      const { data: purchases } = await supabase
        .from('storage_purchases')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      set({
        userStorage: data,
        purchases: purchases ?? [],
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch storage', isLoading: false });
    }
  },

  fetchPool: async () => {
    set({ error: null });
    try {
      const { userStorage } = get();
      if (!userStorage?.pool_id) {
        set({ pool: null });
        return;
      }

      const { data, error } = await supabase
        .from('family_storage_pools')
        .select('*')
        .eq('id', userStorage.pool_id)
        .single();

      if (error) {
        set({ error: error.message });
        return;
      }

      set({ pool: data });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch pool' });
    }
  },

  createPool: async (poolName) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      const now = new Date().toISOString();

      const { data: pool, error } = await supabase
        .from('family_storage_pools')
        .insert({
          admin_id: session.user.id,
          pool_name: poolName,
          total_storage_gb: 0,
          used_storage_bytes: 0,
          member_ids: [session.user.id],
          status: 'active',
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        set({ error: error.message });
        return false;
      }

      if (pool) {
        // Update user_storage with pool_id
        await supabase
          .from('user_storage')
          .update({ pool_id: pool.id, updated_at: now })
          .eq('user_id', session.user.id);

        set({ pool });
      }
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to create pool' });
      return false;
    }
  },

  joinPool: async (poolId) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      // Fetch current pool to get member list
      const { data: pool, error: fetchError } = await supabase
        .from('family_storage_pools')
        .select('*')
        .eq('id', poolId)
        .single();

      if (fetchError || !pool) {
        set({ error: fetchError?.message || 'Pool not found' });
        return false;
      }

      const now = new Date().toISOString();
      const updatedMembers = [...pool.member_ids, session.user.id];

      const { error: poolError } = await supabase
        .from('family_storage_pools')
        .update({ member_ids: updatedMembers, updated_at: now })
        .eq('id', poolId);

      if (poolError) {
        set({ error: poolError.message });
        return false;
      }

      const { error: storageError } = await supabase
        .from('user_storage')
        .update({ pool_id: poolId, updated_at: now })
        .eq('user_id', session.user.id);

      if (storageError) {
        set({ error: storageError.message });
        return false;
      }

      set({ pool: { ...pool, member_ids: updatedMembers } });
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to join pool' });
      return false;
    }
  },

  leavePool: async () => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      const { pool } = get();
      if (!pool) {
        set({ error: 'Not in a pool' });
        return false;
      }

      const now = new Date().toISOString();
      const updatedMembers = pool.member_ids.filter((id) => id !== session.user.id);

      const { error: poolError } = await supabase
        .from('family_storage_pools')
        .update({ member_ids: updatedMembers, updated_at: now })
        .eq('id', pool.id);

      if (poolError) {
        set({ error: poolError.message });
        return false;
      }

      const { error: storageError } = await supabase
        .from('user_storage')
        .update({ pool_id: null, updated_at: now })
        .eq('user_id', session.user.id);

      if (storageError) {
        set({ error: storageError.message });
        return false;
      }

      set({ pool: null });
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to leave pool' });
      return false;
    }
  },

  generateReferralCode: async () => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return null;
      }

      // Use server-side cryptographically secure referral code generation
      const { data: code, error } = await supabase.rpc('generate_and_set_referral_code');

      if (error || !code) {
        set({ error: error?.message || 'Failed to generate code' });
        return null;
      }

      set((state) => ({
        userStorage: state.userStorage ? { ...state.userStorage, referral_code: code } : null,
      }));
      return code;
    } catch (error: any) {
      set({ error: error.message || 'Failed to generate referral code' });
      return null;
    }
  },

  fetchReferrals: async () => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return;
      }

      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        set({ error: error.message });
        return;
      }

      set({ referrals: data ?? [] });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch referrals' });
    }
  },

  purchaseStorage: async (purchaseType, storageGb, billingCycle, _amountInr) => {
    set({ error: null });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        set({ error: 'Not authenticated' });
        return false;
      }

      // V-02 FIX: Use server-side RPC for payment verification
      // Amount is calculated server-side to prevent client tampering.
      // In production, pass the Razorpay payment ID for verification.
      const { data: purchaseId, error } = await supabase.rpc('verify_and_record_purchase', {
        p_purchase_type: purchaseType,
        p_storage_gb: storageGb,
        p_billing_cycle: billingCycle,
        p_razorpay_payment_id: '', // TODO: Pass real Razorpay payment ID after checkout
      });

      if (error) {
        set({ error: error.message });
        return false;
      }

      // Refresh storage data from server (server already updated purchased_gb)
      await get().fetchStorage();
      return true;
    } catch (error: any) {
      set({ error: error.message || 'Failed to purchase storage' });
      return false;
    }
  },

  getUsageBreakdown: () => {
    const { userStorage } = get();
    if (!userStorage) {
      return { usedGb: 0, totalGb: 0, usedPercent: 0, baseGb: 0, referralBonusGb: 0, purchasedGb: 0 };
    }

    const totalGb = userStorage.base_storage_gb + userStorage.referral_bonus_gb + userStorage.purchased_gb;
    const usedGb = userStorage.used_storage_bytes / (1024 * 1024 * 1024);
    const usedPercent = totalGb > 0 ? (usedGb / totalGb) * 100 : 0;

    return {
      usedGb: Math.round(usedGb * 100) / 100,
      totalGb,
      usedPercent: Math.round(usedPercent * 10) / 10,
      baseGb: userStorage.base_storage_gb,
      referralBonusGb: userStorage.referral_bonus_gb,
      purchasedGb: userStorage.purchased_gb,
    };
  },

  setError: (error) => set({ error }),
}));
