import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firestoreError';
import { Announcement, AnnouncementPriority, OperationType } from '../types';
import { sanitizeId, VALIDATION_LIMITS } from '../utils/validation';

function getTimestampMs(val: unknown): number {
  if (!val) return 0;
  if (typeof (val as { toMillis?: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export async function createAnnouncement(params: {
  title: string;
  message: string;
  subject: string;
  priority: AnnouncementPriority;
  authorId: string;
  authorName: string;
  authorRole: 'tutor' | 'admin';
}): Promise<void> {
  const cleanTitle = params.title.trim().slice(0, VALIDATION_LIMITS.TITLE_MAX);
  const cleanMessage = params.message.trim().slice(0, 2000);
  const cleanSubject = (params.subject.trim() || 'All Courses').slice(
    0,
    VALIDATION_LIMITS.SUBJECT_MAX
  );

  if (cleanTitle.length < 3) {
    throw new Error('Announcement title must be at least 3 characters.');
  }
  if (cleanMessage.length < 5) {
    throw new Error('Announcement message must be at least 5 characters.');
  }

  const announcementId = sanitizeId(
    `ann_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  );
  const path = `announcements/${announcementId}`;

  try {
    await setDoc(doc(db, 'announcements', announcementId), {
      id: announcementId,
      title: cleanTitle,
      message: cleanMessage,
      subject: cleanSubject,
      priority: params.priority,
      authorId: params.authorId,
      authorName: params.authorName.trim().slice(0, VALIDATION_LIMITS.NAME_MAX),
      authorRole: params.authorRole,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteAnnouncement(announcementId: string): Promise<void> {
  const path = `announcements/${announcementId}`;
  try {
    await deleteDoc(doc(db, 'announcements', announcementId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeAnnouncements(
  onData: (announcements: Announcement[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!auth.currentUser) {
    onData([]);
    return () => {};
  }
  const path = 'announcements';
  const q = query(
    collection(db, 'announcements'),
    where('priority', 'in', ['normal', 'important', 'urgent'])
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Announcement);
      list.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt));
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}
