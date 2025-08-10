import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Detector } from '../src/js/detector.js';

// Mock @xenova/transformers
vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn(),
  env: {
    allowLocalModels: false,
    useBrowserCache: true
  }
}));

describe('Detector - Input Validation & Error Handling', () => {
  let detector;
  let mockPipeline;
  let mockVideo;
  let mockCanvas;
  let mockImage;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create mock pipeline
    mockPipeline = vi.fn().mockResolvedValue([
      {
        label: 'paper',
        score: 0.95,
        box: { x: 10, y: 20, width: 100, height: 200 }
      }
    ]);

    // Mock pipeline creation
    const { pipeline } = await import('@xenova/transformers');
    pipeline.mockResolvedValue(mockPipeline);

    // Create mock elements
    mockVideo = new HTMLVideoElement();
    mockVideo.videoWidth = 640;
    mockVideo.videoHeight = 480;
    mockVideo.readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
    mockVideo.networkState = 1;
    mockVideo.currentTime = 1.5;

    mockCanvas = new HTMLCanvasElement();
    mockCanvas.width = 640;
    mockCanvas.height = 480;

    mockImage = new HTMLImageElement();
    mockImage.naturalWidth = 800;
    mockImage.naturalHeight = 600;

    // Mock document.createElement
    document.createElement = vi.fn((tagName) => {
      if (tagName === 'canvas') {
        const canvas = new HTMLCanvasElement();
        canvas.getContext = vi.fn(() => ({
          drawImage: vi.fn(),
          clearRect: vi.fn()
        }));
        return canvas;
      }
      return new Element();
    });

    detector = new Detector();
    detector.model = mockPipeline; // Set model directly for testing
    detector.modelName = 'yolos-tiny';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('detect method input validation', () => {
    it('should return empty array for null input', async () => {
      const result = await detector.detect(null);
      expect(result).toEqual([]);
      expect(mockPipeline).not.toHaveBeenCalled();
    });

    it('should return empty array for undefined input', async () => {
      const result = await detector.detect(undefined);
      expect(result).toEqual([]);
      expect(mockPipeline).not.toHaveBeenCalled();
    });

    it('should return empty array for unsupported input type (error caught internally)', async () => {
      const unsupportedInput = { type: 'unsupported', constructor: { name: 'Object' } };
      
      // The implementation catches errors and returns empty array
      const result = await detector.detect(unsupportedInput);
      expect(result).toEqual([]);
      expect(mockPipeline).not.toHaveBeenCalled();
    });

    it('should handle error for complex objects gracefully', async () => {
      const complexObject = {
        someProperty: 'value',
        constructor: { name: 'CustomObject' },
        tagName: 'DIV'
      };
      
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const result = await detector.detect(complexObject);
      
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Unsupported input type for detection:', expect.any(Object));
    });

    it('should handle primitive types gracefully', async () => {
      const primitives = [
        42,
        'string',
        true
      ];

      for (const primitive of primitives) {
        const result = await detector.detect(primitive);
        expect(result).toEqual([]);
      }
    });
  });

  describe('HTMLVideoElement validation', () => {
    it('should process valid video element', async () => {
      const result = await detector.detect(mockVideo);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        label: 'paper',
        score: 0.95,
        box: { x: 10, y: 20, width: 100, height: 200 }
      });
      expect(mockPipeline).toHaveBeenCalled();
    });

    it('should return empty array when video dimensions are not available', async () => {
      mockVideo.videoWidth = 0;
      mockVideo.videoHeight = 480;
      
      const result = await detector.detect(mockVideo);
      
      expect(result).toEqual([]);
      expect(mockPipeline).not.toHaveBeenCalled();
    });

    it('should return empty array when video width is zero', async () => {
      mockVideo.videoWidth = 0;
      mockVideo.videoHeight = 480;
      
      const result = await detector.detect(mockVideo);
      
      expect(result).toEqual([]);
      expect(mockPipeline).not.toHaveBeenCalled();
    });

    it('should return empty array when video height is zero', async () => {
      mockVideo.videoWidth = 640;
      mockVideo.videoHeight = 0;
      
      const result = await detector.detect(mockVideo);
      
      expect(result).toEqual([]);
      expect(mockPipeline).not.toHaveBeenCalled();
    });

    it('should return empty array when readyState is too low', async () => {
      mockVideo.readyState = HTMLMediaElement.HAVE_METADATA;
      
      const result = await detector.detect(mockVideo);
      
      expect(result).toEqual([]);
      expect(mockPipeline).not.toHaveBeenCalled();
    });

    it('should log detailed video state when not ready', async () => {
      mockVideo.videoWidth = 0;
      mockVideo.videoHeight = 0;
      mockVideo.readyState = HTMLMediaElement.HAVE_NOTHING;
      mockVideo.networkState = 0;
      mockVideo.currentTime = 0;
      
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      
      await detector.detect(mockVideo);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Video dimensions not available:',
        {
          videoWidth: 0,
          videoHeight: 0,
          readyState: 0,
          networkState: 0
        }
      );
    });

    it('should log readyState when video is not ready for processing', async () => {
      mockVideo.readyState = HTMLMediaElement.HAVE_METADATA;
      
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      
      await detector.detect(mockVideo);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Video not ready for processing:',
        {
          readyState: 1,
          currentTime: 1.5
        }
      );
    });

    it('should handle canvas creation for video', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      
      await detector.detect(mockVideo);
      
      expect(createElementSpy).toHaveBeenCalledWith('canvas');
    });

    it('should handle canvas context creation failure', async () => {
      document.createElement = vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn(() => null) // Return null context
      }));
      
      const result = await detector.detect(mockVideo);
      
      expect(result).toEqual([]);
    });

    it('should handle drawImage failure', async () => {
      const mockCtx = {
        drawImage: vi.fn(() => {
          throw new Error('Canvas drawing failed');
        })
      };
      
      document.createElement = vi.fn(() => ({
        width: 640,
        height: 480,
        getContext: vi.fn(() => mockCtx)
      }));
      
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const result = await detector.detect(mockVideo);
      
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to draw video to canvas:', expect.any(Error));
    });
  });

  describe('HTMLCanvasElement validation', () => {
    it('should process valid canvas element directly', async () => {
      const result = await detector.detect(mockCanvas);
      
      expect(result).toHaveLength(1);
      expect(mockPipeline).toHaveBeenCalledWith(mockCanvas, expect.any(Object));
    });

    it('should return empty array for canvas with zero dimensions', async () => {
      mockCanvas.width = 0;
      mockCanvas.height = 0;
      
      const result = await detector.detect(mockCanvas);
      
      expect(result).toEqual([]);
      expect(mockPipeline).not.toHaveBeenCalled();
    });

    it('should return empty array for canvas with zero width', async () => {
      mockCanvas.width = 0;
      mockCanvas.height = 480;
      
      const result = await detector.detect(mockCanvas);
      
      expect(result).toEqual([]);
      expect(mockPipeline).not.toHaveBeenCalled();
    });

    it('should return empty array for canvas with zero height', async () => {
      mockCanvas.width = 640;
      mockCanvas.height = 0;
      
      const result = await detector.detect(mockCanvas);
      
      expect(result).toEqual([]);
      expect(mockPipeline).not.toHaveBeenCalled();
    });
  });

  describe('HTMLImageElement validation', () => {
    it('should process valid image element', async () => {
      const result = await detector.detect(mockImage);
      
      expect(result).toHaveLength(1);
      expect(mockPipeline).toHaveBeenCalled();
    });

    it('should return empty array when image dimensions are not loaded', async () => {
      mockImage.naturalWidth = 0;
      mockImage.naturalHeight = 0;
      
      const result = await detector.detect(mockImage);
      
      expect(result).toEqual([]);
      expect(mockPipeline).not.toHaveBeenCalled();
    });

    it('should return empty array when image natural width is zero', async () => {
      mockImage.naturalWidth = 0;
      mockImage.naturalHeight = 600;
      
      const result = await detector.detect(mockImage);
      
      expect(result).toEqual([]);
      expect(mockPipeline).not.toHaveBeenCalled();
    });

    it('should return empty array when image natural height is zero', async () => {
      mockImage.naturalWidth = 800;
      mockImage.naturalHeight = 0;
      
      const result = await detector.detect(mockImage);
      
      expect(result).toEqual([]);
      expect(mockPipeline).not.toHaveBeenCalled();
    });

    it('should create canvas for image processing', async () => {
      const createElementSpy = vi.spyOn(document, 'createElement');
      
      await detector.detect(mockImage);
      
      expect(createElementSpy).toHaveBeenCalledWith('canvas');
    });
  });

  describe('Model error handling', () => {
    it('should throw error when model is not initialized', async () => {
      detector.model = null;
      
      await expect(detector.detect(mockVideo)).rejects.toThrow(
        'Model not initialized. Call init() first.'
      );
    });

    it('should handle model pipeline errors gracefully', async () => {
      mockPipeline.mockRejectedValue(new Error('Model inference failed'));
      
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const result = await detector.detect(mockVideo);
      
      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Detection error:', expect.any(Error));
    });

    it('should log detailed error information', async () => {
      const modelError = new Error('Tensor shape mismatch');
      mockPipeline.mockRejectedValue(modelError);
      
      const consoleErrorSpy = vi.spyOn(console, 'error');
      await detector.detect(mockVideo);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error details:', {
        message: 'Tensor shape mismatch',
        stack: expect.any(String),
        sourceType: 'object',
        sourceConstructor: 'HTMLVideoElement'
      });
    });

    it('should handle transformers library specific errors', async () => {
      const transformersError = new Error('Unsupported input type: object');
      mockPipeline.mockRejectedValue(transformersError);
      
      const result = await detector.detect(mockVideo);
      
      expect(result).toEqual([]);
    });
  });

  describe('Result formatting', () => {
    it('should format results with box coordinates', async () => {
      mockPipeline.mockResolvedValue([{
        label: 'receipt',
        score: 0.87,
        box: { x: 15, y: 25, width: 150, height: 300 }
      }]);
      
      const result = await detector.detect(mockVideo);
      
      expect(result[0]).toMatchObject({
        label: 'receipt',
        score: 0.87,
        box: { x: 15, y: 25, width: 150, height: 300 }
      });
    });

    it('should handle bbox format results', async () => {
      mockPipeline.mockResolvedValue([{
        label: 'document',
        score: 0.92,
        bbox: [10, 20, 100, 200] // [x, y, width, height]
      }]);
      
      const result = await detector.detect(mockVideo);
      
      expect(result[0]).toMatchObject({
        label: 'document',
        score: 0.92,
        box: { x: 10, y: 20, width: 100, height: 200 }
      });
    });

    it('should handle xmin/ymin/xmax/ymax format results', async () => {
      mockPipeline.mockResolvedValue([{
        label: 'paper',
        score: 0.88,
        xmin: 10,
        ymin: 20,
        xmax: 110,
        ymax: 220
      }]);
      
      const result = await detector.detect(mockVideo);
      
      expect(result[0]).toMatchObject({
        label: 'paper',
        score: 0.88,
        box: { x: 10, y: 20, width: 100, height: 200 }
      });
    });

    it('should round coordinates to integers', async () => {
      mockPipeline.mockResolvedValue([{
        label: 'receipt',
        score: 0.95,
        box: { x: 10.7, y: 20.3, width: 100.9, height: 200.1 }
      }]);
      
      const result = await detector.detect(mockVideo);
      
      expect(result[0].box).toEqual({
        x: 11,
        y: 20,
        width: 101,
        height: 200
      });
    });

    it('should handle missing label and score', async () => {
      mockPipeline.mockResolvedValue([{
        box: { x: 10, y: 20, width: 100, height: 200 }
      }]);
      
      const result = await detector.detect(mockVideo);
      
      expect(result[0]).toMatchObject({
        label: 'object',
        score: 0,
        box: { x: 10, y: 20, width: 100, height: 200 }
      });
    });

    it('should handle empty results array', async () => {
      mockPipeline.mockResolvedValue([]);
      
      const result = await detector.detect(mockVideo);
      
      expect(result).toEqual([]);
    });

    it('should handle null results', async () => {
      mockPipeline.mockResolvedValue(null);
      
      const result = await detector.detect(mockVideo);
      
      expect(result).toEqual([]);
    });

    it('should handle non-array results', async () => {
      mockPipeline.mockResolvedValue({ not: 'an array' });
      
      const result = await detector.detect(mockVideo);
      
      expect(result).toEqual([]);
    });
  });

  describe('Edge cases and error recovery', () => {
    it('should handle video element state changes during processing', async () => {
      // Start with valid video
      const result1 = await detector.detect(mockVideo);
      expect(result1).toHaveLength(1);
      
      // Change video to invalid state
      mockVideo.videoWidth = 0;
      const result2 = await detector.detect(mockVideo);
      expect(result2).toEqual([]);
      
      // Change back to valid state
      mockVideo.videoWidth = 640;
      const result3 = await detector.detect(mockVideo);
      expect(result3).toHaveLength(1);
    });

    it('should handle concurrent detection calls', async () => {
      const promises = [
        detector.detect(mockVideo),
        detector.detect(mockVideo),
        detector.detect(mockVideo)
      ];
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result).toHaveLength(1);
      });
    });

    it('should handle very large input dimensions', async () => {
      mockVideo.videoWidth = 4096;
      mockVideo.videoHeight = 2160;
      
      const result = await detector.detect(mockVideo);
      
      expect(result).toHaveLength(1);
      expect(mockPipeline).toHaveBeenCalled();
    });

    it('should handle very small input dimensions', async () => {
      mockVideo.videoWidth = 1;
      mockVideo.videoHeight = 1;
      
      const result = await detector.detect(mockVideo);
      
      expect(result).toHaveLength(1);
      expect(mockPipeline).toHaveBeenCalled();
    });

    it('should validate canvas dimensions after creation', async () => {
      // Mock createElement to return canvas with invalid dimensions
      document.createElement = vi.fn(() => ({
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn()
        }))
      }));
      
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      const result = await detector.detect(mockVideo);
      
      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid canvas dimensions, skipping detection');
    });
  });
});