import React, { useEffect, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubmissions } from '../../hooks/useSubmissions';
import {
  authorizeTutorUid,
  getUserProfile,
  subscribeMyIssuedAuthorizations,
  subscribeStudentsDirectory,
} from '../../services/userService';
import { DirectoryEntry, TutorAuthorization, UserProfile } from '../../types';
import { formatDateTime, toFriendlyErrorMessage } from '../../utils/formatters';
import { exportTutorStudentsRosterCsv } from '../../utils/csvExport';
import { useToast } from '../../contexts/ToastContext';

export const TutorStudentsPage: React.FC = () => {
  const { profile } = useAuth();
  const { submissions } = useSubmissions();
  const { showToast } = useToast();

  const [students, setStudents] = useState<DirectoryEntry[]>([]);
  const [authorizations, setAuthorizations] = useState<TutorAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentPii, setSelectedStudentPii] = useState<UserProfile | null>(null);
  const [loadingPiiUid, setLoadingPiiUid] = useState<string | null>(null);
  const [authorizingUid, setAuthorizingUid] = useState<string | null>(null);

  useEffect(() => {
    const unsubStudents = subscribeStudentsDirectory(
      (list) => {
        setStudents(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    let unsubAuths: (() => void) | null = null;
    if (profile) {
      unsubAuths = subscribeMyIssuedAuthorizations(profile.uid, (list) =>
        setAuthorizations(list)
      );
    }

    return () => {
      unsubStudents();
      if (unsubAuths) unsubAuths();
    };
  }, [profile]);

  const handleInspectStudentRecord = async (uid: string) => {
    setLoadingPiiUid(uid);
    try {
      const fullProfile = await getUserProfile(uid);
      if (fullProfile) {
        setSelectedStudentPii(fullProfile);
      }
    } catch (err) {
      showToast('Failed to load student record', toFriendlyErrorMessage(err), 'error');
    } finally {
      setLoadingPiiUid(null);
    }
  };

  const handleAuthorizeCoTutor = async (targetUid: string, name: string) => {
    if (!profile) return;
    setAuthorizingUid(targetUid);
    try {
      await authorizeTutorUid(targetUid, profile.uid);
      showToast(
        'Tutor authorization granted',
        `${name} can now switch their account to Tutor role in their profile.`,
        'success'
      );
    } catch (err) {
      showToast('Authorization failed', toFriendlyErrorMessage(err), 'error');
    } finally {
      setAuthorizingUid(null);
    }
  };

  const authorizedSet = new Set(authorizations.map((a) => a.targetUid));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <p className="text-xs font-mono text-slate-500 mb-1">INSTITUTIONAL ROSTER</p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
            Registered Students ({students.length})
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Monitor student participation, inspect individual academic records, or authorize teaching
            assistants.
          </p>
        </div>

        <button
          type="button"
          disabled={students.length === 0}
          onClick={() => {
            exportTutorStudentsRosterCsv(students, submissions);
            showToast('Roster exported', 'Student performance roster downloaded as CSV.', 'info');
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors self-start sm:self-auto whitespace-nowrap"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
          <span>Export Student Roster (CSV)</span>
        </button>
      </div>

      {selectedStudentPii && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-mono text-blue-700">
              ◆ VERIFIED STUDENT RECORD (PII ACCESSIBLE TO TUTOR)
            </p>
            <h2 className="text-lg font-display font-semibold text-slate-900">
              {selectedStudentPii.name} ({selectedStudentPii.studentCode})
            </h2>
            <p className="text-xs font-mono text-slate-600">
              Email: {selectedStudentPii.email} · Dept: {selectedStudentPii.department} · ID:{' '}
              {selectedStudentPii.studentCode}
            </p>
            {selectedStudentPii.bio && (
              <p className="text-xs text-slate-600 pt-1">Bio: {selectedStudentPii.bio}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelectedStudentPii(null)}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg self-start sm:self-center"
          >
            Close Record
          </button>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-900">No students registered yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Students who register on ClassFlow will automatically appear in this roster.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-mono text-slate-500">
                  <th className="py-3 px-5 font-medium">Student Name</th>
                  <th className="py-3 px-4 font-medium">Student Code</th>
                  <th className="py-3 px-4 font-medium">Department</th>
                  <th className="py-3 px-4 font-medium">Enrolled</th>
                  <th className="py-3 px-4 font-medium text-right">Submissions</th>
                  <th className="py-3 px-4 font-medium text-right">Avg Grade</th>
                  <th className="py-3 px-5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {students.map((stu) => {
                  const stuSubs = submissions.filter((s) => s.studentId === stu.uid);
                  const gradedSubs = stuSubs.filter((s) => s.status === 'graded' && s.grade >= 0);
                  const avg =
                    gradedSubs.length > 0
                      ? (
                          gradedSubs.reduce((acc, s) => acc + s.grade, 0) / gradedSubs.length
                        ).toFixed(1)
                      : '—';
                  const isAlreadyAuthorized = authorizedSet.has(stu.uid);

                  return (
                    <tr key={stu.uid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">{stu.name}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {stu.studentCode}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">{stu.department}</td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-500 tabular-nums">
                        {formatDateTime(stu.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                        {stuSubs.length}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-emerald-700">
                        {avg}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap space-x-2">
                        <button
                          type="button"
                          disabled={loadingPiiUid === stu.uid}
                          onClick={() => handleInspectStudentRecord(stu.uid)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                        >
                          {loadingPiiUid === stu.uid ? 'Loading...' : 'View Email & Bio'}
                        </button>
                        {isAlreadyAuthorized ? (
                          <span className="text-xs font-mono text-emerald-700 px-2">
                            ● Tutor Authorized
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={authorizingUid === stu.uid}
                            onClick={() => handleAuthorizeCoTutor(stu.uid, stu.name)}
                            className="px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            {authorizingUid === stu.uid ? 'Authorizing...' : 'Authorize as Tutor'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
