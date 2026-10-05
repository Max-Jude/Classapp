import React from 'react';
import { AssignmentPublicationStatus, ComputedAssignmentStatus, SubmissionWorkflowStatus } from '../../types';

/**
 * Unboxed semantic status indicators following Zero-Pill & Non-Color-Only Accessibility discipline.
 */
export const StudentStatusIndicator: React.FC<{ status: ComputedAssignmentStatus }> = ({
  status,
}) => {
  switch (status) {
    case 'Graded':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-700 whitespace-nowrap">
          <span aria-hidden="true">◆</span>
          <span>Graded</span>
        </span>
      );
    case 'Submitted':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-blue-700 whitespace-nowrap">
          <span aria-hidden="true">●</span>
          <span>Submitted</span>
        </span>
      );
    case 'Overdue':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-red-700 whitespace-nowrap">
          <span aria-hidden="true">▲</span>
          <span>Overdue</span>
        </span>
      );
    case 'In Progress':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-amber-700 whitespace-nowrap">
          <span aria-hidden="true">◐</span>
          <span>In Progress</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-600 whitespace-nowrap">
          <span aria-hidden="true">○</span>
          <span>Not Started</span>
        </span>
      );
  }
};

export const SubmissionStatusIndicator: React.FC<{ status: SubmissionWorkflowStatus }> = ({
  status,
}) => {
  if (status === 'graded') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-700 whitespace-nowrap">
        <span aria-hidden="true">◆</span>
        <span>Graded</span>
      </span>
    );
  }
  if (status === 'submitted') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-blue-700 whitespace-nowrap">
        <span aria-hidden="true">●</span>
        <span>Submitted</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-amber-700 whitespace-nowrap">
      <span aria-hidden="true">◐</span>
      <span>In Progress</span>
    </span>
  );
};

export const PublicationStatusIndicator: React.FC<{ status: AssignmentPublicationStatus }> = ({
  status,
}) => {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-700 whitespace-nowrap">
        <span aria-hidden="true">●</span>
        <span>Published</span>
      </span>
    );
  }
  if (status === 'draft') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-mono text-amber-700 whitespace-nowrap">
        <span aria-hidden="true">○</span>
        <span>Draft</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 whitespace-nowrap">
      <span aria-hidden="true">▪</span>
      <span>Archived</span>
    </span>
  );
};
