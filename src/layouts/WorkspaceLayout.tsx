import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckSquare,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PlusCircle,
  Shield,
  ShieldCheck,
  Sun,
  User,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { logoutUser } from '../services/authService';
import { useToast } from '../contexts/ToastContext';
import { toFriendlyErrorMessage } from '../utils/formatters';
import { SecurityRulesInspectorModal } from '../components/security/SecurityRulesInspectorModal';
import { UserRole } from '../types';

export const WorkspaceLayout: React.FC = () => {
  const { profile, isAdmin, switchRoleForTesting } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);

  if (!profile) return null;

  const isInAdminSection = location.pathname.startsWith('/admin');
  const isInStudentSection = location.pathname.startsWith('/student');
  const isTutorOrAdminSection = !isInStudentSection;

  const navItems = isInStudentSection
    ? [
        ...(isAdmin
          ? [{ to: '/admin/dashboard', label: 'Admin Admissions', icon: ShieldCheck }]
          : []),
        { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/student/assignments', label: 'Assignments', icon: BookOpen },
        { to: '/student/submissions', label: 'Submissions', icon: FileText },
        { to: '/student/grades', label: 'Grades & Feedback', icon: CheckSquare },
        { to: '/student/profile', label: 'Profile', icon: User },
      ]
    : [
        ...(isAdmin
          ? [{ to: '/admin/dashboard', label: 'Admin Admissions', icon: ShieldCheck }]
          : []),
        { to: '/tutor/dashboard', label: 'Tutor Dashboard', icon: LayoutDashboard },
        { to: '/tutor/assignments', label: 'Assignments', icon: BookOpen },
        { to: '/tutor/assignments/create', label: 'Create Assignment', icon: PlusCircle },
        { to: '/tutor/submissions', label: 'Submissions', icon: FileText },
        { to: '/tutor/students', label: 'Students', icon: Users },
        { to: '/tutor/profile', label: 'Profile', icon: User },
      ];

  const handleLogout = async () => {
    try {
      await logoutUser();
      showToast('Signed out', 'You have been securely logged out.', 'info');
      navigate('/login');
    } catch (err) {
      showToast('Logout failed', toFriendlyErrorMessage(err), 'error');
    }
  };

  const handleAdminViewSwitch = async (targetRole: UserRole, path: string) => {
    setSwitchingRole(true);
    try {
      await switchRoleForTesting(targetRole);
      navigate(path);
    } catch (err) {
      showToast('Switch failed', toFriendlyErrorMessage(err), 'error');
    } finally {
      setSwitchingRole(false);
    }
  };

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbText = pathSegments
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join(' / ');

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row text-slate-900 transition-colors">
      {/* Desktop Sidebar (260px fixed width) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0 bg-white border-r border-slate-200 min-h-screen sticky top-0">
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-200">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-xl font-display font-bold tracking-tight text-slate-900"
          >
            <span className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </span>
            <span>ClassFlow</span>
          </Link>
          <span className="text-xs font-mono text-blue-700 font-semibold">
            {isInAdminSection ? 'ADMIN' : isInStudentSection ? 'STUDENT' : 'TUTOR'}
          </span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/tutor/assignments' || item.to === '/student/assignments'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-3">
          <button
            type="button"
            onClick={() => setSecurityModalOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
          >
            <Shield className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span>Security Rules Spec</span>
          </button>

          <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-semibold text-slate-900 truncate">{profile.name}</p>
            <p className="text-xs font-mono text-slate-500 truncate mt-0.5">
              {isAdmin ? 'ADMIN' : profile.studentCode} · {profile.department}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Viewport Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Workspace Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-xs font-mono text-slate-500 truncate">
              {breadcrumbText}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            {isAdmin && (
              <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  disabled={switchingRole}
                  onClick={() => handleAdminViewSwitch('admin', '/admin/dashboard')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    isInAdminSection
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Admin Console
                </button>
                <button
                  type="button"
                  disabled={switchingRole}
                  onClick={() => handleAdminViewSwitch('tutor', '/tutor/dashboard')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    !isInAdminSection && !isInStudentSection
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tutor View
                </button>
                <button
                  type="button"
                  disabled={switchingRole}
                  onClick={() => handleAdminViewSwitch('student', '/student/dashboard')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    isInStudentSection
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Student View
                </button>
              </div>
            )}

            {isTutorOrAdminSection && (
              <Link
                to="/tutor/assignments/create"
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap"
              >
                + New Assignment
              </Link>
            )}
          </div>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-full bg-white h-full flex flex-col justify-between p-5 z-10">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <span className="text-lg font-display font-bold text-slate-900">
                    ClassFlow
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close navigation menu"
                    className="p-1.5 text-slate-500 hover:text-slate-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="mt-4 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        end={
                          item.to === '/tutor/assignments' ||
                          item.to === '/student/assignments'
                        }
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-700 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-200 space-y-2">
                <p className="text-xs font-medium text-slate-900 truncate">{profile.name}</p>
                <p className="text-xs font-mono text-slate-500 truncate">{profile.email}</p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full mt-2 flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 p-6 sm:p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <SecurityRulesInspectorModal
        isOpen={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
      />
    </div>
  );
};
