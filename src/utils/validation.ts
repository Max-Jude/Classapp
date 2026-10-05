/**
 * Validation constants synchronized with firebase-blueprint.json and firestore.rules
 */
export const VALIDATION_LIMITS = {
  ID_MAX_LENGTH: 128,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  NAME_MIN: 1,
  NAME_MAX: 100,
  EMAIL_MIN: 3,
  EMAIL_MAX: 254,
  DEPARTMENT_MAX: 100,
  STUDENT_CODE_MAX: 40,
  BIO_MAX: 500,
  TITLE_MIN: 3,
  TITLE_MAX: 160,
  SUBJECT_MIN: 2,
  SUBJECT_MAX: 80,
  DESCRIPTION_MIN: 5,
  DESCRIPTION_MAX: 1000,
  INSTRUCTIONS_MIN: 10,
  INSTRUCTIONS_MAX: 5000,
  NOTES_MAX: 1000,
  FEEDBACK_MAX: 3000,
  GRADE_MIN: 0,
  GRADE_MAX: 100,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB max
  CHUNK_CHAR_SIZE: 700000, // 700 KB per Firestore chunk document (well below 900 KB rule limit)
  ALLOWED_EXTENSIONS: [
    'pdf',
    'doc',
    'docx',
    'ppt',
    'pptx',
    'xls',
    'xlsx',
    'txt',
    'zip',
    'png',
    'jpg',
    'jpeg',
    'csv',
    'md',
    'rtf',
    'json',
    'py',
    'js',
    'ts',
    'html',
    'css',
  ],
} as const;

export function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, VALIDATION_LIMITS.ID_MAX_LENGTH);
  return cleaned || 'id_default';
}

export function isValidId(id: string): boolean {
  return (
    typeof id === 'string' &&
    id.length >= 1 &&
    id.length <= VALIDATION_LIMITS.ID_MAX_LENGTH &&
    VALIDATION_LIMITS.ID_PATTERN.test(id)
  );
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email address is required.';
  if (trimmed.length < VALIDATION_LIMITS.EMAIL_MIN || trimmed.length > VALIDATION_LIMITS.EMAIL_MAX) {
    return `Email must be between ${VALIDATION_LIMITS.EMAIL_MIN} and ${VALIDATION_LIMITS.EMAIL_MAX} characters.`;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return 'Please enter a valid email address.';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (password.length > 128) return 'Password must not exceed 128 characters.';
  return null;
}

export function validateFile(file: File): string | null {
  if (!file) return 'Please select a file to upload.';
  if (file.size <= 0) return 'The selected file is empty.';
  if (file.size > VALIDATION_LIMITS.MAX_FILE_SIZE_BYTES) {
    return `File size exceeds the 10 MB maximum limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`;
  }
  return null;
}

export function validateAssignmentInput(input: {
  title: string;
  subject: string;
  description: string;
  instructions: string;
  deadline: string;
  maxPoints: number;
}): string | null {
  const title = input.title.trim();
  if (title.length < VALIDATION_LIMITS.TITLE_MIN || title.length > VALIDATION_LIMITS.TITLE_MAX) {
    return `Assignment title must be between ${VALIDATION_LIMITS.TITLE_MIN} and ${VALIDATION_LIMITS.TITLE_MAX} characters.`;
  }
  const subject = input.subject.trim();
  if (subject.length < VALIDATION_LIMITS.SUBJECT_MIN || subject.length > VALIDATION_LIMITS.SUBJECT_MAX) {
    return `Subject must be between ${VALIDATION_LIMITS.SUBJECT_MIN} and ${VALIDATION_LIMITS.SUBJECT_MAX} characters.`;
  }
  const desc = input.description.trim();
  if (desc.length < VALIDATION_LIMITS.DESCRIPTION_MIN || desc.length > VALIDATION_LIMITS.DESCRIPTION_MAX) {
    return `Description must be between ${VALIDATION_LIMITS.DESCRIPTION_MIN} and ${VALIDATION_LIMITS.DESCRIPTION_MAX} characters.`;
  }
  const inst = input.instructions.trim();
  if (inst.length < VALIDATION_LIMITS.INSTRUCTIONS_MIN || inst.length > VALIDATION_LIMITS.INSTRUCTIONS_MAX) {
    return `Instructions must be between ${VALIDATION_LIMITS.INSTRUCTIONS_MIN} and ${VALIDATION_LIMITS.INSTRUCTIONS_MAX} characters.`;
  }
  if (!input.deadline || isNaN(Date.parse(input.deadline))) {
    return 'Please specify a valid deadline date and time.';
  }
  if (
    typeof input.maxPoints !== 'number' ||
    isNaN(input.maxPoints) ||
    input.maxPoints < 1 ||
    input.maxPoints > 100
  ) {
    return 'Maximum points must be a number between 1 and 100.';
  }
  return null;
}

export function validateGradeInput(grade: number, feedback: string): string | null {
  if (typeof grade !== 'number' || isNaN(grade)) {
    return 'Please enter a valid numeric grade.';
  }
  if (grade < VALIDATION_LIMITS.GRADE_MIN || grade > VALIDATION_LIMITS.GRADE_MAX) {
    return `Grade must be between ${VALIDATION_LIMITS.GRADE_MIN} and ${VALIDATION_LIMITS.GRADE_MAX}.`;
  }
  if (feedback.trim().length > VALIDATION_LIMITS.FEEDBACK_MAX) {
    return `Feedback cannot exceed ${VALIDATION_LIMITS.FEEDBACK_MAX} characters.`;
  }
  return null;
}
