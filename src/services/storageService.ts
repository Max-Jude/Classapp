import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError } from '../lib/firestoreError';
import { FileUploadResult, OperationType } from '../types';
import { sanitizeId, validateFile, VALIDATION_LIMITS } from '../utils/validation';

function sanitizeStorageFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200) || 'uploaded_file';
}

function cleanDisplayFileName(name: string): string {
  return name.trim().slice(0, 200) || 'uploaded_file';
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads either a Tutor Assignment Attachment or a Student Submission File.
 * Stores files in protected Firestore /fileContents/{fileId} with automatic
 * multi-document chunking so files of any size up to 10 MB upload fast and reliably
 * with full RBAC enforcement in firestore.rules.
 */
export async function uploadProtectedFile(params: {
  file: File;
  category: 'assignment' | 'submission';
  assignmentId: string;
  ownerId: string;
  onProgress?: (percent: number) => void;
}): Promise<FileUploadResult> {
  const validationError = validateFile(params.file);
  if (validationError) {
    throw new Error(validationError);
  }

  const displayFileName = cleanDisplayFileName(params.file.name);
  const safePathName = sanitizeStorageFileName(params.file.name);
  const storagePath =
    params.category === 'assignment'
      ? `assignments/${params.assignmentId}/${safePathName}`
      : `submissions/${params.assignmentId}/${params.ownerId}/${safePathName}`;

  if (params.onProgress) params.onProgress(15);

  const dataUrl = await readFileAsDataUrl(params.file);
  if (!dataUrl) {
    throw new Error('Selected file could not be encoded for upload.');
  }

  if (params.onProgress) params.onProgress(35);

  const baseFileId = sanitizeId(
    `f_${params.category === 'assignment' ? 'asgn' : 'sub'}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 7)}`
  );
  const mimeType = (params.file.type || 'application/octet-stream').slice(0, 120);
  const chunkSize = VALIDATION_LIMITS.CHUNK_CHAR_SIZE;

  // Case 1: File fits in a single Firestore document (<= 700,000 chars)
  if (dataUrl.length <= chunkSize) {
    const path = `fileContents/${baseFileId}`;
    try {
      await setDoc(doc(db, 'fileContents', baseFileId), {
        id: baseFileId,
        ownerId: params.ownerId,
        assignmentId: params.assignmentId,
        category: params.category,
        fileName: displayFileName,
        mimeType,
        size: params.file.size,
        dataUrl,
        createdAt: serverTimestamp(),
      });
      if (params.onProgress) params.onProgress(100);
      return {
        fileName: displayFileName,
        storagePath,
        downloadUrl: `firestore://fileContents/${baseFileId}`,
        fileSize: params.file.size,
      };
    } catch (fsError) {
      handleFirestoreError(fsError, OperationType.CREATE, path);
    }
  }

  // Case 2: Larger file — split into chunks and store a manifest document
  const chunks: string[] = [];
  for (let i = 0; i < dataUrl.length; i += chunkSize) {
    chunks.push(dataUrl.slice(i, i + chunkSize));
  }

  const chunkIds: string[] = [];
  for (let index = 0; index < chunks.length; index++) {
    const chunkId = sanitizeId(`${baseFileId}_p${index}`);
    chunkIds.push(chunkId);
    const chunkPath = `fileContents/${chunkId}`;
    try {
      await setDoc(doc(db, 'fileContents', chunkId), {
        id: chunkId,
        ownerId: params.ownerId,
        assignmentId: params.assignmentId,
        category: params.category,
        fileName: displayFileName,
        mimeType,
        size: params.file.size,
        dataUrl: chunks[index],
        createdAt: serverTimestamp(),
      });
      if (params.onProgress) {
        const pct = 35 + Math.round(((index + 1) / (chunks.length + 1)) * 60);
        params.onProgress(Math.min(95, pct));
      }
    } catch (fsError) {
      handleFirestoreError(fsError, OperationType.CREATE, chunkPath);
    }
  }

  // Store the manifest document referencing all chunk IDs
  const manifestDataUrl = `CHUNKED_MANIFEST:${chunkIds.join(',')}`;
  const manifestPath = `fileContents/${baseFileId}`;
  try {
    await setDoc(doc(db, 'fileContents', baseFileId), {
      id: baseFileId,
      ownerId: params.ownerId,
      assignmentId: params.assignmentId,
      category: params.category,
      fileName: displayFileName,
      mimeType,
      size: params.file.size,
      dataUrl: manifestDataUrl,
      createdAt: serverTimestamp(),
    });
    if (params.onProgress) params.onProgress(100);
    return {
      fileName: displayFileName,
      storagePath,
      downloadUrl: `firestore://fileContents/${baseFileId}`,
      fileSize: params.file.size,
    };
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.CREATE, manifestPath);
  }
}

/**
 * Downloads a protected file from Firestore /fileContents/{fileId} or HTTPS URL
 * without using window.open (safe inside iframe environments).
 */
export async function downloadProtectedFile(
  fileUrl: string,
  fileName: string
): Promise<void> {
  if (!fileUrl) {
    throw new Error('No file URL is attached to this record.');
  }

  if (fileUrl.startsWith('firestore://fileContents/')) {
    const fileId = fileUrl.replace('firestore://fileContents/', '').trim();
    const path = `fileContents/${fileId}`;
    let dataUrl = '';
    try {
      const snap = await getDoc(doc(db, 'fileContents', fileId));
      if (!snap.exists()) {
        throw new Error('The requested file attachment could not be found.');
      }
      dataUrl = snap.data().dataUrl as string;

      if (dataUrl.startsWith('CHUNKED_MANIFEST:')) {
        const chunkIds = dataUrl
          .replace('CHUNKED_MANIFEST:', '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const chunkSnaps = await Promise.all(
          chunkIds.map((cid) => getDoc(doc(db, 'fileContents', cid)))
        );
        dataUrl = chunkSnaps
          .map((cs) => (cs.exists() ? (cs.data().dataUrl as string) : ''))
          .join('');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    triggerAnchorDownload(dataUrl, fileName);
    return;
  }

  // Standard HTTPS download URL fallback
  try {
    const response = await fetch(fileUrl);
    if (response.ok) {
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      triggerAnchorDownload(objectUrl, fileName);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
      return;
    }
  } catch {
    // Fallback to direct anchor download attribute
  }

  triggerAnchorDownload(fileUrl, fileName);
}

function triggerAnchorDownload(href: string, fileName: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName || 'download';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
