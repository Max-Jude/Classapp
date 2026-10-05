import React from 'react';
import { X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const prefix =
          toast.variant === 'success'
            ? '● CONFIRMED'
            : toast.variant === 'error'
            ? '▲ ALERT'
            : '◆ NOTICE';
        const accentColor =
          toast.variant === 'success'
            ? 'text-emerald-700'
            : toast.variant === 'error'
            ? 'text-red-700'
            : 'text-blue-700';

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-start justify-between gap-3"
          >
            <div className="min-w-0">
              <p className={`text-xs font-mono font-medium ${accentColor} mb-0.5`}>{prefix}</p>
              <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
