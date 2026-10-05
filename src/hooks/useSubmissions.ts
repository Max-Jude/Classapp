import { useEffect, useState } from 'react';
import { Submission } from '../types';
import {
  subscribeAllSubmissions,
  subscribeStudentSubmissions,
  subscribeTutorSubmissions,
} from '../services/submissionService';
import { useAuth } from '../contexts/AuthContext';
import { toFriendlyErrorMessage } from '../utils/formatters';

export function useSubmissions() {
  const { profile, isAuthenticated, isAdmin } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !profile || (!isAdmin && profile.approvalStatus !== 'approved')) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const onSuccess = (data: Submission[]) => {
      setSubmissions(data);
      setLoading(false);
    };

    const onFail = (err: Error) => {
      setError(toFriendlyErrorMessage(err));
      setLoading(false);
    };

    const unsubscribe =
      isAdmin || profile.role === 'admin'
        ? subscribeAllSubmissions(onSuccess, onFail)
        : profile.role === 'tutor'
        ? subscribeTutorSubmissions(profile.uid, onSuccess, onFail)
        : subscribeStudentSubmissions(profile.uid, onSuccess, onFail);

    return () => unsubscribe();
  }, [isAuthenticated, profile, isAdmin]);

  return { submissions, loading, error };
}
