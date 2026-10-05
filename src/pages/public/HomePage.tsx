import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const HomePage: React.FC = () => {
  const { isAuthenticated, profile } = useAuth();
  const dashboardPath =
    profile?.role === 'tutor' ? '/tutor/dashboard' : '/student/dashboard';

  return (
    <div className="space-y-20 py-12 md:py-20">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-4">
            <span>ACADEMIC WORKFLOW PLATFORM</span>
            <span aria-hidden="true">·</span>
            <span>FIREBASE AUTH, FIRESTORE &amp; STORAGE</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold text-slate-900 tracking-tight leading-[1.15]">
            Structured assignment delivery, submission tracking, and grading for modern classrooms.
          </h1>
          <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
            ClassFlow unifies course publishing, file distribution, student coursework uploads, and
            rubric-based evaluation in a single role-secured workspace backed by real-time Cloud
            Firestore and Firebase Security Rules.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {isAuthenticated && profile ? (
              <Link
                to={dashboardPath}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
              >
                <span>Continue to {profile.role === 'tutor' ? 'Tutor' : 'Student'} Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <span>Sign In to Portal</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Key Platform Architecture Metrics */}
        <div className="mt-14 pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums">
              2 Role Portals
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Dedicated Student and Tutor workspaces with server-enforced permission boundaries.
            </p>
          </div>
          <div>
            <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums">
              10 MB File Limit
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Validated document distribution and student submissions (PDF, DOCX, PPTX, XLSX, ZIP).
            </p>
          </div>
          <div>
            <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums">
              0–100 Grading Scale
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Authoritative state transitions with terminal grade locking and written tutor feedback.
            </p>
          </div>
        </div>
      </section>

      {/* How ClassFlow Works */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="border-t border-slate-200 pt-14">
          <p className="text-xs font-mono text-blue-700 mb-2">END-TO-END ACADEMIC LIFECYCLE</p>
          <h2 className="text-2xl sm:text-3xl font-display font-semibold text-slate-900">
            How assignments move from publication to evaluation
          </h2>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-mono text-slate-500 mb-2">STAGE 01 · TUTOR</p>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                01. Author &amp; Publish Briefs
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tutors define assignment instructions, subject category, maximum points, and ISO
                deadlines, optionally attaching reference files to{' '}
                <code className="font-mono text-xs">assignments/&#123;assignmentId&#125;</code>.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-mono text-slate-500 mb-2">STAGE 02 · STUDENT</p>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                02. Download &amp; Submit Work
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Students review published instructions, download attached materials, and upload
                completed files to their isolated directory{' '}
                <code className="font-mono text-xs">
                  submissions/&#123;assignmentId&#125;/&#123;studentId&#125;
                </code>
                .
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-mono text-slate-500 mb-2">STAGE 03 · EVALUATION</p>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                03. Grade &amp; Lock Outcome
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Tutors inspect submitted files, assign a verified score (0–100), and record written
                feedback. Once graded, security rules lock the submission against further changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Specific Capabilities */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="border-t border-slate-200 pt-14 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-slate-200 rounded-xl p-8">
            <div className="flex items-center gap-2 text-xs font-mono text-blue-700 mb-2">
              <span>INSTRUCTOR WORKSPACE</span>
              <span aria-hidden="true">·</span>
              <span>ROLE: TUTOR</span>
            </div>
            <h2 className="text-2xl font-display font-semibold text-slate-900 mb-4">
              Designed for Tutors &amp; Course Leads
            </h2>
            <ul className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <li>
                <strong className="text-slate-900">Assignment Publishing:</strong> Create drafts or
                immediately publish coursework with structured instructions, deadlines, and
                reference attachments.
              </li>
              <li>
                <strong className="text-slate-900">Submission Queue Monitoring:</strong> Track
                submitted, pending, and overdue student work across all published assignments in
                real time.
              </li>
              <li>
                <strong className="text-slate-900">Direct File Inspection &amp; Grading:</strong>{' '}
                Download student deliverables, record numerical grades, and publish detailed
                evaluative feedback.
              </li>
              <li>
                <strong className="text-slate-900">Student Roster &amp; Co-Tutor Control:</strong>{' '}
                View registered students, monitor completion rates, and authorize co-tutors safely.
              </li>
            </ul>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-8">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-700 mb-2">
              <span>LEARNER WORKSPACE</span>
              <span aria-hidden="true">·</span>
              <span>ROLE: STUDENT</span>
            </div>
            <h2 className="text-2xl font-display font-semibold text-slate-900 mb-4">
              Designed for Students
            </h2>
            <ul className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <li>
                <strong className="text-slate-900">Personal Academic Dashboard:</strong> View total
                assignments, pending tasks, upcoming deadlines, and recent tutor feedback at a
                glance.
              </li>
              <li>
                <strong className="text-slate-900">Clear Status Tracking:</strong> Authoritative
                status indicators for Not Started, In Progress, Submitted, Graded, and Overdue
                coursework.
              </li>
              <li>
                <strong className="text-slate-900">Validated File Submissions:</strong> Upload and
                replace submission files prior to grading with live progress indicators.
              </li>
              <li>
                <strong className="text-slate-900">Private Gradebook &amp; History:</strong> Access
                your complete submission history, scores, and instructor commentary in strict
                isolation from other students.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};
