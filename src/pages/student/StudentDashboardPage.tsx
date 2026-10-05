import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignments } from '../../hooks/useAssignments';
import { useSubmissions } from '../../hooks/useSubmissions';
import {
  computeStudentAssignmentStatus,
  formatDateTime,
  getRelativeDeadlineText,
} from '../../utils/formatters';
import { StudentStatusIndicator } from '../../components/common/StatusIndicator';
import { AnnouncementsPanel } from '../../components/announcements/AnnouncementsPanel';

export const StudentDashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const { assignments, loading: loadingAssignments, error: assignmentError } = useAssignments();
  const { submissions, loading: loadingSubmissions } = useSubmissions();

  const submissionMap = useMemo(() => {
    const map = new Map<string, (typeof submissions)[number]>();
    submissions.forEach((sub) => map.set(sub.assignmentId, sub));
    return map;
  }, [submissions]);

  const metrics = useMemo(() => {
    let pending = 0;
    let submitted = 0;
    let graded = 0;

    assignments.forEach((asgn) => {
      const sub = submissionMap.get(asgn.id);
      const status = computeStudentAssignmentStatus(asgn, sub);
      if (status === 'Graded') {
        graded++;
      } else if (status === 'Submitted') {
        submitted++;
      } else {
        pending++;
      }
    });

    return {
      total: assignments.length,
      pending,
      submitted,
      graded,
    };
  }, [assignments, submissionMap]);

  const upcomingAssignments = useMemo(() => {
    return assignments
      .filter((a) => {
        const sub = submissionMap.get(a.id);
        return !sub || sub.status === 'in_progress';
      })
      .slice(0, 5);
  }, [assignments, submissionMap]);

  const recentFeedback = useMemo(() => {
    return submissions
      .filter((s) => s.status === 'graded' && s.grade >= 0)
      .sort((a, b) => Date.parse(b.gradedAt || '') - Date.parse(a.gradedAt || ''))
      .slice(0, 4);
  }, [submissions]);

  const loading = loadingAssignments || loadingSubmissions;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-1">
            <span>STUDENT WORKSPACE</span>
            <span aria-hidden="true">·</span>
            <span>{profile?.studentCode}</span>
            <span aria-hidden="true">·</span>
            <span>{profile?.department}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
            Welcome back, {profile?.name}
          </h1>
        </div>
        <Link
          to="/student/assignments"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <span>Browse All Assignments</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {assignmentError && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          ▲ {assignmentError}
        </div>
      )}

      {/* Course & Institutional Announcements */}
      <AnnouncementsPanel />

      {/* Summary Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Total Assignments</p>
          <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums mt-1">
            {loading ? '—' : metrics.total}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Pending Coursework</p>
          <p className="text-2xl font-mono font-semibold text-amber-700 tabular-nums mt-1">
            {loading ? '—' : metrics.pending}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Submitted &amp; Awaiting Grade</p>
          <p className="text-2xl font-mono font-semibold text-blue-700 tabular-nums mt-1">
            {loading ? '—' : metrics.submitted}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Graded &amp; Evaluated</p>
          <p className="text-2xl font-mono font-semibold text-emerald-700 tabular-nums mt-1">
            {loading ? '—' : metrics.graded}
          </p>
        </div>
      </div>

      {/* Two-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Deadlines */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-display font-semibold text-slate-900">
                Upcoming &amp; Pending Deadlines
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Published assignments requiring your submission
              </p>
            </div>
            <Link
              to="/student/assignments"
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              View All
            </Link>
          </div>

          {loading ? (
            <div className="py-8 space-y-3">
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : upcomingAssignments.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-900">No pending assignments</p>
              <p className="text-xs text-slate-500 mt-1">
                You are caught up on all currently published coursework.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {upcomingAssignments.map((asgn) => {
                const sub = submissionMap.get(asgn.id);
                const status = computeStudentAssignmentStatus(asgn, sub);
                return (
                  <div
                    key={asgn.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span>{asgn.subject}</span>
                        <span aria-hidden="true">·</span>
                        <span>Tutor: {asgn.tutorName}</span>
                        <span aria-hidden="true">·</span>
                        <StudentStatusIndicator status={status} />
                      </div>
                      <Link
                        to={`/student/assignments/${asgn.id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-blue-700 transition-colors"
                      >
                        {asgn.title}
                      </Link>
                      <p className="text-xs font-mono text-slate-500 mt-1">
                        Due {formatDateTime(asgn.deadline)} ({getRelativeDeadlineText(asgn.deadline)})
                      </p>
                    </div>
                    <Link
                      to={`/student/assignments/${asgn.id}`}
                      className="px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap self-start sm:self-center"
                    >
                      Open Brief
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Tutor Feedback */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-display font-semibold text-slate-900">
                Recent Feedback
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Latest evaluated submissions</p>
            </div>
            <Link
              to="/student/grades"
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              All Grades
            </Link>
          </div>

          {loading ? (
            <div className="py-8 space-y-3">
              <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-16 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : recentFeedback.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-900">No graded work yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Grades and written tutor feedback will appear here once evaluated.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {recentFeedback.map((sub) => (
                <div key={sub.id} className="py-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      to={`/student/assignments/${sub.assignmentId}`}
                      className="text-sm font-semibold text-slate-900 hover:text-blue-700 truncate"
                    >
                      {sub.assignmentTitle}
                    </Link>
                    <span className="text-xs font-mono font-semibold text-emerald-700 tabular-nums shrink-0">
                      {sub.grade} / 100
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {sub.feedback || 'Graded without additional written notes.'}
                  </p>
                  <p className="text-[11px] font-mono text-slate-400">
                    Evaluated {formatDateTime(sub.gradedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
