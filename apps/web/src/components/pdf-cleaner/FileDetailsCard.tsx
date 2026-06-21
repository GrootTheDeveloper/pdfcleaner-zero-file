'use client';

import React from 'react';
import { FileText, FileType2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useLanguage } from '../../context/LanguageContext';

interface FileDetailsCardProps {
  file: File;
  fileType: 'pdf' | 'image' | null;
  pdfPageCount: number | null;
  state: string;
  downloadUrl: string | null;
  pageRange: string;
  onPageRangeChange: (val: string) => void;
  onClear: () => void;
}

export const FileDetailsCard: React.FC<FileDetailsCardProps> = ({
  file,
  fileType,
  pdfPageCount,
  state,
  downloadUrl,
  pageRange,
  onPageRangeChange,
  onClear,
}) => {
  const { t } = useLanguage();
  const isIdleAndNotDownloaded = state === 'idle' && !downloadUrl;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Selected File Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-red/15 border border-accent-red/20 flex items-center justify-center text-accent-red">
            {fileType === 'pdf' ? (
              <FileText className="w-6 h-6" />
            ) : (
              <FileType2 className="w-6 h-6" />
            )}
          </div>
          <div className="min-w-0">
            <h3
              className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[280px] sm:max-w-md"
              title={file.name}
            >
              {file.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {(file.size / 1024 / 1024).toFixed(2)} MB • {fileType?.toUpperCase()}
              {fileType === 'pdf' &&
                pdfPageCount !== null &&
                ` • ${pdfPageCount} ${pdfPageCount === 1 ? 'Page' : 'Pages'}`}
            </p>
          </div>
        </div>
        {isIdleAndNotDownloaded && (
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-full cursor-pointer"
            onClick={onClear}
          >
            <X className="w-4 h-4 mr-1.5" />
            {t('changeFile')}
          </Button>
        )}
      </div>

      {/* Page Range Selection (PDF only) */}
      {isIdleAndNotDownloaded && fileType === 'pdf' && pdfPageCount !== null && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t('pageRangeTitle')}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t('pageRangeDesc')}</div>
          </div>
          <input
            type="text"
            placeholder={t('pageRangePlaceholder', { count: pdfPageCount })}
            value={pageRange}
            onChange={(e) => onPageRangeChange(e.target.value)}
            className="w-full sm:w-[260px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-2 px-4 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-accent-red/50 transition-all font-mono"
          />
        </div>
      )}
    </div>
  );
};
