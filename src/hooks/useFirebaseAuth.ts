"use client";

import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export const useFirebaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsAuthenticating(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to login');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const register = async (email: string, pass: string) => {
    setIsAuthenticating(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, isAuthenticating, error, login, register, logout };
};
