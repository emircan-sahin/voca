import toast from 'react-hot-toast';

// Fixed id: a newer failure replaces the older toast, matching the single kept blob
export const RETRY_TOAST_ID = 'transcribe-retry';

export function showRetryToast(message: string, retryLabel: string, onRetry: () => void) {
  toast.error(
    (toastInstance) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">{message}</span>
        <button
          onClick={() => {
            toast.dismiss(toastInstance.id);
            onRetry();
          }}
          className="px-2 py-1 text-xs font-medium bg-neutral-900 text-white rounded hover:bg-neutral-800 transition-colors"
        >
          {retryLabel}
        </button>
      </div>
    ),
    { id: RETRY_TOAST_ID, duration: 10_000 }
  );
}
