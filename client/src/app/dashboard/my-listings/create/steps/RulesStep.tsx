'use client';

import { useState } from 'react';
import { Plus, X, CigaretteOff, Dog, PartyPopper, Baby, Shield } from 'lucide-react';
import { CreateListingFormData, CANCELLATION_POLICIES } from '../types';

interface Props {
  formData: CreateListingFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateListingFormData>>;
  t: any;
}

const RULE_ICONS: Record<string, any> = {
  smoking: CigaretteOff,
  pets: Dog,
  parties: PartyPopper,
  children: Baby,
};

export default function RulesStep({ formData, setFormData, t }: Props) {
  const [newRule, setNewRule] = useState('');

  const toggleRule = (rule: string) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        [rule]: prev.rules[rule as keyof typeof prev.rules] === 'allowed' ? 'not_allowed' : 'allowed',
      },
    }));
  };

  const addCustomRule = () => {
    if (newRule.trim()) {
      setFormData(prev => ({
        ...prev,
        rules: {
          ...prev.rules,
          additionalRules: [...prev.rules.additionalRules, newRule.trim()],
        },
      }));
      setNewRule('');
    }
  };

  const removeCustomRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        additionalRules: prev.rules.additionalRules.filter((_, i) => i !== index),
      },
    }));
  };

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
        {t.rules?.title || 'House rules'}
      </h1>
      <p className="text-lg text-gray-500 mb-8">
        {t.rules?.subtitle || 'Set clear expectations for your guests.'}
      </p>

      {/* Rule Cards */}
      <div className="space-y-3 mb-8">
        {(['smoking', 'pets', 'parties', 'children'] as const).map(rule => {
          const Icon = RULE_ICONS[rule] || Shield;
          const isAllowed = formData.rules[rule] === 'allowed';
          return (
            <button
              key={rule}
              type="button"
              onClick={() => toggleRule(rule)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 transition-all text-left ${
                isAllowed
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <Icon className={`w-6 h-6 flex-shrink-0 ${isAllowed ? 'text-green-600' : 'text-gray-400'}`} />
              <div className="flex-1">
                <span className="text-base font-medium text-gray-900">
                  {t.rules?.items?.[rule] || rule}
                </span>
              </div>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                isAllowed
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {isAllowed
                  ? (t.rules?.allowed || 'Allowed')
                  : (t.rules?.notAllowed || 'Not allowed')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cancellation Policy */}
      <div className="mb-8">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          {t.rules?.cancellationTitle || 'Cancellation policy'}
        </h3>
        <div className="space-y-3">
          {CANCELLATION_POLICIES.map(policy => (
            <button
              key={policy}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, cancellationPolicy: policy }))}
              className={`w-full flex items-start gap-4 px-5 py-4 rounded-xl border-2 transition-all text-left ${
                formData.cancellationPolicy === policy
                  ? 'border-[#FF6B35] bg-orange-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                formData.cancellationPolicy === policy ? 'border-[#FF6B35]' : 'border-gray-300'
              }`}>
                {formData.cancellationPolicy === policy && (
                  <div className="w-3 h-3 rounded-full bg-[#FF6B35]" />
                )}
              </div>
              <div>
                <span className="text-base font-medium text-gray-900">
                  {t.rules?.cancellation?.[policy]?.label || policy}
                </span>
                <p className="text-sm text-gray-500 mt-0.5">
                  {t.rules?.cancellation?.[policy]?.description || ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Rules */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          {t.rules?.customRules || 'Additional rules'}
        </h3>

        {formData.rules.additionalRules.length > 0 && (
          <div className="space-y-2 mb-4">
            {formData.rules.additionalRules.map((rule, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl">
                <span className="text-sm text-gray-700 flex-1">{rule}</span>
                <button
                  type="button"
                  onClick={() => removeCustomRule(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newRule}
            onChange={e => setNewRule(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomRule(); } }}
            placeholder={t.rules?.customRulePlaceholder || 'Add a custom rule...'}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FF6B35] focus:border-[#FF6B35] outline-none text-sm"
          />
          <button
            type="button"
            onClick={addCustomRule}
            disabled={!newRule.trim()}
            className="px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
