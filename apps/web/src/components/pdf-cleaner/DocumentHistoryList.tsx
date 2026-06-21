'use client';

import React from 'react';
import { History } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { HistoryEntry } from '../../utils/local-db';

interface DocumentHistoryListProps {
  historyList: HistoryEntry[];
  onClearHistory: () => void;
}

export const DocumentHistoryList: React.FC<DocumentHistoryListProps> = ({
  historyList,
  onClearHistory,
}) => {
  const { t, language } = useLanguage();

  if (historyList.length === 0) return null;

  const handleDownloadFile = (item: HistoryEntry) => {
    const url = URL.createObjectURL(item.pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    const ext = item.fileName.split('.').pop()?.toLowerCase();
    a.download = `${item.fileName.replace(/\.[^/.]+$/, '')}_cleaned.${ext || 'pdf'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = (item: HistoryEntry) => {
    if (!item.zipBlob) return;
    const url = URL.createObjectURL(item.zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.fileName.replace(/\.[^/.]+$/, '')}_cleaned_images.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full bg-card-bg border border-card-border rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(238,230,220,0.45)] dark:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-accent-red" />
          {t('localHistoryTitle')}
        </h3>
        <button
          onClick={onClearHistory}
          className="text-xs text-accent-red hover:text-accent-red/80 font-bold cursor-pointer"
        >
          {t('clearHistory')}
        </button>
      </div>
      <div className="space-y-3">
        {historyList.map((item) => (
          <div
            key={item.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
          >
            <div className="min-w-0">
              <div
                className="font-bold text-sm text-slate-700 dark:text-slate-300 truncate max-w-[240px] sm:max-w-md"
                title={item.fileName}
              >
                {item.fileName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {(item.fileSize / 1024 / 1024).toFixed(2)} MB • {item.pagesProcessed}{' '}
                {item.pagesProcessed === 1 ? 'Page' : 'Pages'} •{' '}
                {t('processedOn', {
                  date: new Date(item.timestamp).toLocaleString(
                    language === 'vi' ? 'vi-VN' : 'en-US',
                  ),
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDownloadFile(item)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
              >
                {t('downloadFile')}
              </button>
              {item.zipBlob && (
                <button
                  onClick={() => handleDownloadZip(item)}
                  className="px-4 py-1.5 rounded-xl bg-accent-red hover:bg-accent-red/90 text-white font-semibold text-xs transition-all cursor-pointer shadow-sm"
                >
                  {t('downloadZip')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
