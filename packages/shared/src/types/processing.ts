export type ProcessingMode =
  | 'light-clean'
  | 'strong-background-removal'
  | 'text-contrast-boost'
  | 'print-optimized'
  | 'compressed-output'
  | 'custom';

export type ProcessingConfig = {
  mode: ProcessingMode;
  dpi: number;                    // 150 | 200 | 300, default 200
  jpegQuality: number;            // 70-95, default 85
  grayscale: boolean;             // default true
  gamma: number;                  // 0.5-2.0, default 1.0
  contrast: number;               // 0.5-2.0, default 1.2
  thresholdBlockSize?: number;    // odd number, 11-51, default 21
  thresholdC?: number;            // 2-15, default 5
  blurKernelSize?: number;        // odd number, 3-7, default 3
  blurType?: 'gaussian' | 'median'; // default 'median'
  morphologyKernelSize?: number;  // odd number, 1-5, default 2
  enableNoiseReduction: boolean;  // default true
  enableDeskew?: boolean;         // default false
  enableBackgroundNorm: boolean;  // default true
  enableThresholding: boolean;    // default true (false for light-clean)
  enableMorphology: boolean;      // default true
};

export type ProcessingStep =
  | 'grayscale'
  | 'noise-reduction'
  | 'background-normalization'
  | 'contrast-enhancement'
  | 'thresholding'
  | 'morphology'
  | 'encoding';

export type WorkerCapabilities = {
  opencv: boolean;
  offscreenCanvas: boolean;
};

// Main Thread -> Worker
export type MainToWorkerMessage =
  | { type: 'INIT'; opencvUrl: string; config: ProcessingConfig }
  | { type: 'PROCESS_PAGE'; pageIndex: number; imageData: ArrayBuffer; width: number; height: number }
  | { type: 'CANCEL' }
  | { type: 'UPDATE_CONFIG'; config: ProcessingConfig };

// Worker -> Main Thread
export type WorkerToMainMessage =
  | { type: 'INIT_DONE'; capabilities: WorkerCapabilities }
  | { type: 'INIT_FAILED'; error: string; fallbackAvailable: boolean }
  | { type: 'PAGE_DONE'; pageIndex: number; resultData: ArrayBuffer; width: number; height: number }
  | { type: 'PAGE_FAILED'; pageIndex: number; errorCode: string; errorMessage: string }
  | { type: 'PROGRESS'; pageIndex: number; step: ProcessingStep; percentOfPage: number }
  | { type: 'CANCELLED'; lastCompletedPage: number }
  | { type: 'MEMORY_WARNING'; heapUsedMB: number; heapLimitMB: number };
