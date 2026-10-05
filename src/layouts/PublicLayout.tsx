import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { BookOpen, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getHomeRouteForProfile } from '../services/authService';

export const PublicLayout: React.FC = () => {
  const { isAuthenticated, profile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const dashboardPath = profile ? getHomeRouteForProfile(profile) : '/login';

  const isLoginPage = location.pathname === '/login';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 transition-colors">
      {/* Clean, Welcoming Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Wordmark */}
          <Link
            to="/"
            className="flex items-center gap-2.5 text-xl font-display font-bold tracking-tight text-slate-900 whitespace-nowrap"
          >
            <span className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-4 h-4" />
            </span>
            <span>ClassFlow</span>
          </Link>

          {/* Right Controls: Theme Toggle & Account Action */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              )}
            </button>

            {isAuthenticated && profile ? (
              <Link
                to={dashboardPath}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
              >
                Open Workspace
              </Link>
            ) : isLoginPage ? (
              <Link
                to="/"
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
              >
                Create Account
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center">
        <Outlet />
      </main>

      <footer className="py-6 border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-slate-900">ClassFlow</span>
            <span aria-hidden="true">·</span>
            <span>Student &amp; Tutor Assignment Workspace</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/" className="hover:text-slate-900 transition-colors">
              Create Account
            </Link>
            <Link to="/login" className="hover:text-slate-900 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
