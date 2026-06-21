import { apiClient } from './api-client';

const TELEMETRY_OPT_OUT_KEY = 'pdfcleaner_telemetry_opt_out';
const OFFLINE_TELEMETRY_QUEUE = 'pdfcleaner_offline_telemetry_queue';
const OFFLINE_ERRORS_QUEUE = 'pdfcleaner_offline_errors_queue';

export interface TelemetryData {
  mode: string;
  pagesProcessed: number;
  pagesSkipped: number;
  durationMs: number;
  outputSizeBytes: number;
}

export interface ErrorReportData {
  errorCode: string;
  errorMessage: string;
  stackTrace?: string;
  mode: string;
}

class TelemetryClient {
  private isOptedOut(): boolean {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(TELEMETRY_OPT_OUT_KEY) === 'true';
  }

  setOptOut(optOut: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TELEMETRY_OPT_OUT_KEY, optOut ? 'true' : 'false');
  }

  getOptOut(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(TELEMETRY_OPT_OUT_KEY) === 'true';
  }

  async logTelemetry(data: TelemetryData): Promise<void> {
    if (this.isOptedOut()) return;

    try {
      await apiClient.post('/telemetry', data);
    } catch {
      // Save to offline queue to retry when online
      this.enqueueOffline(OFFLINE_TELEMETRY_QUEUE, data);
    }
  }

  async logError(data: ErrorReportData): Promise<void> {
    if (this.isOptedOut()) return;

    try {
      await apiClient.post('/errors', data);
    } catch {
      // Save to offline queue to retry when online
      this.enqueueOffline(OFFLINE_ERRORS_QUEUE, data);
    }
  }

  private enqueueOffline(key: string, data: unknown): void {
    if (typeof window === 'undefined') return;
    try {
      const existing = localStorage.getItem(key);
      const queue = existing ? (JSON.parse(existing) as unknown[]) : [];
      queue.push(data);
      localStorage.setItem(key, JSON.stringify(queue));
    } catch (err) {
      console.error('Failed to enqueue offline log:', err);
    }
  }

  async flushOfflineQueues(): Promise<void> {
    if (this.isOptedOut() || typeof window === 'undefined') return;

    // Flush telemetry
    try {
      const telemetryStr = localStorage.getItem(OFFLINE_TELEMETRY_QUEUE);
      if (telemetryStr) {
        const queue = JSON.parse(telemetryStr) as TelemetryData[];
        if (queue.length > 0) {
          await Promise.all(
            queue.map(async (item) => {
              await apiClient.post('/telemetry', item);
            }),
          );
          localStorage.removeItem(OFFLINE_TELEMETRY_QUEUE);
        }
      }
    } catch (err) {
      console.warn('Failed to flush offline telemetry queue:', err);
    }

    // Flush errors
    try {
      const errorsStr = localStorage.getItem(OFFLINE_ERRORS_QUEUE);
      if (errorsStr) {
        const queue = JSON.parse(errorsStr) as ErrorReportData[];
        if (queue.length > 0) {
          await Promise.all(
            queue.map(async (item) => {
              await apiClient.post('/errors', item);
            }),
          );
          localStorage.removeItem(OFFLINE_ERRORS_QUEUE);
        }
      }
    } catch (err) {
      console.warn('Failed to flush offline errors queue:', err);
    }
  }
}

export const telemetryClient = new TelemetryClient();
