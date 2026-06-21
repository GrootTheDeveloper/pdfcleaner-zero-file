'use client';

import React from 'react';
import { Eye, X, Loader2, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface ComparePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  pageThumbnails: { original: string; processed: string | null }[];
  activePreviewIndex: number;
  setActivePreviewIndex: (idx: number) => void;
  previewLoading: boolean;
  state: string;
}

export const ComparePreviewModal: React.FC<ComparePreviewModalProps> = ({
  isOpen,
  onClose,
  file,
  pageThumbnails,
  activePreviewIndex,
  setActivePreviewIndex,
  previewLoading,
  state,
}) => {
  const { t } = useLanguage();

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 dark:bg-slate-950/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-slate-700 dark:text-slate-100 shadow-2xl backdrop-blur-xl flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Eye className="w-5 h-5 text-accent-red" />
          {t('previewModalTitle')}
        </h2>

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 overflow-y-auto pr-1 flex-1">
          {/* Thumbnails Pager */}
          <div className="md:col-span-1 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col gap-3 max-h-[220px] md:max-h-full">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('pagesTitle')}
            </span>
            <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 pr-1">
              {pageThumbnails.map((thumb, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePreviewIndex(idx)}
                  className={`flex items-center gap-3 p-2 rounded-xl text-left border transition-all shrink-0 md:shrink cursor-pointer ${
                    activePreviewIndex === idx
                      ? 'border-accent-red bg-accent-red/10 text-accent-red font-bold'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-white dark:hover:bg-slate-800 text-slate-500'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb.original}
                    className="w-10 h-12 object-cover rounded border border-slate-200 dark:border-slate-800"
                    alt=""
                  />
                  <div className="text-[11px] hidden sm:block">
                    <div className="font-bold text-slate-700 dark:text-slate-300">
                      Page {idx + 1}
                    </div>
                    <div className="text-slate-400 mt-0.5">{t('clickCompare')}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Compare side-by-side layout (shows full pages) */}
          <div className="md:col-span-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/30 flex flex-col items-center gap-4 flex-1">
            <div className="flex items-center justify-between w-full border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t('pagePreviewTitle', { num: activePreviewIndex + 1 })}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full flex-1 items-stretch justify-center min-h-[300px]">
              {/* Left: Original Page */}
              <div className="flex-1 flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                  {t('originalBadge')}
                </span>
                <div className="relative flex-1 flex justify-center items-center min-h-[240px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pageThumbnails[activePreviewIndex]?.original}
                    className="max-w-full max-h-[350px] object-contain rounded shadow-sm"
                    alt="Original"
                  />
                </div>
              </div>

              {/* Right: Processed Page */}
              <div className="flex-1 flex flex-col gap-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                <span className="text-xs font-bold text-accent-red uppercase tracking-wider text-center">
                  {t('processedBadge')}
                </span>
                <div className="relative flex-1 flex justify-center items-center min-h-[240px]">
                  {pageThumbnails[activePreviewIndex]?.processed ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={pageThumbnails[activePreviewIndex].processed!}
                      className="max-w-full max-h-[350px] object-contain rounded shadow-sm"
                      alt="Processed"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs p-4 gap-2 text-center">
                      {previewLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-accent-red" />
                          <span>{t('previewLoading')}</span>
                        </>
                      ) : state === 'processing' || state === 'initializing' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin text-accent-red" />
                          <span>{t('processing')}</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-5 h-5 text-slate-300 dark:text-slate-700 animate-pulse mb-1" />
                          <span className="text-slate-400 max-w-[150px] font-medium leading-normal">
                            {t('clickToProcess')}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
