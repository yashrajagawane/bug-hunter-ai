import React, { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuthStore, UserProfile } from '../store/authStore';

/**
 * Safely converts a Firestore document's data to a UserProfile,
 * handling the Timestamp → ISO string conversion for createdAt.
 */
function toUserProfile(data: Record<string, unknown>): UserProfile {
  const createdAt = data.createdAt;
  let createdAtStr: string;
  if (createdAt instanceof Timestamp) {
    createdAtStr = createdAt.toDate().toISOString();
  } else if (typeof createdAt === 'string') {
    createdAtStr = createdAt;
  } else {
    createdAtStr = new Date().toISOString();
  }
  return { ...data, createdAt: createdAtStr } as UserProfile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          // Fetch or create user profile in Firestore
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            setProfile(toUserProfile(userSnap.data()));
          } else {
            // Create new profile
            const newProfile: UserProfile = {
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
            
            setProfile(newProfile);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setUser, setProfile, setLoading]);

  return <>{children}</>;
}
