import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, loginEmail, registerEmail, logout, handleFirestoreError, OperationType } from '../firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  createdAt: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const userEmail = currentUser.email?.toLowerCase();
        const docId = userEmail || currentUser.uid;
        const userRef = doc(db, 'users', docId);
        
        try {
          const docSnap = await getDoc(userRef);
          
          if (!docSnap.exists()) {
            // Check for legacy document keyed by uid
            const legacyRef = doc(db, 'users', currentUser.uid);
            const legacySnap = await getDoc(legacyRef);
            
            if (legacySnap.exists()) {
              const legacyData = legacySnap.data() as UserProfile;
              await setDoc(userRef, legacyData);
              try { await deleteDoc(legacyRef); } catch (e) { /* ignore */ }
              setProfile(legacyData);
            } else {
              // Create new user profile
              const isFirstAdmin = currentUser.email === 'junior.obba@gmail.com';
              const newProfile: UserProfile = {
                uid: currentUser.uid,
                email: currentUser.email || '',
                displayName: currentUser.displayName || 'Anonymous',
                role: isFirstAdmin ? 'admin' : 'user',
                createdAt: new Date().toISOString(),
              };
              await setDoc(userRef, newProfile);
              setProfile(newProfile);
            }
          } else {
            const existingData = docSnap.data() as UserProfile;
            // Update uid and displayName if they were missing (e.g. pre-created by admin)
            if (existingData.uid !== currentUser.uid || existingData.displayName === 'Anonymous' || !existingData.displayName) {
              const updatedProfile = {
                ...existingData,
                uid: currentUser.uid,
                displayName: existingData.displayName && existingData.displayName !== 'Anonymous' 
                  ? existingData.displayName 
                  : (currentUser.displayName || 'Anonymous')
              };
              await updateDoc(userRef, { 
                uid: currentUser.uid,
                displayName: updatedProfile.displayName
              });
              setProfile(updatedProfile);
            } else {
              setProfile(existingData);
            }
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${docId}`);
        }
        
        // Listen to profile changes
        const unsubProfile = onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as UserProfile);
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${docId}`);
        });
        
        setLoading(false);
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleEmailLogin = async (email: string, pass: string) => {
    try {
      await loginEmail(email, pass);
    } catch (error: any) {
      // If user not found or invalid credential, check if they are pre-authorized by admin
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        const userRef = doc(db, 'users', email.toLowerCase());
        const docSnap = await getDoc(userRef);
        
        // If admin created their profile and they use the default password, auto-register them
        if (docSnap.exists() && pass === '1234') {
          await registerEmail(email, pass);
          return;
        }
      }
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithEmail: handleEmailLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
