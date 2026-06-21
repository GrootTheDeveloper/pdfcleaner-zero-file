'use client';

import React, { useEffect, useState } from 'react';
import { Download, Loader2, X, RefreshCw, AlertCircle, Eye } from 'lucide-react';
import { DEFAULT_CONFIG, ProcessingConfig } from '@pdfcleaner/shared';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { apiClient } from '../lib/api-client';
import { mergePresetConfig } from '../lib/default-presets';
import { useDocumentCleanerWorkflow } from '../hooks/useDocumentCleanerWorkflow';
import { usePresetManager } from '../hooks/usePresetManager';

import { Dropzone } from './pdf-cleaner/Dropzone';
import { FileDetailsCard } from './pdf-cleaner/FileDetailsCard';
import { PresetSelector } from './pdf-cleaner/PresetSelector';
import { AdvancedSettingsPanel } from './pdf-cleaner/AdvancedSettingsPanel';
import { ConsoleLogs } from './pdf-cleaner/ConsoleLogs';
import { DocumentHistoryList } from './pdf-cleaner/DocumentHistoryList';
import { ComparePreviewModal } from './pdf-cleaner/ComparePreviewModal';
import { SavePresetModal } from './pdf-cleaner/SavePresetModal';

interface PDFCleanerAppProps {
  onFileChange?: (file: File | null) => void;
  resetTrigger?: number;
}

