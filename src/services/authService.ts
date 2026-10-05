import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { ApprovalStatus, UserProfile, UserRole } from '../types';
import {
  createUserProfileAtomically,
  getUserProfile,
  isSuperAdminEmail,
} from './userService';

export function getHomeRouteForProfile(profile: UserProfile): string {
  const isOwner = isSuperAdminEmail(profile.email);
  if (!isOwner && profile.approvalStatus !== 'approved') {
    return '/pending-approval';
  }
  if (profile.role === 'admin') {
    return '/admin/dashboard';
  }
  if (profile.role === 'tutor') {
    return '/tutor/dashboard';
  }
  return '/student/dashboard';
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User; profile: UserProfile }> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const existingProfile = await getUserProfile(credential.user.uid);
  if (existingProfile) {
    return { user: credential.user, profile: existingProfile };
  }

  const isOwnerEmail = isSuperAdminEmail(credential.user.email);
  const role: UserRole = isOwnerEmail ? 'admin' : 'student';
  const approvalStatus: ApprovalStatus = isOwnerEmail ? 'approved' : 'pending';

  const profile = await createUserProfileAtomically({
    uid: credential.user.uid,
    name: credential.user.displayName || email.split('@')[0],
    email: credential.user.email || email.trim(),
    role,
    approvalStatus,
  });
  return { user: credential.user, profile };
}

export async function registerWithEmail(params: {
  name: string;
  email: string;
  password: string;
  requestedRole: UserRole;
  department: string;
  studentCode: string;
}): Promise<{ user: User; profile: UserProfile | null; requiresEmailVerification: boolean }> {
  const credential = await createUserWithEmailAndPassword(
    auth,
    params.email.trim(),
    params.password
  );
  await updateProfile(credential.user, { displayName: params.name.trim() });

  const isOwnerEmail = isSuperAdminEmail(credential.user.email);
  const finalRole: UserRole = isOwnerEmail
    ? 'admin'
    : params.requestedRole === 'tutor'
    ? 'tutor'
    : 'student';
  const approvalStatus: ApprovalStatus = isOwnerEmail ? 'approved' : 'pending';

  const profile = await createUserProfileAtomically({
    uid: credential.user.uid,
    name: params.name,
    email: params.email,
    role: finalRole,
    approvalStatus,
    department: params.department,
    studentCode: params.studentCode,
  });

  return { user: credential.user, profile, requiresEmailVerification: false };
}

export async function signInOrRegisterWithGoogle(options?: {
  preferredRole?: UserRole;
  department?: string;
  studentCode?: string;
}): Promise<{ user: User; profile: UserProfile; isNewUser: boolean }> {
  const credential = await signInWithPopup(auth, googleProvider);
  const user = credential.user;

  const existingProfile = await getUserProfile(user.uid);
  if (existingProfile) {
    return { user, profile: existingProfile, isNewUser: false };
  }

  const isOwnerEmail = user.emailVerified && isSuperAdminEmail(user.email);
  const role: UserRole = isOwnerEmail
    ? 'admin'
    : options?.preferredRole === 'tutor'
    ? 'tutor'
    : 'student';
  const approvalStatus: ApprovalStatus = isOwnerEmail ? 'approved' : 'pending';

  const profile = await createUserProfileAtomically({
    uid: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'ClassFlow User',
    email: user.email || 'user@example.edu',
    role,
    approvalStatus,
    department: options?.department || 'Computer Science',
    studentCode: options?.studentCode,
  });

  return { user, profile, isNewUser: true };
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}
