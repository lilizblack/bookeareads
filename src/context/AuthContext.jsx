import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider } from '../lib/firebaseClient';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOfflineMode, setIsOfflineMode] = useState(false);

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in
                setUser(firebaseUser);
                setSession({ user: firebaseUser });
                setIsOfflineMode(false);
                setLoading(false);
            } else {
                // User is signed out
                setUser(null);
                setSession(null);
                setIsOfflineMode(true);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const signUp = async (email, password) => {
        if (!auth) throw new Error('Firebase not configured');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user };
    };

    const signIn = async (email, password) => {
        if (!auth) throw new Error('Firebase not configured');
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user };
    };

    const signInWithGoogle = async () => {
        if (!auth) throw new Error('Firebase not configured');
        const result = await signInWithPopup(auth, googleProvider);
        return { user: result.user };
    };

    const signOut = async () => {
        if (!auth) return;
        await firebaseSignOut(auth);
        setIsOfflineMode(true);
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            loading,
            isOfflineMode,
            signUp,
            signIn,
            signInWithGoogle, // New Google Sign-In method
            signOut
        }}>
            {children}
        </AuthContext.Provider>
    );
};
