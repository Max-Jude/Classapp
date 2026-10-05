import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { updateUserProfileAtomically } from '../../services/userService';
import { formatDateTime, toFriendlyErrorMessage } from '../../utils/formatters';

export const TutorProfilePage: React.FC = () => {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(profile?.name || '');
  const [department, setDepartment] = useState(profile?.department || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);

  if (!profile) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      showToast('Validation error', 'Name must be at least 2 characters.', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateUserProfileAtomically(profile.uid, {
        name,
        department,
        studentCode: profile.studentCode,
        bio,
      });
      showToast('Profile updated', 'Your instructor profile has been saved.', 'success');
    } catch (err) {
      showToast('Update failed', toFriendlyErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div className="pb-5 border-b border-slate-200">
        <p className="text-xs font-mono text-slate-500 mb-1">INSTRUCTOR PROFILE</p>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900">
          Tutor Account Settings
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage your public instructor name, department, and biography.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="pb-6 mb-6 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-slate-500">Instructor Email</p>
            <p className="font-mono text-slate-900 font-medium mt-0.5">{profile.email}</p>
          </div>
          <div>
            <p className="text-slate-500">Instructor Identification Code</p>
            <p className="font-mono text-blue-700 font-semibold mt-0.5">{profile.studentCode}</p>
          </div>
          <div>
            <p className="text-slate-500">Verified Role</p>
            <p className="font-mono text-blue-700 font-medium mt-0.5 uppercase">{profile.role}</p>
          </div>
          <div>
            <p className="text-slate-500">Member Since</p>
            <p className="font-mono text-slate-700 mt-0.5">{formatDateTime(profile.createdAt)}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="tprof-name" className="block text-sm font-medium text-slate-800 mb-1">
              Instructor Display Name
            </label>
            <input
              id="tprof-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tprof-dept" className="block text-sm font-medium text-slate-800 mb-1">
                Academic Department
              </label>
              <input
                id="tprof-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800 mb-1">
                Instructor Identification Code
              </label>
              <div className="w-full px-3.5 py-2 text-sm font-mono bg-slate-100 border border-slate-200 rounded-lg text-slate-600 flex items-center justify-between select-none">
                <span>{profile.studentCode}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-sans text-slate-500">
                  <Lock className="w-3 h-3" />
                  <span>Auto-Assigned</span>
                </span>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="tprof-bio" className="block text-sm font-medium text-slate-800 mb-1">
              Instructor Bio &amp; Office Hours
            </label>
            <textarea
              id="tprof-bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Office hours, course responsibilities, or contact notes..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving Profile...' : 'Save Instructor Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
