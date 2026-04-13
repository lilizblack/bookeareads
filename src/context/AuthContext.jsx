import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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

    // Track previous uid to prevent unnecessary re-renders when Firebase
    // passes a new user object reference without the actual uid changing
    // (e.g. during token refreshes), which would cascade into BookContext
    // re-fetching all books and showing loading skeletons globally.
    const prevUidRef = useRef(null);

    useEffect(() => {
        if (!auth) {
            setLoading(false);
            return;
        }

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            const newUid = firebaseUser?.uid || null;

            // Only update user state when the actual uid changes, not on every
            // callback invocation (Firebase can fire this with a new object
            // reference even when the user hasn't changed).
            if (newUid !== prevUidRef.current) {
                prevUidRef.current = newUid;
                if (firebaseUser) {
                    setUser(firebaseUser);
                    setSession({ user: firebaseUser });
                    setIsOfflineMode(false);
                } else {
                    setUser(null);
                    setSession(null);
                    setIsOfflineMode(true);
                }
            }

            setLoading(false);
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
