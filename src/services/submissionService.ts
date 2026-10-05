import {
  collection,
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
import { Assignment, OperationType, Submission, UserProfile } from '../types';
import { sanitizeId, validateGradeInput, VALIDATION_LIMITS } from '../utils/validation';
import { uploadProtectedFile } from './storageService';

export function buildSubmissionId(assignmentId: string, studentId: string): string {
  return sanitizeId(`${assignmentId}_${studentId}`);
}

export async function getSubmissionById(submissionId: string): Promise<Submission | null> {
  const path = `submissions/${submissionId}`;
  try {
    const snap = await getDoc(doc(db, 'submissions', submissionId));
    if (!snap.exists()) return null;
    return snap.data() as Submission;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function submitAssignmentWork(params: {
  assignment: Assignment;
  student: UserProfile;
  file: File;
  notes: string;
  existingSubmission?: Submission | null;
  onProgress?: (pct: number) => void;
}): Promise<Submission> {
  if (params.existingSubmission?.status === 'graded') {
    throw new Error('This assignment has already been graded and is locked against modifications.');
  }

  const isPastDeadline = Date.now() > Date.parse(params.assignment.deadline);
  if (isPastDeadline && params.assignment.allowLateSubmissions === false) {
    throw new Error(
      'The deadline for this assignment has passed and the instructor has locked late submissions.'
    );
  }

  const uploaded = await uploadProtectedFile({
    file: params.file,
    category: 'submission',
    assignmentId: params.assignment.id,
    ownerId: params.student.uid,
    onProgress: params.onProgress,
  });

  const submissionId = buildSubmissionId(params.assignment.id, params.student.uid);
  const path = `submissions/${submissionId}`;
  const cleanNotes = params.notes.trim().slice(0, VALIDATION_LIMITS.NOTES_MAX);
  const now = serverTimestamp();

  try {
    if (params.existingSubmission) {
      await updateDoc(doc(db, 'submissions', submissionId), {
        fileName: uploaded.fileName,
        storagePath: uploaded.storagePath,
        fileUrl: uploaded.downloadUrl,
        fileSize: uploaded.fileSize,
        notes: cleanNotes,
        status: 'submitted',
        submittedAt: now,
        updatedAt: now,
      });
    } else {
      await setDoc(doc(db, 'submissions', submissionId), {
        id: submissionId,
        assignmentId: params.assignment.id,
        assignmentTitle: params.assignment.title.slice(0, VALIDATION_LIMITS.TITLE_MAX),
        subject: params.assignment.subject.slice(0, VALIDATION_LIMITS.SUBJECT_MAX),
        tutorId: params.assignment.tutorId,
        studentId: params.student.uid,
        studentName: params.student.name.slice(0, VALIDATION_LIMITS.NAME_MAX),
        studentCode: params.student.studentCode.slice(0, VALIDATION_LIMITS.STUDENT_CODE_MAX),
        fileName: uploaded.fileName,
        storagePath: uploaded.storagePath,
        fileUrl: uploaded.downloadUrl,
        fileSize: uploaded.fileSize,
        notes: cleanNotes,
        status: 'submitted',
        grade: -1,
        feedback: '',
        gradedBy: '',
        gradedAt: '',
        submittedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    const updatedSnap = await getDoc(doc(db, 'submissions', submissionId));
    return updatedSnap.data() as Submission;
  } catch (error) {
    handleFirestoreError(
      error,
      params.existingSubmission ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function gradeStudentSubmission(params: {
  submissionId: string;
  tutorUid: string;
  grade: number;
  feedback: string;
}): Promise<void> {
  const roundedGrade = Math.round(params.grade);
  const validationError = validateGradeInput(roundedGrade, params.feedback);
  if (validationError) {
    throw new Error(validationError);
  }

  const path = `submissions/${params.submissionId}`;
  try {
    await updateDoc(doc(db, 'submissions', params.submissionId), {
      status: 'graded',
      grade: roundedGrade,
      feedback: params.feedback.trim().slice(0, VALIDATION_LIMITS.FEEDBACK_MAX),
      gradedBy: params.tutorUid,
      gradedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeStudentSubmissions(
  studentId: string,
  onData: (submissions: Submission[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'submissions';
  const q = query(collection(db, 'submissions'), where('studentId', '==', studentId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Submission);
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeTutorSubmissions(
  tutorId: string,
  onData: (submissions: Submission[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'submissions';
  const q = query(collection(db, 'submissions'), where('tutorId', '==', tutorId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Submission);
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeAllSubmissions(
  onData: (submissions: Submission[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'submissions';
  return onSnapshot(
    collection(db, 'submissions'),
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Submission);
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
