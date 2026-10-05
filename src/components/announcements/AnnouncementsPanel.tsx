import React, { useEffect, useState } from 'react';
import { Bell, Megaphone, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  createAnnouncement,
  deleteAnnouncement,
  subscribeAnnouncements,
} from '../../services/announcementService';
import { Announcement, AnnouncementPriority } from '../../types';
import { formatDateTime, toFriendlyErrorMessage } from '../../utils/formatters';

interface AnnouncementsPanelProps {
  /** Optional department/subject filter hint for default composer value */
  defaultSubject?: string;
}

export const AnnouncementsPanel: React.FC<AnnouncementsPanelProps> = ({
  defaultSubject = 'All Courses',
}) => {
  const { profile, isAdmin } = useAuth();
  const isTutor = profile?.role === 'tutor';
  const { showToast } = useToast();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [posting, setPosting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canPost = isTutor || isAdmin;

  useEffect(() => {
    const unsub = subscribeAnnouncements(
      (list) => {
        setAnnouncements(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !canPost) return;

    setPosting(true);
    try {
      await createAnnouncement({
        title,
        message,
        subject: subject.trim() || 'All Courses',
        priority,
        authorId: profile.uid,
        authorName: profile.name,
        authorRole: isAdmin ? 'admin' : 'tutor',
      });
      setTitle('');
      setMessage('');
      setPriority('normal');
      setComposing(false);
      showToast(
        'Announcement published',
        'Students and instructors can now see your notice on their dashboards.',
        'success'
      );
    } catch (err) {
      showToast('Failed to post announcement', toFriendlyErrorMessage(err), 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (ann: Announcement) => {
    setDeletingId(ann.id);
    try {
      await deleteAnnouncement(ann.id);
      showToast('Announcement removed', `"${ann.title}" has been deleted.`, 'info');
    } catch (err) {
      showToast('Delete failed', toFriendlyErrorMessage(err), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // For students, if there are no announcements at all, don't clutter their dashboard
  if (!canPost && !loading && announcements.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-display font-semibold text-slate-900">
              Course &amp; Institutional Announcements ({announcements.length})
            </h2>
            <p className="text-xs text-slate-500">
              {canPost
                ? 'Broadcast deadline updates, exam reminders, or class notices to all students.'
                : 'Important notices and updates from your instructors and administrator.'}
            </p>
          </div>
        </div>

        {canPost && (
          <button
            type="button"
            onClick={() => setComposing((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors self-start sm:self-auto whitespace-nowrap"
          >
            {composing ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Close Composer</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Post Announcement</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Collapsible Composer for Tutors & Admins */}
      {canPost && composing && (
        <form
          onSubmit={handlePost}
          className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Announcement Headline
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Assignment 2 Deadline Extended to Friday"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Course / Department
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="All Courses"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                <option value="normal">● Standard Notice</option>
                <option value="important">◆ Important Update</option>
                <option value="urgent">▲ Urgent Alert</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Announcement Message
            </label>
            <textarea
              rows={2}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write clear instructions or updates for students..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setComposing(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={posting}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {posting ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </div>
        </form>
      )}

      {/* Announcements List */}
      {loading ? (
        <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
      ) : announcements.length === 0 ? (
        <div className="py-3 text-xs text-slate-500 flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-slate-400" />
          <span>No active announcements posted yet. Click &ldquo;Post Announcement&rdquo; to broadcast a notice to students.</span>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 border-t border-slate-200 pt-2">
          {announcements.slice(0, 5).map((ann) => {
            const canDeleteThis = isAdmin || (isTutor && ann.authorId === profile?.uid);
            return (
              <div
                key={ann.id}
                className="py-3 first:pt-2 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {ann.priority === 'urgent' ? (
                      <span className="font-mono font-semibold text-red-700">▲ URGENT</span>
                    ) : ann.priority === 'important' ? (
                      <span className="font-mono font-semibold text-amber-700">◆ IMPORTANT</span>
                    ) : (
                      <span className="font-mono font-semibold text-blue-700">● NOTICE</span>
                    )}
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="font-medium text-slate-800">{ann.subject}</span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="text-slate-500">
                      Posted by {ann.authorName} ({ann.authorRole.toUpperCase()})
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="font-mono text-slate-400">{formatDateTime(ann.createdAt)}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900">{ann.title}</h3>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {ann.message}
                  </p>
                </div>

                {canDeleteThis && (
                  <button
                    type="button"
                    disabled={deletingId === ann.id}
                    onClick={() => handleDelete(ann)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors shrink-0 self-start"
                    title="Delete announcement"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{deletingId === ann.id ? 'Removing...' : 'Remove'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
