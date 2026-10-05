import React from 'react';
import { X } from 'lucide-react';
import { FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../../lib/firebase';

interface SecurityRulesInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityRulesInspectorModal: React.FC<SecurityRulesInspectorModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="security-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-6 md:p-8 shadow-lg my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <p className="text-xs font-mono text-blue-700 mb-1">
              ◆ ZERO-TRUST FIREBASE ARCHITECTURE
            </p>
            <h2 id="security-modal-title" className="text-xl font-display font-semibold text-slate-900">
              Security Rules & Role Authorization Specification
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close security modal"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 font-mono text-xs space-y-1">
            <div>
              <span className="text-slate-500">Firebase Project ID:</span>{' '}
              <span className="text-slate-900 font-medium">{FIREBASE_PROJECT_ID}</span>
            </div>
            <div>
              <span className="text-slate-500">Firestore Database:</span>{' '}
              <span className="text-slate-900 font-medium">{FIRESTORE_DATABASE_ID}</span>
            </div>
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              1. How Tutor Role Creation is Secured
            </h3>
            <p>
              ClassFlow never trusts hidden frontend fields to grant tutor access. In{' '}
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                firestore.rules
              </code>
              , creating or updating a user document with <code className="font-mono text-xs">role == &apos;tutor&apos;</code>{' '}
              is rejected unless one of three server-side invariants holds:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-slate-600">
              <li>
                <strong>Bootstrapped Project Owner:</strong> Verified authentication token matching
                the primary instructor email (<code className="font-mono text-xs">email_verified == true</code>).
              </li>
              <li>
                <strong>First-Tutor Atomic Bootstrap Lock:</strong> On a newly provisioned database
                where <code className="font-mono text-xs">/systemConfig/tutorBootstrap</code> does
                not yet exist, the first instructor atomically creates the lock document in the same
                batch (<code className="font-mono text-xs">existsAfter</code>), permanently sealing
                self-registration for subsequent users.
              </li>
              <li>
                <strong>Explicit Tutor Authorization:</strong> An existing Tutor creates a record at{' '}
                <code className="font-mono text-xs">/tutorAuthorizations/&#123;targetUid&#125;</code>{' '}
                from the Students roster, allowing that specific user UID to claim tutor privileges.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              2. PII Isolation & Cross-Student Privacy
            </h3>
            <p className="text-slate-600">
              User records are split between <code className="font-mono text-xs">/users/&#123;userId&#125;</code>{' '}
              (which stores private PII including <code className="font-mono text-xs">email</code>,
              readable only by the owner or an authorized tutor) and{' '}
              <code className="font-mono text-xs">/directory/&#123;userId&#125;</code> (which stores
              non-PII roster metadata synchronized atomically via batch writes). Students can never
              read another student&apos;s email, submissions, or grades.
            </p>
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              3. Submission Integrity & Terminal State Locking
            </h3>
            <p className="text-slate-600">
              When a student creates a submission at{' '}
              <code className="font-mono text-xs">/submissions/&#123;assignmentId&#125;_&#123;studentId&#125;</code>,
              rules enforce <code className="font-mono text-xs">grade == -1</code>,{' '}
              <code className="font-mono text-xs">feedback == &apos;&apos;</code>, and{' '}
              <code className="font-mono text-xs">status in [&apos;in_progress&apos;, &apos;submitted&apos;]</code>.
              Once a tutor grades a submission (<code className="font-mono text-xs">status == &apos;graded&apos;</code>),
              terminal state locking blocks the student from replacing the file or altering the
              submission.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            Close Specification
          </button>
        </div>
      </div>
    </div>
  );
};
