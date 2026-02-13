'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { X, Save } from 'lucide-react';
import ProgressBar from './components/ProgressBar';
import ExitConfirmDialog from './components/ExitConfirmDialog';

interface CreateListingLayoutProps {
  children: ReactNode;
  currentIndex: number;
  totalSteps: number;
  currentPhase: number;
  progress: number;
  canGoBack: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft?: () => void;
  nextDisabled?: boolean;
  saving?: boolean;
  phaseLabels: { [key: number]: string };
  t: any;
  hasDraft: boolean;
}

export default function CreateListingLayout({
  children,
  currentIndex,
  totalSteps,
  currentPhase,
  progress,
  canGoBack,
  isLastStep,
  onBack,
  onNext,
  onSaveDraft,
  nextDisabled,
  saving,
  phaseLabels,
  t,
  hasDraft,
}: CreateListingLayoutProps) {
  const [showExitDialog, setShowExitDialog] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
        {hasDraft ? (
          <button
            onClick={() => setShowExitDialog(true)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">{t.exit}</span>
          </button>
        ) : (
          <Link href="/dashboard/my-listings" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">{t.exit}</span>
          </Link>
        )}

        <Link href="/" className="text-xl font-bold text-[#FF6B35]">
          Baytup
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 hidden sm:inline">
            {currentIndex + 1} / {totalSteps}
          </span>
          {onSaveDraft && (
            <button
              onClick={onSaveDraft}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-full hover:border-gray-300 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">{t.saveDraft}</span>
            </button>
          )}
        </div>
      </header>

      {/* Progress Bar */}
      <ProgressBar progress={progress} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Phase Label */}
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            {phaseLabels[currentPhase]}
          </p>

          {/* Step Content */}
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <footer className="flex-shrink-0 bg-white border-t border-gray-100 px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {canGoBack ? (
            <button
              onClick={onBack}
              className="text-gray-600 underline underline-offset-4 font-medium hover:text-gray-900 transition-colors"
            >
              {t.back}
            </button>
          ) : (
            <div />
          )}

          {!isLastStep && (
            <button
              onClick={onNext}
              disabled={nextDisabled || saving}
              className="bg-[#FF6B35] text-white px-8 py-3.5 rounded-full text-base font-semibold hover:bg-[#e55a2b] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {t.next}
            </button>
          )}
        </div>
      </footer>

      {/* Exit Confirmation Dialog */}
      <ExitConfirmDialog
        open={showExitDialog}
        onClose={() => setShowExitDialog(false)}
        onConfirm={() => {
          setShowExitDialog(false);
          window.location.href = '/dashboard/my-listings';
        }}
        t={t}
      />
    </div>
  );
}
