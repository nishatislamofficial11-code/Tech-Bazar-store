import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { setDemoModeActive } from '../lib/demoMode';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  isDemo: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true, 
  isDemo: false,
  signOut: async () => {},
  refreshProfile: async () => {} 
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setDemoModeActive(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        if (data.role === 'blocked') {
          setDemoModeActive(false);
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          if (typeof window !== 'undefined') {
            import('react-hot-toast').then(({ default: toast }) => {
              toast.error('Your account has been blocked by an administrator.');
            });
          }
        } else {
          setProfile(data);
          setDemoModeActive(data.role === 'demo');
        }
      } else {
         console.warn('Could not fetch profile, attempting to recreate it:', error);
         
         if (session?.user) {
           const newProfile = {
             id: userId,
             email: session.user.email,
             full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
             role: 'user'
           };
           
           await supabase.from('profiles').upsert(newProfile);
           setProfile(newProfile);
           setDemoModeActive(false);
         }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    setDemoModeActive(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, isDemo: profile?.role === 'demo', signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
