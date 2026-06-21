export type ProcessingMode =
  | 'light-clean'
  | 'strong-background-removal'
  | 'text-contrast-boost'
  | 'print-optimized'
  | 'heavy-noise-reduction'
  | 'color-preservation'
  | 'custom';

export type ProcessingConfig = {
  mode: ProcessingMode;
  dpi: number; // 150 | 200 | 300, default 200
  jpegQuality: number; // 70-95, default 85
  grayscale: boolean; // default true
  gamma: number; // 0.5-2.0, default 1.0
  contrast: number; // 0.5-2.0, default 1.2
  thresholdBlockSize?: number; // odd number, 11-51, default 21
  thresholdC?: number; // 2-15, default 5
  blurKernelSize?: number; // odd number, 3-7, default 3
  blurType?: 'gaussian' | 'median'; // default 'median'
  morphologyKernelSize?: number; // odd number, 1-5, default 2
  morphType?: 'open' | 'close'; // default 'open'
  normKernelSize?: number; // background normalization kernel size, default 25
  enableNoiseReduction: boolean; // default true
  enableDeskew?: boolean; // default false
  enableBackgroundNorm: boolean; // default true
  enableThresholding: boolean; // default true (false for light-clean)
  enableMorphology: boolean; // default true
};

export type ProcessingStep =
  | 'grayscale'
  | 'noise-reduction'
  | 'background-normalization'
  | 'contrast-enhancement'
  | 'thresholding'
  | 'morphology'
  | 'encoding';

export type WorkerImageData = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  colorSpace?: 'srgb' | 'display-p3';
};

export type WorkerMessage =
  | { type: 'INIT' }
  | {
      type: 'PROCESS_PAGE';
      pageId: string;
      imageData: WorkerImageData;
      config: ProcessingConfig;
    }
  | { type: 'CANCEL' };

export type WorkerResponse =
  | { type: 'INIT_DONE' }
  | { type: 'INIT_FAILED'; error: string }
  | { type: 'PROGRESS'; pageId: string; progress: number; stage: string }
  | {
      type: 'PAGE_DONE';
      pageId: string;
      resultImageData: WorkerImageData;
      durationMs: number;
    }
  | { type: 'PAGE_FAILED'; pageId: string; error: string }
  | { type: 'CANCELLED'; pageId: string };

export type Preset = {
  id: string;
  name: string;
  config: ProcessingConfig;
  isPublic: boolean;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
};
