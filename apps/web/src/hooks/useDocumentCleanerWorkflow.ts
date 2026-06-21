import React, { useCallback, useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { ProcessingConfig } from '@pdfcleaner/shared';
import { telemetryClient } from '../lib/telemetry-client';
import { useProcessingEngine, PageResult } from './useProcessingEngine';
import {
  createBlobFromImageData,
  createPDFFromImages,
  getPDFPageCount,
  loadImageToImageData,
  loadPDFImages,
  parsePageRange,
  validateFile,
} from '../utils/pdf-handler';
import { clearLocalHistory, getHistory, HistoryEntry, saveToHistory } from '../utils/local-db';
import { Language } from '../context/LanguageContext';

type FileType = 'pdf' | 'image';

type PageThumbnail = {
  original: string;
  processed: string | null;
};

interface UseDocumentCleanerWorkflowOptions {
  customConfig: ProcessingConfig;
  language: Language;
  maxFileSizeMb: number;
  maxPages: number;
  selectedMode: string;
}

function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

function getOutputExtension(file: File, fileType: FileType | null) {
  return fileType === 'pdf' ? '.pdf' : `.${file.name.split('.').pop()}`;
}

export function useDocumentCleanerWorkflow({
  customConfig,
  language,
  maxFileSizeMb,
  maxPages,
  selectedMode,
}: UseDocumentCleanerWorkflowOptions) {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType | null>(null);
  const [historyList, setHistoryList] = useState<HistoryEntry[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pageThumbnails, setPageThumbnails] = useState<PageThumbnail[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [zipDownloadUrl, setZipDownloadUrl] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState('');
  const [pageRange, setPageRange] = useState('');
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const {
    state,
    globalProgress,
    pageResults,
    processPages,
    cancel,
    error: engineError,
  } = useProcessingEngine();
  const prevPageResults = useRef<Record<string, PageResult>>({});
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const addLog = useCallback(
    (msg: string) => {
      const time = new Date().toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', {
        hour12: false,
      });
      setLogs((prev) => [...prev, `[${time}] ${msg}`]);
    },
    [language],
  );

  const resetOutput = useCallback(() => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    if (zipDownloadUrl) URL.revokeObjectURL(zipDownloadUrl);
    setDownloadUrl(null);
    setZipDownloadUrl(null);
  }, [downloadUrl, zipDownloadUrl]);

  const handleClearFile = useCallback(() => {
    cancel();
    resetOutput();
    setFile(null);
    setFileType(null);
    setValidationError(null);
    setPageThumbnails([]);
    setPageRange('');
    setPdfPageCount(null);
    setPreviewLoading(false);
    setLogs([]);
  }, [cancel, resetOutput]);

  useEffect(() => {
    Object.entries(pageResults).forEach(([pageId, res]) => {
      const prev = prevPageResults.current[pageId];
      if (!prev || prev.status !== res.status || prev.stage !== res.stage) {
        if (res.status === 'processing') {
          if (res.stage && res.stage !== 'waiting' && res.stage !== 'starting') {
            const stageName = res.stage.replace(/_/g, ' ');
            addLog(
              language === 'vi'
                ? `Trang ${pageId}: Đang thực hiện ${stageName}...`
                : `Page ${pageId}: Running ${stageName}...`,
            );
          }
        } else if (res.status === 'done' && prev?.status !== 'done') {
          addLog(
            language === 'vi'
              ? `Trang ${pageId}: Xử lý hoàn tất`
              : `Page ${pageId}: Processing completed`,
          );
        } else if (res.status === 'error' && prev?.status !== 'error') {
          addLog(
            language === 'vi'
              ? `Trang ${pageId}: Gặp lỗi: ${res.error}`
              : `Page ${pageId}: Encountered error: ${res.error}`,
          );
        }
      }
    });
    prevPageResults.current = pageResults;
  }, [pageResults, language, addLog]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    const loadHistory = async () => {
      const items = await getHistory();
      setHistoryList(items);
    };
    void loadHistory();
  }, []);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      if (zipDownloadUrl) URL.revokeObjectURL(zipDownloadUrl);
    };
  }, [downloadUrl, zipDownloadUrl]);

  const handleFileSelect = useCallback(
    async (selectedFile: File) => {
      setValidationError(null);
      resetOutput();
      setPageThumbnails([]);
      setPageRange('');

      const validation = await validateFile(selectedFile, maxFileSizeMb);
      if (!validation.valid) {
        setValidationError(validation.error || 'Invalid file selection.');
        return;
      }

      setFile(selectedFile);
      const type = validation.type || null;
      setFileType(type);
      setOutputFileName(`${selectedFile.name.replace(/\.[^/.]+$/, '')}_cleaned`);

      if (type === 'pdf') {
        try {
          setPdfPageCount(await getPDFPageCount(selectedFile));
        } catch (err: unknown) {
          console.error('Failed to read PDF page count', err);
          setPdfPageCount(null);
        }
      } else {
        setPdfPageCount(null);
      }

      setPreviewLoading(true);
      try {
        if (type === 'pdf') {
          const pagesInfo = await loadPDFImages(selectedFile, [1]);
          if (pagesInfo.length > 0) {
            setPageThumbnails([
              { original: imageDataToDataUrl(pagesInfo[0].imageData), processed: null },
            ]);
          }
        } else {
          const imageData = await loadImageToImageData(selectedFile);
          setPageThumbnails([{ original: imageDataToDataUrl(imageData), processed: null }]);
        }
        setActivePreviewIndex(0);
      } catch (err) {
        console.error('Failed to load immediate page preview', err);
      } finally {
        setPreviewLoading(false);
      }
    },
    [maxFileSizeMb, resetOutput],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        void handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleProcess = useCallback(async () => {
    if (!file || !fileType) return;

    setValidationError(null);
    setLogs([]);
    addLog(
      language === 'vi'
        ? `Bắt đầu xử lý tài liệu: ${file.name}`
        : `Started processing document: ${file.name}`,
    );
    const startTime = Date.now();

    try {
      let pagesToProcess: { pageId: string; imageData: ImageData }[] = [];
      const tempThumbnails: PageThumbnail[] = [];
      let targetPages: number[] = [1];

      if (fileType === 'pdf') {
        if (pdfPageCount) {
          if (pdfPageCount > maxPages) {
            throw new Error(
              `PDF contains too many pages (${pdfPageCount}). Maximum allowed is ${maxPages} pages.`,
            );
          }
          const rangeResult = parsePageRange(pageRange, pdfPageCount);
          if (rangeResult.error) throw new Error(rangeResult.error);
          targetPages = rangeResult.pages;
        }

        addLog(
          language === 'vi'
            ? `Đang giải nén và nạp dữ liệu cho ${targetPages.length} trang...`
            : `Extracting and loading image data for ${targetPages.length} pages...`,
        );
        const pagesInfo = await loadPDFImages(file, targetPages);
        pagesToProcess = pagesInfo.map((page) => ({
          pageId: page.pageNumber.toString(),
          imageData: page.imageData,
        }));
        pagesInfo.forEach((page) =>
          tempThumbnails.push({ original: imageDataToDataUrl(page.imageData), processed: null }),
        );
      } else {
        addLog(
          language === 'vi' ? `Đang nạp ảnh: ${file.name}...` : `Loading image: ${file.name}...`,
        );
        const imageData = await loadImageToImageData(file);
        pagesToProcess = [{ pageId: '1', imageData }];
        tempThumbnails.push({ original: imageDataToDataUrl(imageData), processed: null });
      }

      setPageThumbnails(tempThumbnails);
      setActivePreviewIndex(0);

      addLog(
        language === 'vi'
          ? 'Đang gửi dữ liệu đến luồng Web Worker...'
          : 'Sending image data to Web Worker thread...',
      );
      const cleanedImages = await processPages(pagesToProcess, customConfig);

      const updatedThumbnails = [...tempThumbnails];
      cleanedImages.forEach((imageData, idx) => {
        updatedThumbnails[idx].processed = imageDataToDataUrl(imageData);
      });
      setPageThumbnails(updatedThumbnails);

      addLog(
        language === 'vi'
          ? 'Đang biên dịch và xuất tài liệu kết quả...'
          : 'Compiling and generating output document...',
      );
      const compiledBlob =
        fileType === 'pdf'
          ? await createPDFFromImages(cleanedImages, customConfig.jpegQuality / 100)
          : await createBlobFromImageData(
              cleanedImages[0],
              file.name.split('.').pop()?.toLowerCase() === 'png' ? 'image/png' : 'image/jpeg',
              customConfig.jpegQuality / 100,
            );

      const url = URL.createObjectURL(compiledBlob);
      setDownloadUrl(url);

      addLog(
        language === 'vi'
          ? 'Đang nén hình ảnh thành tệp ZIP...'
          : 'Compressing processed images to ZIP file...',
      );
      const zip = new JSZip();
      const zipFolder = zip.folder('cleaned_images');

      for (let i = 0; i < cleanedImages.length; i++) {
        const imageData = cleanedImages[i];
        const pageNum = fileType === 'pdf' ? targetPages[i] : 1;
        const ext = fileType === 'pdf' ? 'jpg' : file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
        const imageBlob = await createBlobFromImageData(
          imageData,
          mime,
          customConfig.jpegQuality / 100,
        );
        zipFolder?.file(`page_${String(pageNum).padStart(3, '0')}.${ext}`, imageBlob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      setZipDownloadUrl(URL.createObjectURL(zipBlob));

      await saveToHistory({
        fileName: file.name,
        fileSize: file.size,
        pagesProcessed: pagesToProcess.length,
        pdfBlob: compiledBlob,
        zipBlob,
      });
      setHistoryList(await getHistory());

      addLog(
        language === 'vi'
          ? 'Hoàn thành! Tài liệu sạch đã sẵn sàng tải xuống.'
          : 'Success! Cleaned document is ready for download.',
      );

      void telemetryClient.logTelemetry({
        mode: selectedMode,
        pagesProcessed: pagesToProcess.length,
        pagesSkipped: Object.values(pageResults).filter((result) => result.status === 'error')
          .length,
        durationMs: Date.now() - startTime,
        outputSizeBytes: compiledBlob.size,
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected processing error occurred';
      const stack = err instanceof Error ? err.stack : undefined;
      console.error('Processing failed', err);
      setValidationError(errorMessage);
      addLog(language === 'vi' ? `Lỗi: ${errorMessage}` : `Error: ${errorMessage}`);

      void telemetryClient.logError({
        errorCode: 'PROCESSING_FAILED',
        errorMessage,
        stackTrace: stack,
        mode: selectedMode,
      });
    }
  }, [
    addLog,
    customConfig,
    file,
    fileType,
    language,
    maxPages,
    pageRange,
    pageResults,
    pdfPageCount,
    processPages,
    selectedMode,
  ]);

  const triggerDownload = useCallback(() => {
    if (!downloadUrl || !file) return;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${outputFileName}${getOutputExtension(file, fileType)}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [downloadUrl, file, fileType, outputFileName]);

  const triggerZipDownload = useCallback(() => {
    if (!zipDownloadUrl || !file) return;
    const link = document.createElement('a');
    link.href = zipDownloadUrl;
    link.download = `${outputFileName}_images.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [file, outputFileName, zipDownloadUrl]);

  const clearHistory = useCallback(async () => {
    await clearLocalHistory();
    setHistoryList([]);
  }, []);

  return {
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
  };
}
