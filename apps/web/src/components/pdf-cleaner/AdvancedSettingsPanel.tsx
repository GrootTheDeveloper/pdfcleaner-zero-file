'use client';

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ProcessingConfig } from '@pdfcleaner/shared';
import { Button } from '../ui/button';
import { User } from '../../hooks/useAuth';

interface AdvancedSettingsPanelProps {
  customConfig: ProcessingConfig;
  onConfigChange: (key: keyof ProcessingConfig, value: boolean | number | string) => void;
  showAdvanced: boolean;
  user: User | null;
  onSavePresetClick: () => void;
}

export const AdvancedSettingsPanel: React.FC<AdvancedSettingsPanelProps> = ({
  customConfig,
  onConfigChange,
  showAdvanced,
  user,
  onSavePresetClick,
}) => {
  const { t } = useLanguage();

  if (!showAdvanced) return null;

  return (
    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
      {/* Grayscale Toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
        <div>
          <div className="font-semibold text-slate-700 dark:text-slate-300">
            {t('grayscaleLabel')}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('grayscaleDesc')}
          </div>
        </div>
        <input
          type="checkbox"
          checked={customConfig.grayscale}
          onChange={(e) => onConfigChange('grayscale', e.target.checked)}
          className="w-4 h-4 accent-accent-red bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 cursor-pointer"
        />
      </div>

      {/* Deskew Toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
        <div>
          <div className="font-semibold text-slate-700 dark:text-slate-300">{t('deskewLabel')}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t('deskewDesc')}</div>
        </div>
        <input
          type="checkbox"
          checked={customConfig.enableDeskew}
          onChange={(e) => onConfigChange('enableDeskew', e.target.checked)}
          className="w-4 h-4 accent-accent-red bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 cursor-pointer"
        />
      </div>

      {/* Gamma Slider */}
      <div className="flex flex-col gap-1.5 p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium">{t('gammaLabel')}</span>
          <span className="font-mono text-accent-red font-bold">
            {customConfig.gamma.toFixed(1)}x
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={customConfig.gamma}
          onChange={(e) => onConfigChange('gamma', parseFloat(e.target.value))}
          className="w-full accent-accent-red h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Contrast Slider */}
      <div className="flex flex-col gap-1.5 p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium">{t('contrastLabel')}</span>
          <span className="font-mono text-accent-red font-bold">
            {customConfig.contrast.toFixed(1)}x
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={customConfig.contrast}
          onChange={(e) => onConfigChange('contrast', parseFloat(e.target.value))}
          className="w-full accent-accent-red h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* JPEG Quality Slider */}
      <div className="flex flex-col gap-1.5 p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium">{t('jpegQualityLabel')}</span>
          <span className="font-mono text-accent-red font-bold">{customConfig.jpegQuality}%</span>
        </div>
        <input
          type="range"
          min="60"
          max="100"
          step="5"
          value={customConfig.jpegQuality}
          onChange={(e) => onConfigChange('jpegQuality', parseInt(e.target.value))}
          className="w-full accent-accent-red h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Background Block size Slider */}
      <div className="flex flex-col gap-1.5 p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium">{t('normKernelLabel')}</span>
          <span className="font-mono text-accent-red font-bold">
            {customConfig.normKernelSize || 25}px
          </span>
        </div>
        <input
          type="range"
          min="15"
          max="51"
          step="2"
          value={customConfig.normKernelSize || 25}
          onChange={(e) => onConfigChange('normKernelSize', parseInt(e.target.value))}
          className="w-full accent-accent-red h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Text Stroke Thickness Slider */}
      {customConfig.enableThresholding && (
        <div className="flex flex-col gap-1.5 p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">{t('thresholdCLabel')}</span>
            <span className="font-mono text-accent-red font-bold">
              {customConfig.thresholdC !== undefined ? customConfig.thresholdC : 5}
            </span>
          </div>
          <input
            type="range"
            min="2"
            max="20"
            step="1"
            value={customConfig.thresholdC !== undefined ? customConfig.thresholdC : 5}
            onChange={(e) => onConfigChange('thresholdC', parseInt(e.target.value))}
            className="w-full accent-accent-red h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      )}

      {/* Save Preset Button block */}
      <div className="md:col-span-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {user ? t('saveAsPresetLogged') : t('saveAsPresetUnlogged')}
        </div>
        <Button
          size="sm"
          disabled={!user}
          onClick={onSavePresetClick}
          className="bg-accent-red hover:bg-accent-red/90 text-white font-medium text-xs rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 shadow-sm"
        >
          {t('saveAsPreset')}
        </Button>
      </div>
    </div>
  );
};
