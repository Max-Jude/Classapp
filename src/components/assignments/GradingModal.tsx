import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { Submission } from '../../types';
import { formatDateTime, formatFileSize, toFriendlyErrorMessage } from '../../utils/formatters';
import { downloadProtectedFile } from '../../services/storageService';
import { gradeStudentSubmission } from '../../services/submissionService';
import { useToast } from '../../contexts/ToastContext';
import { SubmissionStatusIndicator } from '../common/StatusIndicator';

interface GradingModalProps {
  submission: Submission;
  tutorUid: string;
  onClose: () => void;
  onGraded?: () => void;
}

export const GradingModal: React.FC<GradingModalProps> = ({
  submission,
  tutorUid,
  onClose,
  onGraded,
}) => {
  const { showToast } = useToast();
  const [grade, setGrade] = useState<string>(
    submission.grade >= 0 ? String(submission.grade) : ''
  );
  const [feedback, setFeedback] = useState<string>(submission.feedback || '');
  const [saving, setSaving] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadProtectedFile(submission.fileUrl, submission.fileName);
      showToast('Download started', submission.fileName, 'info');
    } catch (err) {
      showToast('Download failed', toFriendlyErrorMessage(err), 'error');
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericGrade = Number(grade);
    if (grade.trim() === '' || isNaN(numericGrade) || numericGrade < 0 || numericGrade > 100) {
      setError('Please enter a valid numeric grade between 0 and 100.');
      return;
    }

    setSaving(true);
    try {
      await gradeStudentSubmission({
        submissionId: submission.id,
        tutorUid,
        grade: numericGrade,
        feedback,
      });
      showToast(
        'Submission graded',
        `Recorded ${Math.round(numericGrade)}/100 for ${submission.studentName}.`,
        'success'
      );
      if (onGraded) onGraded();
      onClose();
    } catch (err) {
      setError(toFriendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="grading-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-6 md:p-8 shadow-lg my-8">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>{submission.subject}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{submission.studentCode || 'Student'}</span>
              <span aria-hidden="true">·</span>
              <SubmissionStatusIndicator status={submission.status} />
            </div>
            <h2 id="grading-modal-title" className="text-xl font-display font-semibold text-slate-900">
              Evaluate Submission: {submission.studentName}
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">{submission.assignmentTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close grading dialog"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 border-b border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Submitted File</p>
              <p className="text-sm font-medium text-slate-900 truncate mt-0.5">
                {submission.fileName}
              </p>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mt-1">
                <span>{formatFileSize(submission.fileSize)}</span>
                <span aria-hidden="true">·</span>
                <span>Submitted {formatDateTime(submission.submittedAt)}</span>
              </div>
            </div>
            <button
              type="button"
              disabled={downloading}
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Downloading...' : 'Download File'}</span>
            </button>
          </div>

          {submission.notes && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-1">Student Notes</p>
              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-wrap">
                {submission.notes}
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="pt-5 space-y-5">
          {error && (
            <div role="alert" className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
              ▲ {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
            <div>
              <label htmlFor="grade-input" className="block text-sm font-medium text-slate-800 mb-1.5">
                Score (0 – 100)
              </label>
              <div className="relative">
                <input
                  id="grade-input"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="92"
                  className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
                />
                <span className="absolute right-3 top-2 text-xs font-mono text-slate-400">
                  / 100
                </span>
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500 mt-7 leading-relaxed">
                Saving a grade transitions this submission to the terminal{' '}
                <span className="font-mono text-slate-800">Graded</span> state and locks student file
                modifications via Firestore Security Rules.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="feedback-input" className="block text-sm font-medium text-slate-800 mb-1.5">
              Tutor Evaluation & Feedback
            </label>
            <textarea
              id="feedback-input"
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Provide constructive feedback on methodology, clarity, and areas for improvement..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
            />
            <p className="text-xs font-mono text-slate-400 mt-1 text-right">
              {feedback.length} / 3000 chars
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {saving ? 'Saving Grade...' : 'Save Grade & Publish Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
