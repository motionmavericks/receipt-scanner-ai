import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ReceiptScanner } from '../src/js/main.js';

// Mock all dependencies
vi.mock('../src/js/camera.js', () => ({
  CameraManager: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(new MediaStream()),
    captureImage: vi.fn().mockResolvedValue(new Blob())
  }))
}));

vi.mock('../src/js/detector.js', () => ({
  Detector: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(),
    switchModel: vi.fn().mockResolvedValue(),
    detect: vi.fn().mockResolvedValue([])
  }))
}));

vi.mock('../src/js/capture.js', () => ({
  CaptureManager: vi.fn().mockImplementation(() => ({
    shouldCapture: vi.fn().mockReturnValue(false),
    getStats: vi.fn().mockReturnValue({ stabilityFrames: 0 }),
    reset: vi.fn()
  }))
}));

vi.mock('../src/js/storage.js', () => ({
  StorageManager: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(),
    saveReceipt: vi.fn().mockResolvedValue('test-id'),
    getReceiptCount: vi.fn().mockResolvedValue(5)
  }))
}));

vi.mock('../src/js/ui.js', () => ({
  UIManager: vi.fn().mockImplementation(() => ({
    init: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    setVideoStream: vi.fn().mockResolvedValue(),
    showError: vi.fn(),
    updateStatus: vi.fn(),
    updateFPS: vi.fn(),
    flashCapture: vi.fn()
  }))
}));

vi.mock('../src/js/gallery.js', () => ({
  GalleryManager: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(),
    show: vi.fn(),
    hide: vi.fn(),
    selectAll: vi.fn(),
    exportSelected: vi.fn(),
    deleteSelected: vi.fn()
  }))
}));

// Create a test-specific version of ReceiptScanner to access private methods
class TestableReceiptScanner extends ReceiptScanner {
  // Expose private methods for testing
  isVideoReady(video) {
    return super.isVideoReady(video);
  }

  startDetectionLoop(video, overlay) {
    return super.startDetectionLoop(video, overlay);
  }
}

