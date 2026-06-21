import { DocumentCleanerPipeline } from '../pipeline';
import type { WorkerMessage, WorkerResponse } from '@pdfcleaner/shared';
import { initOpenCV, imageDataToMat, matToImageData, deleteMats } from '../utils/cv-utils';

let isInitialized = false;
let cancelRequested = false;

function postWorkerMessage(message: WorkerResponse, transfer?: Transferable[]) {
  if (transfer) {
    (
      self as unknown as { postMessage: (msg: WorkerResponse, transfer: Transferable[]) => void }
    ).postMessage(message, transfer);
    return;
  }

  self.postMessage(message);
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  if (msg.type === 'INIT') {
    try {
      await initOpenCV();
      isInitialized = true;
      postWorkerMessage({ type: 'INIT_DONE' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown initialization error';
      postWorkerMessage({ type: 'INIT_FAILED', error: message });
    }
  } else if (msg.type === 'CANCEL') {
    cancelRequested = true;
  } else if (msg.type === 'PROCESS_PAGE') {
    if (!isInitialized) {
      postWorkerMessage({
        type: 'PAGE_FAILED',
        pageId: msg.pageId,
        error: 'OpenCV is not initialized yet',
      });
      return;
    }

    cancelRequested = false;
    const startTime = performance.now();

    try {
      postWorkerMessage({
        type: 'PROGRESS',
        pageId: msg.pageId,
        progress: 10,
        stage: 'reading_image',
      });
      const matRgba = imageDataToMat(msg.imageData as ImageData);

      if (cancelRequested) throw new Error('CANCELLED');

      const pipeline = new DocumentCleanerPipeline(msg.config);

      postWorkerMessage({
        type: 'PROGRESS',
        pageId: msg.pageId,
        progress: 30,
        stage: 'processing_pipeline',
      });
      const processedMat = pipeline.process(matRgba);

      if (cancelRequested) {
        deleteMats([processedMat]);
        throw new Error('CANCELLED');
      }

      postWorkerMessage({
        type: 'PROGRESS',
        pageId: msg.pageId,
        progress: 90,
        stage: 'encoding_result',
      });
      const resultImageData = matToImageData(processedMat);

      deleteMats([processedMat]);

      const durationMs = performance.now() - startTime;
      postWorkerMessage({ type: 'PAGE_DONE', pageId: msg.pageId, resultImageData, durationMs }, [
        resultImageData.data.buffer,
      ]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      if (errMsg === 'CANCELLED') {
        postWorkerMessage({ type: 'CANCELLED', pageId: msg.pageId });
      } else {
        postWorkerMessage({ type: 'PAGE_FAILED', pageId: msg.pageId, error: errMsg });
      }
    }
  }
};
