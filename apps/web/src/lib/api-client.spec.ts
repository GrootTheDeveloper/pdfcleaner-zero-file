import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient, ApiError } from './api-client';

describe('apiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should make GET requests successfully', async () => {
    const mockData = { success: true, data: 'test' };
    const mockResponse = new Response(JSON.stringify(mockData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const result = await apiClient.get('/test-route');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/test-route'),
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
      }),
    );
    expect(result).toEqual(mockData);
  });

  it('should format body as JSON for POST requests', async () => {
    const mockData = { created: true };
    const mockResponse = new Response(JSON.stringify(mockData), { status: 201 });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const payload = { name: 'test-preset' };
    const result = await apiClient.post('/presets', payload);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.any(Headers),
      }),
    );
    expect(result).toEqual(mockData);
  });

  it('should map 204 No Content response to an empty object', async () => {
    const mockResponse = new Response(null, { status: 204 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const result = await apiClient.delete('/presets/123');
    expect(result).toEqual({});
  });

  it('should throw ApiError with status and errorCode on failure', async () => {
    const errorPayload = { errorCode: 'PRESET_NOT_FOUND', message: 'Preset does not exist' };
    const mockResponse = new Response(JSON.stringify(errorPayload), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    await expect(apiClient.get('/presets/123')).rejects.toThrowError(
      new ApiError(404, 'PRESET_NOT_FOUND', 'Preset does not exist'),
    );
  });

  it('should fallback to UNKNOWN_ERROR if server error is not JSON', async () => {
    const mockResponse = new Response('Internal Server Error', { status: 500 });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    try {
      await apiClient.get('/test');
      expect.fail('Should have thrown error');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr).toBeInstanceOf(ApiError);
      expect(apiErr.statusCode).toBe(500);
      expect(apiErr.errorCode).toBe('UNKNOWN_ERROR');
      expect(apiErr.message).toBe('An unexpected API error occurred');
    }
  });
});
