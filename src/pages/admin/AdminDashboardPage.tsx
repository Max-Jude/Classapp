import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  GraduationCap,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useAssignments } from '../../hooks/useAssignments';
import { useSubmissions } from '../../hooks/useSubmissions';
import {
  adminRemoveUser,
  adminUpdateUserAdmission,
  isSuperAdminEmail,
  subscribeAllUsersForAdmin,
} from '../../services/userService';
import { ApprovalStatus, UserProfile, UserRole } from '../../types';
import { formatDateTime, toFriendlyErrorMessage } from '../../utils/formatters';
import { exportAdminUsersRosterCsv } from '../../utils/csvExport';
import { AnnouncementsPanel } from '../../components/announcements/AnnouncementsPanel';

type AdminFilterTab = 'PENDING' | 'TUTORS' | 'STUDENTS' | 'REJECTED' | 'ALL';

export const AdminDashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { assignments } = useAssignments();
  const { submissions } = useSubmissions();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminFilterTab>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingUid, setProcessingUid] = useState<string | null>(null);
  const [confirmRemoveUid, setConfirmRemoveUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeAllUsersForAdmin(
      (list) => {
        setUsers(list);
        setLoadingUsers(false);
      },
      () => {
        setLoadingUsers(false);
      }
    );
    return () => unsub();
  }, []);

  const pendingUsers = useMemo(
    () => users.filter((u) => u.approvalStatus === 'pending' && !isSuperAdminEmail(u.email)),
    [users]
  );

  const pendingTutorsCount = useMemo(
    () => pendingUsers.filter((u) => u.role === 'tutor').length,
    [pendingUsers]
  );

  const pendingStudentsCount = useMemo(
    () => pendingUsers.filter((u) => u.role === 'student').length,
    [pendingUsers]
  );

  const approvedTutorsCount = useMemo(
    () => users.filter((u) => u.role === 'tutor' && u.approvalStatus === 'approved').length,
    [users]
  );

  const approvedStudentsCount = useMemo(
    () => users.filter((u) => u.role === 'student' && u.approvalStatus === 'approved').length,
    [users]
  );

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (activeTab === 'PENDING' && u.approvalStatus !== 'pending') return false;
      if (activeTab === 'TUTORS' && u.role !== 'tutor') return false;
      if (activeTab === 'STUDENTS' && u.role !== 'student') return false;
      if (activeTab === 'REJECTED' && u.approvalStatus !== 'rejected') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.department.toLowerCase().includes(q) ||
          u.studentCode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [users, activeTab, searchQuery]);

  const handleAdmissionAction = async (
    targetUser: UserProfile,
    newApprovalStatus: ApprovalStatus,
    newRole: UserRole
  ) => {
    setProcessingUid(targetUser.uid);
    try {
      await adminUpdateUserAdmission({
        targetUid: targetUser.uid,
        approvalStatus: newApprovalStatus,
        role: newRole,
      });

      if (newApprovalStatus === 'approved') {
        showToast(
          'User Admitted & Approved',
          `${targetUser.name} is now admitted as an approved ${newRole.toUpperCase()}.`,
          'success'
        );
      } else if (newApprovalStatus === 'rejected') {
        showToast(
          'Admission Declined / Revoked',
          `Access for ${targetUser.name} has been set to declined.`,
          'info'
        );
      }
    } catch (err) {
      showToast('Action failed', toFriendlyErrorMessage(err), 'error');
    } finally {
      setProcessingUid(null);
    }
  };

  const handleRemoveUser = async (targetUser: UserProfile) => {
    setProcessingUid(targetUser.uid);
    try {
      await adminRemoveUser(targetUser.uid);
      setConfirmRemoveUid(null);
      showToast(
        `${targetUser.role === 'tutor' ? 'Tutor' : 'Student'} Removed`,
        `${targetUser.name} (${targetUser.studentCode}) has been removed from ClassFlow.`,
        'info'
      );
    } catch (err) {
      showToast('Removal failed', toFriendlyErrorMessage(err), 'error');
    } finally {
      setProcessingUid(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-700 mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>PLATFORM ADMINISTRATION &amp; ADMISSIONS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
            Admin Admissions Console — {profile?.name}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Approve or remove Student and Tutor accounts, manage roles, and oversee coursework.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={filteredUsers.length === 0}
            onClick={() => {
              exportAdminUsersRosterCsv(filteredUsers, activeTab);
              showToast(
                'Roster exported',
                `Exported ${filteredUsers.length} account records to CSV.`,
                'info'
              );
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Export Roster (CSV)</span>
          </button>
          <Link
            to="/tutor/assignments"
            className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            View All Assignments ({assignments.length})
          </Link>
          <Link
            to="/tutor/assignments/create"
            className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
          >
            + Create Assignment
          </Link>
        </div>
      </div>

      {/* Course & Institutional Announcements */}
      <AnnouncementsPanel defaultSubject="All Courses" />

      {/* Interactive KPI Metrics (Click to filter Students or Tutors) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('PENDING')}
          className={`bg-white border rounded-xl p-5 text-left transition-all ${
            activeTab === 'PENDING'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Pending Admissions</p>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-mono font-semibold text-amber-700 tabular-nums mt-1">
            {loadingUsers ? '—' : pendingUsers.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {pendingTutorsCount} Tutors · {pendingStudentsCount} Students awaiting review
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('TUTORS')}
          className={`bg-white border rounded-xl p-5 text-left transition-all ${
            activeTab === 'TUTORS'
              ? 'border-blue-600 ring-2 ring-blue-600/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Approved Tutors</p>
            <Award className="w-4 h-4 text-blue-700" />
          </div>
          <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums mt-1">
            {loadingUsers ? '—' : approvedTutorsCount}
          </p>
          <p className="text-xs text-blue-700 mt-1">Click to manage or remove tutors →</p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('STUDENTS')}
          className={`bg-white border rounded-xl p-5 text-left transition-all ${
            activeTab === 'STUDENTS'
              ? 'border-emerald-600 ring-2 ring-emerald-600/20'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Approved Students</p>
            <GraduationCap className="w-4 h-4 text-emerald-700" />
          </div>
          <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums mt-1">
            {loadingUsers ? '—' : approvedStudentsCount}
          </p>
          <p className="text-xs text-emerald-700 mt-1">Click to manage or remove students →</p>
        </button>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Platform Activity</p>
            <CheckCircle2 className="w-4 h-4 text-blue-700" />
          </div>
          <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums mt-1">
            {assignments.length} / {submissions.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Assignments · Submissions</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'PENDING'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Pending Approval</span>
            <span className="px-1.5 py-0.5 text-[11px] font-mono rounded bg-amber-100 text-amber-800">
              {pendingUsers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('TUTORS')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'TUTORS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tutors ({users.filter((u) => u.role === 'tutor').length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STUDENTS')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'STUDENTS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Students ({users.filter((u) => u.role === 'student').length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REJECTED')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'REJECTED'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Declined ({users.filter((u) => u.approvalStatus === 'rejected').length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Accounts ({users.length})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, ID code..."
            className="w-full pl-9 pr-3.5 py-1.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
          />
        </div>
      </div>

      {/* Admissions & Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-900">
              {activeTab === 'PENDING'
                ? 'Accounts Awaiting Admin Approval'
                : activeTab === 'TUTORS'
                ? 'Tutor (Instructor) Accounts'
                : activeTab === 'STUDENTS'
                ? 'Student Accounts'
                : activeTab === 'REJECTED'
                ? 'Declined / Suspended Accounts'
                : 'All Registered Accounts'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Approve, change roles, or permanently remove any Student or Tutor from the platform.
            </p>
          </div>
        </div>

        {loadingUsers ? (
          <div className="p-6 space-y-3">
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-900">
              {activeTab === 'PENDING'
                ? 'No pending Student or Tutor applications right now'
                : 'No accounts match the selected filter'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Switch tabs above to view your approved Students ({approvedStudentsCount}) or Tutors (
              {approvedTutorsCount}).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-mono text-slate-500">
                  <th className="py-3 px-5 font-medium">User &amp; Email</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Department &amp; ID Code</th>
                  <th className="py-3 px-4 font-medium">Admission Status</th>
                  <th className="py-3 px-4 font-medium">Registered</th>
                  <th className="py-3 px-5 font-medium text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredUsers.map((u) => {
                  const isOwner = isSuperAdminEmail(u.email);
                  const isBusy = processingUid === u.uid;
                  const isConfirmingRemove = confirmRemoveUid === u.uid;

                  return (
                    <tr key={u.uid} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <p className="font-semibold text-slate-900">{u.name}</p>
                        <p className="text-xs font-mono text-slate-500">{u.email}</p>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {u.role === 'admin' || isOwner ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-blue-700">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>ADMIN ({u.role.toUpperCase()})</span>
                          </span>
                        ) : u.role === 'tutor' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-blue-700">
                            <Award className="w-3.5 h-3.5" />
                            <span>TUTOR</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-slate-700">
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>STUDENT</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <p className="text-slate-800 font-medium">{u.department}</p>
                        <p className="font-mono text-blue-700 font-semibold">{u.studentCode}</p>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs">
                        {isOwner || u.approvalStatus === 'approved' ? (
                          <span className="text-emerald-700 font-semibold">◆ Approved</span>
                        ) : u.approvalStatus === 'rejected' ? (
                          <span className="text-red-700 font-semibold">▲ Declined</span>
                        ) : (
                          <span className="text-amber-700 font-semibold">○ Pending Approval</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono text-slate-500 tabular-nums whitespace-nowrap">
                        {formatDateTime(u.createdAt)}
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {isOwner ? (
                          <span className="text-xs font-mono text-slate-400">
                            Platform Super-Admin
                          </span>
                        ) : isConfirmingRemove ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRemoveUser(u)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50 rounded-lg transition-colors"
                            >
                              {isBusy
                                ? 'Removing...'
                                : `Confirm Remove ${u.role === 'tutor' ? 'Tutor' : 'Student'}`}
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmRemoveUid(null)}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            {u.approvalStatus !== 'approved' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleAdmissionAction(
                                    u,
                                    'approved',
                                    u.role === 'tutor' ? 'tutor' : 'student'
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg transition-colors"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>
                                  {isBusy
                                    ? 'Updating...'
                                    : `Approve as ${u.role === 'tutor' ? 'Tutor' : 'Student'}`}
                                </span>
                              </button>
                            )}

                            {u.approvalStatus === 'approved' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleAdmissionAction(
                                    u,
                                    'approved',
                                    u.role === 'tutor' ? 'student' : 'tutor'
                                  )
                                }
                                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors"
                              >
                                {u.role === 'tutor' ? 'Switch to Student' : 'Promote to Tutor'}
                              </button>
                            )}

                            {u.approvalStatus === 'pending' && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleAdmissionAction(u, 'rejected', u.role)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 rounded-lg transition-colors"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => setConfirmRemoveUid(u.uid)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 rounded-lg transition-colors"
                              title={`Remove ${u.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove {u.role === 'tutor' ? 'Tutor' : 'Student'}</span>
                            </button>
                          </div>
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
