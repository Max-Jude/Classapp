import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSubmissions } from '../../hooks/useSubmissions';
import { formatDateTime } from '../../utils/formatters';

export const StudentGradesPage: React.FC = () => {
  const { submissions, loading, error } = useSubmissions();

  const gradedSubmissions = useMemo(() => {
    return submissions.filter((s) => s.status === 'graded' && s.grade >= 0);
  }, [submissions]);

  const averageScore = useMemo(() => {
    if (gradedSubmissions.length === 0) return null;
    const sum = gradedSubmissions.reduce((acc, s) => acc + s.grade, 0);
    return (sum / gradedSubmissions.length).toFixed(1);
  }, [gradedSubmissions]);

  return (
    <div className="space-y-6">
      <div className="pb-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-slate-500 mb-1">ACADEMIC TRANSCRIPT</p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
            Grades &amp; Tutor Feedback
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Official scores and written evaluations from your course tutors.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center gap-6">
          <div>
            <p className="text-xs text-slate-500">Evaluated Work</p>
            <p className="text-lg font-mono font-semibold text-slate-900 tabular-nums">
              {gradedSubmissions.length}
            </p>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <p className="text-xs text-slate-500">Cumulative Average</p>
            <p className="text-lg font-mono font-semibold text-emerald-700 tabular-nums">
              {averageScore !== null ? `${averageScore} / 100` : '—'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          ▲ {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-24 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      ) : gradedSubmissions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-base font-semibold text-slate-900">No graded submissions yet</p>
          <p className="text-xs text-slate-500 mt-1">
            Once a tutor evaluates your submitted coursework, your grade and written feedback will
            be published here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {gradedSubmissions.map((sub) => (
            <div
              key={sub.id}
              className="bg-white border border-slate-200 rounded-xl p-6 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                    <span>{sub.subject}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">Graded {formatDateTime(sub.gradedAt)}</span>
                  </div>
                  <Link
                    to={`/student/assignments/${sub.assignmentId}`}
                    className="text-lg font-display font-semibold text-slate-900 hover:text-blue-700"
                  >
                    {sub.assignmentTitle}
                  </Link>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs font-mono text-slate-500">FINAL SCORE</p>
                  <p className="text-xl font-mono font-bold text-emerald-700 tabular-nums">
                    {sub.grade} / 100
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Tutor Commentary</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {sub.feedback || 'No additional written commentary was recorded for this grade.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
