'use client';

interface ExitConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  t: any;
}

export default function ExitConfirmDialog({ open, onClose, onConfirm, t }: ExitConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {t.exitDialog?.title || 'Leave without saving?'}
        </h3>
        <p className="text-gray-500 mb-6">
          {t.exitDialog?.description || 'Your progress has been saved as a draft. You can continue later.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-full border border-gray-300 font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t.exitDialog?.stay || 'Stay'}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-full bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
          >
            {t.exitDialog?.leave || 'Leave'}
          </button>
        </div>
      </div>
    </div>
  );
}
