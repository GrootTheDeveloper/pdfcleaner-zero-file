import { vi, describe, it, expect } from 'vitest';

// Mock pdfjs-dist and pdf-lib since we only test pure utilities in this spec
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  version: 'mock-version',
}));
vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn(),
  },
}));

import { parsePageRange } from './pdf-handler';

describe('pdf-handler page range parsing', () => {
  it('should return all pages if range string is empty', () => {
    const result = parsePageRange('', 5);
    expect(result.pages).toEqual([1, 2, 3, 4, 5]);
    expect(result.error).toBeUndefined();
  });

  it('should parse single pages', () => {
    const result = parsePageRange('1, 3, 5', 5);
    expect(result.pages).toEqual([1, 3, 5]);
    expect(result.error).toBeUndefined();
  });

  it('should parse page ranges', () => {
    const result = parsePageRange('1-3, 5', 5);
    expect(result.pages).toEqual([1, 2, 3, 5]);
    expect(result.error).toBeUndefined();
  });

  it('should ignore whitespace and handle trailing commas', () => {
    const result = parsePageRange(' 1 - 3 ,  5 , ', 5);
    expect(result.pages).toEqual([1, 2, 3, 5]);
    expect(result.error).toBeUndefined();
  });

  it('should sort and deduplicate pages', () => {
    const result = parsePageRange('3, 1-3, 2, 5-5', 5);
    expect(result.pages).toEqual([1, 2, 3, 5]);
    expect(result.error).toBeUndefined();
  });

  it('should return error for invalid page range bounds', () => {
    const result = parsePageRange('1-6', 5);
    expect(result.pages).toEqual([]);
    expect(result.error).toContain('Invalid page range');
  });

  it('should return error for start page greater than end page', () => {
    const result = parsePageRange('3-1', 5);
    expect(result.pages).toEqual([]);
    expect(result.error).toContain('Start page cannot be greater than end page');
  });

  it('should return error for invalid characters', () => {
    const result = parsePageRange('1-3, abc', 5);
    expect(result.pages).toEqual([]);
    expect(result.error).toContain('Invalid format');
  });
});
