import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { WorkspaceLayout } from '../layouts/WorkspaceLayout';
import { ProtectedRoute } from './ProtectedRoute';

// Public & Admission Pages
import { AboutPage } from '../pages/public/AboutPage';
import { LoginPage } from '../pages/public/LoginPage';
import { RegisterPage } from '../pages/public/RegisterPage';
import { PendingApprovalPage } from '../pages/public/PendingApprovalPage';

// Admin Pages
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';

// Student Pages
import { StudentDashboardPage } from '../pages/student/StudentDashboardPage';
import { StudentAssignmentsPage } from '../pages/student/StudentAssignmentsPage';
import { StudentAssignmentDetailPage } from '../pages/student/StudentAssignmentDetailPage';
import { StudentSubmissionsPage } from '../pages/student/StudentSubmissionsPage';
import { StudentGradesPage } from '../pages/student/StudentGradesPage';
import { StudentProfilePage } from '../pages/student/StudentProfilePage';

// Tutor Pages
import { TutorDashboardPage } from '../pages/tutor/TutorDashboardPage';
import { TutorAssignmentsPage } from '../pages/tutor/TutorAssignmentsPage';
import { TutorCreateAssignmentPage } from '../pages/tutor/TutorCreateAssignmentPage';
import { TutorAssignmentDetailPage } from '../pages/tutor/TutorAssignmentDetailPage';
import { TutorSubmissionsPage } from '../pages/tutor/TutorSubmissionsPage';
import { TutorStudentsPage } from '../pages/tutor/TutorStudentsPage';
import { TutorProfilePage } from '../pages/tutor/TutorProfilePage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Entry, Authentication & Pending Approval Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/pending-approval" element={<PendingApprovalPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Route>

      {/* Protected Admin Console Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="admin">
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
      </Route>

      {/* Protected Student Workspace Routes */}
      <Route
        path="/student"
        element={
          <ProtectedRoute allowedRole="student">
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/student/dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboardPage />} />
        <Route path="assignments" element={<StudentAssignmentsPage />} />
        <Route path="assignments/:id" element={<StudentAssignmentDetailPage />} />
        <Route path="submissions" element={<StudentSubmissionsPage />} />
        <Route path="grades" element={<StudentGradesPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
      </Route>

      {/* Protected Tutor Workspace Routes */}
      <Route
        path="/tutor"
        element={
          <ProtectedRoute allowedRole="tutor">
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/tutor/dashboard" replace />} />
        <Route path="dashboard" element={<TutorDashboardPage />} />
        <Route path="assignments" element={<TutorAssignmentsPage />} />
        <Route path="assignments/create" element={<TutorCreateAssignmentPage />} />
        <Route path="assignments/:id" element={<TutorAssignmentDetailPage />} />
        <Route path="submissions" element={<TutorSubmissionsPage />} />
        <Route path="students" element={<TutorStudentsPage />} />
        <Route path="profile" element={<TutorProfilePage />} />
      </Route>

      {/* Fallback Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
