import { describe, it, expect, vi, beforeEach } from 'vitest';
import { telemetryClient, TelemetryData, ErrorReportData } from './telemetry-client';
import { apiClient } from './api-client';

describe('telemetryClient', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const sampleTelemetry: TelemetryData = {
    mode: 'strong-background-removal',
    pagesProcessed: 5,
    pagesSkipped: 0,
    durationMs: 1200,
    outputSizeBytes: 1048576,
  };

  const sampleError: ErrorReportData = {
    errorCode: 'OPENCV_ERROR',
    errorMessage: 'Failed to process page',
    stackTrace: 'Error at cv.cvtColor...',
    mode: 'custom',
  };

  it('should manage opt-out settings correctly', () => {
    expect(telemetryClient.getOptOut()).toBe(false);
    telemetryClient.setOptOut(true);
    expect(telemetryClient.getOptOut()).toBe(true);
    telemetryClient.setOptOut(false);
    expect(telemetryClient.getOptOut()).toBe(false);
  });

  it('should log telemetry via API when opted in', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ success: true });

    await telemetryClient.logTelemetry(sampleTelemetry);

    expect(postSpy).toHaveBeenCalledWith('/telemetry', sampleTelemetry);
    expect(localStorage.getItem('pdfcleaner_offline_telemetry_queue')).toBeNull();
  });

  it('should not log telemetry when opted out', async () => {
    const postSpy = vi.spyOn(apiClient, 'post');
    telemetryClient.setOptOut(true);

    await telemetryClient.logTelemetry(sampleTelemetry);

    expect(postSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('pdfcleaner_offline_telemetry_queue')).toBeNull();
  });

  it('should enqueue telemetry locally if API request fails', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Network error'));

    await telemetryClient.logTelemetry(sampleTelemetry);

    expect(postSpy).toHaveBeenCalled();
    const queueStr = localStorage.getItem('pdfcleaner_offline_telemetry_queue');
    expect(queueStr).toBeDefined();
    const queue = JSON.parse(queueStr!) as TelemetryData[];
    expect(queue).toHaveLength(1);
    expect(queue[0]).toEqual(sampleTelemetry);
  });

  it('should log errors via API when opted in', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ success: true });

    await telemetryClient.logError(sampleError);

    expect(postSpy).toHaveBeenCalledWith('/errors', sampleError);
    expect(localStorage.getItem('pdfcleaner_offline_errors_queue')).toBeNull();
  });

  it('should enqueue errors locally if API request fails', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Network error'));

    await telemetryClient.logError(sampleError);

    expect(postSpy).toHaveBeenCalled();
    const queueStr = localStorage.getItem('pdfcleaner_offline_errors_queue');
    expect(queueStr).toBeDefined();
    const queue = JSON.parse(queueStr!) as ErrorReportData[];
    expect(queue).toHaveLength(1);
    expect(queue[0]).toEqual(sampleError);
  });

  it('should flush offline queues successfully when online', async () => {
    // Populate offline queues
    localStorage.setItem('pdfcleaner_offline_telemetry_queue', JSON.stringify([sampleTelemetry]));
    localStorage.setItem('pdfcleaner_offline_errors_queue', JSON.stringify([sampleError]));

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ success: true });

    await telemetryClient.flushOfflineQueues();

    expect(postSpy).toHaveBeenCalledWith('/telemetry', sampleTelemetry);
    expect(postSpy).toHaveBeenCalledWith('/errors', sampleError);
    expect(localStorage.getItem('pdfcleaner_offline_telemetry_queue')).toBeNull();
    expect(localStorage.getItem('pdfcleaner_offline_errors_queue')).toBeNull();
  });
});
