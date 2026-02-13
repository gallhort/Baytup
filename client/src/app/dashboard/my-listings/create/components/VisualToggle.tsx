'use client';

import { ReactNode } from 'react';
import { Check } from 'lucide-react';

interface VisualToggleProps {
  icon: ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
}

export default function VisualToggle({ icon, label, selected, onClick }: VisualToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-200 w-full text-left ${
        selected
          ? 'border-[#FF6B35] bg-orange-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <span className="text-xl flex-shrink-0">{icon}</span>
      <span className="text-sm font-medium text-gray-900 flex-1">{label}</span>
      {selected && (
        <div className="w-5 h-5 bg-[#FF6B35] rounded-full flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
    </button>
  );
}
