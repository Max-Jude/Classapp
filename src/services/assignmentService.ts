import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firestoreError';
import { Assignment, AssignmentPublicationStatus, OperationType } from '../types';
import { sanitizeId, validateAssignmentInput, VALIDATION_LIMITS } from '../utils/validation';
import { uploadProtectedFile } from './storageService';

export function generateAssignmentId(): string {
  return sanitizeId(`asgn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
}

export async function createAssignment(params: {
  id?: string;
  title: string;
  subject: string;
  description: string;
  instructions: string;
  tutorId: string;
  tutorName: string;
  deadline: string;
  maxPoints: number;
  status: AssignmentPublicationStatus;
  allowLateSubmissions?: boolean;
  attachmentFile?: File | null;
  onUploadProgress?: (pct: number) => void;
}): Promise<Assignment> {
  const validationError = validateAssignmentInput({
    title: params.title,
    subject: params.subject,
    description: params.description,
    instructions: params.instructions,
    deadline: params.deadline,
    maxPoints: params.maxPoints,
  });
  if (validationError) {
    throw new Error(validationError);
  }

  const assignmentId = params.id ? sanitizeId(params.id) : generateAssignmentId();
  const path = `assignments/${assignmentId}`;
  const now = serverTimestamp();
  const publishedAt = params.status === 'published' ? new Date().toISOString() : '';
  const allowLateSubmissions = params.allowLateSubmissions !== false;

  // Step 1: Create the assignment document first so exists(/assignments/$(assignmentId))
  // in security rules is satisfied if a fallback file upload references it.
  try {
    await setDoc(doc(db, 'assignments', assignmentId), {
      id: assignmentId,
      title: params.title.trim().slice(0, VALIDATION_LIMITS.TITLE_MAX),
      subject: params.subject.trim().slice(0, VALIDATION_LIMITS.SUBJECT_MAX),
      description: params.description.trim().slice(0, VALIDATION_LIMITS.DESCRIPTION_MAX),
      instructions: params.instructions.trim().slice(0, VALIDATION_LIMITS.INSTRUCTIONS_MAX),
      tutorId: params.tutorId,
      tutorName: params.tutorName.trim().slice(0, VALIDATION_LIMITS.NAME_MAX),
      deadline: new Date(params.deadline).toISOString(),
      maxPoints: Math.min(100, Math.max(1, Math.round(params.maxPoints))),
      status: params.status,
      attachmentName: '',
      attachmentPath: '',
      attachmentUrl: '',
      attachmentSize: 0,
      publishedAt,
      allowLateSubmissions,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  // Step 2: If an attachment file was provided, upload it and update the assignment document.
  if (params.attachmentFile) {
    try {
      const uploaded = await uploadProtectedFile({
        file: params.attachmentFile,
        category: 'assignment',
        assignmentId,
        ownerId: params.tutorId,
        onProgress: params.onUploadProgress,
      });

      await updateDoc(doc(db, 'assignments', assignmentId), {
        attachmentName: uploaded.fileName,
        attachmentPath: uploaded.storagePath,
        attachmentUrl: uploaded.downloadUrl,
        attachmentSize: uploaded.fileSize,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      try {
        await deleteDoc(doc(db, 'assignments', assignmentId));
      } catch {
        // Ignore cleanup error
      }
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  const finalSnap = await getDoc(doc(db, 'assignments', assignmentId));
  return finalSnap.data() as Assignment;
}

export async function uploadAssignmentAttachment(params: {
  assignmentId: string;
  tutorId: string;
  file: File;
  onUploadProgress?: (pct: number) => void;
}): Promise<void> {
  const path = `assignments/${params.assignmentId}`;
  const uploaded = await uploadProtectedFile({
    file: params.file,
    category: 'assignment',
    assignmentId: params.assignmentId,
    ownerId: params.tutorId,
    onProgress: params.onUploadProgress,
  });

  try {
    await updateDoc(doc(db, 'assignments', params.assignmentId), {
      attachmentName: uploaded.fileName,
      attachmentPath: uploaded.storagePath,
      attachmentUrl: uploaded.downloadUrl,
      attachmentSize: uploaded.fileSize,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateAssignment(
  assignmentId: string,
  tutorId: string,
  updates: {
    title: string;
    subject: string;
    description: string;
    instructions: string;
    tutorName: string;
    deadline: string;
    maxPoints: number;
    status: AssignmentPublicationStatus;
    existingPublishedAt: string;
    allowLateSubmissions?: boolean;
    newAttachmentFile?: File | null;
    onUploadProgress?: (pct: number) => void;
  }
): Promise<void> {
  const validationError = validateAssignmentInput({
    title: updates.title,
    subject: updates.subject,
    description: updates.description,
    instructions: updates.instructions,
    deadline: updates.deadline,
    maxPoints: updates.maxPoints,
  });
  if (validationError) {
    throw new Error(validationError);
  }

  const path = `assignments/${assignmentId}`;
  const publishedAt =
    updates.status === 'published' && !updates.existingPublishedAt
      ? new Date().toISOString()
      : updates.existingPublishedAt;

  const payload: Record<string, unknown> = {
    title: updates.title.trim().slice(0, VALIDATION_LIMITS.TITLE_MAX),
    subject: updates.subject.trim().slice(0, VALIDATION_LIMITS.SUBJECT_MAX),
    description: updates.description.trim().slice(0, VALIDATION_LIMITS.DESCRIPTION_MAX),
    instructions: updates.instructions.trim().slice(0, VALIDATION_LIMITS.INSTRUCTIONS_MAX),
    tutorName: updates.tutorName.trim().slice(0, VALIDATION_LIMITS.NAME_MAX),
    deadline: new Date(updates.deadline).toISOString(),
    maxPoints: Math.min(100, Math.max(1, Math.round(updates.maxPoints))),
    status: updates.status,
    publishedAt,
    allowLateSubmissions: updates.allowLateSubmissions !== false,
    updatedAt: serverTimestamp(),
  };

  if (updates.newAttachmentFile) {
    const uploaded = await uploadProtectedFile({
      file: updates.newAttachmentFile,
      category: 'assignment',
      assignmentId,
      ownerId: tutorId,
      onProgress: updates.onUploadProgress,
    });
    payload.attachmentName = uploaded.fileName;
    payload.attachmentPath = uploaded.storagePath;
    payload.attachmentUrl = uploaded.downloadUrl;
    payload.attachmentSize = uploaded.fileSize;
  }

  try {
    await updateDoc(doc(db, 'assignments', assignmentId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const path = `assignments/${assignmentId}`;
  try {
    await deleteDoc(doc(db, 'assignments', assignmentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getAssignmentById(assignmentId: string): Promise<Assignment | null> {
  const path = `assignments/${assignmentId}`;
  try {
    const snap = await getDoc(doc(db, 'assignments', assignmentId));
    if (!snap.exists()) return null;
    return snap.data() as Assignment;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribePublishedAssignments(
  onData: (assignments: Assignment[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'assignments';
  const q = query(collection(db, 'assignments'), where('status', '==', 'published'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Assignment);
      list.sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeTutorAssignments(
  tutorId: string,
  onData: (assignments: Assignment[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'assignments';
  const q = query(collection(db, 'assignments'), where('tutorId', '==', tutorId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Assignment);
      list.sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeAllAssignments(
  onData: (assignments: Assignment[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'assignments';
  return onSnapshot(
    collection(db, 'assignments'),
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Assignment);
      list.sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
