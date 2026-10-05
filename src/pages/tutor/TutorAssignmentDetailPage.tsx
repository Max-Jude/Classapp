import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useSubmissions } from '../../hooks/useSubmissions';
import {
  getAssignmentById,
  updateAssignment,
  uploadAssignmentAttachment,
} from '../../services/assignmentService';
import { subscribeStudentsDirectory } from '../../services/userService';
import { downloadProtectedFile } from '../../services/storageService';
import {
  Assignment,
  AssignmentPublicationStatus,
  DirectoryEntry,
  Submission,
} from '../../types';
import {
  formatDateTime,
  formatFileSize,
  isDeadlinePast,
  isSubmissionLate,
  toFriendlyErrorMessage,
} from '../../utils/formatters';
import { exportAssignmentCohortCsv } from '../../utils/csvExport';
import { FileDropzone } from '../../components/common/FileDropzone';
import {
  PublicationStatusIndicator,
  SubmissionStatusIndicator,
} from '../../components/common/StatusIndicator';
import { GradingModal } from '../../components/assignments/GradingModal';

export const TutorAssignmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { submissions } = useSubmissions();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [students, setStudents] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // Edit form states
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maxPoints, setMaxPoints] = useState(100);
  const [status, setStatus] = useState<AssignmentPublicationStatus>('published');
  const [allowLateSubmissions, setAllowLateSubmissions] = useState<boolean>(true);
  const [newAttachment, setNewAttachment] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [directUploading, setDirectUploading] = useState(false);
  const directFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file || !assignment || !profile) return;

    setDirectUploading(true);
    setError(null);
    try {
      await uploadAssignmentAttachment({
        assignmentId: assignment.id,
        tutorId: profile.uid,
        file,
      });
      await loadAssignment();
      showToast('File uploaded', `"${file.name}" is now attached to this assignment.`, 'success');
    } catch (err) {
      setError(toFriendlyErrorMessage(err));
    } finally {
      setDirectUploading(false);
      if (directFileInputRef.current) directFileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const unsub = subscribeStudentsDirectory((list) => setStudents(list));
    return () => unsub();
  }, []);

  const loadAssignment = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getAssignmentById(id);
      if (!data) {
        setError('Assignment not found.');
      } else {
        setAssignment(data);
        setTitle(data.title);
        setSubject(data.subject);
        setDescription(data.description);
        setInstructions(data.instructions);
        setDeadline(new Date(data.deadline).toISOString().slice(0, 16));
        setMaxPoints(data.maxPoints);
        setStatus(data.status);
        setAllowLateSubmissions(data.allowLateSubmissions !== false);
      }
    } catch (err) {
      setError(toFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignment();
  }, [id]);

  const assignmentSubmissions = useMemo(
    () => submissions.filter((s) => s.assignmentId === id),
    [submissions, id]
  );

  // Track submitted vs pending/overdue across registered students
  const studentTrackingRows = useMemo(() => {
    const subByStudent = new Map<string, Submission>();
    assignmentSubmissions.forEach((s) => subByStudent.set(s.studentId, s));

    return students.map((stu) => ({
      student: stu,
      submission: subByStudent.get(stu.uid) || null,
    }));
  }, [students, assignmentSubmissions]);

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment || !profile) return;

    setSaving(true);
    setError(null);
    try {
      await updateAssignment(assignment.id, profile.uid, {
        title,
        subject,
        description,
        instructions,
        tutorName: profile.name,
        deadline,
        maxPoints,
        status,
        existingPublishedAt: assignment.publishedAt,
        allowLateSubmissions,
        newAttachmentFile: newAttachment,
        onUploadProgress: (pct) => setUploadProgress(pct),
      });
      await loadAssignment();
      setNewAttachment(null);
      setUploadProgress(null);
      setEditing(false);
      showToast('Assignment updated', 'Changes saved to Firestore.', 'success');
    } catch (err) {
      setError(toFriendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8">
        <p className="text-sm text-red-700 mb-4">▲ {error || 'Assignment not found.'}</p>
        <Link to="/tutor/assignments" className="text-xs font-medium text-blue-700 hover:underline">
          Back to Assignments
        </Link>
      </div>
    );
  }

  const pastDue = isDeadlinePast(assignment.deadline);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <Link
            to="/tutor/assignments"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Assignments</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>{assignment.subject}</span>
            <span aria-hidden="true">·</span>
            <PublicationStatusIndicator status={assignment.status} />
            <span aria-hidden="true">·</span>
            <span className="font-mono">Max {assignment.maxPoints} pts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
            {assignment.title}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-500 mt-1">
            <span>Deadline: {formatDateTime(assignment.deadline)}</span>
            <span aria-hidden="true">·</span>
            <span>
              {assignment.allowLateSubmissions === false
                ? '▲ Late Submissions Locked'
                : '● Late Submissions Allowed (Marked LATE)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              exportAssignmentCohortCsv(assignment, studentTrackingRows);
              showToast('Gradebook exported', 'Cohort CSV downloaded.', 'info');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Gradebook (CSV)</span>
          </button>
          <button
            type="button"
            onClick={() => setEditing((prev) => !prev)}
            className="px-4 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            {editing ? 'Close Editor' : 'Edit Assignment Brief'}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          ▲ {error}
        </div>
      )}

      {/* Collapsible Edit Form */}
      {editing ? (
        <form
          onSubmit={handleSaveChanges}
          className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5"
        >
          <h2 className="text-lg font-display font-semibold text-slate-900">
            Edit Assignment Configuration
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Instructions</label>
            <textarea
              rows={5}
              required
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Deadline</label>
              <input
                type="datetime-local"
                required
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Max Points</label>
              <input
                type="number"
                min={1}
                max={100}
                required
                value={maxPoints}
                onChange={(e) => setMaxPoints(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AssignmentPublicationStatus)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900">Late Submission Policy</p>
              <p className="text-xs text-slate-500">
                Control whether students can upload work after the deadline.
              </p>
            </div>
            <select
              value={allowLateSubmissions ? 'allow' : 'lock'}
              onChange={(e) => setAllowLateSubmissions(e.target.value === 'allow')}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg"
            >
              <option value="allow">● Allow Late Submissions (Marked as LATE)</option>
              <option value="lock">▲ Strictly Lock Submissions After Deadline</option>
            </select>
          </div>

          <FileDropzone
            selectedFile={newAttachment}
            onSelectFile={setNewAttachment}
            uploadProgress={uploadProgress}
            disabled={saving}
            label="Replace or Add Reference Attachment"
          />

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Description</h2>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{assignment.description}</p>
          </div>
          <div className="pt-4 border-t border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Instructions</h2>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{assignment.instructions}</p>
          </div>
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <input
              ref={directFileInputRef}
              type="file"
              onChange={handleDirectFileUpload}
              className="sr-only"
              aria-label="Upload assignment attachment"
            />
            <div>
              <p className="text-xs font-mono text-slate-500 uppercase">Uploaded File</p>
              {assignment.attachmentName && assignment.attachmentUrl ? (
                <div className="flex items-center gap-2 mt-1">
                  <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                  <p className="text-sm font-semibold text-slate-900">
                    {assignment.attachmentName}{' '}
                    <span className="text-xs font-mono text-slate-500 font-normal">
                      ({formatFileSize(assignment.attachmentSize)})
                    </span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500 mt-1">
                  No file uploaded for this assignment yet.
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {assignment.attachmentName && assignment.attachmentUrl && (
                <button
                  type="button"
                  onClick={() =>
                    downloadProtectedFile(assignment.attachmentUrl, assignment.attachmentName)
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download ({assignment.attachmentName})</span>
                </button>
              )}
              <button
                type="button"
                disabled={directUploading}
                onClick={() => directFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-lg transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {directUploading
                    ? 'Uploading File...'
                    : assignment.attachmentName
                    ? 'Replace File'
                    : 'Upload Assignment File'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions for this Assignment */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-900">
              Submitted Student Work ({assignmentSubmissions.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Download submitted files and assign grades and feedback
            </p>
          </div>
        </div>

        {assignmentSubmissions.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No submissions have been uploaded for this assignment yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-mono text-slate-500">
                  <th className="py-3 px-5 font-medium">Student</th>
                  <th className="py-3 px-4 font-medium">File</th>
                  <th className="py-3 px-4 font-medium">Submitted At</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Grade</th>
                  <th className="py-3 px-5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {assignmentSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-900">{sub.studentName}</p>
                      <p className="text-xs font-mono text-slate-500">{sub.studentCode}</p>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <button
                        type="button"
                        onClick={() => downloadProtectedFile(sub.fileUrl, sub.fileName)}
                        className="font-medium text-blue-700 hover:underline inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>{sub.fileName}</span>
                      </button>
                      <p className="text-[11px] font-mono text-slate-400">
                        {formatFileSize(sub.fileSize)}
                      </p>
                    </td>
                     <td className="py-3.5 px-4 text-xs font-mono text-slate-600 tabular-nums">
                      <div>{formatDateTime(sub.submittedAt)}</div>
                      {isSubmissionLate(sub.submittedAt, assignment.deadline) && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded">
                          ▲ LATE
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <SubmissionStatusIndicator status={sub.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                      {sub.status === 'graded' && sub.grade >= 0
                        ? `${sub.grade} / ${assignment.maxPoints}`
                        : '—'}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => setGradingSubmission(sub)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md"
                      >
                        {sub.status === 'graded' ? 'Edit Grade' : 'Grade Submission'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cohort Completion & Overdue Tracking */}
      {students.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-display font-semibold text-slate-900">
              Cohort Completion Roster ({students.length} Registered Students)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks submitted, pending, and overdue status across all enrolled students
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-mono text-slate-500">
                  <th className="py-3 px-5 font-medium">Student Name</th>
                  <th className="py-3 px-4 font-medium">Student ID</th>
                  <th className="py-3 px-4 font-medium">Department</th>
                  <th className="py-3 px-5 font-medium text-right">Tracking State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {studentTrackingRows.map(({ student, submission }) => (
                  <tr key={student.uid}>
                    <td className="py-3 px-5 font-medium text-slate-900">{student.name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-500">
                      {student.studentCode}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">{student.department}</td>
                    <td className="py-3 px-5 text-right font-mono text-xs">
                      {submission ? (
                        submission.status === 'graded' ? (
                          <span className="text-emerald-700">
                            ◆ Graded ({submission.grade}/100)
                          </span>
                        ) : (
                          <span className="text-blue-700">● Submitted</span>
                        )
                      ) : pastDue ? (
                        <span className="text-red-700">▲ Overdue (No Submission)</span>
                      ) : (
                        <span className="text-amber-700">○ Pending Submission</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {gradingSubmission && profile && (
        <GradingModal
          submission={gradingSubmission}
          tutorUid={profile.uid}
          onClose={() => setGradingSubmission(null)}
        />
      )}
    </div>
  );
};
