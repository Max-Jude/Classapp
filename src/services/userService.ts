import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, BOOTSTRAPPED_TUTOR_EMAIL, db } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firestoreError';
import {
  ApprovalStatus,
  DirectoryEntry,
  OperationType,
  TutorAuthorization,
  UserProfile,
  UserRole,
} from '../types';
import { VALIDATION_LIMITS } from '../utils/validation';

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase() === BOOTSTRAPPED_TUTOR_EMAIL.toLowerCase());
}

export function normalizeUserProfile(raw: Partial<UserProfile>): UserProfile {
  const isOwner = isSuperAdminEmail(raw.email);
  return {
    uid: raw.uid || '',
    name: raw.name || 'ClassFlow Member',
    email: raw.email || '',
    role: raw.role || (isOwner ? 'admin' : 'student'),
    approvalStatus: raw.approvalStatus || 'approved',
    department: raw.department || 'General Studies',
    studentCode: raw.studentCode || 'STU-001',
    bio: raw.bio || '',
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!auth.currentUser) return null;
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return normalizeUserProfile(snap.data() as Partial<UserProfile>);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function isTutorBootstrapAvailable(): Promise<boolean> {
  if (!auth.currentUser) return false;
  const path = 'systemConfig/tutorBootstrap';
  try {
    const snap = await getDoc(doc(db, 'systemConfig', 'tutorBootstrap'));
    return !snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function hasTutorAuthorization(uid: string): Promise<boolean> {
  if (!auth.currentUser) return false;
  const path = `tutorAuthorizations/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'tutorAuthorizations', uid));
    return snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function canUserClaimTutorRole(
  email: string | null | undefined,
  emailVerified: boolean,
  bootstrapAvailable: boolean,
  authorizedByTutor: boolean
): boolean {
  if (emailVerified && isSuperAdminEmail(email)) {
    return true;
  }
  return emailVerified && (bootstrapAvailable || authorizedByTutor);
}

export function generateIdentificationCode(role: UserRole, uid: string): string {
  const prefix = role === 'admin' ? 'ADM' : role === 'tutor' ? 'TUT' : 'STU';
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = (hash * 31 + uid.charCodeAt(i)) % 900000;
  }
  const numericCode = String(Math.abs(hash) + 100000).slice(0, 6);
  return `${prefix}-${numericCode}`;
}

export async function createUserProfileAtomically(params: {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  approvalStatus?: ApprovalStatus;
  department?: string;
  studentCode?: string;
  bio?: string;
}): Promise<UserProfile> {
  const path = `users/${params.uid}`;
  const cleanName = params.name.trim().slice(0, VALIDATION_LIMITS.NAME_MAX) || 'ClassFlow Member';
  const cleanEmail = params.email.trim().slice(0, VALIDATION_LIMITS.EMAIL_MAX);
  const cleanDepartment = (params.department || 'General Studies')
    .trim()
    .slice(0, VALIDATION_LIMITS.DEPARTMENT_MAX);

  const isOwner = isSuperAdminEmail(cleanEmail);
  const finalApprovalStatus: ApprovalStatus =
    params.approvalStatus || (isOwner ? 'approved' : 'pending');

  const cleanCode = generateIdentificationCode(params.role, params.uid);
  const cleanBio = (params.bio || '').trim().slice(0, VALIDATION_LIMITS.BIO_MAX);

  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();

    batch.set(doc(db, 'users', params.uid), {
      uid: params.uid,
      name: cleanName,
      email: cleanEmail,
      role: params.role,
      approvalStatus: finalApprovalStatus,
      department: cleanDepartment,
      studentCode: cleanCode,
      bio: cleanBio,
      createdAt: now,
      updatedAt: now,
    });

    batch.set(doc(db, 'directory', params.uid), {
      uid: params.uid,
      name: cleanName,
      role: params.role,
      approvalStatus: finalApprovalStatus,
      department: cleanDepartment,
      studentCode: cleanCode,
      createdAt: now,
      updatedAt: now,
    });

    await batch.commit();
    const created = await getDoc(doc(db, 'users', params.uid));
    return normalizeUserProfile(created.data() as Partial<UserProfile>);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateUserProfileAtomically(
  uid: string,
  updates: {
    name: string;
    department: string;
    studentCode: string;
    bio: string;
    role?: UserRole;
    approvalStatus?: ApprovalStatus;
  }
): Promise<UserProfile> {
  const path = `users/${uid}`;
  const cleanName = updates.name.trim().slice(0, VALIDATION_LIMITS.NAME_MAX);
  const cleanDepartment = updates.department.trim().slice(0, VALIDATION_LIMITS.DEPARTMENT_MAX);
  const cleanCode = updates.studentCode.trim().slice(0, VALIDATION_LIMITS.STUDENT_CODE_MAX);
  const cleanBio = updates.bio.trim().slice(0, VALIDATION_LIMITS.BIO_MAX);

  try {
    const currentSnap = await getDoc(doc(db, 'users', uid));
    const currentData = (currentSnap.data() || {}) as Partial<UserProfile>;
    const currentApproval: ApprovalStatus =
      updates.approvalStatus || currentData.approvalStatus || 'approved';
    const lockedCode =
      currentData.studentCode ||
      generateIdentificationCode(updates.role || currentData.role || 'student', uid);

    const batch = writeBatch(db);
    const now = serverTimestamp();

    const userUpdatePayload: Record<string, unknown> = {
      name: cleanName,
      department: cleanDepartment,
      studentCode: lockedCode,
      bio: cleanBio,
      approvalStatus: currentApproval,
      updatedAt: now,
    };

    const dirUpdatePayload: Record<string, unknown> = {
      name: cleanName,
      department: cleanDepartment,
      studentCode: lockedCode,
      approvalStatus: currentApproval,
      updatedAt: now,
    };

    if (updates.role) {
      userUpdatePayload.role = updates.role;
      dirUpdatePayload.role = updates.role;
    }

    batch.update(doc(db, 'users', uid), userUpdatePayload);
    batch.update(doc(db, 'directory', uid), dirUpdatePayload);

    await batch.commit();
    const updated = await getDoc(doc(db, 'users', uid));
    return normalizeUserProfile(updated.data() as Partial<UserProfile>);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Admin-only atomic admission decision (Approve, Decline/Revoke, or Change Role).
 */
export async function adminUpdateUserAdmission(params: {
  targetUid: string;
  approvalStatus: ApprovalStatus;
  role: UserRole;
}): Promise<void> {
  const path = `users/${params.targetUid}`;
  try {
    const batch = writeBatch(db);
    const now = serverTimestamp();

    batch.update(doc(db, 'users', params.targetUid), {
      role: params.role,
      approvalStatus: params.approvalStatus,
      updatedAt: now,
    });

    batch.update(doc(db, 'directory', params.targetUid), {
      role: params.role,
      approvalStatus: params.approvalStatus,
      updatedAt: now,
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Admin-only permanent removal of a Student or Tutor account record from Firestore.
 */
export async function adminRemoveUser(targetUid: string): Promise<void> {
  const path = `users/${targetUid}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', targetUid));
    batch.delete(doc(db, 'directory', targetUid));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function authorizeTutorUid(
  targetUid: string,
  authorizedByUid: string
): Promise<void> {
  const path = `tutorAuthorizations/${targetUid}`;
  try {
    await setDoc(doc(db, 'tutorAuthorizations', targetUid), {
      targetUid,
      authorizedByUid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeStudentsDirectory(
  onData: (students: DirectoryEntry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'directory';
  const q = query(collection(db, 'directory'), where('role', '==', 'student'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => {
          const raw = d.data() as Partial<DirectoryEntry>;
          return {
            uid: raw.uid || d.id,
            name: raw.name || 'Student',
            role: raw.role || 'student',
            approvalStatus: raw.approvalStatus || 'approved',
            department: raw.department || 'General Studies',
            studentCode: raw.studentCode || 'STU-001',
            createdAt: raw.createdAt || null,
            updatedAt: raw.updatedAt || null,
          } as DirectoryEntry;
        })
        .filter((s) => s.approvalStatus === 'approved');
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

/**
 * Admin real-time listener for all registered accounts (Students, Tutors, Admins).
 */
export function subscribeAllUsersForAdmin(
  onData: (users: UserProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'users';
  return onSnapshot(
    collection(db, 'users'),
    (snapshot) => {
      const list = snapshot.docs.map((d) => normalizeUserProfile(d.data() as Partial<UserProfile>));
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeMyIssuedAuthorizations(
  tutorUid: string,
  onData: (auths: TutorAuthorization[]) => void
): Unsubscribe {
  const path = 'tutorAuthorizations';
  const q = query(
    collection(db, 'tutorAuthorizations'),
    where('authorizedByUid', '==', tutorUid)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => d.data() as TutorAuthorization));
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
