import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Search } from 'lucide-react';
import { useAssignments } from '../../hooks/useAssignments';
import { useSubmissions } from '../../hooks/useSubmissions';
import { downloadProtectedFile } from '../../services/storageService';
import {
  computeStudentAssignmentStatus,
  formatDateTime,
} from '../../utils/formatters';
import { ComputedAssignmentStatus } from '../../types';
import { StudentStatusIndicator } from '../../components/common/StatusIndicator';

type FilterTab = 'ALL' | ComputedAssignmentStatus;

export const StudentAssignmentsPage: React.FC = () => {
  const { assignments, loading: loadingAsgn, error } = useAssignments();
  const { submissions, loading: loadingSub } = useSubmissions();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');

  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    assignments.forEach((a) => {
      if (a.subject) set.add(a.subject);
    });
    return Array.from(set).sort();
  }, [assignments]);

  const submissionMap = useMemo(() => {
    const map = new Map<string, (typeof submissions)[number]>();
    submissions.forEach((s) => map.set(s.assignmentId, s));
    return map;
  }, [submissions]);

  const enrichedAssignments = useMemo(() => {
    return assignments.map((asgn) => {
      const sub = submissionMap.get(asgn.id) || null;
      const computedStatus = computeStudentAssignmentStatus(asgn, sub);
      return { assignment: asgn, submission: sub, computedStatus };
    });
  }, [assignments, submissionMap]);

  const filtered = useMemo(() => {
    return enrichedAssignments.filter((item) => {
      if (activeFilter !== 'ALL' && item.computedStatus !== activeFilter) {
        return false;
      }
      if (selectedSubject !== 'ALL' && item.assignment.subject !== selectedSubject) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.assignment.title.toLowerCase().includes(q) ||
          item.assignment.subject.toLowerCase().includes(q) ||
          item.assignment.tutorName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enrichedAssignments, activeFilter, selectedSubject, searchQuery]);

  const loading = loadingAsgn || loadingSub;

  const filterTabs: FilterTab[] = [
    'ALL',
    'Not Started',
    'Submitted',
    'Graded',
    'Overdue',
  ];

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-slate-200">
        <p className="text-xs font-mono text-slate-500 mb-1">COURSEWORK CATALOG</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
          Assigned Coursework
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Review instructions, download reference files, and submit your completed work.
        </p>
      </div>

      {/* Search & Interactive Segmented Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeFilter === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'ALL' ? 'All Assignments' : tab}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {availableSubjects.length > 0 && (
            <select
              aria-label="Filter by subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
            >
              <option value="ALL">All Subjects ({assignments.length})</option>
              {availableSubjects.map((subj) => (
                <option key={subj} value={subj}>
                  {subj}
                </option>
              ))}
            </select>
          )}

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title, subject, tutor..."
              className="w-full pl-9 pr-3.5 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          ▲ {error}
        </div>
      )}

      {/* Assignment Table / Responsive List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-900">
              No assignments match your current filter
            </p>
            <p className="text-xs text-slate-500 mt-1">
              When tutors publish coursework, it appears automatically in this list.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-mono text-slate-500">
                  <th className="py-3 px-5 font-medium">Assignment</th>
                  <th className="py-3 px-4 font-medium">Subject &amp; Tutor</th>
                  <th className="py-3 px-4 font-medium">Uploaded File</th>
                  <th className="py-3 px-4 font-medium">Deadline</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Score</th>
                  <th className="py-3 px-5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filtered.map(({ assignment, submission, computedStatus }) => (
                  <tr
                    key={assignment.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3.5 px-5">
                      <Link
                        to={`/student/assignments/${assignment.id}`}
                        className="font-semibold text-slate-900 hover:text-blue-700"
                      >
                        {assignment.title}
                      </Link>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {assignment.description}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      <span className="font-medium text-slate-900">{assignment.subject}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{assignment.tutorName}</span>
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {assignment.attachmentName && assignment.attachmentUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            downloadProtectedFile(
                              assignment.attachmentUrl,
                              assignment.attachmentName
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 font-medium text-blue-700 hover:underline max-w-[180px]"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{assignment.attachmentName}</span>
                          <Download className="w-3 h-3 shrink-0" />
                        </button>
                      ) : (
                        <span className="text-slate-400">No file</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-700 tabular-nums whitespace-nowrap">
                      {formatDateTime(assignment.deadline)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StudentStatusIndicator status={computedStatus} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                      {submission && submission.status === 'graded' && submission.grade >= 0 ? (
                        <span className="font-semibold text-emerald-700">
                          {submission.grade} / {assignment.maxPoints}
                        </span>
                      ) : (
                        <span className="text-slate-400">— / {assignment.maxPoints}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <Link
                        to={`/student/assignments/${assignment.id}`}
                        className="inline-block px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                      >
                        View Details
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
