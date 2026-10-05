import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Plus, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignments } from '../../hooks/useAssignments';
import { useSubmissions } from '../../hooks/useSubmissions';
import { deleteAssignment, uploadAssignmentAttachment } from '../../services/assignmentService';
import { downloadProtectedFile } from '../../services/storageService';
import {
  formatDateTime,
  formatFileSize,
  isDeadlinePast,
  toFriendlyErrorMessage,
} from '../../utils/formatters';
import { PublicationStatusIndicator } from '../../components/common/StatusIndicator';
import { useToast } from '../../contexts/ToastContext';

export const TutorAssignmentsPage: React.FC = () => {
  const { profile } = useAuth();
  const { assignments, loading, error } = useAssignments();
  const { submissions } = useSubmissions();
  const { showToast } = useToast();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [uploadingAssignmentId, setUploadingAssignmentId] = useState<string | null>(null);
  const [targetUploadAssignmentId, setTargetUploadAssignmentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDelete = async (id: string, title: string) => {
    setDeletingId(id);
    try {
      await deleteAssignment(id);
      setConfirmDeleteId(null);
      showToast('Assignment deleted', `"${title}" was removed.`, 'info');
    } catch (err) {
      showToast('Delete failed', toFriendlyErrorMessage(err), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const triggerRowFileUpload = (assignmentId: string) => {
    setTargetUploadAssignmentId(assignmentId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleRowFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file || !targetUploadAssignmentId || !profile) return;

    const assignmentId = targetUploadAssignmentId;
    setUploadingAssignmentId(assignmentId);
    try {
      await uploadAssignmentAttachment({
        assignmentId,
        tutorId: profile.uid,
        file,
      });
      showToast(
        'File uploaded',
        `"${file.name}" is now attached to the assignment.`,
        'success'
      );
    } catch (err) {
      showToast('Upload failed', toFriendlyErrorMessage(err), 'error');
    } finally {
      setUploadingAssignmentId(null);
      setTargetUploadAssignmentId(null);
    }
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleRowFileSelected}
        className="sr-only"
        aria-label="Upload assignment file"
      />

      <div className="pb-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-slate-500 mb-1">COURSE AUTHORING</p>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
            Manage Assignments
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Monitor deadlines, uploaded assignment files, publication status, and submissions.
          </p>
        </div>

        <Link
          to="/tutor/assignments/create"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New Assignment</span>
        </Link>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          ▲ {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-900">No assignments found</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Author and publish your first course assignment to distribute it to students.
            </p>
            <Link
              to="/tutor/assignments/create"
              className="inline-block px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
            >
              + Create Assignment
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-mono text-slate-500">
                  <th className="py-3 px-5 font-medium">Title &amp; Subject</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Deadline</th>
                  <th className="py-3 px-4 font-medium">Uploaded File</th>
                  <th className="py-3 px-4 font-medium text-right">Submissions</th>
                  <th className="py-3 px-4 font-medium text-right">Graded</th>
                  <th className="py-3 px-5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {assignments.map((asgn) => {
                  const asgnSubs = submissions.filter((s) => s.assignmentId === asgn.id);
                  const gradedSubs = asgnSubs.filter((s) => s.status === 'graded');
                  const pastDue = isDeadlinePast(asgn.deadline);
                  const isUploadingThis = uploadingAssignmentId === asgn.id;

                  return (
                    <tr key={asgn.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <Link
                          to={`/tutor/assignments/${asgn.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-700"
                        >
                          {asgn.title}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{asgn.subject}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <PublicationStatusIndicator status={asgn.status} />
                      </td>

                      <td className="py-3.5 px-4 text-xs font-mono tabular-nums whitespace-nowrap">
                        <span className={pastDue ? 'text-red-700 font-medium' : 'text-slate-700'}>
                          {formatDateTime(asgn.deadline)}
                        </span>
                      </td>

                      {/* Dedicated Uploaded File Column */}
                      <td className="py-3.5 px-4">
                        {isUploadingThis ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-mono text-blue-700">
                            Uploading file...
                          </span>
                        ) : asgn.attachmentName && asgn.attachmentUrl ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                downloadProtectedFile(asgn.attachmentUrl, asgn.attachmentName)
                              }
                              title={`Download ${asgn.attachmentName}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700 hover:underline max-w-[200px]"
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{asgn.attachmentName}</span>
                              <Download className="w-3 h-3 shrink-0 opacity-75" />
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerRowFileUpload(asgn.id)}
                              className="text-[11px] font-medium text-slate-500 hover:text-slate-900 underline whitespace-nowrap"
                            >
                              Replace
                            </button>
                            {asgn.attachmentSize > 0 && (
                              <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap hidden xl:inline">
                                ({formatFileSize(asgn.attachmentSize)})
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">No file uploaded</span>
                            <button
                              type="button"
                              onClick={() => triggerRowFileUpload(asgn.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Upload File</span>
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums">
                        {asgnSubs.length}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-emerald-700">
                        {gradedSubs.length} / {asgnSubs.length}
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap space-x-2">
                        <Link
                          to={`/tutor/assignments/${asgn.id}`}
                          className="inline-block px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                        >
                          Manage &amp; Grade
                        </Link>
                        {confirmDeleteId === asgn.id ? (
                          <button
                            type="button"
                            disabled={deletingId === asgn.id}
                            onClick={() => handleDelete(asgn.id, asgn.title)}
                            className="inline-block px-2.5 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-md transition-colors"
                          >
                            {deletingId === asgn.id ? 'Deleting...' : 'Confirm'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(asgn.id)}
                            aria-label={`Delete ${asgn.title}`}
                            className="inline-flex items-center p-1.5 text-slate-400 hover:text-red-700 rounded-md transition-colors align-middle"
                          >
                            <Trash2 className="w-4 h-4" />
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
