import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User } from '../types';
import { Session } from '@supabase/supabase-js';

// The interface defining all functions and state provided by the context.
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAnonymous: boolean;
  isPremium: boolean; // NEW: Premium status helper
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (profile: Partial<User>) => Promise<void>;
  convertToPermanentUser: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // This is the single, authoritative function for fetching or creating a user profile.
  // It correctly handles the separation between your DB schema and your client-side User type.
  const fetchAndSetUserProfile = async (authUser: any): Promise<void> => {
    try {
      console.log(`🔍 Processing user ${authUser.id.substring(0,8)}...`);
      
      const { data: profileFromDb, error: selectError } = await supabase
        .from('profiles')
        .select('*, subscription_status') // NEW: Include subscription_status
        .eq('id', authUser.id)
        .maybeSingle();
  
      if (selectError) throw selectError;
  
      let finalProfileData = profileFromDb;
  
      // If no profile exists in the DB, create one.
      if (!profileFromDb) {
        console.log('📝 No profile found in DB. Creating one...');
        
        // This object ONLY contains data for columns that exist in your 'profiles' table.
        const newProfileForDb = {
          id: authUser.id,
          full_name: authUser.user_metadata?.full_name || (authUser.is_anonymous ? 'Guest User' : ''),
          avatar_url: authUser.user_metadata?.avatar_url || '',
          username: authUser.user_metadata?.name || authUser.email?.split('@')[0] || (authUser.is_anonymous ? 'Guest' : 'user'),
          subscription_status: 'free' as const, // NEW: Default to free tier
        };
        
        const { data: createdProfile, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfileForDb)
          .select('*, subscription_status') // NEW: Include subscription_status
          .single();
        
        if (insertError) throw insertError;
        finalProfileData = createdProfile;
      }
  
      if (!finalProfileData) throw new Error("Profile could not be fetched or created.");
  
      // Construct the final user object for the React state.
      // This combines the profile data from the DB with the sensitive data from the auth session.
      const finalUserForClient: User = {
        ...finalProfileData,
        is_anonymous: authUser.is_anonymous,
        email: authUser.is_anonymous ? 'guest@focusflow.dev' : authUser.email || '',
        subscription_status: finalProfileData.subscription_status || 'free', // NEW: Include subscription status
      };
      
      console.log('✅ Success! Setting final UI state:', {
        ...finalUserForClient,
        subscription_status: finalUserForClient.subscription_status // NEW: Log subscription status
      });
      setUser(finalUserForClient);
  
    } catch (error) {
      console.error('❌ Unhandled error in fetchAndSetUserProfile:', error);
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    }
  };
  
  // This is the main useEffect hook that manages all authentication events.
  useEffect(() => {
    // This is the single, authoritative function that sets our auth state.
    // It ALWAYS gets the latest data from the server.
    const syncUserSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Error fetching session:', error);
        setUser(null);
        setSession(null);
        return;
      }
      
      if (session) {
        // Handle pending Google Sign-In merge
        const guestIdToMerge = sessionStorage.getItem('anonymous_merge_id');
        if (guestIdToMerge) {
          console.log(`🚀 AuthContext detected a pending guest merge. Calling RPC...`);
          const { error: rpcError } = await supabase.rpc('merge_anonymous_data', { anonymous_user_id: guestIdToMerge });
          if (rpcError) console.error('⚠️ AuthContext data merge failed:', rpcError);
          else console.log('✅ AuthContext data merge successful.');
          sessionStorage.removeItem('anonymous_merge_id');
        }
        setSession(session);
        await fetchAndSetUserProfile(session.user);
      } else {
        // If no session, create a new anonymous one.
        console.log('ℹ️ No active session. Attempting new anonymous session.');
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) {
          console.error('❌ Anonymous sign-in failed.', anonError);
          setUser(null);
          setSession(null);
        } else if (anonData.session) {
          // The onAuthStateChange listener will catch the 'SIGNED_IN' event from this
          // and run this syncUserSession function again, so we don't need to do anything else here.
          console.log('✅ Anonymous session creation initiated.');
        }
      }
    };

    const initialize = async () => {
      setLoading(true);
      await syncUserSession();
      setLoading(false);
    };

    initialize();

    // The listener's ONLY job is to be a TRIGGER to re-sync the session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`🔄 Auth Event Trigger: ${event}. Re-syncing session.`);
        // Always re-sync to get the absolute latest state from the server.
        // This eliminates all race conditions and stale data issues.
        syncUserSession();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --- All other functions exposed by the context ---

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const isGuest = user?.is_anonymous;
    const guestId = user?.id;

    if (isGuest && guestId) {
      console.log(`🔄 A guest is signing in. Preparing to merge data for user: ${guestId}`);
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw signInError;

    if (isGuest && guestId) {
      console.log('🚀 Calling RPC to merge anonymous data...');
      const { error: rpcError } = await supabase.rpc('merge_anonymous_data', {
        anonymous_user_id: guestId,
      });
      if (rpcError) console.error('⚠️ Data merge failed:', rpcError);
      else console.log('✅ Anonymous data merged successfully.');
    }
  };
  
  const signInWithGoogle = async () => {
    if (user && user.is_anonymous) {
      console.log('🔄 Guest signing in with Google. Storing anonymous ID for merge after callback.');
      sessionStorage.setItem('anonymous_merge_id', user.id);
    } else {
      sessionStorage.removeItem('anonymous_merge_id');
    }
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) throw error;
  };

  const convertToPermanentUser = async (email: string, password: string) => {
    if (!user || !user.is_anonymous) throw new Error('No anonymous user to convert');
    
    const { error } = await supabase.auth.updateUser({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
  };

  const updateProfile = async (profile: Partial<User>) => {
    if (!user) throw new Error('No user logged in');
    if (user.is_anonymous) {
      setUser(prevUser => prevUser ? { ...prevUser, ...profile } : null);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update(profile)
      .eq('id', user.id);
    if (error) throw error;
    setUser({ ...user, ...profile });
  };

  const isAnonymous = user?.is_anonymous || false;
  const isPremium = user?.subscription_status === 'premium'; // NEW: Premium status helper

  const value = {
    user,
    session,
    loading,
    isAnonymous,
    isPremium, // NEW: Expose premium status
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    convertToPermanentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};