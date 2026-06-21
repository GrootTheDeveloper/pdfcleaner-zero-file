import cv from '@techstark/opencv-js';
import { ProcessingConfig } from '@pdfcleaner/shared';
import { deleteMats } from './utils/cv-utils';

export class DocumentCleanerPipeline {
  private config: ProcessingConfig;

  constructor(config: ProcessingConfig) {
    this.config = config;
  }

  /**
   * Main entry point to process an image.
   * Takes an RGBA cv.Mat and processes it, returning a new Mat.
   */
  public process(matRgba: cv.Mat): cv.Mat {
    // 1. Convert RGBA to BGR
    const matBgr = new cv.Mat();
    cv.cvtColor(matRgba, matBgr, cv.COLOR_RGBA2BGR);

    // If color output (grayscale === false) AND thresholding is enabled,
    // we run a mixed pipeline to overlay color elements on top of a binarized background.
    const useColorMasking = !this.config.grayscale && this.config.enableThresholding;

    if (useColorMasking) {
      // Step A: Create a grayscale copy
      const matGray = new cv.Mat();
      cv.cvtColor(matBgr, matGray, cv.COLOR_BGR2GRAY);

      // Step B: Clean the grayscale copy through the full binarization pipeline
      const cleanedGray = this.processGrayscalePipeline(matGray);

      // Step C: Mask out original color elements and overlay them on the binarized gray background
      const outputBgr = this.applyColorMasking(matBgr, cleanedGray);

      deleteMats([matBgr, matGray, cleanedGray]);
      return outputBgr;
    } else {
      // Standard linear pipeline
      let currentMat = matBgr;
      if (this.config.grayscale) {
        const matGray = new cv.Mat();
        cv.cvtColor(currentMat, matGray, cv.COLOR_BGR2GRAY);
        deleteMats([currentMat]);
        currentMat = matGray;
      }

      return this.processGrayscalePipeline(currentMat);
    }
  }

  /**
   * Runs the core document cleaning stages on a Mat.
   * Can accept either a grayscale or color BGR Mat.
   */
  private processGrayscalePipeline(mat: cv.Mat): cv.Mat {
    let currentMat = mat;

    // 1. Noise Reduction
    if (this.config.enableNoiseReduction) {
      const blurredMat = new cv.Mat();
      if (this.config.blurType === 'gaussian') {
        const ksize = new cv.Size(this.config.blurKernelSize ?? 3, this.config.blurKernelSize ?? 3);
        cv.GaussianBlur(currentMat, blurredMat, ksize, 0, 0, cv.BORDER_DEFAULT);
      } else {
        cv.medianBlur(currentMat, blurredMat, this.config.blurKernelSize ?? 3);
      }
      deleteMats([currentMat]);
      currentMat = blurredMat;
    }

    // 2. Auto-Deskew
    if (this.config.enableDeskew) {
      currentMat = this.deskew(currentMat);
    }

    // 3. Background Normalization
    if (this.config.enableBackgroundNorm) {
      currentMat = this.normalizeBackground(currentMat);
    }

    // 4. Gamma Correction
    if (this.config.gamma !== 1.0) {
      this.applyGammaCorrection(currentMat, this.config.gamma);
    }

    // 5. Contrast Stretching (unconditional min-max normalization to [0, 255] matching Python's cv2.normalize)
    cv.normalize(currentMat, currentMat, 0, 255, cv.NORM_MINMAX, -1);

    // Apply user-defined contrast scale multiplier if not 1.0
    if (this.config.contrast !== 1.0) {
      cv.convertScaleAbs(currentMat, currentMat, this.config.contrast, 0);
    }

    // 6. Adaptive Thresholding (only for 1-channel Grayscale images)
    if (this.config.enableThresholding && currentMat.type() === cv.CV_8UC1) {
      const threshMat = new cv.Mat();
      cv.adaptiveThreshold(
        currentMat,
        threshMat,
        255,
        cv.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv.THRESH_BINARY,
        this.config.thresholdBlockSize ?? 21,
        this.config.thresholdC ?? 15,
      );
      deleteMats([currentMat]);
      currentMat = threshMat;
    }

    // 7. Morphology Cleanup (only for 1-channel Grayscale images)
    if (this.config.enableMorphology && currentMat.type() === cv.CV_8UC1) {
      const morphMat = new cv.Mat();
      const ksize = new cv.Size(
        this.config.morphologyKernelSize ?? 2,
        this.config.morphologyKernelSize ?? 2,
      );
      const kernel = cv.getStructuringElement(cv.MORPH_RECT, ksize);

      const morphType = this.config.morphType === 'close' ? cv.MORPH_CLOSE : cv.MORPH_OPEN;
      cv.morphologyEx(currentMat, morphMat, morphType, kernel);

      deleteMats([currentMat, kernel]);
      currentMat = morphMat;
    }

    return currentMat;
  }

