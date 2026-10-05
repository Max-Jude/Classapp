import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Clock, GraduationCap, LogOut, ShieldAlert, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getHomeRouteForProfile, logoutUser } from '../../services/authService';
import { useToast } from '../../contexts/ToastContext';
import { formatDateTime } from '../../utils/formatters';

export const PendingApprovalPage: React.FC = () => {
  const { isAuthenticated, profile, isApproved, loading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (!loading && profile && isApproved) {
      showToast(
        'Account Approved!',
        `Welcome to your ${profile.role.toUpperCase()} workspace, ${profile.name}.`,
        'success'
      );
      navigate(getHomeRouteForProfile(profile), { replace: true });
    }
  }, [loading, isAuthenticated, profile, isApproved, navigate, showToast]);

  const handleLogout = async () => {
    await logoutUser();
    showToast('Signed out', 'You have signed out of your account.', 'info');
    navigate('/login', { replace: true });
  };

  if (loading || !profile) {
    return (
      <div className="max-w-lg mx-auto px-6 py-16 text-center">
        <p className="text-xs font-mono text-slate-500">CHECKING ADMISSION STATUS...</p>
      </div>
    );
  }

  const isRejected = profile.approvalStatus === 'rejected';
  const isTutorApplicant = profile.role === 'tutor';

  return (
    <div className="w-full max-w-xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                isRejected
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isRejected ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-mono text-slate-500 uppercase">
                {isRejected ? 'ADMISSION DECLINED' : 'ADMISSION QUEUE'}
              </p>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-900">
                {isRejected
                  ? 'Your account access was declined'
                  : 'Awaiting Admin Approval'}
              </h1>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-md text-xs font-mono font-medium whitespace-nowrap ${
              isRejected
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {isRejected ? '▲ Declined' : '○ Pending Review'}
          </span>
        </div>

        <div className="py-6 space-y-5">
          {isRejected ? (
            <p className="text-sm text-slate-600 leading-relaxed">
              The platform administrator has declined or suspended admission for this account. If
              you believe this was a mistake, please contact your course administrator.
            </p>
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm mb-1">
                  Your {isTutorApplicant ? 'Tutor (Instructor)' : 'Student'} registration has been
                  submitted!
                </p>
                <p>
                  For security, new accounts require admission approval from the ClassFlow
                  Administrator before accessing course assignments. As soon as the Admin approves
                  your account, this page will <strong>automatically unlock</strong> and open your
                  workspace.
                </p>
              </div>
            </div>
          )}

          {/* Applicant Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Applicant Name</span>
              <span className="font-semibold text-slate-900">{profile.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Email Address</span>
              <span className="font-mono text-xs text-slate-700">{profile.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Requested Role</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-blue-700 text-xs">
                {isTutorApplicant ? (
                  <>
                    <Award className="w-3.5 h-3.5" />
                    <span>Tutor (Instructor)</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Student Account</span>
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Department &amp; Code</span>
              <span className="text-xs font-mono text-slate-700">
                {profile.department} · {profile.studentCode}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Registered At</span>
              <span className="text-xs font-mono text-slate-600">
                {formatDateTime(profile.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
          <span className="text-xs font-mono text-slate-500">
            Live sync active — waiting for Admin decision
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
