import { useEffect, useState } from 'react';
import { Assignment } from '../types';
import {
  subscribeAllAssignments,
  subscribePublishedAssignments,
  subscribeTutorAssignments,
} from '../services/assignmentService';
import { useAuth } from '../contexts/AuthContext';
import { toFriendlyErrorMessage } from '../utils/formatters';

export function useAssignments() {
  const { profile, isAuthenticated, isAdmin } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !profile || (!isAdmin && profile.approvalStatus !== 'approved')) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const onSuccess = (data: Assignment[]) => {
      setAssignments(data);
      setLoading(false);
    };

    const onFail = (err: Error) => {
      setError(toFriendlyErrorMessage(err));
      setLoading(false);
    };

    const unsubscribe =
      isAdmin || profile.role === 'admin'
        ? subscribeAllAssignments(onSuccess, onFail)
        : profile.role === 'tutor'
        ? subscribeTutorAssignments(profile.uid, onSuccess, onFail)
        : subscribePublishedAssignments(onSuccess, onFail);

    return () => unsubscribe();
  }, [isAuthenticated, profile, isAdmin]);

  return { assignments, loading, error };
}
