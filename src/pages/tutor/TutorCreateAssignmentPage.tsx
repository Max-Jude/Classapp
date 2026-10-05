import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { createAssignment } from '../../services/assignmentService';
import { AssignmentPublicationStatus } from '../../types';
import { toFriendlyErrorMessage } from '../../utils/formatters';
import { FileDropzone } from '../../components/common/FileDropzone';

export const TutorCreateAssignmentPage: React.FC = () => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Default deadline 7 days from now formatted for datetime-local input
  const defaultDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Computer Science');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [maxPoints, setMaxPoints] = useState<number>(100);
  const [status, setStatus] = useState<AssignmentPublicationStatus>('published');
  const [allowLateSubmissions, setAllowLateSubmissions] = useState<boolean>(true);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setSaving(true);

    try {
      const created = await createAssignment({
        title,
        subject,
        description,
        instructions,
        tutorId: profile.uid,
        tutorName: profile.name,
        deadline,
        maxPoints,
        status,
        allowLateSubmissions,
        attachmentFile,
        onUploadProgress: (pct) => setUploadProgress(pct),
      });

      showToast(
        status === 'published' ? 'Assignment published' : 'Draft saved',
        `"${created.title}" is now stored in Firestore.`,
        'success'
      );
      navigate(`/tutor/assignments/${created.id}`);
    } catch (err) {
      setUploadProgress(null);
      setError(toFriendlyErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link
          to="/tutor/assignments"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Assignments</span>
        </Link>
        <p className="text-xs font-mono text-slate-500 mb-1">NEW COURSEWORK BRIEF</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
          Create Assignment
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Configure instructions, deadlines, reference attachments, and publication state.
        </p>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
          ▲ {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="asgn-title" className="block text-sm font-medium text-slate-800 mb-1">
              Assignment Title
            </label>
            <input
              id="asgn-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Neural Network Backpropagation Lab"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>

          <div>
            <label htmlFor="asgn-subject" className="block text-sm font-medium text-slate-800 mb-1">
              Subject / Category
            </label>
            <input
              id="asgn-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Computer Science"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>
        </div>

        <div>
          <label htmlFor="asgn-desc" className="block text-sm font-medium text-slate-800 mb-1">
            Short Description (Summary)
          </label>
          <textarea
            id="asgn-desc"
            rows={2}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Concise summary displayed on assignment cards..."
            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
          />
        </div>

        <div>
          <label htmlFor="asgn-inst" className="block text-sm font-medium text-slate-800 mb-1">
            Detailed Instructions &amp; Grading Rubric
          </label>
          <textarea
            id="asgn-inst"
            rows={6}
            required
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Step-by-step deliverables, required file formats, and evaluation rubric..."
            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="asgn-deadline"
              className="block text-sm font-medium text-slate-800 mb-1"
            >
              Submission Deadline
            </label>
            <input
              id="asgn-deadline"
              type="datetime-local"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>

          <div>
            <label htmlFor="asgn-points" className="block text-sm font-medium text-slate-800 mb-1">
              Maximum Points (1–100)
            </label>
            <input
              id="asgn-points"
              type="number"
              min={1}
              max={100}
              required
              value={maxPoints}
              onChange={(e) => setMaxPoints(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>

          <div>
            <label htmlFor="asgn-status" className="block text-sm font-medium text-slate-800 mb-1">
              Publication Status
            </label>
            <select
              id="asgn-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as AssignmentPublicationStatus)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
            >
              <option value="published">Published (Visible to Students)</option>
              <option value="draft">Draft (Private to Tutor)</option>
            </select>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Late Submission Policy</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose whether students can still upload files after the deadline has passed.
            </p>
          </div>
          <select
            value={allowLateSubmissions ? 'allow' : 'lock'}
            onChange={(e) => setAllowLateSubmissions(e.target.value === 'allow')}
            className="px-3.5 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
          >
            <option value="allow">● Allow Late Submissions (Marked as LATE)</option>
            <option value="lock">▲ Strictly Lock Submissions After Deadline</option>
          </select>
        </div>

        <FileDropzone
          selectedFile={attachmentFile}
          onSelectFile={setAttachmentFile}
          uploadProgress={uploadProgress}
          disabled={saving}
          label="Optional Assignment Attachment (Specification / Starter Archive)"
        />

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <Link
            to="/tutor/assignments"
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {saving
              ? 'Saving Assignment...'
              : status === 'published'
              ? 'Publish Assignment'
              : 'Save Draft'}
          </button>
        </div>
      </form>
    </div>
  );
};
