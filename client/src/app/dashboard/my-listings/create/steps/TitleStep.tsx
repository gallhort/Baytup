'use client';

import { CreateListingFormData } from '../types';

interface Props {
  formData: CreateListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateListingFormData>>;
  t: any;
}

export default function TitleStep({ formData, setFormData, t }: Props) {
  const maxLength = 100;
  const charCount = formData.title.length;

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.titleStep?.title || 'Give your listing a title'}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t.titleStep?.subtitle || 'Short titles work best. Be creative!'}
      </p>

      <div className="relative">
        <textarea
          value={formData.title}
          onChange={e => {
            if (e.target.value.length <= maxLength) {
              setFormData(prev => ({ ...prev, title: e.target.value }));
            }
          }}
          placeholder={t.titleStep?.placeholder || 'e.g. Cozy apartment in the heart of Algiers'}
          rows={3}
          className="w-full px-5 py-4 text-2xl font-medium border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] outline-none resize-none placeholder-gray-300"
        />
        <div className="flex justify-end mt-2">
          <span className={`text-sm font-medium ${
            charCount > 90 ? 'text-orange-500' : charCount > 0 ? 'text-gray-400' : 'text-gray-300'
          }`}>
            {charCount}/{maxLength}
          </span>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-8 bg-gray-50 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">{t.titleStep?.tipsTitle || 'Tips'}</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>{t.titleStep?.tip1 || 'Highlight what makes your place special'}</li>
          <li>{t.titleStep?.tip2 || 'Mention the neighborhood or a nearby landmark'}</li>
          <li>{t.titleStep?.tip3 || 'Keep it under 50 characters for best results'}</li>
        </ul>
      </div>
    </div>
  );
}