  private deskew(mat: cv.Mat): cv.Mat {
    // 1. Create a grayscale copy for angle detection
    const gray = new cv.Mat();
    if (mat.type() === cv.CV_8UC3) {
      cv.cvtColor(mat, gray, cv.COLOR_BGR2GRAY);
    } else {
      mat.copyTo(gray);
    }

    // 2. Pre-normalize background so heavy shadow doesn't confuse the Otsu threshold
    const ksize = new cv.Size(51, 51);
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    const bg = new cv.Mat();
    cv.morphologyEx(gray, bg, cv.MORPH_CLOSE, kernel);

    const normGray = new cv.Mat();
    try {
      cv.divide(gray, bg, normGray, 255.0, -1);
    } catch {
      // Fallback for environment specific OpenCV.js divide signatures
      const floatMat = new cv.Mat();
      const floatBg = new cv.Mat();
      gray.convertTo(floatMat, cv.CV_32F);
      bg.convertTo(floatBg, cv.CV_32F);
      cv.divide(floatMat, floatBg, normGray);
      cv.convertScaleAbs(normGray, normGray, 255.0, 0);
      deleteMats([floatMat, floatBg]);
    }

    // Smooth noise before thresholding (median blur kernel size 5 matching Python)
    cv.medianBlur(normGray, normGray, 5);

    // Otsu threshold (BINARY_INV since we want text to be white for contours)
    const thresh = new cv.Mat();
    cv.threshold(normGray, thresh, 0, 255, cv.THRESH_BINARY_INV | cv.THRESH_OTSU);

    // Cleanup intermediate mats
    deleteMats([gray, bg, kernel, normGray]);

    // 3. Find contours instead of findNonZero
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(thresh, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    if (contours.size() === 0) {
      deleteMats([thresh, hierarchy]);
      contours.delete();
      return mat;
    }

    // Collect all points from contours in (y, x) order to match Python's np.where output
    const allPoints: number[] = [];
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const data = contour.data32S; // Int32Array of x,y coordinates
      for (let j = 0; j < data.length; j += 2) {
        const x = data[j];
        const y = data[j + 1];
        allPoints.push(y);
        allPoints.push(x);
      }
      deleteMats([contour]);
    }

    if (allPoints.length === 0) {
      deleteMats([thresh, hierarchy]);
      contours.delete();
      return mat;
    }

    // Create a single Mat of points (CV_32SC2)
    const combinedMat = cv.matFromArray(allPoints.length / 2, 1, cv.CV_32SC2, allPoints);

    // 4. Calculate minAreaRect
    const rect = cv.minAreaRect(combinedMat);
    let angle = rect.angle;

    // Angle correction logic (matching Python implementation exactly)
    if (angle < -45) {
      angle = -(90 + angle);
    } else if (angle > 45) {
      angle = 90 - angle;
    } else {
      angle = -angle;
    }

    // If angle is negligible, return original
    if (Math.abs(angle) < 0.5 || Math.abs(angle - 90) < 0.5) {
      deleteMats([thresh, hierarchy, combinedMat]);
      contours.delete();
      return mat;
    }

    // 5. Rotate image
    const center = new cv.Point(mat.cols / 2, mat.rows / 2);
    const M = cv.getRotationMatrix2D(center, angle, 1.0);

    const rotated = new cv.Mat();
    const borderValue = new cv.Scalar(255, 255, 255, 255);
    cv.warpAffine(
      mat,
      rotated,
      M,
      new cv.Size(mat.cols, mat.rows),
      cv.INTER_CUBIC,
      cv.BORDER_CONSTANT,
      borderValue,
    );

    deleteMats([thresh, hierarchy, combinedMat, M, mat]);
    contours.delete();
    return rotated;
  }

