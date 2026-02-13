'use client';

import { CreateListingFormData } from '../types';

interface Props {
  formData: CreateListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateListingFormData>>;
  t: any;
}

export default function DescriptionStep({ formData, setFormData, t }: Props) {
  const maxLength = 2000;
  const charCount = formData.description.length;

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.descriptionStep?.title || 'Describe your listing'}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t.descriptionStep?.subtitle || 'Share what makes your place special and what guests can expect.'}
      </p>

      <div className="relative">
        <textarea
          value={formData.description}
          onChange={e => {
            if (e.target.value.length <= maxLength) {
              setFormData(prev => ({ ...prev, description: e.target.value }));
            }
          }}
          placeholder={t.descriptionStep?.placeholder || 'Describe the space, the neighborhood, what guests will love...'}
          rows={8}
          className="w-full px-5 py-4 text-base border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] outline-none resize-none placeholder-gray-300 leading-relaxed"
        />
        <div className="flex justify-between mt-2">
          <span className={`text-sm ${charCount < 20 && charCount > 0 ? 'text-red-500' : 'text-gray-300'}`}>
            {charCount < 20 && charCount > 0
              ? `${t.descriptionStep?.minChars || 'Minimum 20 characters'} (${20 - charCount} ${t.descriptionStep?.remaining || 'remaining'})`
              : ''}
          </span>
          <span className={`text-sm font-medium ${
            charCount > 1900 ? 'text-orange-500' : charCount > 0 ? 'text-gray-400' : 'text-gray-300'
          }`}>
            {charCount}/{maxLength}
          </span>
        </div>
      </div>

      {/* Suggestions */}
      <div className="mt-8 bg-gray-50 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-900 mb-3">
          {t.descriptionStep?.tipsTitle || 'What to include'}
        </h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>{t.descriptionStep?.tip1 || 'The space: layout, style, unique features'}</li>
          <li>{t.descriptionStep?.tip2 || 'The neighborhood: restaurants, transport, attractions nearby'}</li>
          <li>{t.descriptionStep?.tip3 || 'Guest access: private entrance, shared spaces, parking'}</li>
          <li>{t.descriptionStep?.tip4 || 'What makes it special: views, history, recent renovation'}</li>
        </ul>
      </div>
    </div>
  );
}
