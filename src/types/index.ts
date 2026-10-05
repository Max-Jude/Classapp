import { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'tutor' | 'admin';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  department: string;
  studentCode: string;
  bio: string;
  createdAt: Timestamp | string | null;
  updatedAt: Timestamp | string | null;
}

export interface DirectoryEntry {
  uid: string;
  name: string;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  department: string;
  studentCode: string;
  createdAt: Timestamp | string | null;
  updatedAt: Timestamp | string | null;
}

export interface TutorBootstrapConfig {
  primaryTutorUid: string;
  createdAt: Timestamp | string | null;
}

export interface TutorAuthorization {
  targetUid: string;
  authorizedByUid: string;
  createdAt: Timestamp | string | null;
}

export type AssignmentPublicationStatus = 'draft' | 'published' | 'archived';

export interface Assignment {
  id: string;
  title: string;
  subject: string;
  description: string;
  instructions: string;
  tutorId: string;
  tutorName: string;
  deadline: string; // ISO 8601 string
  maxPoints: number;
  status: AssignmentPublicationStatus;
  attachmentName: string;
  attachmentPath: string;
  attachmentUrl: string;
  attachmentSize: number;
  publishedAt: string;
  allowLateSubmissions?: boolean;
  createdAt: Timestamp | string | null;
  updatedAt: Timestamp | string | null;
}

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  subject: string;
  priority: AnnouncementPriority;
  authorId: string;
  authorName: string;
  authorRole: 'tutor' | 'admin';
  createdAt: Timestamp | string | null;
}

export type SubmissionWorkflowStatus = 'in_progress' | 'submitted' | 'graded';

export type ComputedAssignmentStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Submitted'
  | 'Graded'
  | 'Overdue';

export interface Submission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  subject: string;
  tutorId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  fileName: string;
  storagePath: string;
  fileUrl: string;
  fileSize: number;
  notes: string;
  status: SubmissionWorkflowStatus;
  grade: number; // -1 when ungraded, 0..100 when graded
  feedback: string;
  gradedBy: string;
  gradedAt: string;
  submittedAt: Timestamp | string | null;
  createdAt: Timestamp | string | null;
  updatedAt: Timestamp | string | null;
}

export interface FileUploadResult {
  fileName: string;
  storagePath: string;
  downloadUrl: string;
  fileSize: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
      displayName?: string | null;
      photoUrl?: string | null;
    }[];
  };
}
