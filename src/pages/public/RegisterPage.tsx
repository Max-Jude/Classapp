import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Award, Eye, EyeOff, GraduationCap, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getHomeRouteForProfile,
  registerWithEmail,
  signInOrRegisterWithGoogle,
} from '../../services/authService';
import { UserRole } from '../../types';
import { toFriendlyErrorMessage } from '../../utils/formatters';
import { validateEmail, validatePassword } from '../../utils/validation';
import { useToast } from '../../contexts/ToastContext';

export const RegisterPage: React.FC = () => {
  const { isAuthenticated, profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && profile) {
      navigate(getHomeRouteForProfile(profile), {
        replace: true,
      });
    }
  }, [isAuthenticated, profile, navigate]);

  const handleGoogleRegister = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const result = await signInOrRegisterWithGoogle({
        preferredRole: role,
        department,
        studentCode: studentCode.trim() || undefined,
      });
      if (result.profile.approvalStatus === 'pending') {
        showToast(
          'Application Submitted',
          'Your account is awaiting approval by the ClassFlow Administrator.',
          'info'
        );
      } else {
        showToast(
          'Welcome to ClassFlow',
          `Signed in as ${result.profile.name} (${result.profile.role.toUpperCase()}).`,
          'success'
        );
      }
      navigate(getHomeRouteForProfile(result.profile), { replace: true });
    } catch (err) {
      setError(toFriendlyErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    const passErr = validatePassword(password);
    if (passErr) {
      setError(passErr);
      return;
    }
    if (password !== confirmPassword) {
      setError('Password and confirmation password do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerWithEmail({
        name: name.trim(),
        email: email.trim(),
        password,
        requestedRole: role,
        department: department.trim() || 'General Studies',
        studentCode: studentCode.trim(),
      });

      if (result.requiresEmailVerification) {
        setVerificationPendingEmail(email.trim());
        showToast(
          'Verification email sent',
          'Please verify your email or use Continue with Google for instant verified access.',
          'info'
        );
        return;
      }

      if (result.profile) {
        if (result.profile.approvalStatus === 'pending') {
          showToast(
            'Application Submitted',
            'Your account is awaiting approval by the ClassFlow Administrator.',
            'info'
          );
        } else {
          showToast('Registration complete', `Welcome, ${result.profile.name}!`, 'success');
        }
        navigate(getHomeRouteForProfile(result.profile), { replace: true });
      }
    } catch (err) {
      setError(toFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 sm:px-6 py-10 md:py-14">
      {/* Welcoming Intro Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Welcome to ClassFlow</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight">
          Create your ClassFlow account
        </h1>
        <p className="text-sm text-slate-600 mt-1.5">
          Choose your role below to enter your Student or Tutor workspace.
        </p>
      </div>

      {/* Main Enrollment Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        {/* Interactive Role Cards */}
        <div className="mb-6">
          <label className="block text-xs font-mono text-slate-500 mb-2.5">
            SELECT YOUR WORKSPACE ROLE
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('student')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                role === 'student'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  role === 'student'
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Student Account</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                  View assignments, upload work, and track grades.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setRole('tutor')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                role === 'tutor'
                  ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  role === 'tutor'
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Tutor (Instructor)</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                  Publish assignments, review files, and grade students.
                </p>
              </div>
            </button>
          </div>

          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-900">Admin Admission Policy:</strong> New{' '}
            {role === 'tutor' ? 'Tutor (Instructor)' : 'Student'} accounts are placed in the
            Pending Admissions queue until approved by the ClassFlow Administrator.
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 leading-relaxed"
          >
            ▲ {error}
          </div>
        )}

        {verificationPendingEmail ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3 text-xs text-blue-900 leading-relaxed">
            <p className="font-semibold text-sm">Check your inbox to verify your email</p>
            <p>
              We sent a verification link to{' '}
              <span className="font-mono font-semibold">{verificationPendingEmail}</span>. Please
              verify your email before signing in, or use <strong>Continue with Google</strong> for
              instant verified access.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Quick Google Enrollment Button */}
            <button
              type="button"
              disabled={googleLoading || submitting}
              onClick={handleGoogleRegister}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 rounded-xl hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              <svg className="w-4 h-4 bg-white rounded-full p-0.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
                />
              </svg>
              <span>
                {googleLoading
                  ? 'Setting up your workspace...'
                  : `Continue with Google as ${role === 'tutor' ? 'Tutor' : 'Student'}`}
              </span>
            </button>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-xs font-mono text-slate-400">OR REGISTER WITH EMAIL</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            <form onSubmit={handleEmailRegister} className="space-y-4" noValidate>
              <div>
                <label htmlFor="reg-name" className="block text-sm font-medium text-slate-800 mb-1">
                  Full Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-sm font-medium text-slate-800 mb-1"
                >
                  Academic Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@university.edu"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-department"
                    className="block text-xs font-medium text-slate-700 mb-1"
                  >
                    Department / Subject Track
                  </label>
                  <input
                    id="reg-department"
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Computer Science"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {role === 'tutor' ? 'Instructor ID Code' : 'Student Identification Code'}
                  </label>
                  <div className="w-full px-3 py-2 text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <span>{role === 'tutor' ? 'TUT-XXXXXX' : 'STU-XXXXXX'}</span>
                    <span className="text-[11px] text-blue-700 font-sans font-medium">
                      Auto-Generated
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-pass"
                    className="block text-sm font-medium text-slate-800 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="reg-pass"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      className="w-full px-3.5 py-2.5 pr-9 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="reg-confirm"
                    className="block text-sm font-medium text-slate-800 mb-1"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="reg-confirm"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || googleLoading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Creating Account...' : 'Create Account with Email'}
              </button>
            </form>
          </>
        )}

        <div className="mt-6 pt-5 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <span>Already have a ClassFlow account?</span>
          <Link to="/login" className="font-semibold text-blue-700 hover:underline">
            Sign in to your account →
          </Link>
        </div>
      </div>
    </div>
  );
};
