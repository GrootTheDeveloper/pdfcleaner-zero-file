import cv from '@techstark/opencv-js';

/**
 * Safely deletes OpenCV Mat objects to free up WebAssembly memory.
 * This is crucial because JavaScript Garbage Collection does not automatically
 * clean up WASM heap memory allocated by OpenCV.
 *
 * @param mats Array of cv.Mat to delete.
 */
export function deleteMats(mats: (cv.Mat | unknown | undefined | null)[]) {
  mats.forEach((mat) => {
    try {
      const obj = mat as { isDeleted?: () => boolean; delete?: () => void } | null;
      if (
        obj &&
        typeof obj.isDeleted === 'function' &&
        !obj.isDeleted() &&
        typeof obj.delete === 'function'
      ) {
        obj.delete();
      }
    } catch {
      // Ignore errors during deletion
    }
  });
}

/**
 * Ensures OpenCV is fully loaded and initialized.
 */
export async function initOpenCV(): Promise<void> {
  // If getBuildInformation exists, it's already initialized
  if (typeof cv.getBuildInformation === 'function' && cv.getBuildInformation()) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (cv instanceof Promise) {
      cv.then(() => {
        resolve();
      }).catch(reject);
    } else {
      cv.onRuntimeInitialized = () => {
        resolve();
      };
    }
  });
}

/**
 * Converts standard ImageData (from a Canvas) to an OpenCV Mat.
 * Note: ImageData is always RGBA (4 channels).
 */
export function imageDataToMat(imageData: ImageData): cv.Mat {
  return cv.matFromImageData(imageData);
}

/**
 * Converts an OpenCV Mat back to an ImageData object.
 * Note: Mat must be RGBA (CV_8UC4) before converting!
 */
export function matToImageData(mat: cv.Mat): ImageData {
  // If the image is Grayscale, convert to RGBA
  let rgbaMat = new cv.Mat();
  let needDelete = false;

  try {
    if (mat.type() === cv.CV_8UC1) {
      cv.cvtColor(mat, rgbaMat, cv.COLOR_GRAY2RGBA);
      needDelete = true;
    } else if (mat.type() === cv.CV_8UC3) {
      cv.cvtColor(mat, rgbaMat, cv.COLOR_BGR2RGBA);
      needDelete = true;
    } else if (mat.type() === cv.CV_8UC4) {
      // It's already RGBA, but we should make sure the color mapping is correct.
      // Usually if we processed in BGR, we need to convert BGR(A) to RGB(A).
      rgbaMat = mat;
    } else {
      throw new Error(`Unsupported mat type: ${mat.type()}`);
    }

    const imgData = new ImageData(new Uint8ClampedArray(rgbaMat.data), rgbaMat.cols, rgbaMat.rows);

    return imgData;
  } finally {
    if (needDelete) {
      rgbaMat.delete();
    }
  }
}
