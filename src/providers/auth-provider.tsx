import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/**
 * Set by the login screen. When it is explicitly "false" the session is
 * cleared on the next cold start, which is what the remember-me checkbox
 * promises. A missing value keeps the original persistent-session behaviour.
 */
export const REMEMBER_SESSION_KEY = 'thefarmyard.remember-session';

export type AppRole = 'farmer' | 'buyer' | 'admin';

type Profile = {
  id: string;
  full_name: string;
  phone_number: string;
  role: AppRole;
  is_verified: boolean;
  farm_location: string;
  is_blocked?: boolean;
  avatar_url?: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    /*
     * avatar_url is intentionally not selected: the deployed public.profiles
     * table has no such column (no migration adds it). Selecting it makes
     * PostgREST reject the whole query with 42703, which would leave the
     * profile null. Add it back only after the column is created.
     */
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, full_name, phone_number, role, is_verified, farm_location, is_blocked'
      )
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Failed to load profile:', error.message);
      setProfile(null);
      return;
    }

    if (data?.is_blocked) {
      await supabase.auth.signOut();
      setProfile(null);
      return;
    }

    setProfile(data as Profile);
  }

  async function refreshProfile() {
    if (!session?.user.id) {
      setProfile(null);
      return;
    }

    await loadProfile(session.user.id);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      const rememberPreference = await AsyncStorage.getItem(
        REMEMBER_SESSION_KEY
      );

      if (!mounted) return;

      if (initialSession && rememberPreference === 'false') {
        await supabase.auth.signOut();

        if (!mounted) return;

        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setSession(initialSession);

      if (initialSession?.user.id) {
        await loadProfile(initialSession.user.id);
      } else {
        setProfile(null);
      }

      if (mounted) {
        setLoading(false);
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession?.user.id) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      void loadProfile(nextSession.user.id).finally(() => {
        setLoading(false);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading,
    signOut,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}