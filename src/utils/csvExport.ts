import { Assignment, DirectoryEntry, Submission, UserProfile } from '../types';
import { formatDateTime, isDeadlinePast, isSubmissionLate } from './formatters';

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

function triggerCsvDownload(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Exports filtered or complete student submissions as a spreadsheet-ready CSV Gradebook.
 */
export function exportSubmissionsGradebookCsv(
  submissions: Submission[],
  assignmentsMap: Map<string, Assignment>,
  filename = `ClassFlow_Gradebook_${new Date().toISOString().slice(0, 10)}.csv`
): void {
  const headers = [
    'Student Name',
    'Student ID Code',
    'Assignment Title',
    'Subject',
    'Submission Status',
    'Timeliness',
    'Submitted File',
    'Submitted At',
    'Score',
    'Max Points',
    'Tutor Feedback',
    'Evaluated At',
  ];

  const rows = submissions.map((sub) => {
    const asgn = assignmentsMap.get(sub.assignmentId);
    const maxPts = asgn?.maxPoints ?? 100;
    const late = asgn ? isSubmissionLate(sub.submittedAt, asgn.deadline) : false;
    return [
      sub.studentName,
      sub.studentCode,
      sub.assignmentTitle,
      sub.subject,
      sub.status === 'graded' ? 'Graded' : 'Submitted (Awaiting Grade)',
      late ? 'LATE' : 'On-Time',
      sub.fileName,
      formatDateTime(sub.submittedAt),
      sub.status === 'graded' && sub.grade >= 0 ? sub.grade : 'Ungraded',
      maxPts,
      sub.feedback || '',
      sub.gradedAt ? formatDateTime(sub.gradedAt) : '—',
    ];
  });

  const csv = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  triggerCsvDownload(csv, filename);
}

/**
 * Exports the full student cohort completion & grade roster for a single assignment.
 */
export function exportAssignmentCohortCsv(
  assignment: Assignment,
  trackingRows: { student: DirectoryEntry; submission: Submission | null }[]
): void {
  const safeTitle = assignment.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  const filename = `ClassFlow_${safeTitle}_Cohort_Grades.csv`;

  const headers = [
    'Student Name',
    'Student ID Code',
    'Department',
    'Assignment Title',
    'Tracking Status',
    'Timeliness',
    'Submitted File',
    'Submitted At',
    'Score',
    'Max Points',
    'Tutor Feedback',
  ];

  const pastDue = isDeadlinePast(assignment.deadline);

  const rows = trackingRows.map(({ student, submission }) => {
    if (!submission) {
      return [
        student.name,
        student.studentCode,
        student.department,
        assignment.title,
        pastDue ? 'Overdue (No Submission)' : 'Pending Submission',
        pastDue ? 'Missing / Past Due' : 'Pending',
        '—',
        '—',
        '—',
        assignment.maxPoints,
        '',
      ];
    }

    const late = isSubmissionLate(submission.submittedAt, assignment.deadline);
    return [
      student.name,
      student.studentCode,
      student.department,
      assignment.title,
      submission.status === 'graded' ? 'Graded' : 'Submitted',
      late ? 'LATE' : 'On-Time',
      submission.fileName,
      formatDateTime(submission.submittedAt),
      submission.status === 'graded' && submission.grade >= 0 ? submission.grade : 'Ungraded',
      assignment.maxPoints,
      submission.feedback || '',
    ];
  });

  const csv = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  triggerCsvDownload(csv, filename);
}

/**
 * Exports the Admin user directory (Students, Tutors, Pending, Approved) to CSV.
 */
export function exportAdminUsersRosterCsv(
  users: UserProfile[],
  filterName = 'All_Accounts'
): void {
  const filename = `ClassFlow_${filterName}_Roster_${new Date().toISOString().slice(0, 10)}.csv`;

  const headers = [
    'Full Name',
    'Email Address',
    'Role',
    'Identification Code',
    'Department',
    'Admission Status',
    'Registered At',
  ];

  const rows = users.map((u) => [
    u.name,
    u.email,
    u.role.toUpperCase(),
    u.studentCode,
    u.department,
    u.approvalStatus.toUpperCase(),
    formatDateTime(u.createdAt),
  ]);

  const csv = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  triggerCsvDownload(csv, filename);
}

/**
 * Exports the Tutor's enrolled Student Roster with submission counts and average grades.
 */
export function exportTutorStudentsRosterCsv(
  students: DirectoryEntry[],
  submissions: Submission[]
): void {
  const filename = `ClassFlow_Student_Performance_Roster_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  const headers = [
    'Student Name',
    'Student ID Code',
    'Department',
    'Enrolled Date',
    'Total Submissions',
    'Graded Submissions',
    'Average Grade (%)',
  ];

  const rows = students.map((stu) => {
    const stuSubs = submissions.filter((s) => s.studentId === stu.uid);
    const gradedSubs = stuSubs.filter((s) => s.status === 'graded' && s.grade >= 0);
    const avg =
      gradedSubs.length > 0
        ? (gradedSubs.reduce((acc, s) => acc + s.grade, 0) / gradedSubs.length).toFixed(1)
        : '—';

    return [
      stu.name,
      stu.studentCode,
      stu.department,
      formatDateTime(stu.createdAt),
      stuSubs.length,
      gradedSubs.length,
      avg,
    ];
  });

  const csv = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ].join('\r\n');

  triggerCsvDownload(csv, filename);
}