describe('ReceiptScanner - Video Validation', () => {
  let scanner;
  let mockVideo;
  let mockMediaStream;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create a mock video element
    mockVideo = new HTMLVideoElement();
    
    // Mock MediaStream
    mockMediaStream = {
      getVideoTracks: vi.fn().mockReturnValue([
        { enabled: true, readyState: 'live' }
      ])
    };

    // Mock DOM elements
    document.getElementById = vi.fn((id) => {
      if (id === 'camera-feed') return mockVideo;
      if (id === 'detection-overlay') {
        const overlay = new HTMLCanvasElement();
        overlay.getContext = vi.fn(() => ({
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
          stroke: vi.fn()
        }));
        return overlay;
      }
      return {
        addEventListener: vi.fn(),
        textContent: '',
        value: '',
        checked: false,
        classList: { add: vi.fn(), remove: vi.fn() },
        querySelector: vi.fn(() => ({ textContent: 'AUTO' }))
      };
    });

    scanner = new TestableReceiptScanner();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isVideoReady', () => {
    it('should return false for null video', () => {
      expect(scanner.isVideoReady(null)).toBe(false);
    });

    it('should return false for undefined video', () => {
      expect(scanner.isVideoReady(undefined)).toBe(false);
    });

    it('should return false for non-video element', () => {
      const div = { constructor: { name: 'HTMLDivElement' } };
      expect(scanner.isVideoReady(div)).toBe(false);
    });

    it('should return false when video dimensions are not available', () => {
      mockVideo.videoWidth = 0;
      mockVideo.videoHeight = 0;
      mockVideo.readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
      
      expect(scanner.isVideoReady(mockVideo)).toBe(false);
    });

    it('should return false when video width is missing', () => {
      mockVideo.videoWidth = 0;
      mockVideo.videoHeight = 480;
      mockVideo.readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
      
      expect(scanner.isVideoReady(mockVideo)).toBe(false);
    });

    it('should return false when video height is missing', () => {
      mockVideo.videoWidth = 640;
      mockVideo.videoHeight = 0;
      mockVideo.readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
      
      expect(scanner.isVideoReady(mockVideo)).toBe(false);
    });

    it('should return false when readyState is too low', () => {
      mockVideo.videoWidth = 640;
      mockVideo.videoHeight = 480;
      mockVideo.readyState = HTMLMediaElement.HAVE_METADATA;
      
      expect(scanner.isVideoReady(mockVideo)).toBe(false);
    });

    it('should return false when no video tracks are available', () => {
      mockVideo.videoWidth = 640;
      mockVideo.videoHeight = 480;
      mockVideo.readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
      mockVideo.srcObject = {
        getVideoTracks: vi.fn().mockReturnValue([])
      };
      
      expect(scanner.isVideoReady(mockVideo)).toBe(false);
    });

    it('should return false when video track is disabled', () => {
      mockVideo.videoWidth = 640;
      mockVideo.videoHeight = 480;
      mockVideo.readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
      mockVideo.srcObject = {
        getVideoTracks: vi.fn().mockReturnValue([{ enabled: false }])
      };
      
      expect(scanner.isVideoReady(mockVideo)).toBe(false);
    });

    it('should return true when video is fully ready', () => {
      mockVideo.videoWidth = 640;
      mockVideo.videoHeight = 480;
      mockVideo.readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
      mockVideo.srcObject = mockMediaStream;
      
      expect(scanner.isVideoReady(mockVideo)).toBe(true);
    });

    it('should return true with higher readyState', () => {
      mockVideo.videoWidth = 1920;
      mockVideo.videoHeight = 1080;
      mockVideo.readyState = HTMLMediaElement.HAVE_ENOUGH_DATA;
      mockVideo.srcObject = mockMediaStream;
      
      expect(scanner.isVideoReady(mockVideo)).toBe(true);
    });

    it('should handle video with no srcObject', () => {
      mockVideo.videoWidth = 640;
      mockVideo.videoHeight = 480;
      mockVideo.readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
      mockVideo.srcObject = null;
      
      expect(scanner.isVideoReady(mockVideo)).toBe(true);
    });
  });

  describe('startDetection', () => {
    it('should not start detection if video element is missing', () => {
      document.getElementById = vi.fn((id) => {
        if (id === 'camera-feed') return null;
        return { getContext: vi.fn() };
      });

      const consoleSpy = vi.spyOn(console, 'error');
      scanner.startDetection();
      
      expect(consoleSpy).toHaveBeenCalledWith('Camera feed element not found for detection');
      expect(scanner.detectionLoop).toBe(null);
    });

    it('should not start detection if video is not HTMLVideoElement', () => {
      document.getElementById = vi.fn((id) => {
        if (id === 'camera-feed') return { constructor: { name: 'HTMLDivElement' } };
        return { getContext: vi.fn() };
      });

      const consoleSpy = vi.spyOn(console, 'error');
      scanner.startDetection();
      
      expect(consoleSpy).toHaveBeenCalledWith('Camera feed element is not a video element:', 'HTMLDivElement');
      expect(scanner.detectionLoop).toBe(null);
    });

    it('should not start detection if overlay element is missing', () => {
      document.getElementById = vi.fn((id) => {
        if (id === 'camera-feed') return mockVideo;
        if (id === 'detection-overlay') return null;
        return {};
      });

      const consoleSpy = vi.spyOn(console, 'error');
      scanner.startDetection();
      
      expect(consoleSpy).toHaveBeenCalledWith('Detection overlay element not found');
      expect(scanner.detectionLoop).toBe(null);
    });

    it('should wait for video to be ready if not initially ready', () => {
      // Make video not ready initially
      mockVideo.videoWidth = 0;
      mockVideo.videoHeight = 0;
      mockVideo.readyState = HTMLMediaElement.HAVE_NOTHING;

      const consoleSpy = vi.spyOn(console, 'log');
      scanner.startDetection();
      
      expect(consoleSpy).toHaveBeenCalledWith('Video not ready yet, waiting for video to load...');
      expect(scanner.detectionLoop).toBe(null);
    });

    it('should start detection immediately if video is ready', () => {
      mockVideo.videoWidth = 640;
      mockVideo.videoHeight = 480;
      mockVideo.readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
      mockVideo.srcObject = mockMediaStream;

      const startDetectionLoopSpy = vi.spyOn(scanner, 'startDetectionLoop').mockImplementation(() => {});
      scanner.startDetection();
      
      expect(startDetectionLoopSpy).toHaveBeenCalled();
    });

    it('should timeout if video never becomes ready', async () => {
      mockVideo.videoWidth = 0;
      mockVideo.videoHeight = 0;
      mockVideo.readyState = HTMLMediaElement.HAVE_NOTHING;

      const consoleSpy = vi.spyOn(console, 'error');
      const showErrorSpy = vi.spyOn(scanner.ui, 'showError');
      
      // Mock setTimeout to immediately execute the callback 50 times
      let timeoutCount = 0;
      vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        timeoutCount++;
        if (timeoutCount <= 50) {
          callback();
        }
      });

      scanner.startDetection();
      
      expect(consoleSpy).toHaveBeenCalledWith('Video failed to become ready within timeout period');
      expect(showErrorSpy).toHaveBeenCalledWith('Camera failed to initialize properly. Please refresh the page.');
    });

    it('should eventually start detection when video becomes ready during wait', async () => {
      mockVideo.videoWidth = 0;
      mockVideo.videoHeight = 0;
      mockVideo.readyState = HTMLMediaElement.HAVE_NOTHING;

      const startDetectionLoopSpy = vi.spyOn(scanner, 'startDetectionLoop').mockImplementation(() => {});
      
      // Mock setTimeout to make video ready after 3 attempts
      let timeoutCount = 0;
      vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        timeoutCount++;
        if (timeoutCount === 3) {
          // Make video ready on third attempt
          mockVideo.videoWidth = 640;
          mockVideo.videoHeight = 480;
          mockVideo.readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
          mockVideo.srcObject = mockMediaStream;
        }
        callback();
      });

      scanner.startDetection();
      
      expect(startDetectionLoopSpy).toHaveBeenCalled();
    });
  });

  describe('Detection loop error handling', () => {
    let mockDetector;
    let mockOverlay;

    beforeEach(() => {
      mockVideo.videoWidth = 640;
      mockVideo.videoHeight = 480;
      mockVideo.readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
      mockVideo.srcObject = mockMediaStream;

      mockOverlay = new HTMLCanvasElement();
      mockOverlay.width = 640;
      mockOverlay.height = 480;
      mockOverlay.getContext = vi.fn(() => ({
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
      }));

      mockDetector = {
        detect: vi.fn().mockResolvedValue([])
      };
      scanner.detector = mockDetector;
    });

    it('should handle "Unsupported input type" error gracefully', async () => {
      const unsupportedError = new Error('Unsupported input type: object');
      mockDetector.detect.mockRejectedValue(unsupportedError);

      const consoleSpy = vi.spyOn(console, 'error');
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      
      // Mock isVideoReady to return false after error (simulating invalid video)
      const isVideoReadySpy = vi.spyOn(scanner, 'isVideoReady')
        .mockReturnValueOnce(true)  // Initial call
        .mockReturnValueOnce(false) // After error
        .mockReturnValueOnce(false); // Validation call

      const updateStatusSpy = vi.spyOn(scanner.ui, 'updateStatus');
      const startDetectionSpy = vi.spyOn(scanner, 'startDetection');

      // Mock setTimeout to prevent infinite recursion in tests
      vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        // Don't execute the callback to prevent recursion
      });

      await scanner.startDetectionLoop(mockVideo, mockOverlay);

      expect(consoleSpy).toHaveBeenCalledWith('Detection failed:', 'Unsupported input type: object');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Video element validation failed during detection, re-checking...');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Video is no longer ready, pausing detection');
      expect(updateStatusSpy).toHaveBeenCalledWith('Camera connection lost - reconnecting...', 'warning');
    });

    it('should continue detection for other types of errors', async () => {
      const genericError = new Error('Some other detection error');
      mockDetector.detect.mockRejectedValue(genericError);

      const consoleSpy = vi.spyOn(console, 'error');
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      
      await scanner.startDetectionLoop(mockVideo, mockOverlay);

      expect(consoleSpy).toHaveBeenCalledWith('Detection failed:', 'Some other detection error');
      expect(consoleWarnSpy).toHaveBeenCalledWith('Continuing detection despite error:', 'Some other detection error');
    });

    it('should skip detection frame when video is not ready', async () => {
      // Mock isVideoReady to return false for frame validation
      const isVideoReadySpy = vi.spyOn(scanner, 'isVideoReady')
        .mockReturnValue(false);

      const consoleWarnSpy = vi.spyOn(console, 'warn');
      const detectSpy = vi.spyOn(mockDetector, 'detect');

      await scanner.startDetectionLoop(mockVideo, mockOverlay);

      expect(consoleWarnSpy).toHaveBeenCalledWith('Video not ready for detection, skipping frame');
      expect(detectSpy).not.toHaveBeenCalled();
    });

    it('should reinitialize detection when video becomes invalid during runtime', async () => {
      const inputTypeError = new Error('Unsupported input type: object');
      mockDetector.detect.mockRejectedValue(inputTypeError);

      // Mock isVideoReady sequence: true initially, then false after error
      const isVideoReadySpy = vi.spyOn(scanner, 'isVideoReady')
        .mockReturnValueOnce(true)  // Initial validation
        .mockReturnValueOnce(false); // After error occurs

      const startDetectionSpy = vi.spyOn(scanner, 'startDetection');
      
      // Mock setTimeout to track the reinitialize call
      const timeoutSpy = vi.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        expect(delay).toBe(1000);
        // Don't execute to prevent infinite recursion in tests
      });

      await scanner.startDetectionLoop(mockVideo, mockOverlay);

      expect(timeoutSpy).toHaveBeenCalled();
    });

    it('should update overlay dimensions to match video', async () => {
      mockVideo.videoWidth = 1920;
      mockVideo.videoHeight = 1080;
      mockOverlay.width = 640;
      mockOverlay.height = 480;

      await scanner.startDetectionLoop(mockVideo, mockOverlay);

      expect(mockOverlay.width).toBe(1920);
      expect(mockOverlay.height).toBe(1080);
    });

    it('should only run detection every 3rd frame', async () => {
      const detectSpy = vi.spyOn(mockDetector, 'detect').mockResolvedValue([]);
      
      // Mock requestAnimationFrame to run the loop multiple times
      let frameCount = 0;
      vi.spyOn(global, 'requestAnimationFrame').mockImplementation((callback) => {
        frameCount++;
        if (frameCount <= 6) { // Run 6 frames
          callback();
        }
      });

      await scanner.startDetectionLoop(mockVideo, mockOverlay);

      // Should only detect on frames 3 and 6 (every 3rd frame)
      expect(detectSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error recovery scenarios', () => {
    it('should recover when video element becomes valid again', async () => {
      // Start with invalid video
      mockVideo.videoWidth = 0;
      mockVideo.videoHeight = 0;
      
      const waitForVideoSpy = vi.fn();
      let callCount = 0;
      
      vi.spyOn(global, 'setTimeout').mockImplementation((callback) => {
        callCount++;
        if (callCount === 3) {
          // Make video valid on 3rd attempt
          mockVideo.videoWidth = 640;
          mockVideo.videoHeight = 480;
          mockVideo.readyState = HTMLMediaElement.HAVE_CURRENT_DATA;
          mockVideo.srcObject = mockMediaStream;
        }
        callback();
      });

      const startDetectionLoopSpy = vi.spyOn(scanner, 'startDetectionLoop').mockImplementation(() => {});
      scanner.startDetection();

      expect(startDetectionLoopSpy).toHaveBeenCalled();
    });

    it('should handle rapid video state changes', () => {
      // Test rapid changes between ready/not ready states
      const isVideoReadyStates = [true, false, true, false, true];
      let callCount = 0;
      
      vi.spyOn(scanner, 'isVideoReady').mockImplementation(() => {
        return isVideoReadyStates[callCount++ % isVideoReadyStates.length];
      });

      // Should handle rapid state changes without crashing
      expect(() => {
        scanner.startDetection();
      }).not.toThrow();
    });

    it('should properly clean up detection loop on stop', () => {
      const cancelAnimationFrameSpy = vi.spyOn(global, 'cancelAnimationFrame');
      
      scanner.detectionLoop = 123; // Mock animation frame ID
      scanner.stopDetection();

      expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(123);
      expect(scanner.detectionLoop).toBe(null);
    });
  });
});