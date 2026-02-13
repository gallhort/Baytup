'use client';

import { ReactNode } from 'react';
import { Check } from 'lucide-react';

interface VisualCardProps {
  icon: ReactNode;
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  large?: boolean;
}

export default function VisualCard({
  icon,
  label,
  description,
  selected,
  onClick,
  large,
}: VisualCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left w-full rounded-2xl border-2 p-5 transition-all duration-200 ${
        large ? 'sm:p-8' : 'sm:p-6'
      } ${
        selected
          ? 'border-[#FF6B35] bg-orange-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
      }`}
    >
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-[#FF6B35] rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`${large ? 'text-4xl sm:text-5xl' : 'text-3xl'} mb-3`}>
        {icon}
      </div>
      <h3 className={`font-semibold text-gray-900 ${large ? 'text-xl sm:text-2xl' : 'text-base'}`}>
        {label}
      </h3>
      {description && (
        <p className={`text-gray-500 mt-1 ${large ? 'text-base' : 'text-sm'}`}>
          {description}
        </p>
      )}
    </button>
  );
}
