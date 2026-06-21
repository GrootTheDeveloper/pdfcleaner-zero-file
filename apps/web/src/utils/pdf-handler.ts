import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

// Set the workerSrc for pdfjs locally from the public directory
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface PdfPageImage {
  pageNumber: number;
  imageData: ImageData;
}

export async function validateFile(
  file: File,
  maxSizeMb = 200,
): Promise<{ valid: boolean; error?: string; type?: 'pdf' | 'image' }> {
  // Check file size (dynamic limit)
  const MAX_SIZE = maxSizeMb * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { valid: false, error: `File is too large. Max size is ${maxSizeMb}MB.` };
  }

  try {
    // Read the first 8 bytes for magic numbers
    const headerBytes = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(new Uint8Array(e.target.result as ArrayBuffer));
        } else {
          reject(new Error('Failed to read header bytes.'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file.slice(0, 8));
    });

    const isPdf =
      headerBytes[0] === 0x25 &&
      headerBytes[1] === 0x50 &&
      headerBytes[2] === 0x44 &&
      headerBytes[3] === 0x46; // %PDF
    const isPng =
      headerBytes[0] === 0x89 &&
      headerBytes[1] === 0x50 &&
      headerBytes[2] === 0x4e &&
      headerBytes[3] === 0x47; // PNG
    const isJpg = headerBytes[0] === 0xff && headerBytes[1] === 0xd8 && headerBytes[2] === 0xff; // JPEG

    if (isPdf) {
      return { valid: true, type: 'pdf' };
    }
    if (isPng || isJpg) {
      return { valid: true, type: 'image' };
    }

    // Secondary extension check
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return { valid: true, type: 'pdf' };
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext || '')) return { valid: true, type: 'image' };

    return {
      valid: false,
      error: 'Unsupported file type. Please upload a PDF or an Image (PNG, JPG, WEBP).',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown validation error';
    return { valid: false, error: `File validation failed: ${message}` };
  }
}

export async function getPDFPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    loadingTask.onPassword = () => {
      throw new Error('PASSWORD_REQUIRED');
    };
    const pdfDocument = await loadingTask.promise;
    return pdfDocument.numPages;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '';
    if (
      (err && typeof err === 'object' && 'name' in err && err.name === 'PasswordException') ||
      errorMessage === 'PASSWORD_REQUIRED'
    ) {
      throw new Error(
        'This PDF is encrypted or password-protected. Please remove password protection and try again.',
      );
    }
    throw err;
  }
}

export function parsePageRange(
  rangeStr: string,
  totalPages: number,
): { pages: number[]; error?: string } {
  if (!rangeStr.trim()) {
    return { pages: Array.from({ length: totalPages }, (_, i) => i + 1) };
  }

  const pages: number[] = [];
  const parts = rangeStr.split(',');
  const rangeRegex = /^\s*(\d+)\s*-\s*(\d+)\s*$/;
  const singleRegex = /^\s*(\d+)\s*$/;

  for (const part of parts) {
    if (!part.trim()) continue;

    let match = part.match(rangeRegex);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);

      if (
        isNaN(start) ||
        isNaN(end) ||
        start < 1 ||
        end < 1 ||
        start > totalPages ||
        end > totalPages
      ) {
        return {
          pages: [],
          error: `Invalid page range: "${part.trim()}". Pages must be between 1 and ${totalPages}.`,
        };
      }
      if (start > end) {
        return {
          pages: [],
          error: `Invalid page range: "${part.trim()}". Start page cannot be greater than end page.`,
        };
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    } else {
      match = part.match(singleRegex);
      if (match) {
        const page = parseInt(match[1], 10);
        if (isNaN(page) || page < 1 || page > totalPages) {
          return {
            pages: [],
            error: `Invalid page number: "${part.trim()}". Pages must be between 1 and ${totalPages}.`,
          };
        }
        pages.push(page);
      } else {
        return { pages: [], error: `Invalid format: "${part.trim()}". Use format like "1-3, 5".` };
      }
    }
  }

  // Deduplicate and sort pages
  const uniquePages = Array.from(new Set(pages)).sort((a, b) => a - b);
  if (uniquePages.length === 0) {
    return { pages: [], error: 'No pages selected.' };
  }
  return { pages: uniquePages };
}

export async function loadPDFImages(
  file: File,
  pageNumbers?: number[],
  onProgress?: (current: number, total: number) => void,
): Promise<PdfPageImage[]> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

    // Set up password handlers or catch password exceptions
    loadingTask.onPassword = () => {
      throw new Error('PASSWORD_REQUIRED');
    };

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;

    // Filter target pages
    const targetPages =
      pageNumbers && pageNumbers.length > 0
        ? pageNumbers.filter((p) => p >= 1 && p <= numPages)
        : Array.from({ length: numPages }, (_, i) => i + 1);

    const pageImages: PdfPageImage[] = [];
    const totalToLoad = targetPages.length;

    for (let index = 0; index < totalToLoad; index++) {
      const i = targetPages[index];
      const page = await pdfDocument.getPage(i);

      // Standard resolution scale (2.0 gives ~150-200 DPI depending on page size)
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Could not create 2D canvas context.');

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
      };

      await page.render(renderContext as unknown as Parameters<typeof page.render>[0]).promise;

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      pageImages.push({
        pageNumber: i,
        imageData,
      });

      if (onProgress) {
        onProgress(index + 1, totalToLoad);
      }
    }

    return pageImages;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '';
    if (
      (err && typeof err === 'object' && 'name' in err && err.name === 'PasswordException') ||
      errorMessage === 'PASSWORD_REQUIRED'
    ) {
      throw new Error(
        'This PDF is encrypted or password-protected. Please remove password protection and try again.',
      );
    }
    throw err;
  }
}

export async function loadImageToImageData(file: File): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not create 2D canvas context.'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        resolve(imgData);
      };
      img.onerror = () => reject(new Error('Failed to decode image file.'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

export async function createBlobFromImageData(
  imgData: ImageData,
  type = 'image/jpeg',
  quality = 0.92,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = imgData.width;
  canvas.height = imgData.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.putImageData(imgData, 0, 0);
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to compile output image.'));
      },
      type,
      quality,
    );
  });
}

export async function createPDFFromImages(images: ImageData[], quality = 0.9): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  for (const imgData of images) {
    // Convert ImageData to jpeg buffer
    const canvas = document.createElement('canvas');
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imgData, 0, 0);
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (!blob) continue;

    const arrayBuffer = await blob.arrayBuffer();
    const jpgImage = await pdfDoc.embedJpg(arrayBuffer);

    const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
    page.drawImage(jpgImage, {
      x: 0,
      y: 0,
      width: jpgImage.width,
      height: jpgImage.height,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
}
