'use client';

import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface DropzoneProps {
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (file: File) => void;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onDrop, onFileSelect }) => {
  const { t } = useLanguage();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-center">
      <div
        onDrop={onDrop}
        onDragOver={handleDragOver}
        className="w-full h-[148px] border-2 border-dashed border-dropzone-border hover:border-accent-red/80 hover:bg-dropzone-bg-hover rounded-2xl bg-dropzone-bg flex flex-col items-center justify-center transition-all duration-300 cursor-pointer group"
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <p className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-200 text-center px-4">
          {t('dragDropText')}
        </p>
        <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1">
          {t('orBrowse')}
        </p>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleInputChange}
        />
      </div>
    </div>
  );
};
