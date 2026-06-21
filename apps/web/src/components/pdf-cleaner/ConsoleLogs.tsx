'use client';

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface ConsoleLogsProps {
  logs: string[];
  state: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const ConsoleLogs: React.FC<ConsoleLogsProps> = ({ logs, state, containerRef }) => {
  const { t } = useLanguage();

  return (
    <div className="w-full bg-card-bg border border-card-border rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(238,230,220,0.45)] dark:shadow-none flex flex-col gap-3">
      <h3 className="text-xs font-extrabold text-accent-dark-red uppercase tracking-wider">
        {t('processLog')}
      </h3>
      <div
        ref={containerRef}
        className="w-full bg-log-bg border border-card-border rounded-xl p-4 min-h-[120px] max-h-[220px] overflow-y-auto font-mono text-xs text-slate-700 dark:text-slate-300"
      >
        {state === 'idle' && logs.length === 0 ? (
          <p className="italic text-slate-400 dark:text-slate-500">{t('logPlaceholder')}</p>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div key={index} className="leading-relaxed whitespace-pre-wrap">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
