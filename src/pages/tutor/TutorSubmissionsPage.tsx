import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileSpreadsheet, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignments } from '../../hooks/useAssignments';
import { useSubmissions } from '../../hooks/useSubmissions';
import { downloadProtectedFile } from '../../services/storageService';
import { Assignment, Submission } from '../../types';
import {
  formatDateTime,
  formatFileSize,
  isSubmissionLate,
  toFriendlyErrorMessage,
} from '../../utils/formatters';
import { exportSubmissionsGradebookCsv } from '../../utils/csvExport';
import { SubmissionStatusIndicator } from '../../components/common/StatusIndicator';
import { GradingModal } from '../../components/assignments/GradingModal';
import { useToast } from '../../contexts/ToastContext';

type QueueFilter = 'ALL' | 'submitted' | 'graded';

export const TutorSubmissionsPage: React.FC = () => {
  const { profile } = useAuth();
  const { assignments } = useAssignments();
  const { submissions, loading, error } = useSubmissions();
  const { showToast } = useToast();

  const [filter, setFilter] = useState<QueueFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const assignmentsMap = useMemo(() => {
    const map = new Map<string, Assignment>();
    assignments.forEach((a) => map.set(a.id, a));
    return map;
  }, [assignments]);

  const filtered = useMemo(() => {
    return submissions.filter((sub) => {
      if (filter !== 'ALL' && sub.status !== filter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          sub.studentName.toLowerCase().includes(q) ||
          sub.assignmentTitle.toLowerCase().includes(q) ||
          sub.fileName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [submissions, filter, searchQuery]);

  const handleDownload = async (sub: Submission) => {
    try {
      await downloadProtectedFile(sub.fileUrl, sub.fileName);
      showToast('Download started', sub.fileName, 'info');
    } catch (err) {
      showToast('Download failed', toFriendlyErrorMessage(err), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-mono text-slate-500 mb-1">EVALUATION QUEUE</p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
            Student Submissions
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Inspect submitted coursework files, record numerical grades, and publish feedback.
          </p>
        </div>

        <button
          type="button"
          disabled={filtered.length === 0}
          onClick={() => {
            exportSubmissionsGradebookCsv(filtered, assignmentsMap);
            showToast(
              'Gradebook exported',
              `Exported ${filtered.length} submission records to CSV.`,
              'info'
            );
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors self-start sm:self-auto whitespace-nowrap"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
          <span>Export Gradebook (CSV)</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            All ({submissions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('submitted')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'submitted' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Awaiting Grade ({submissions.filter((s) => s.status === 'submitted').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('graded')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filter === 'graded' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Graded ({submissions.filter((s) => s.status === 'graded').length})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by student or assignment..."
            className="w-full pl-9 pr-3.5 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
          />
        </div>
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
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-900">No matching submissions</p>
            <p className="text-xs text-slate-500 mt-1">
              Submissions uploaded by students to your assignments will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-mono text-slate-500">
                  <th className="py-3 px-5 font-medium">Student</th>
                  <th className="py-3 px-4 font-medium">Assignment</th>
                  <th className="py-3 px-4 font-medium">Submitted File</th>
                  <th className="py-3 px-4 font-medium">Timestamp</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Grade</th>
                  <th className="py-3 px-5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <p className="font-semibold text-slate-900">{sub.studentName}</p>
                      <p className="text-xs font-mono text-slate-500">{sub.studentCode}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        to={`/tutor/assignments/${sub.assignmentId}`}
                        className="font-medium text-slate-900 hover:text-blue-700"
                      >
                        {sub.assignmentTitle}
                      </Link>
                      <p className="text-xs text-slate-500">{sub.subject}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleDownload(sub)}
                        className="text-xs font-medium text-blue-700 hover:underline inline-flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[160px]">{sub.fileName}</span>
                      </button>
                      <p className="text-[11px] font-mono text-slate-400">
                        {formatFileSize(sub.fileSize)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600 tabular-nums whitespace-nowrap">
                      <div>{formatDateTime(sub.submittedAt)}</div>
                      {isSubmissionLate(
                        sub.submittedAt,
                        assignmentsMap.get(sub.assignmentId)?.deadline
                      ) && (
                        <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded">
                          ▲ LATE
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <SubmissionStatusIndicator status={sub.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                      {sub.status === 'graded' && sub.grade >= 0 ? (
                        <span className="font-semibold text-emerald-700">{sub.grade} / 100</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedSubmission(sub)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                      >
                        {sub.status === 'graded' ? 'Update Grade' : 'Grade & Feedback'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSubmission && profile && (
        <GradingModal
          submission={selectedSubmission}
          tutorUid={profile.uid}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </div>
  );
};
