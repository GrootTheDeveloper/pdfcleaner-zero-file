'use client';

import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button } from '../ui/button';

interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  newPresetName: string;
  onPresetNameChange: (val: string) => void;
  onSave: (e: React.FormEvent) => void;
  saveLoading: boolean;
}

export const SavePresetModal: React.FC<SavePresetModalProps> = ({
  isOpen,
  onClose,
  newPresetName,
  onPresetNameChange,
  onSave,
  saveLoading,
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 dark:bg-slate-950/65 backdrop-blur-md"
        onClick={onClose}
      />
      <form
        onSubmit={onSave}
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-slate-800 dark:text-slate-100 shadow-2xl backdrop-blur-xl z-50"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-bold mb-4">{t('saveAsPreset')}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              {t('presetNameLabel')}
            </label>
            <input
              type="text"
              required
              placeholder={t('presetNamePlaceholder')}
              value={newPresetName}
              onChange={(e) => onPresetNameChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2.5 px-4 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-accent-red/50 transition-all"
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              {t('cancel')}
            </button>
            <Button
              type="submit"
              disabled={saveLoading}
              className="bg-accent-red hover:bg-accent-red/90 text-white font-bold text-xs rounded-xl px-5 py-2 shadow-md shadow-accent-red/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveLoading && <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
              {t('save')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
