import React, { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore, UserProfile } from '../store/authStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch or create user profile in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setProfile(userSnap.data() as UserProfile);
        } else {
          // Create new profile
          const newProfile = {
            uid: firebaseUser.uid,
            username: firebaseUser.displayName || 'Detective',
            email: firebaseUser.email || '',
            xp: 0,
            level: 1,
            coins: 100, // starting coins
            streak: 0,
            casesSolved: 0,
            isAdmin: false,
            createdAt: new Date().toISOString()
          };
          
          await setDoc(userRef, {
            ...newProfile,
            createdAt: serverTimestamp() // Overwrite with actual server timestamp on server
          });
          
          setProfile(newProfile as UserProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setProfile, setLoading]);

  return <>{children}</>;
}