export default function PDFCleanerApp({ onFileChange, resetTrigger }: PDFCleanerAppProps) {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<string>('light-clean');
  const [customConfig, setCustomConfig] = useState<ProcessingConfig>(DEFAULT_CONFIG);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [maxPages, setMaxPages] = useState(100);
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(200);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const { presets, saveLoading, savePreset, deletePreset } = usePresetManager(user);

  const workflow = useDocumentCleanerWorkflow({
    customConfig,
    language,
    maxFileSizeMb,
    maxPages,
    selectedMode,
  });

  const {
    activePreviewIndex,
    clearHistory,
    downloadUrl,
    engineError,
    file,
    fileType,
    globalProgress,
    handleClearFile,
    handleDrop,
    handleFileSelect,
    handleProcess,
    historyList,
    logContainerRef,
    logs,
    outputFileName,
    pageRange,
    pageResults,
    pageThumbnails,
    pdfPageCount,
    previewLoading,
    setActivePreviewIndex,
    setOutputFileName,
    setPageRange,
    setValidationError,
    state,
    triggerDownload,
    triggerZipDownload,
    validationError,
    zipDownloadUrl,
    cancel,
  } = workflow;

  useEffect(() => {
    onFileChange?.(file);
  }, [file, onFileChange]);

  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      handleClearFile();
    }
  }, [resetTrigger, handleClearFile]);

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const config = await apiClient.get<Record<string, number>>('/engine-config/LIMITS');
        if (config && typeof config === 'object') {
          if (config.MAX_FILE_SIZE_MB) setMaxFileSizeMb(Number(config.MAX_FILE_SIZE_MB));
          if (config.MAX_PAGES) setMaxPages(Number(config.MAX_PAGES));
        }
      } catch {
        // Offline mode falls back to built-in limits.
      }
    };

    void fetchLimits();
  }, []);

  const handleConfigChange = (key: keyof ProcessingConfig, value: unknown) => {
    setSelectedMode('custom');
    setCustomConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    try {
      await savePreset(newPresetName, customConfig);
      setIsSaveModalOpen(false);
      setNewPresetName('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save preset';
      alert(message);
    }
  };

  const handleDeletePreset = async (e: React.MouseEvent, presetId: string) => {
    e.stopPropagation();
    if (
      !confirm(
        language === 'vi'
          ? 'Bạn có chắc chắn muốn xóa chế độ tùy chỉnh này?'
          : 'Are you sure you want to delete this custom preset?',
      )
    )
      return;

    try {
      await deletePreset(presetId);
      setSelectedMode('light-clean');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete preset';
      alert(message);
    }
  };

  return (
    <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="w-full bg-card-bg border border-card-border rounded-3xl p-5 sm:p-6 shadow-[0_8px_30px_rgb(238,230,220,0.45)] dark:shadow-none flex flex-col relative">
          {!file ? (
            <Dropzone onDrop={handleDrop} onFileSelect={handleFileSelect} />
          ) : (
            <div className="w-full flex flex-col gap-6">
              <FileDetailsCard
                file={file}
                fileType={fileType}
                pdfPageCount={pdfPageCount}
                state={state}
                downloadUrl={downloadUrl}
                pageRange={pageRange}
                onPageRangeChange={(val) => {
                  setPageRange(val);
                  setValidationError(null);
                }}
                onClear={handleClearFile}
              />

              {state === 'idle' && !downloadUrl && (
                <div className="flex flex-col gap-5 border-t border-slate-100 dark:border-slate-800 pt-5">
                  <PresetSelector
                    presets={presets}
                    selectedMode={selectedMode}
                    onSelectPreset={(presetId, config) => {
                      setSelectedMode(presetId);
                      setCustomConfig(mergePresetConfig(config));
                    }}
                    onDeletePreset={handleDeletePreset}
                  />

                  <AdvancedSettingsPanel
                    customConfig={customConfig}
                    onConfigChange={handleConfigChange}
                    showAdvanced={showAdvanced}
                    user={user}
                    onSavePresetClick={() => setIsSaveModalOpen(true)}
                  />
                </div>
              )}

              {state !== 'idle' && (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
                      <Loader2 className="w-4 h-4 text-accent-red animate-spin" />
                      {state === 'initializing' ? t('activatingWasm') : t('processing')}
                    </div>
                    <span className="font-mono font-bold text-accent-red text-base">
                      {Math.round(globalProgress)}%
                    </span>
                  </div>

                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300/40 dark:border-slate-800 p-[1.5px]">
                    <div
                      className="h-full bg-gradient-to-r from-accent-red to-accent-dark-red rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${globalProgress}%` }}
                    />
                  </div>

                  <div className="max-h-[140px] overflow-y-auto mt-2 space-y-1.5 pr-2 custom-scrollbar text-xs">
                    {Object.entries(pageResults).map(([pageId, res]) => (
                      <div
                        key={pageId}
                        className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800 last:border-0"
                      >
                        <span className="text-slate-500 dark:text-slate-400">Page {pageId}</span>
                        <span
                          className={`font-semibold ${
                            res.status === 'done'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : res.status === 'processing'
                                ? 'text-accent-red'
                                : res.status === 'error'
                                  ? 'text-accent-red'
                                  : 'text-slate-400'
                          }`}
                        >
                          {res.status === 'done'
                            ? t('pageStatusCompleted')
                            : res.status === 'processing'
                              ? `${res.stage.replace('_', ' ')} (${Math.round(res.progress)}%)`
                              : res.status === 'error'
                                ? `Failed: ${res.error}`
                                : t('pageStatusQueued')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(validationError || engineError) && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-sm rounded-xl flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <div>
                    <span className="font-bold">Error:</span> {validationError || engineError}
                  </div>
                </div>
              )}
            </div>
          )}

          {file && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-5 border-t border-card-border">
              <div>
                {downloadUrl && state === 'idle' && file ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">
                      {t('saveFileAs')}
                    </span>
                    <input
                      type="text"
                      value={outputFileName}
                      onChange={(e) =>
                        setOutputFileName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))
                      }
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-accent-red/50 max-w-[180px]"
                    />
                    <span className="text-slate-400 dark:text-slate-500 font-mono font-bold">
                      {fileType === 'pdf' ? '.pdf' : `.${file.name.split('.').pop()}`}
                    </span>
                  </div>
                ) : (
                  <span className="text-status-text font-bold text-sm tracking-wide">
                    {state === 'initializing' && t('activatingWasm')}
                    {state === 'processing' && t('processing')}
                    {state === 'done' && t('completed')}
                    {state === 'error' && t('processingFailed')}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2.5 w-full sm:w-auto justify-end">
                {state === 'idle' && !downloadUrl && file && (
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="px-5 py-2 text-sm font-bold rounded-xl border border-amber-300 bg-amber-50/40 dark:border-amber-500/25 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100/50 dark:hover:bg-amber-500/20 transition-all cursor-pointer shadow-sm"
                  >
                    {t('settings')}
                  </button>
                )}

                {file && (
                  <button
                    onClick={() => setIsPreviewModalOpen(true)}
                    className="px-5 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    {t('previewBtn')}
                  </button>
                )}

                {state === 'idle' && file && (
                  <button
                    onClick={handleClearFile}
                    className="px-5 py-2 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
                  >
                    {t('clearFile')}
                  </button>
                )}

                <div className="flex gap-2 w-full sm:w-auto">
                  {state === 'idle' && !downloadUrl ? (
                    <button
                      onClick={handleProcess}
                      className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-white bg-accent-red hover:bg-accent-red/90 rounded-xl transition-all shadow-md shadow-accent-red/10 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      {t('startProcessing')}
                    </button>
                  ) : state === 'done' || downloadUrl ? (
                    <div className="flex gap-2 w-full sm:w-auto">
                      {zipDownloadUrl && (
                        <button
                          onClick={triggerZipDownload}
                          className="px-5 py-2 text-sm font-bold text-white bg-accent-red hover:bg-accent-red/90 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {t('downloadZip')}
                        </button>
                      )}
                      <button
                        onClick={triggerDownload}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {t('downloadFile')}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={cancel}
                      className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-white bg-accent-red hover:bg-accent-red/90 rounded-xl cursor-pointer flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      {t('cancel')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-5 flex flex-col gap-6">
        <ConsoleLogs logs={logs} state={state} containerRef={logContainerRef} />

        <DocumentHistoryList
          historyList={historyList}
          onClearHistory={async () => {
            if (
              confirm(
                language === 'vi'
                  ? 'Bạn có chắc chắn muốn xóa lịch sử không?'
                  : 'Are you sure you want to clear history?',
              )
            ) {
              await clearHistory();
            }
          }}
        />
      </div>

      <SavePresetModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        newPresetName={newPresetName}
        onPresetNameChange={setNewPresetName}
        onSave={handleSavePreset}
        saveLoading={saveLoading}
      />

      <ComparePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        file={file}
        pageThumbnails={pageThumbnails}
        activePreviewIndex={activePreviewIndex}
        setActivePreviewIndex={setActivePreviewIndex}
        previewLoading={previewLoading}
        state={state}
      />
    </div>
  );
}
