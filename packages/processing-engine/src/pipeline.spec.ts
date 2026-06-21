import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentCleanerPipeline } from './pipeline';
import { ProcessingConfig } from '@pdfcleaner/shared';
import cv from '@techstark/opencv-js';

// Mock cv
vi.mock('@techstark/opencv-js', () => {
  class MockMat {
    cols = 100;
    rows = 100;
    data = new Uint8Array(100 * 100 * 4);
    data32S = new Int32Array([10, 10, 20, 20]);
    type() {
      return 24;
    } // CV_8UC4
    channels() {
      return 4;
    }
    copyTo = vi.fn();
    delete = vi.fn();
    convertTo = vi.fn();
    isDeleted() {
      return false;
    }
  }

  class MockMatVector {
    private mats: MockMat[] = [new MockMat(), new MockMat(), new MockMat(), new MockMat()];
    get(index: number) {
      return this.mats[index] || new MockMat();
    }
    size() {
      return this.mats.length;
    }
    delete() {}
  }

  return {
    default: {
      Mat: MockMat,
      MatVector: MockMatVector,
      Size: class MockSize {
        constructor(
          public w: number,
          public h: number,
        ) {}
      },
      Point: class MockPoint {
        constructor(
          public x: number,
          public y: number,
        ) {}
      },
      Scalar: class MockScalar {
        constructor(
          public r: number,
          public g: number,
          public b: number,
          public a: number,
        ) {}
      },
      COLOR_RGBA2BGR: 1,
      COLOR_BGR2RGBA: 2,
      COLOR_GRAY2RGBA: 3,
      COLOR_BGR2GRAY: 4,
      COLOR_GRAY2BGR: 5,
      COLOR_BGR2HSV: 6,
      CV_8UC1: 8,
      CV_8UC3: 16,
      CV_8UC4: 24,
      CV_32F: 32,
      CV_32SC2: 30,
      MORPH_RECT: 0,
      MORPH_CLOSE: 1,
      MORPH_OPEN: 2,
      ADAPTIVE_THRESH_GAUSSIAN_C: 1,
      THRESH_BINARY: 0,
      THRESH_BINARY_INV: 1,
      THRESH_OTSU: 8,
      BORDER_DEFAULT: 0,
      NORM_MINMAX: 32,
      RETR_LIST: 1,
      CHAIN_APPROX_SIMPLE: 2,

      cvtColor: vi.fn(),
      getStructuringElement: vi.fn(() => new MockMat()),
      morphologyEx: vi.fn(),
      divide: vi.fn(),
      LUT: vi.fn(),
      convertScaleAbs: vi.fn(),
      adaptiveThreshold: vi.fn(),
      bitwise_and: vi.fn(),
      bitwise_or: vi.fn(),
      bitwise_not: vi.fn(),
      inRange: vi.fn(),
      split: vi.fn(),
      merge: vi.fn(),
      medianBlur: vi.fn(),
      GaussianBlur: vi.fn(),
      findContours: vi.fn(),
      minAreaRect: vi.fn(() => ({
        angle: 5,
        center: { x: 50, y: 50 },
        size: { width: 100, height: 100 },
      })),
      getRotationMatrix2D: vi.fn(() => new MockMat()),
      warpAffine: vi.fn(),
      normalize: vi.fn(),
      threshold: vi.fn(),
      matFromArray: vi.fn(() => new MockMat()),
    },
  };
});

describe('DocumentCleanerPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultConfig: ProcessingConfig = {
    mode: 'light-clean',
    dpi: 200,
    jpegQuality: 85,
    grayscale: true,
    gamma: 1.0,
    contrast: 1.2,
    enableNoiseReduction: true,
    enableDeskew: false,
    enableBackgroundNorm: true,
    enableThresholding: true,
    enableMorphology: true,
  };

  it('should initialize with config', () => {
    const pipeline = new DocumentCleanerPipeline(defaultConfig);
    expect(pipeline).toBeDefined();
  });

  it('should execute grayscale pipeline path when config.grayscale is true', () => {
    const pipeline = new DocumentCleanerPipeline({
      ...defaultConfig,
      grayscale: true,
    });

    const inputMat = new cv.Mat();
    const outputMat = pipeline.process(inputMat);

    expect(outputMat).toBeDefined();
    expect(cv.cvtColor).toHaveBeenCalled();
  });

  it('should execute deskewing step when enableDeskew is true', () => {
    const pipeline = new DocumentCleanerPipeline({
      ...defaultConfig,
      enableDeskew: true,
    });

    const inputMat = new cv.Mat();
    pipeline.process(inputMat);

    expect(cv.minAreaRect).toHaveBeenCalled();
    expect(cv.getRotationMatrix2D).toHaveBeenCalled();
    expect(cv.warpAffine).toHaveBeenCalled();
  });

  it('should skip thresholding and morphology when disabled', () => {
    const pipeline = new DocumentCleanerPipeline({
      ...defaultConfig,
      enableThresholding: false,
      enableMorphology: false,
      enableBackgroundNorm: false,
    });

    const inputMat = new cv.Mat();
    pipeline.process(inputMat);

    expect(cv.adaptiveThreshold).not.toHaveBeenCalled();
    expect(cv.morphologyEx).not.toHaveBeenCalled();
  });
});
