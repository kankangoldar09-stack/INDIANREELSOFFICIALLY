import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types';
import { toast } from 'sonner';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
  return data;
}
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (username: string, password: string, fullName: string, dob?: string, city?: string, emailAddress?: string) => Promise<{ error: Error | null }>;
  signInWithOtpFlow: (identifier: string) => Promise<{ error: Error | null; resolvedEmail?: string }>;
  verifyEmailOTP: (email: string, token: string) => Promise<{ error: Error | null }>;
  verifySignupOTP: (email: string, token: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  const updateLastIp = async (userId: string, currentBanReason: string | null) => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      const currentIp = data.ip;
      
      const expectedPrefix = `IP: ${currentIp}`;
      // Only update if it doesn't already start with the current IP or "IP:" format
      if (!currentBanReason || !currentBanReason.startsWith(expectedPrefix)) {
        await (supabase as any)
          .from('profiles')
          .update({ ban_reason: expectedPrefix })
          .eq('id', userId);
      }
    } catch (err) {
      console.warn('Failed to update user IP:', err);
    }
  };

  useEffect(() => {
    if (profile && !profile.is_banned) {
      updateLastIp(profile.id, profile.ban_reason);
    }
  }, [profile]);

  useEffect(() => {
    supabase
      .auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          getProfile(session.user.id).then(setProfile);
        }
      })
      .catch(error => {
        toast.error(`Failed to fetch user profile: ${error.message}`);
      })
      .finally(() => {
        setLoading(false);
      });

    // In this function, do NOT use any await calls. Use `.then()` instead to avoid deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithUsername = async (username: string, password: string) => {
    try {
      const cleanUsername = username.replace(/^@/, '').trim();
      console.log('Attempting login for:', cleanUsername);

      // 1. Try to find the email for this username from profiles table
      const { data: profileData, error: profileError }: any = await (supabase as any)
        .from('profiles')
        .select('email')
        .ilike('username', cleanUsername)
        .limit(1)
        .maybeSingle();

      // Fallback email if profile not found (might happen for old users)
      const email = profileData?.email || `${cleanUsername}@miaoda.com`;
      console.log('Using email for login:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase auth error:', error);
        throw error;
      }
      
      console.log('Login successful, user:', data.user?.id);
      return { error: null };
    } catch (error) {
      console.error('Login catch error:', error);
      return { error: error as Error };
    }
  };

  const signUpWithUsername = async (username: string, password: string, fullName: string, dob?: string, city?: string, emailAddress?: string) => {
    try {
      const email = emailAddress && emailAddress.includes('@')
        ? emailAddress.trim()
        : `${username}@miaoda.com`;

      const userMetadata: Record<string, string> = {
        username: username.trim(),
        full_name: fullName.trim(),
      };

      if (dob) {
        userMetadata.dob = dob.trim();
      }
      if (city) {
        userMetadata.city = city.trim();
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userMetadata,
        }
      });

      if (error) throw error;

      // Auto-login immediately — no OTP/email verification needed
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithOtpFlow = async (identifier: string) => {
    try {
      let email = identifier;

      // If identifier is not an email, try to resolve it as a username
      if (!identifier.includes('@')) {
        const cleanUsername = identifier.replace(/^@/, '').trim();
        const { data: profileData } = await (supabase as any)
          .from('profiles')
          .select('email')
          .ilike('username', cleanUsername)
          .limit(1)
          .maybeSingle();

        if (profileData?.email) {
          email = profileData.email;
        } else {
          // Fallback if not found, let Supabase handle it (might fail)
          email = `${cleanUsername}@miaoda.com`;
        }
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        }
      });

      if (error) throw error;
      return { error: null, resolvedEmail: email };
    } catch (error) {
      console.error('Email OTP flow error:', error);
      return { error: error as Error };
    }
  };

  const verifyEmailOTP = async (email: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Email OTP verify error:', error);
      return { error: error as Error };
    }
  };

  const verifySignupOTP = async (email: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      console.error('Signup OTP verify error:', error);
      return { error: error as Error };
    }
  };


  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    sessionStorage.removeItem('welcome_played');
    sessionStorage.removeItem('login_welcome_played');
    sessionStorage.removeItem('signup_welcome_played');
  };

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_self');
      return { error: null };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithUsername, signUpWithUsername, signInWithOtpFlow, verifyEmailOTP, verifySignupOTP, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // During hot reload, context might be temporarily undefined
    // Return a safe default to prevent crashes
    if (import.meta.hot) {
      console.warn('AuthContext is undefined during hot reload, returning safe defaults');
      return {
        user: null,
        profile: null,
        loading: true,
        signInWithUsername: async () => ({ error: new Error('Context not ready') }),
        signUpWithUsername: async () => ({ error: new Error('Context not ready') }),
        signInWithOtpFlow: async () => ({ error: new Error('Context not ready') }),
        verifyEmailOTP: async () => ({ error: new Error('Context not ready') }),
        verifySignupOTP: async () => ({ error: new Error('Context not ready') }),
        signInWithGoogle: async () => ({ error: new Error('Context not ready') }),
        signOut: async () => {},
        refreshProfile: async () => {},
      };
    }
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
