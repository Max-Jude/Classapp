import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import {
  createUserProfileAtomically,
  isSuperAdminEmail,
  normalizeUserProfile,
  updateUserProfileAtomically,
} from '../services/userService';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isApproved: boolean;
  canSwitchOrClaimTutor: boolean;
  refreshProfile: () => Promise<void>;
  switchRoleForTesting: (targetRole: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Attach real-time listener to the authenticated user's profile document
      profileUnsubscribe = onSnapshot(
        doc(db, 'users', user.uid),
        async (snap) => {
          if (snap.exists()) {
            const raw = snap.data() as Partial<UserProfile>;
            const normalized = normalizeUserProfile(raw);

            // Auto-migrate existing documents that predate approvalStatus field
            const isOwner = isSuperAdminEmail(user.email);
            if (!raw.approvalStatus) {
              try {
                await updateUserProfileAtomically(user.uid, {
                  name: normalized.name,
                  department: normalized.department,
                  studentCode: normalized.studentCode,
                  bio: normalized.bio,
                  role: isOwner ? 'admin' : normalized.role,
                  approvalStatus: 'approved',
                });
              } catch {
                // Ignore migration error
              }
            }

            setProfile(normalized);
            setLoading(false);
          } else if (user.emailVerified) {
            // Auto-provision profile if signed in with verified provider and missing document
            try {
              const isOwner = isSuperAdminEmail(user.email);
              const defaultRole: UserRole = isOwner ? 'admin' : 'student';
              const created = await createUserProfileAtomically({
                uid: user.uid,
                name: user.displayName || user.email?.split('@')[0] || 'ClassFlow Member',
                email: user.email || 'user@example.edu',
                role: defaultRole,
                approvalStatus: isOwner ? 'approved' : 'pending',
              });
              setProfile(created);
            } catch {
              // Profile will be created explicitly by registration flow
            } finally {
              setLoading(false);
            }
          } else {
            setProfile(null);
            setLoading(false);
          }
        },
        () => {
          setLoading(false);
        }
      );
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setFirebaseUser({ ...auth.currentUser });
    }
  }, []);

  const switchRoleForTesting = useCallback(
    async (targetRole: UserRole) => {
      if (!firebaseUser || !profile) return;
      await updateUserProfileAtomically(firebaseUser.uid, {
        name: profile.name,
        department: profile.department,
        studentCode: profile.studentCode,
        bio: profile.bio,
        role: targetRole,
        approvalStatus: 'approved',
      });
    },
    [firebaseUser, profile]
  );

  const isOwner = isSuperAdminEmail(firebaseUser?.email || profile?.email);
  const isAdmin = Boolean(isOwner || profile?.role === 'admin');
  const isApproved = Boolean(isAdmin || profile?.approvalStatus === 'approved');

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        isAuthenticated: Boolean(firebaseUser && profile),
        isAdmin,
        isApproved,
        canSwitchOrClaimTutor: isAdmin,
        refreshProfile,
        switchRoleForTesting,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
