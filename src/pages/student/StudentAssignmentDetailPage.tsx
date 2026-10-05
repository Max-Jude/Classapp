import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getAssignmentById } from '../../services/assignmentService';
import {
  buildSubmissionId,
  getSubmissionById,
  submitAssignmentWork,
} from '../../services/submissionService';
import { downloadProtectedFile } from '../../services/storageService';
import { Assignment, Submission } from '../../types';
import {
  computeStudentAssignmentStatus,
  formatDateTime,
  formatFileSize,
  isDeadlinePast,
  isSubmissionLate,
  toFriendlyErrorMessage,
} from '../../utils/formatters';
import { FileDropzone } from '../../components/common/FileDropzone';
import { StudentStatusIndicator } from '../../components/common/StatusIndicator';

export const StudentAssignmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [downloadingAttachment, setDownloadingAttachment] = useState<boolean>(false);
  const [downloadingSubmission, setDownloadingSubmission] = useState<boolean>(false);

  useEffect(() => {
    if (!id || !profile) return;
    let active = true;

    async function loadDetails() {
      setLoading(true);
      setError(null);
      try {
        const asgn = await getAssignmentById(id!);
        if (!active) return;
        if (!asgn) {
          setError('Assignment not found.');
          setLoading(false);
          return;
        }
        setAssignment(asgn);

        const subId = buildSubmissionId(asgn.id, profile!.uid);
        const existingSub = await getSubmissionById(subId);
        if (!active) return;
        setSubmission(existingSub);
        if (existingSub?.notes) {
          setNotes(existingSub.notes);
        }
      } catch (err) {
        if (active) setError(toFriendlyErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDetails();
    return () => {
      active = false;
    };
  }, [id, profile]);

  const handleDownloadAttachment = async () => {
    if (!assignment?.attachmentUrl) return;
    setDownloadingAttachment(true);
    try {
      await downloadProtectedFile(assignment.attachmentUrl, assignment.attachmentName);
      showToast('Download started', assignment.attachmentName, 'info');
    } catch (err) {
      showToast('Download failed', toFriendlyErrorMessage(err), 'error');
    } finally {
      setDownloadingAttachment(false);
    }
  };

  const handleDownloadSubmission = async () => {
    if (!submission?.fileUrl) return;
    setDownloadingSubmission(true);
    try {
      await downloadProtectedFile(submission.fileUrl, submission.fileName);
      showToast('Download started', submission.fileName, 'info');
    } catch (err) {
      showToast('Download failed', toFriendlyErrorMessage(err), 'error');
    } finally {
      setDownloadingSubmission(false);
    }
  };

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment || !profile) return;

    if (!selectedFile) {
      showToast('File required', 'Please select a document to upload before submitting.', 'error');
      return;
    }

    setSubmitting(true);
    setUploadProgress(5);
    setError(null);

    try {
      const updated = await submitAssignmentWork({
        assignment,
        student: profile,
        file: selectedFile,
        notes,
        existingSubmission: submission,
        onProgress: (pct) => setUploadProgress(pct),
      });
      setSubmission(updated);
      setSelectedFile(null);
      setUploadProgress(null);
      showToast(
        'Assignment submitted',
        `Your file (${updated.fileName}) has been securely recorded.`,
        'success'
      );
    } catch (err) {
      setUploadProgress(null);
      setError(toFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
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
        <p className="text-sm text-red-700 mb-4">▲ {error || 'Assignment could not be loaded.'}</p>
        <Link
          to="/student/assignments"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-900 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assignments</span>
        </Link>
      </div>
    );
  }

  const computedStatus = computeStudentAssignmentStatus(assignment, submission);
  const isLockedByGrade = submission?.status === 'graded';
  const pastDue = isDeadlinePast(assignment.deadline);
  const isLockedByDeadline = pastDue && assignment.allowLateSubmissions === false;
  const isUploadDisabled = submitting || isLockedByGrade || isLockedByDeadline;
  const submittedLate = submission
    ? isSubmissionLate(submission.submittedAt, assignment.deadline)
    : false;

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/student/assignments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Assignments</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
          <span className="font-medium text-slate-800">{assignment.subject}</span>
          <span aria-hidden="true">·</span>
          <span>Tutor: {assignment.tutorName}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono">Max Score: {assignment.maxPoints} pts</span>
          <span aria-hidden="true">·</span>
          <StudentStatusIndicator status={computedStatus} />
        </div>

        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
          {assignment.title}
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500">
          <span>Published: {formatDateTime(assignment.publishedAt || assignment.createdAt)}</span>
          <span aria-hidden="true">·</span>
          <span className="text-slate-800 font-medium">
            Deadline: {formatDateTime(assignment.deadline)}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {assignment.allowLateSubmissions === false
              ? '▲ Strict Deadline (No Late Submissions)'
              : '● Late Submissions Accepted (Marked LATE)'}
          </span>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          ▲ {error}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left 2 Columns: Brief, Instructions & Attachment */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-2">Overview</h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {assignment.description}
            </p>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <h2 className="text-base font-semibold text-slate-900 mb-2">
              Detailed Instructions &amp; Deliverables
            </h2>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {assignment.instructions}
            </div>
          </div>

          {assignment.attachmentUrl && (
            <div className="pt-6 border-t border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">
                Attached Reference Material
              </h2>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {assignment.attachmentName}
                  </p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    {formatFileSize(assignment.attachmentSize)} · Path: {assignment.attachmentPath}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={downloadingAttachment}
                  onClick={handleDownloadAttachment}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {downloadingAttachment ? 'Downloading...' : 'Download Assignment File'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Grade Outcome + Submission Form */}
        <div className="space-y-6">
          {/* Grade & Tutor Feedback Box (if graded) */}
          {submission && submission.status === 'graded' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-xs font-mono font-medium text-emerald-700">
                  ◆ GRADED OUTCOME
                </span>
                <span className="text-lg font-mono font-bold text-slate-900 tabular-nums">
                  {submission.grade} / {assignment.maxPoints}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Tutor Feedback</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {submission.feedback || 'No written feedback provided.'}
                </p>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Evaluated {formatDateTime(submission.gradedAt)}
              </p>
            </div>
          )}

          {/* Existing Submission Status Card */}
          {submission && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Your Submission</h2>
                <StudentStatusIndicator status={computedStatus} />
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-900 truncate">
                    {submission.fileName}
                  </p>
                  {submittedLate && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded shrink-0">
                      ▲ LATE
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-slate-500">
                  {formatFileSize(submission.fileSize)} · Submitted{' '}
                  {formatDateTime(submission.submittedAt)}
                </p>
                <button
                  type="button"
                  disabled={downloadingSubmission}
                  onClick={handleDownloadSubmission}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline pt-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    {downloadingSubmission ? 'Downloading...' : 'Download Submitted File'}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Upload / Submit Form */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">
              {submission ? 'Replace Submission File' : 'Submit Completed Work'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {isLockedByGrade
                ? 'This submission has been graded and is locked against modifications.'
                : isLockedByDeadline
                ? '▲ Deadline Passed — The instructor has locked late submissions for this assignment.'
                : pastDue
                ? 'Past Due — Late submissions are accepted for this assignment and will be marked as LATE.'
                : 'Upload your completed assignment document to your private student submission path.'}
            </p>

            <form onSubmit={handleSubmitWork} className="space-y-4">
              <FileDropzone
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
                uploadProgress={uploadProgress}
                disabled={isUploadDisabled}
                label="Coursework File"
              />

              <div>
                <label
                  htmlFor="submission-notes"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Submission Notes (Optional)
                </label>
                <textarea
                  id="submission-notes"
                  rows={3}
                  disabled={isUploadDisabled}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any context or notes for your tutor..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 disabled:bg-slate-50"
                />
              </div>

              <button
                type="submit"
                disabled={isUploadDisabled || !selectedFile}
                className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                {isLockedByDeadline
                  ? 'Submissions Locked (Past Deadline)'
                  : submitting
                  ? 'Uploading & Recording Submission...'
                  : submission
                  ? 'Upload Replacement & Resubmit'
                  : 'Submit Assignment'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
