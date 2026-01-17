
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { syncLocalDataToSupabase } from '../utils/syncUtils';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    // Persist "offline mode" to allow viewing data after logout
    const [isOfflineMode, setIsOfflineMode] = useState(false);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);

            if (_event === 'SIGNED_IN') {
                setIsOfflineMode(false);
                if (session?.user) {
                    // Trigger Data Sync (Merge)
                    await syncLocalDataToSupabase(session.user.id);
                }
            } else if (_event === 'SIGNED_OUT') {
                // Critical: Enable Read-Only Mode
                setIsOfflineMode(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email, password) => {
        if (!supabase) throw new Error('Supabase not configured');
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });
        if (error) throw error;
        return data;
    };

    const signIn = async (email, password) => {
        if (!supabase) throw new Error('Supabase not configured');
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
            isOfflineMode, // Publicly exposed
            signUp,
            signIn,
            signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
};