  /**
   * Performs background normalization.
   * If the input is a color BGR image, it uses the LAB color space to safely
   * normalize the lightness channel (L) without corrupting color tones.
   */
  private normalizeBackground(mat: cv.Mat): cv.Mat {
    const isColor = mat.channels() === 3;
    let targetMat = mat;
    const channels = new cv.MatVector();
    let lChannel: cv.Mat | null = null;
    let labMat: cv.Mat | null = null;

    // If BGR, isolate the Lightness (L) channel in LAB space
    if (isColor) {
      labMat = new cv.Mat();
      cv.cvtColor(mat, labMat, cv.COLOR_BGR2Lab);
      cv.split(labMat, channels);
      lChannel = channels.get(0);
      targetMat = lChannel;
    }

    const ksize = this.config.normKernelSize ?? 25;
    const kernelSize = new cv.Size(ksize, ksize);
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, kernelSize);

    const bg = new cv.Mat();
    cv.morphologyEx(targetMat, bg, cv.MORPH_CLOSE, kernel);

    const divided = new cv.Mat();
    try {
      cv.divide(targetMat, bg, divided, 255.0, -1);
    } catch {
      // Fallback for environment specific OpenCV.js divide quirks
      const floatMat = new cv.Mat();
      const floatBg = new cv.Mat();
      targetMat.convertTo(floatMat, cv.CV_32F);
      bg.convertTo(floatBg, cv.CV_32F);

      cv.divide(floatMat, floatBg, divided);
      cv.convertScaleAbs(divided, divided, 255.0, 0);

      deleteMats([floatMat, floatBg]);
    }

    deleteMats([bg, kernel]);

    if (isColor && labMat && lChannel) {
      // Merge the normalized L channel back
      channels.set(0, divided);
      cv.merge(channels, labMat);

      const resultBgr = new cv.Mat();
      cv.cvtColor(labMat, resultBgr, cv.COLOR_Lab2BGR);

      deleteMats([mat, labMat, lChannel, divided]);
      channels.delete();
      return resultBgr;
    } else {
      deleteMats([mat]);
      return divided;
    }
  }

  private applyGammaCorrection(mat: cv.Mat, gamma: number) {
    const invGamma = 1.0 / gamma;
    const lutData = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      lutData[i] = Math.min(255, Math.max(0, Math.pow(i / 255.0, invGamma) * 255.0));
    }

    const lutMat = cv.matFromArray(1, 256, cv.CV_8UC1, lutData);
    cv.LUT(mat, lutMat, mat);
    deleteMats([lutMat]);
  }

  /**
   * Detects colored pixels in the original BGR image (using Saturation channel in HSV space)
   * and overlays them on top of the clean, binarized document background.
   */
  private applyColorMasking(matBgr: cv.Mat, matBinary: cv.Mat): cv.Mat {
    const hsv = new cv.Mat();
    cv.cvtColor(matBgr, hsv, cv.COLOR_BGR2HSV);

    const channels = new cv.MatVector();
    cv.split(hsv, channels);
    const saturation = channels.get(1);

    // Saturation threshold (35 is ideal for signatures/stamps)
    const colorMask = new cv.Mat();
    cv.threshold(saturation, colorMask, 35, 255, cv.THRESH_BINARY);

    // Morphology Open to clean up tiny noise points in the mask
    const ksize = new cv.Size(3, 3);
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, ksize);
    cv.morphologyEx(colorMask, colorMask, cv.MORPH_OPEN, kernel);

    // Convert binary image to BGR
    const binaryBgr = new cv.Mat();
    cv.cvtColor(matBinary, binaryBgr, cv.COLOR_GRAY2BGR);

    // Overlay color pixels from matBgr using colorMask onto binaryBgr background
    const result = new cv.Mat();
    binaryBgr.copyTo(result);
    matBgr.copyTo(result, colorMask);

    deleteMats([hsv, saturation, colorMask, kernel, binaryBgr]);
    channels.delete();

    return result;
  }
}
