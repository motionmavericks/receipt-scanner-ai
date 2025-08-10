import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the classes before importing
const mockCameraManager = {
  init: vi.fn().mockResolvedValue({}), // Mock stream object
  captureImage: vi.fn().mockResolvedValue({}) // Mock blob object
};

const mockDetector = {
  init: vi.fn().mockResolvedValue(),
  switchModel: vi.fn().mockResolvedValue(),
  detect: vi.fn().mockResolvedValue([])
};

const mockCaptureManager = {
  shouldCapture: vi.fn().mockReturnValue(false),
  getStats: vi.fn().mockReturnValue({ stabilityFrames: 0 }),
  reset: vi.fn()
};

const mockStorageManager = {
  init: vi.fn().mockResolvedValue(),
  saveReceipt: vi.fn().mockResolvedValue('test-id'),
  getReceiptCount: vi.fn().mockResolvedValue(5)
};

const mockUIManager = {
  init: vi.fn(),
  showLoading: vi.fn(),
  hideLoading: vi.fn(),
  setVideoStream: vi.fn().mockResolvedValue(),
  showError: vi.fn(),
  updateStatus: vi.fn(),
  updateFPS: vi.fn(),
  flashCapture: vi.fn()
};

const mockGalleryManager = {
  init: vi.fn().mockResolvedValue(),
  show: vi.fn(),
  hide: vi.fn()
};

// Mock all modules
vi.mock('../src/js/camera.js', () => ({
  CameraManager: vi.fn(() => mockCameraManager)
}));

vi.mock('../src/js/detector.js', () => ({
  Detector: vi.fn(() => mockDetector)
}));

vi.mock('../src/js/capture.js', () => ({
  CaptureManager: vi.fn(() => mockCaptureManager)
}));

vi.mock('../src/js/storage.js', () => ({
  StorageManager: vi.fn(() => mockStorageManager)
}));

vi.mock('../src/js/ui.js', () => ({
  UIManager: vi.fn(() => mockUIManager)
}));

vi.mock('../src/js/gallery.js', () => ({
  GalleryManager: vi.fn(() => mockGalleryManager)
}));

// Import after mocking
import { ReceiptScanner } from '../src/js/main.js';

// Testable class that exposes private methods
class TestableReceiptScanner extends ReceiptScanner {
  isVideoReady(video) {
    return super.isVideoReady(video);
  }

  startDetectionLoop(video, overlay) {
    return super.startDetectionLoop(video, overlay);
  }

  isReceiptLike(detection) {
    return super.isReceiptLike(detection);
  }

  drawBoundingBox(ctx, detection) {
    return super.drawBoundingBox(ctx, detection);
  }
}

