import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { useSubmissions } from '../../hooks/useSubmissions';
import { downloadProtectedFile } from '../../services/storageService';
import { formatDateTime, formatFileSize, toFriendlyErrorMessage } from '../../utils/formatters';
import { useToast } from '../../contexts/ToastContext';
import { SubmissionStatusIndicator } from '../../components/common/StatusIndicator';

export const StudentSubmissionsPage: React.FC = () => {
  const { submissions, loading, error } = useSubmissions();
  const { showToast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (id: string, url: string, name: string) => {
    setDownloadingId(id);
    try {
      await downloadProtectedFile(url, name);
      showToast('Download started', name, 'info');
    } catch (err) {
      showToast('Download failed', toFriendlyErrorMessage(err), 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-slate-200">
        <p className="text-xs font-mono text-slate-500 mb-1">SUBMISSION ARCHIVE</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
          My Submissions
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Complete history of files you have uploaded and submitted.
        </p>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          ▲ {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-900">No submissions recorded yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Open an assignment to upload and submit your first deliverable.
            </p>
            <Link
              to="/student/assignments"
              className="inline-block px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800"
            >
              Browse Assignments
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-mono text-slate-500">
                  <th className="py-3 px-5 font-medium">Assignment</th>
                  <th className="py-3 px-4 font-medium">Submitted File</th>
                  <th className="py-3 px-4 font-medium">Submitted At</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Grade</th>
                  <th className="py-3 px-5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <Link
                        to={`/student/assignments/${sub.assignmentId}`}
                        className="font-semibold text-slate-900 hover:text-blue-700"
                      >
                        {sub.assignmentTitle}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">{sub.subject}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-medium text-slate-900 truncate max-w-[200px]">
                        {sub.fileName}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">
                        {formatFileSize(sub.fileSize)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      {formatDateTime(sub.submittedAt)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <SubmissionStatusIndicator status={sub.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                      {sub.status === 'graded' && sub.grade >= 0 ? (
                        <span className="font-semibold text-emerald-700">{sub.grade} / 100</span>
                      ) : (
                        <span className="text-slate-400">Pending</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap space-x-2">
                      <button
                        type="button"
                        disabled={downloadingId === sub.id}
                        onClick={() => handleDownload(sub.id, sub.fileUrl, sub.fileName)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>File</span>
                      </button>
                      <Link
                        to={`/student/assignments/${sub.assignmentId}`}
                        className="inline-block px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:underline"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
