import { ProcessingConfig } from '@pdfcleaner/shared';

export function runPipeline(imageData: ImageData, config: ProcessingConfig): ImageData {
  console.log(`[Processing Engine] Running pipeline with mode: ${config.mode}`);
  // Placeholder: trả về ảnh gốc cho đến khi thuật toán được cài đặt ở Phase 2
  return imageData;
}
