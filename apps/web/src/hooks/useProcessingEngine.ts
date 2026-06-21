import { useState, useCallback, useRef } from 'react';
import { ProcessingConfig } from '@pdfcleaner/shared';
import type { WorkerMessage, WorkerResponse } from '@pdfcleaner/processing-engine';

export type ProcessingState = 'idle' | 'initializing' | 'processing' | 'done' | 'error';

export interface PageResult {
  pageId: string;
  imageData: ImageData | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  stage: string;
  error?: string;
}

export function useProcessingEngine() {
  const [state, setState] = useState<ProcessingState>('idle');
  const [globalProgress, setGlobalProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Track individual page progress
  const [pageResults, setPageResults] = useState<Record<string, PageResult>>({});

  const workersRef = useRef<Worker[]>([]);

  // Initialize the worker pool (default size 2 for balanced CPU/RAM load)
  const initEngine = useCallback(async (poolSize = 2) => {
    if (workersRef.current.length > 0) return;

    setState('initializing');
    setError(null);

    const workers: Worker[] = [];
    const initPromises: Promise<void>[] = [];

    for (let i = 0; i < poolSize; i++) {
      const p = new Promise<void>((resolve, reject) => {
        try {
          const worker = new Worker(
            new URL('@pdfcleaner/processing-engine/dist/worker/cleaner.worker.js', import.meta.url),
            { type: 'module' },
          );

          worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
            const msg = e.data;
            if (msg.type === 'INIT_DONE') {
              resolve();
            } else if (msg.type === 'INIT_FAILED') {
              reject(new Error(msg.error));
            }
          };

          worker.postMessage({ type: 'INIT' } as WorkerMessage);
          workers.push(worker);
        } catch (err: unknown) {
          reject(err);
        }
      });
      initPromises.push(p);
    }

    try {
      await Promise.all(initPromises);
      workersRef.current = workers;
      setState('idle');
    } catch (err: unknown) {
      workers.forEach((w) => w.terminate());
      setState('error');
      const message = err instanceof Error ? err.message : 'Unknown engine initialization error';
      setError(message);
      throw err;
    }
  }, []);

  const processPages = useCallback(
    async (
      pages: { pageId: string; imageData: ImageData }[],
      config: ProcessingConfig,
    ): Promise<ImageData[]> => {
      const poolSize = Math.min(navigator.hardwareConcurrency || 2, 2); // Cap at 2 workers to avoid high RAM/OOM
      if (workersRef.current.length === 0) {
        await initEngine(poolSize);
      }

      const activeWorkers = workersRef.current;
      const numWorkers = activeWorkers.length;

      setState('processing');
      setGlobalProgress(0);

      // Initialize results state
      const initialResults: Record<string, PageResult> = {};
      pages.forEach((p) => {
        initialResults[p.pageId] = {
          pageId: p.pageId,
          imageData: null,
          status: 'pending',
          progress: 0,
          stage: 'waiting',
        };
      });
      setPageResults(initialResults);

      const completedImages: ImageData[] = new Array(pages.length);
      let completedCount = 0;
      let nextPageIndex = 0;

      return new Promise<ImageData[]>((resolve, reject) => {
        let isAborted = false;

        const runNext = (workerIndex: number) => {
          if (isAborted) return;

          if (nextPageIndex >= pages.length) {
            // If all workers are finished, resolve the full array
            if (completedCount === pages.length) {
              setState('done');
              setGlobalProgress(100);
              resolve(completedImages);
            }
            return;
          }

          const currentIdx = nextPageIndex++;
          const page = pages[currentIdx];
          const worker = activeWorkers[workerIndex];

          setPageResults((prev) => ({
            ...prev,
            [page.pageId]: { ...prev[page.pageId], status: 'processing', stage: 'starting' },
          }));

          const handleMessage = (e: MessageEvent<WorkerResponse>) => {
            const msg = e.data;
            if (!('pageId' in msg) || msg.pageId !== page.pageId) return;

            if (msg.type === 'PROGRESS') {
              setPageResults((prev) => {
                const updated = {
                  ...prev,
                  [page.pageId]: { ...prev[page.pageId], progress: msg.progress, stage: msg.stage },
                };

                // Calculate global progress as the average of all pages
                const totalProgress = Object.values(updated).reduce((sum, res) => {
                  return sum + (res.status === 'done' ? 100 : res.progress);
                }, 0);
                setGlobalProgress(totalProgress / pages.length);

                return updated;
              });
            } else if (msg.type === 'PAGE_DONE') {
              worker.removeEventListener('message', handleMessage);
              completedImages[currentIdx] = msg.resultImageData as ImageData;
              completedCount++;

              setPageResults((prev) => ({
                ...prev,
                [page.pageId]: {
                  ...prev[page.pageId],
                  status: 'done',
                  progress: 100,
                  imageData: msg.resultImageData as ImageData,
                },
              }));

              // Move this worker to the next available page in queue
              runNext(workerIndex);
            } else if (msg.type === 'PAGE_FAILED') {
              worker.removeEventListener('message', handleMessage);
              isAborted = true;
              reject(new Error(msg.error));
            }
          };

          worker.addEventListener('message', handleMessage);

          worker.postMessage(
            {
              type: 'PROCESS_PAGE',
              pageId: page.pageId,
              imageData: page.imageData,
              config,
            } as WorkerMessage,
            [page.imageData.data.buffer],
          );
        };

        // Bootstrap processing across workers
        const workersToUse = Math.min(numWorkers, pages.length);
        for (let w = 0; w < workersToUse; w++) {
          runNext(w);
        }
      });
    },
    [initEngine],
  );

  const cancel = useCallback(() => {
    workersRef.current.forEach((worker) => {
      worker.terminate();
    });
    workersRef.current = [];
    setState('idle');
  }, []);

  return {
    state,
    globalProgress,
    pageResults,
    error,
    initEngine,
    processPages,
    cancel,
  };
}
