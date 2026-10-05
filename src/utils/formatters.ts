import { Timestamp } from 'firebase/firestore';
import { Assignment, ComputedAssignmentStatus, Submission } from '../types';

export function formatDateTime(value: Timestamp | string | Date | null | undefined): string {
  if (!value) return '—';
  let date: Date;
  if (value instanceof Timestamp) {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    date = new Date(value);
  } else if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    date = (value as { toDate: () => Date }).toDate();
  } else {
    return '—';
  }
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatShortDate(value: Timestamp | string | Date | null | undefined): string {
  if (!value) return '—';
  let date: Date;
  if (value instanceof Timestamp) {
    date = value.toDate();
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    date = new Date(value);
  } else if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    date = (value as { toDate: () => Date }).toDate();
  } else {
    return '—';
  }
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}

export function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

export function isDeadlinePast(deadlineIso: string): boolean {
  if (!deadlineIso) return false;
  const deadlineTime = Date.parse(deadlineIso);
  if (isNaN(deadlineTime)) return false;
  return Date.now() > deadlineTime;
}

export function isSubmissionLate(
  submittedAt: Timestamp | string | Date | null | undefined,
  deadlineIso: string | undefined | null
): boolean {
  if (!submittedAt || !deadlineIso) return false;
  const deadlineTime = Date.parse(deadlineIso);
  if (isNaN(deadlineTime)) return false;

  let subDate: Date;
  if (submittedAt instanceof Timestamp) {
    subDate = submittedAt.toDate();
  } else if (submittedAt instanceof Date) {
    subDate = submittedAt;
  } else if (typeof submittedAt === 'string') {
    subDate = new Date(submittedAt);
  } else if (typeof (submittedAt as { toDate?: () => Date }).toDate === 'function') {
    subDate = (submittedAt as { toDate: () => Date }).toDate();
  } else {
    return false;
  }
  if (isNaN(subDate.getTime())) return false;
  return subDate.getTime() > deadlineTime;
}

export function getRelativeDeadlineText(deadlineIso: string): string {
  if (!deadlineIso) return '';
  const target = Date.parse(deadlineIso);
  if (isNaN(target)) return '';
  const diffMs = target - Date.now();
  const absHours = Math.round(Math.abs(diffMs) / (1000 * 60 * 60));
  const absDays = Math.floor(absHours / 24);

  if (diffMs < 0) {
    if (absDays > 0) return `${absDays}d overdue`;
    if (absHours > 0) return `${absHours}h overdue`;
    return 'Past due';
  } else {
    if (absDays > 0) return `Due in ${absDays}d`;
    if (absHours > 0) return `Due in ${absHours}h`;
    return 'Due soon';
  }
}

/**
 * Computes authoritative assignment status combining Firestore submission state and deadline.
 */
export function computeStudentAssignmentStatus(
  assignment: Assignment,
  submission?: Submission | null
): ComputedAssignmentStatus {
  if (submission) {
    if (submission.status === 'graded') return 'Graded';
    if (submission.status === 'submitted') return 'Submitted';
    if (submission.status === 'in_progress') {
      return isDeadlinePast(assignment.deadline) ? 'Overdue' : 'In Progress';
    }
  }
  if (isDeadlinePast(assignment.deadline)) {
    return 'Overdue';
  }
  return 'Not Started';
}

export function toFriendlyErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  // Check if it is our structured JSON FirestoreErrorInfo
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.error === 'string') {
      return mapFirebaseMessage(parsed.error);
    }
  } catch {
    // Not JSON
  }

  return mapFirebaseMessage(raw);
}

function mapFirebaseMessage(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('permission-denied') || lower.includes('missing or insufficient permissions')) {
    return "You don't have permission to perform this action. Security rules rejected the request.";
  }
  if (lower.includes('quota exceeded')) {
    return 'Firestore daily free-tier quota has been reached. Quota resets the next day.';
  }
  if (lower.includes('auth/invalid-credential') || lower.includes('auth/wrong-password') || lower.includes('auth/user-not-found')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (lower.includes('auth/email-already-in-use')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (lower.includes('auth/operation-not-allowed')) {
    return 'Email/Password sign-in is not yet enabled in the Firebase Console for this project. Use "Continue with Google" or enable Email/Password under Authentication > Sign-in method in Firebase Console.';
  }
  if (lower.includes('auth/popup-closed-by-user')) {
    return 'The sign-in popup was closed before authentication completed.';
  }
  if (lower.includes('auth/weak-password')) {
    return 'Please choose a stronger password (at least 8 characters).';
  }
  if (lower.includes('network-request-failed')) {
    return 'A network error occurred. Please check your internet connection and try again.';
  }
  return msg;
}
