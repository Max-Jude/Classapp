import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, FileText, Plus, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAssignments } from '../../hooks/useAssignments';
import { useSubmissions } from '../../hooks/useSubmissions';
import { subscribeStudentsDirectory } from '../../services/userService';
import { createAssignment, uploadAssignmentAttachment } from '../../services/assignmentService';
import { downloadProtectedFile } from '../../services/storageService';
import { DirectoryEntry, Submission } from '../../types';
import { formatDateTime, toFriendlyErrorMessage } from '../../utils/formatters';
import {
  PublicationStatusIndicator,
  SubmissionStatusIndicator,
} from '../../components/common/StatusIndicator';
import { GradingModal } from '../../components/assignments/GradingModal';
import { AnnouncementsPanel } from '../../components/announcements/AnnouncementsPanel';
import { useToast } from '../../contexts/ToastContext';

export const TutorDashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { assignments, loading: loadingAsgn, error: asgnError } = useAssignments();
  const { submissions, loading: loadingSub } = useSubmissions();

  const [students, setStudents] = useState<DirectoryEntry[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [seedingSample, setSeedingSample] = useState(false);
  const [uploadingAsgnId, setUploadingAsgnId] = useState<string | null>(null);
  const [targetUploadAsgnId, setTargetUploadAsgnId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerQuickUpload = (assignmentId: string) => {
    setTargetUploadAsgnId(assignmentId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleQuickFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file || !targetUploadAsgnId || !profile) return;

    const assignmentId = targetUploadAsgnId;
    setUploadingAsgnId(assignmentId);
    try {
      await uploadAssignmentAttachment({
        assignmentId,
        tutorId: profile.uid,
        file,
      });
      showToast('File uploaded', `"${file.name}" attached to assignment.`, 'success');
    } catch (err) {
      showToast('Upload failed', toFriendlyErrorMessage(err), 'error');
    } finally {
      setUploadingAsgnId(null);
      setTargetUploadAsgnId(null);
    }
  };

  useEffect(() => {
    const unsub = subscribeStudentsDirectory((list) => setStudents(list));
    return () => unsub();
  }, []);

  const ungradedCount = useMemo(
    () => submissions.filter((s) => s.status === 'submitted').length,
    [submissions]
  );

  const gradedCount = useMemo(
    () => submissions.filter((s) => s.status === 'graded').length,
    [submissions]
  );

  const recentSubmissions = useMemo(() => {
    return [...submissions].slice(0, 5);
  }, [submissions]);

  const recentAssignments = useMemo(() => {
    return [...assignments].slice(0, 5);
  }, [assignments]);

  const handleCreateSampleAssignment = async () => {
    if (!profile) return;
    setSeedingSample(true);
    try {
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await createAssignment({
        title: 'Distributed Systems: Consensus & Fault Tolerance Analysis',
        subject: 'Computer Science',
        description:
          'Analyze leader election safety and log replication invariants under network partitions.',
        instructions:
          '1. Review the Raft consensus protocol state machine.\n2. Compare split-brain prevention mechanisms between Paxos and Raft.\n3. Upload a concise PDF or DOCX technical brief (max 10 MB) summarizing your proof and simulation findings.',
        tutorId: profile.uid,
        tutorName: profile.name,
        deadline: nextWeek,
        maxPoints: 100,
        status: 'published',
      });
      showToast(
        'Published sample assignment',
        'Students can now view and submit work to this assignment.',
        'success'
      );
    } catch (err) {
      showToast('Failed to create sample', toFriendlyErrorMessage(err), 'error');
    } finally {
      setSeedingSample(false);
    }
  };

  const loading = loadingAsgn || loadingSub;

  return (
    <div className="space-y-8">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleQuickFileChange}
        className="sr-only"
        aria-label="Upload assignment file"
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-blue-700 mb-1">
            <span>INSTRUCTOR CONSOLE</span>
            <span aria-hidden="true">·</span>
            <span>{profile?.studentCode}</span>
            <span aria-hidden="true">·</span>
            <span>{profile?.department}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
            Tutor Dashboard — {profile?.name}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {assignments.length === 0 && !loading && (
            <button
              type="button"
              disabled={seedingSample}
              onClick={handleCreateSampleAssignment}
              className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {seedingSample ? 'Publishing...' : 'Publish Sample Assignment'}
            </button>
          )}
          <Link
            to="/tutor/assignments/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Assignment</span>
          </Link>
        </div>
      </div>

      {asgnError && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          ▲ {asgnError}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Registered Students</p>
          <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums mt-1">
            {students.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Course Assignments</p>
          <p className="text-2xl font-mono font-semibold text-slate-900 tabular-nums mt-1">
            {loading ? '—' : assignments.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Pending Grading Queue</p>
          <p className="text-2xl font-mono font-semibold text-amber-700 tabular-nums mt-1">
            {loading ? '—' : ungradedCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Graded Submissions</p>
          <p className="text-2xl font-mono font-semibold text-emerald-700 tabular-nums mt-1">
            {loading ? '—' : gradedCount}
          </p>
        </div>
      </div>

      {/* Course & Institutional Announcements */}
      <AnnouncementsPanel defaultSubject={profile?.department || 'All Courses'} />

      {/* Two-Column Operational Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recently Submitted Student Work */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-display font-semibold text-slate-900">
                Recent Student Submissions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect uploaded files and record grades
              </p>
            </div>
            <Link
              to="/tutor/submissions"
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              All Submissions
            </Link>
          </div>

          {loading ? (
            <div className="py-8 space-y-3">
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : recentSubmissions.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-900">No student submissions yet</p>
              <p className="text-xs text-slate-500 mt-1">
                When students upload work for your assignments, they appear here in real time.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {recentSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="py-3.5 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                      <span className="font-semibold text-slate-900">{sub.studentName}</span>
                      <span aria-hidden="true">·</span>
                      <SubmissionStatusIndicator status={sub.status} />
                    </div>
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {sub.assignmentTitle}
                    </p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">
                      {sub.fileName} · {formatDateTime(sub.submittedAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sub.status === 'graded' && sub.grade >= 0 && (
                      <span className="text-xs font-mono font-semibold text-emerald-700 tabular-nums">
                        {sub.grade}/100
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedSubmission(sub)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {sub.status === 'graded' ? 'Review Grade' : 'Grade Work'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Created Assignments */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-display font-semibold text-slate-900">
                Created Assignments
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Coursework briefs authored by you
              </p>
            </div>
            <Link
              to="/tutor/assignments"
              className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap"
            >
              Manage All
            </Link>
          </div>

          {loading ? (
            <div className="py-8 space-y-3">
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : recentAssignments.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium text-slate-900">No assignments created yet</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Create your first assignment or publish a sample brief to start receiving student
                submissions.
              </p>
              <Link
                to="/tutor/assignments/create"
                className="inline-block px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800"
              >
                + Create First Assignment
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {recentAssignments.map((asgn) => {
                const subCount = submissions.filter((s) => s.assignmentId === asgn.id).length;
                return (
                  <div
                    key={asgn.id}
                    className="py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
                        <span>{asgn.subject}</span>
                        <span aria-hidden="true">·</span>
                        <PublicationStatusIndicator status={asgn.status} />
                      </div>
                      <Link
                        to={`/tutor/assignments/${asgn.id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-blue-700 truncate block"
                      >
                        {asgn.title}
                      </Link>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        Due {formatDateTime(asgn.deadline)} · {subCount} submissions
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        {uploadingAsgnId === asgn.id ? (
                          <span className="text-xs font-mono text-blue-700">Uploading file...</span>
                        ) : asgn.attachmentName && asgn.attachmentUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              downloadProtectedFile(asgn.attachmentUrl, asgn.attachmentName)
                            }
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-xs font-medium text-blue-700 hover:underline max-w-[240px]"
                          >
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate">Uploaded File: {asgn.attachmentName}</span>
                            <Download className="w-3 h-3 shrink-0" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => triggerQuickUpload(asgn.id)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700"
                          >
                            <Upload className="w-3 h-3" />
                            <span>+ Upload File</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <Link
                      to={`/tutor/assignments/${asgn.id}`}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Manage
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedSubmission && profile && (
        <GradingModal
          submission={selectedSubmission}
          tutorUid={profile.uid}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </div>
  );
};