describe('Integration Tests - Detection Error Recovery', () => {
  let scanner;
  let mockVideo;
  let mockOverlay;
  let mockContext;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Create mock video element
    mockVideo = new HTMLVideoElement();
    mockVideo.videoWidth = 640;
    mockVideo.videoHeight = 480;
    mockVideo.readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
    mockVideo.srcObject = {
      getVideoTracks: vi.fn().mockReturnValue([{ enabled: true }])
    };

    // Create mock context
    mockContext = {
      clearRect: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      beginPath: vi.fn(),
      arc: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      strokeStyle: '#000000',
      fillStyle: '#000000',
      lineWidth: 1,
      font: '12px Arial',
      textAlign: 'start'
    };

    // Create mock overlay
    mockOverlay = new HTMLCanvasElement();
    mockOverlay.width = 640;
    mockOverlay.height = 480;
    mockOverlay.getContext = vi.fn(() => mockContext);

    // Mock DOM
    document.getElementById = vi.fn((id) => {
      if (id === 'camera-feed') return mockVideo;
      if (id === 'detection-overlay') return mockOverlay;
      return {
        addEventListener: vi.fn(),
        textContent: '',
        value: '',
        checked: false,
        classList: { add: vi.fn(), remove: vi.fn() },
        querySelector: vi.fn(() => ({ textContent: 'AUTO' }))
      };
    });

    // Mock window
    global.window = {
      ...global.window,
      requestAnimationFrame: vi.fn((cb) => {
        setTimeout(cb, 16);
        return 123;
      }),
      cancelAnimationFrame: vi.fn()
    };

    scanner = new TestableReceiptScanner();
    scanner.detector = mockDetector;
    scanner.capture = mockCaptureManager;
    scanner.ui = mockUIManager;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Detection Error Recovery Scenarios', () => {
    it('should recover from "Unsupported input type" error and reinitialize', async () => {
      // Set up detector to throw the specific error
      const unsupportedError = new Error('Unsupported input type: object');
      mockDetector.detect
        .mockRejectedValueOnce(unsupportedError)
        .mockResolvedValue([]);

      // Mock isVideoReady to simulate video becoming invalid then valid again
      const isVideoReadySpy = vi.spyOn(scanner, 'isVideoReady')
        .mockReturnValueOnce(true)   // Initial frame validation
        .mockReturnValueOnce(false)  // After error occurs
        .mockReturnValueOnce(true);  // When recovering

      const startDetectionSpy = vi.spyOn(scanner, 'startDetection');
      
      // Start the detection loop
      await scanner.startDetectionLoop(mockVideo, mockOverlay);

      // Fast forward to trigger setTimeout
      vi.runAllTimers();

      // Verify error was caught and recovery was attempted
      expect(mockUIManager.updateStatus).toHaveBeenCalledWith(
        'Camera connection lost - reconnecting...', 
        'warning'
      );
      expect(startDetectionSpy).toHaveBeenCalled();
    });

    it('should continue detection when video remains valid despite error', async () => {
      // Set up detector to throw the error
      const unsupportedError = new Error('Unsupported input type: object');
      mockDetector.detect
        .mockRejectedValueOnce(unsupportedError)
        .mockResolvedValue([]);

      // Mock isVideoReady to remain true (video is still valid)
      const isVideoReadySpy = vi.spyOn(scanner, 'isVideoReady')
        .mockReturnValue(true);

      const consoleSpy = vi.spyOn(console, 'warn');
      
      await scanner.startDetectionLoop(mockVideo, mockOverlay);

      // Should log the error but continue
      expect(consoleSpy).toHaveBeenCalledWith(
        'Video element validation failed during detection, re-checking...'
      );
    });

    it('should handle multiple consecutive errors gracefully', async () => {
      // Set up detector to throw errors multiple times
      mockDetector.detect
        .mockRejectedValueOnce(new Error('Unsupported input type: object'))
        .mockRejectedValueOnce(new Error('Model inference failed'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue([]);

      const isVideoReadySpy = vi.spyOn(scanner, 'isVideoReady')
        .mockReturnValue(true);

      const consoleSpy = vi.spyOn(console, 'error');
      
      // Mock requestAnimationFrame to run multiple times
      let frameCount = 0;
      global.window.requestAnimationFrame = vi.fn((cb) => {
        frameCount++;
        if (frameCount <= 12) { // Run enough frames to hit detection calls
          setTimeout(cb, 16);
        }
        return frameCount;
      });

      await scanner.startDetectionLoop(mockVideo, mockOverlay);
      vi.runAllTimers();

      // Should have logged multiple errors
      expect(consoleSpy).toHaveBeenCalledTimes(3);
    });

    it('should skip detection when video is not ready during loop', async () => {
      const isVideoReadySpy = vi.spyOn(scanner, 'isVideoReady')
        .mockReturnValueOnce(true)  // Initial validation
        .mockReturnValue(false);    // Frame validation fails

      const consoleSpy = vi.spyOn(console, 'warn');
      
      // Mock requestAnimationFrame to run a few times
      let frameCount = 0;
      global.window.requestAnimationFrame = vi.fn((cb) => {
        frameCount++;
        if (frameCount <= 6) { // Run enough frames to test detection skipping
          setTimeout(cb, 16);
        }
        return frameCount;
      });

      await scanner.startDetectionLoop(mockVideo, mockOverlay);
      vi.runAllTimers();

      expect(consoleSpy).toHaveBeenCalledWith('Video not ready for detection, skipping frame');
      expect(mockDetector.detect).not.toHaveBeenCalled();
    });

    it('should update overlay dimensions when video dimensions change', async () => {
      // Start with one size
      mockVideo.videoWidth = 640;
      mockVideo.videoHeight = 480;
      mockOverlay.width = 320;
      mockOverlay.height = 240;

      // Mock requestAnimationFrame to run once
      global.window.requestAnimationFrame = vi.fn((cb) => {
        setTimeout(cb, 16);
        return 1;
      });

      await scanner.startDetectionLoop(mockVideo, mockOverlay);
      vi.runAllTimers();

      // Overlay should match video dimensions
      expect(mockOverlay.width).toBe(640);
      expect(mockOverlay.height).toBe(480);
    });
  });

  describe('Video State Validation Edge Cases', () => {
    it('should handle video element with no srcObject', () => {
      mockVideo.srcObject = null;
      
      const result = scanner.isVideoReady(mockVideo);
      
      // Should still be considered ready if other conditions are met
      expect(result).toBe(true);
    });

    it('should handle video element with empty tracks array', () => {
      mockVideo.srcObject = {
        getVideoTracks: vi.fn().mockReturnValue([])
      };
      
      const result = scanner.isVideoReady(mockVideo);
      
      expect(result).toBe(false);
    });

    it('should handle video element with disabled track', () => {
      mockVideo.srcObject = {
        getVideoTracks: vi.fn().mockReturnValue([{ enabled: false }])
      };
      
      const result = scanner.isVideoReady(mockVideo);
      
      expect(result).toBe(false);
    });

    it('should handle video state transitions correctly', () => {
      // Start with invalid video
      mockVideo.videoWidth = 0;
      expect(scanner.isVideoReady(mockVideo)).toBe(false);
      
      // Make video valid
      mockVideo.videoWidth = 640;
      mockVideo.videoHeight = 480;
      expect(scanner.isVideoReady(mockVideo)).toBe(true);
      
      // Make readyState invalid
      mockVideo.readyState = HTMLMediaElement.HAVE_METADATA;
      expect(scanner.isVideoReady(mockVideo)).toBe(false);
      
      // Restore readyState
      mockVideo.readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
      expect(scanner.isVideoReady(mockVideo)).toBe(true);
    });
  });

  describe('Detection Loop Performance', () => {
    it('should only run detection every 3rd frame', async () => {
      mockDetector.detect.mockResolvedValue([]);
      
      // Mock requestAnimationFrame to run exactly 9 times
      let frameCount = 0;
      global.window.requestAnimationFrame = vi.fn((cb) => {
        frameCount++;
        if (frameCount <= 9) {
          setTimeout(cb, 16);
        }
        return frameCount;
      });

      await scanner.startDetectionLoop(mockVideo, mockOverlay);
      vi.runAllTimers();

      // Should only call detect 3 times (frames 3, 6, 9)
      expect(mockDetector.detect).toHaveBeenCalledTimes(3);
    });

    it('should update FPS counter correctly', async () => {
      mockDetector.detect.mockResolvedValue([]);
      
      // Mock Date.now to simulate 1 second passing
      let currentTime = 0;
      vi.spyOn(Date, 'now').mockImplementation(() => {
        currentTime += 100; // Each call advances time by 100ms
        return currentTime;
      });

      // Mock requestAnimationFrame to run 10 times (simulating ~1 second)
      let frameCount = 0;
      global.window.requestAnimationFrame = vi.fn((cb) => {
        frameCount++;
        if (frameCount <= 10) {
          setTimeout(cb, 16);
        }
        return frameCount;
      });

      await scanner.startDetectionLoop(mockVideo, mockOverlay);
      vi.runAllTimers();

      // Should have updated FPS
      expect(mockUIManager.updateFPS).toHaveBeenCalled();
    });
  });

  describe('Detection Results Processing', () => {
    it('should process receipt-like detections correctly', async () => {
      const mockDetections = [
        {
          label: 'paper',
          score: 0.9,
          box: { x: 100, y: 100, width: 200, height: 300 }
        },
        {
          label: 'person',
          score: 0.8,
          box: { x: 200, y: 200, width: 150, height: 200 }
        }
      ];

      mockDetector.detect.mockResolvedValue(mockDetections);
      scanner.settings = { confidenceThreshold: 0.85 };

      // Mock receipt-like detection
      const isReceiptLikeSpy = vi.spyOn(scanner, 'isReceiptLike')
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const drawBoundingBoxSpy = vi.spyOn(scanner, 'drawBoundingBox')
        .mockImplementation(() => {});

      // Mock requestAnimationFrame to run once
      let frameCount = 0;
      global.window.requestAnimationFrame = vi.fn((cb) => {
        frameCount++;
        if (frameCount <= 3) { // Run enough to trigger detection
          setTimeout(cb, 16);
        }
        return frameCount;
      });

      await scanner.startDetectionLoop(mockVideo, mockOverlay);
      vi.runAllTimers();

      // Should only process receipt-like detection above threshold
      expect(drawBoundingBoxSpy).toHaveBeenCalledTimes(1);
      expect(drawBoundingBoxSpy).toHaveBeenCalledWith(mockContext, mockDetections[0]);
    });

    it('should trigger auto-capture when conditions are met', async () => {
      const mockDetection = {
        label: 'receipt',
        score: 0.95,
        box: { x: 100, y: 100, width: 200, height: 300 }
      };

      mockDetector.detect.mockResolvedValue([mockDetection]);
      scanner.isAutoMode = true;
      scanner.settings = { confidenceThreshold: 0.8 };

      // Mock capture manager to trigger capture
      mockCaptureManager.shouldCapture.mockReturnValue(true);

      const isReceiptLikeSpy = vi.spyOn(scanner, 'isReceiptLike')
        .mockReturnValue(true);

      const performCaptureSpy = vi.spyOn(scanner, 'performCapture')
        .mockResolvedValue();

      // Mock requestAnimationFrame to run once
      let frameCount = 0;
      global.window.requestAnimationFrame = vi.fn((cb) => {
        frameCount++;
        if (frameCount <= 3) {
          setTimeout(cb, 16);
        }
        return frameCount;
      });

      await scanner.startDetectionLoop(mockVideo, mockOverlay);
      vi.runAllTimers();

      expect(performCaptureSpy).toHaveBeenCalled();
      expect(mockCaptureManager.reset).toHaveBeenCalled();
    });

    it('should update stability status when not capturing', async () => {
      const mockDetection = {
        label: 'receipt',
        score: 0.95,
        box: { x: 100, y: 100, width: 200, height: 300 }
      };

      mockDetector.detect.mockResolvedValue([mockDetection]);
      scanner.isAutoMode = true;
      scanner.settings = { confidenceThreshold: 0.8 };

      // Mock capture manager to not trigger capture
      mockCaptureManager.shouldCapture.mockReturnValue(false);

      const isReceiptLikeSpy = vi.spyOn(scanner, 'isReceiptLike')
        .mockReturnValue(true);

      const updateStabilityStatusSpy = vi.spyOn(scanner, 'updateStabilityStatus')
        .mockImplementation(() => {});

      // Mock requestAnimationFrame to run once
      let frameCount = 0;
      global.window.requestAnimationFrame = vi.fn((cb) => {
        frameCount++;
        if (frameCount <= 3) {
          setTimeout(cb, 16);
        }
        return frameCount;
      });

      await scanner.startDetectionLoop(mockVideo, mockOverlay);
      vi.runAllTimers();

      expect(updateStabilityStatusSpy).toHaveBeenCalledWith(mockDetection);
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle complete error recovery workflow', async () => {
      // Simulate the complete error and recovery workflow
      const unsupportedError = new Error('Unsupported input type: object');
      
      // First call fails, subsequent calls succeed
      mockDetector.detect
        .mockRejectedValueOnce(unsupportedError)
        .mockResolvedValue([]);

      // Video becomes invalid then valid again
      const isVideoReadySpy = vi.spyOn(scanner, 'isVideoReady')
        .mockReturnValueOnce(true)   // Initial validation
        .mockReturnValueOnce(false)  // During error handling
        .mockReturnValue(true);      // After recovery

      const startDetectionSpy = vi.spyOn(scanner, 'startDetection');
      const consoleSpy = vi.spyOn(console, 'error');

      // Start detection loop
      await scanner.startDetectionLoop(mockVideo, mockOverlay);
      
      // Fast forward timers to trigger recovery
      vi.runAllTimers();

      // Verify the complete workflow
      expect(consoleSpy).toHaveBeenCalledWith('Detection failed:', 'Unsupported input type: object');
      expect(mockUIManager.updateStatus).toHaveBeenCalledWith('Camera connection lost - reconnecting...', 'warning');
      expect(startDetectionSpy).toHaveBeenCalled();
    });

    it('should maintain performance during error recovery', async () => {
      // Test that error recovery doesn't impact normal detection performance
      const errors = [
        new Error('Unsupported input type: object'),
        null, // Success
        null, // Success
        new Error('Network timeout'),
        null  // Success
      ];

      let callCount = 0;
      mockDetector.detect.mockImplementation(() => {
        const error = errors[callCount % errors.length];
        callCount++;
        
        if (error) {
          return Promise.reject(error);
        }
        return Promise.resolve([]);
      });

      const isVideoReadySpy = vi.spyOn(scanner, 'isVideoReady')
        .mockReturnValue(true);

      // Run multiple frames
      let frameCount = 0;
      global.window.requestAnimationFrame = vi.fn((cb) => {
        frameCount++;
        if (frameCount <= 15) { // Run enough frames to test multiple errors
          setTimeout(cb, 16);
        }
        return frameCount;
      });

      await scanner.startDetectionLoop(mockVideo, mockOverlay);
      vi.runAllTimers();

      // Should have attempted multiple detections despite errors
      expect(mockDetector.detect).toHaveBeenCalledTimes(5); // Every 3rd frame
    });
  });

  describe('isReceiptLike method', () => {
    it('should identify receipt-like labels', () => {
      const receiptDetections = [
        { label: 'paper', score: 0.7 },
        { label: 'document', score: 0.8 },
        { label: 'receipt', score: 0.9 },
        { label: 'invoice', score: 0.75 },
        { label: 'bill', score: 0.85 },
        { label: 'ticket', score: 0.6 }
      ];

      receiptDetections.forEach(detection => {
        const result = scanner.isReceiptLike(detection);
        expect(result).toBe(true);
      });
    });

    it('should identify high-confidence detections regardless of label', () => {
      const highConfidenceDetection = { label: 'unknown', score: 0.9 };
      
      const result = scanner.isReceiptLike(highConfidenceDetection);
      
      expect(result).toBe(true);
    });

    it('should reject non-receipt labels with low confidence', () => {
      const nonReceiptDetection = { label: 'person', score: 0.6 };
      
      const result = scanner.isReceiptLike(nonReceiptDetection);
      
      expect(result).toBe(false);
    });
  });
});