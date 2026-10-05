import React from 'react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-16 space-y-12">
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 mb-3">
          <span>PLATFORM DOCUMENTATION</span>
          <span aria-hidden="true">·</span>
          <span>ARCHITECTURE &amp; WORKFLOW</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900">
          About ClassFlow
        </h1>
        <p className="mt-4 text-base text-slate-600 leading-relaxed">
          ClassFlow is a full-stack educational assignment management platform built to demonstrate
          clean software architecture, role-based access control, and zero-trust Firebase security.
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 space-y-4">
        <h2 className="text-xl font-display font-semibold text-slate-900">
          01. Who ClassFlow Is Designed For
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          ClassFlow serves academic courses, coding bootcamps, and university seminars that require
          a structured workflow between instructors (Tutors) and learners (Students) without visual
          clutter or insecure client-only permissions.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-200">
          <div>
            <p className="text-xs font-mono text-blue-700 mb-1">FOR TUTORS</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Tutors author assignments, attach specification files, monitor student completion across
              the cohort, download submitted deliverables, and record grades and written feedback.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-emerald-700 mb-1">FOR STUDENTS</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Students view published coursework, track upcoming deadlines, download reference
              documents, upload completed work, and review their personal grades and tutor notes.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 space-y-4">
        <h2 className="text-xl font-display font-semibold text-slate-900">
          02. Assignment Lifecycle: From Creation to Grading
        </h2>
        <ol className="space-y-4 text-sm text-slate-600 leading-relaxed list-decimal pl-5">
          <li>
            <strong className="text-slate-900">Creation &amp; Publication:</strong> A tutor creates
            an assignment in <code className="font-mono text-xs">/assignments/&#123;assignmentId&#125;</code>{' '}
            with status <code className="font-mono text-xs">draft</code> or{' '}
            <code className="font-mono text-xs">published</code> and optionally uploads a file to{' '}
            <code className="font-mono text-xs">assignments/&#123;assignmentId&#125;/&#123;fileName&#125;</code>.
          </li>
          <li>
            <strong className="text-slate-900">Student Delivery:</strong> Published assignments
            appear immediately on every authenticated student&apos;s dashboard and assignment list.
          </li>
          <li>
            <strong className="text-slate-900">Submission Upload:</strong> The student uploads their
            solution file to{' '}
            <code className="font-mono text-xs">
              submissions/&#123;assignmentId&#125;/&#123;studentId&#125;/&#123;fileName&#125;
            </code>{' '}
            and creates or updates their submission record at{' '}
            <code className="font-mono text-xs">
              /submissions/&#123;assignmentId&#125;_&#123;studentId&#125;
            </code>{' '}
            with status <code className="font-mono text-xs">submitted</code>.
          </li>
          <li>
            <strong className="text-slate-900">Evaluation &amp; Terminal Lock:</strong> The tutor
            downloads the submission, enters a grade (0–100) and feedback, and saves. Firestore
            updates the status to <code className="font-mono text-xs">graded</code>, permanently
            locking the submission from further student edits.
          </li>
        </ol>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 space-y-4">
        <h2 className="text-xl font-display font-semibold text-slate-900">
          03. How Tutor Authorization Is Controlled Securely
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          In an educational platform, allowing any visitor to simply select &ldquo;Tutor&rdquo; in a
          registration dropdown without server-side verification would compromise the entire grading
          system. ClassFlow enforces role creation inside{' '}
          <code className="font-mono text-xs">firestore.rules</code>:
        </p>
        <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
          <li>
            The bootstrapped project instructor account is verified via{' '}
            <code className="font-mono text-xs">request.auth.token.email_verified == true</code>.
          </li>
          <li>
            For initial setup on a fresh database, the first verified account can claim the initial
            tutor seat by atomically creating the singleton lock document{' '}
            <code className="font-mono text-xs">/systemConfig/tutorBootstrap</code>.
          </li>
          <li>
            Once the initial tutor seat is locked, all new registrations are strictly constrained to{' '}
            <code className="font-mono text-xs">role == &apos;student&apos;</code> unless an
            existing tutor explicitly authorizes their UID in{' '}
            <code className="font-mono text-xs">/tutorAuthorizations/&#123;targetUid&#125;</code>.
          </li>
        </ul>
      </section>

      <div className="flex items-center gap-4">
        <Link
          to="/register"
          className="px-5 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors"
        >
          Create Account
        </Link>
        <Link
          to="/login"
          className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
};
