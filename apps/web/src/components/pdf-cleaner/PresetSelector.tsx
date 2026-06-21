'use client';

import React from 'react';
import { Sliders, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { ProcessingConfig } from '@pdfcleaner/shared';

export interface UIPreset {
  id: string;
  name: string;
  config: ProcessingConfig;
  desc: string;
  isPublic: boolean;
  isUserOwned: boolean;
}

interface PresetSelectorProps {
  presets: UIPreset[];
  selectedMode: string;
  onSelectPreset: (presetId: string, config: ProcessingConfig) => void;
  onDeletePreset: (e: React.MouseEvent, id: string) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  presets,
  selectedMode,
  onSelectPreset,
  onDeletePreset,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
          <Sliders className="w-4 h-4 text-accent-red" />
          {t('presetTitle')}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {presets.map((p) => {
          const presetName = t(`preset_name_${p.id}`) || p.name;
          const presetDesc = t(`preset_desc_${p.id}`) || p.desc;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p.id, p.config)}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                selectedMode === p.id
                  ? 'border-accent-red bg-accent-red/5 dark:bg-accent-red/10'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
              }`}
            >
              <div className="font-bold text-sm text-slate-800 dark:text-slate-200 pr-6 truncate">
                {presetName}
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                {presetDesc}
              </div>
              {p.isUserOwned && (
                <button
                  onClick={(e) => onDeletePreset(e, p.id)}
                  className="absolute top-2.5 right-2.5 p-1 rounded-md text-slate-400 hover:text-accent-red hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
