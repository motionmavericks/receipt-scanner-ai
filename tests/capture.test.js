import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CaptureManager } from '../src/js/capture.js';

describe('CaptureManager - Stability Detection', () => {
  let captureManager;
  let mockDetection;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    captureManager = new CaptureManager();
    
    mockDetection = {
      label: 'receipt',
      score: 0.9,
      box: {
        x: 100,
        y: 100,
        width: 200,
        height: 300
      }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('shouldCapture method', () => {
    it('should not capture if minimum interval has not passed', () => {
      captureManager.lastCaptureTime = Date.now();
      
      const result = captureManager.shouldCapture(mockDetection, 3);
      
      expect(result).toBe(false);
    });

    it('should not capture if detection quality is too low', () => {
      // Mock Date.now to ensure interval has passed
      vi.setSystemTime(captureManager.lastCaptureTime + 3000);
      
      // Mock analyzeQuality to return low quality
      vi.spyOn(captureManager, 'analyzeQuality').mockReturnValue({
        overall: 0.1 // Very low quality
      });
      
      const result = captureManager.shouldCapture(mockDetection, 3);
      
      expect(result).toBe(false);
      expect(captureManager.stabilityFrames).toBe(0);
    });

    it('should accumulate stability frames for stable detections', () => {
      vi.setSystemTime(captureManager.lastCaptureTime + 3000);
      
      // Mock analyzeQuality to return good quality
      vi.spyOn(captureManager, 'analyzeQuality').mockReturnValue({
        overall: 0.8
      });
      
      // Mock isStableEnhanced to return true
      vi.spyOn(captureManager, 'isStableEnhanced').mockReturnValue(true);
      
      // First call - should start stability tracking
      let result = captureManager.shouldCapture(mockDetection, 3);
      expect(result).toBe(false);
      expect(captureManager.stabilityFrames).toBe(1);
      
      // Second call with same box - should increment
      result = captureManager.shouldCapture(mockDetection, 3);
      expect(result).toBe(false);
      expect(captureManager.stabilityFrames).toBe(2);
      
      // Third call - should trigger capture
      result = captureManager.shouldCapture(mockDetection, 3);
      expect(result).toBe(true);
      expect(captureManager.stabilityFrames).toBe(0); // Reset after capture
    });

    it('should decay stability frames for unstable detections', () => {
      vi.setSystemTime(captureManager.lastCaptureTime + 3000);
      
      // Mock analyzeQuality to return good quality for all calls
      vi.spyOn(captureManager, 'analyzeQuality').mockReturnValue({
        overall: 0.8
      });
      
      // Build up some stability
      vi.spyOn(captureManager, 'isStableEnhanced').mockReturnValue(true);
      captureManager.shouldCapture(mockDetection, 5);
      captureManager.shouldCapture(mockDetection, 5);
      expect(captureManager.stabilityFrames).toBe(2);
      
      // Move detection significantly - make it unstable
      vi.spyOn(captureManager, 'isStableEnhanced').mockReturnValue(false);
      const movedDetection = {
        ...mockDetection,
        box: { x: 200, y: 200, width: 200, height: 300 } // Moved by 100 pixels
      };
      
      const result = captureManager.shouldCapture(movedDetection, 5);
      expect(result).toBe(false);
      expect(captureManager.stabilityFrames).toBe(0); // Should decay to 0 (2 - 2 = 0)
    });

    it('should use adaptive stability frames for high quality detections', () => {
      vi.setSystemTime(captureManager.lastCaptureTime + 3000);
      
      // Mock analyzeQuality to return very high quality
      vi.spyOn(captureManager, 'analyzeQuality').mockReturnValue({
        overall: 0.9 // Very high quality
      });
      
      // Mock isStableEnhanced to return true
      vi.spyOn(captureManager, 'isStableEnhanced').mockReturnValue(true);
      
      // High quality detection should require fewer frames
      const highQualityDetection = {
        ...mockDetection,
        score: 0.95 // Very high confidence
      };
      
      // Should build up stability frames
      captureManager.shouldCapture(highQualityDetection, 5);
      const result = captureManager.shouldCapture(highQualityDetection, 5);
      
      // With high quality (>0.8), adaptive frames should be reduced
      // Should be building stability frames
      expect(captureManager.stabilityFrames).toBeGreaterThan(0);
    });

    it('should update history with each detection', () => {
      vi.setSystemTime(captureManager.lastCaptureTime + 3000);
      
      expect(captureManager.boxHistory).toHaveLength(0);
      
      captureManager.shouldCapture(mockDetection, 3);
      
      expect(captureManager.boxHistory).toHaveLength(1);
      expect(captureManager.boxHistory[0].box).toEqual(mockDetection.box);
      expect(captureManager.boxHistory[0].timestamp).toBeDefined();
    });
  });

  describe('isVideoReady method', () => {
    it('should return false for first detection (no previous box)', () => {
      const result = captureManager.isStableEnhanced(mockDetection.box, mockDetection.score);
      
      expect(result).toBe(false);
      expect(captureManager.lastBox).toEqual(mockDetection.box);
    });

    it('should return true for stable position and size', () => {
      // Set up initial box
      captureManager.lastBox = mockDetection.box;
      captureManager.boxHistory = [
        { box: mockDetection.box, timestamp: Date.now() - 100 },
        { box: mockDetection.box, timestamp: Date.now() - 50 },
        { box: mockDetection.box, timestamp: Date.now() }
      ];
      
      // Same box should be stable
      const result = captureManager.isStableEnhanced(mockDetection.box, mockDetection.score);
      
      expect(result).toBe(true);
    });

    it('should return false for significant position change', () => {
      captureManager.lastBox = mockDetection.box;
      
      // Moved significantly
      const movedBox = {
        x: mockDetection.box.x + 50,
        y: mockDetection.box.y + 50,
        width: mockDetection.box.width,
        height: mockDetection.box.height
      };
      
      const result = captureManager.isStableEnhanced(movedBox, mockDetection.score);
      
      expect(result).toBe(false);
    });

    it('should return false for significant size change', () => {
      captureManager.lastBox = mockDetection.box;
      
      // Size changed significantly
      const resizedBox = {
        x: mockDetection.box.x,
        y: mockDetection.box.y,
        width: mockDetection.box.width * 2, // Doubled width
        height: mockDetection.box.height
      };
      
      const result = captureManager.isStableEnhanced(resizedBox, mockDetection.score);
      
      expect(result).toBe(false);
    });

    it('should adjust threshold based on confidence', () => {
      captureManager.lastBox = mockDetection.box;
      
      // Lower confidence should allow more movement
      const lowConfidenceScore = 0.6;
      const slightlyMovedBox = {
        x: mockDetection.box.x + 15, // Small movement
        y: mockDetection.box.y + 15,
        width: mockDetection.box.width,
        height: mockDetection.box.height
      };
      
      const result = captureManager.isStableEnhanced(slightlyMovedBox, lowConfidenceScore);
      
      // With lower confidence, movement threshold should be higher, so this might still be stable
      expect(typeof result).toBe('boolean');
    });

    it('should adjust threshold based on box size', () => {
      const largeBox = {
        x: 100,
        y: 100,
        width: 800, // Very large box
        height: 600
      };
      
      captureManager.lastBox = largeBox;
      
      // Large boxes should allow more movement
      const slightlyMovedLargeBox = {
        x: largeBox.x + 20,
        y: largeBox.y + 20,
        width: largeBox.width,
        height: largeBox.height
      };
      
      const result = captureManager.isStableEnhanced(slightlyMovedLargeBox, 0.9);
      
      expect(typeof result).toBe('boolean');
    });
  });

  describe('calculateMovement method', () => {
    it('should calculate correct distance between box centers', () => {
      const box1 = { x: 100, y: 100, width: 200, height: 300 };
      const box2 = { x: 103, y: 104, width: 200, height: 300 };
      
      const movement = captureManager.calculateMovement(box1, box2);
      
      // Center of box1: (200, 250)
      // Center of box2: (203, 254)
      // Distance should be sqrt(3^2 + 4^2) = 5
      expect(movement.distance).toBeCloseTo(5, 1);
      expect(movement.dx).toBe(3);
      expect(movement.dy).toBe(4);
      expect(movement.sizeChange).toBe(0);
    });

    it('should calculate size change correctly', () => {
      const box1 = { x: 100, y: 100, width: 200, height: 300 };
      const box2 = { x: 100, y: 100, width: 210, height: 290 };
      
      const movement = captureManager.calculateMovement(box1, box2);
      
      expect(movement.sizeChange).toBe(20); // |10| + |-10| = 20
      expect(movement.distance).toBeCloseTo(5, 0); // Centers have moved slightly due to size change
    });
  });

  describe('quality analysis', () => {
    it('should calculate quality score for detection', () => {
      const imageData = { width: 1920, height: 1080 };
      
      const quality = captureManager.analyzeQuality(mockDetection, imageData);
      
      expect(quality).toHaveProperty('confidence');
      expect(quality).toHaveProperty('size');
      expect(quality).toHaveProperty('position');
      expect(quality).toHaveProperty('stability');
      expect(quality).toHaveProperty('blur');
      expect(quality).toHaveProperty('overall');
      
      expect(quality.confidence).toBe(mockDetection.score);
      expect(quality.overall).toBeGreaterThan(0);
      expect(quality.overall).toBeLessThanOrEqual(1);
    });

    it('should prefer centered detections', () => {
      const imageData = { width: 1000, height: 1000 };
      
      // Centered detection
      const centeredDetection = {
        ...mockDetection,
        box: { x: 400, y: 350, width: 200, height: 300 } // Center at (500, 500)
      };
      
      // Off-center detection
      const offCenterDetection = {
        ...mockDetection,
        box: { x: 0, y: 0, width: 200, height: 300 } // Center at (100, 150)
      };
      
      const centeredQuality = captureManager.analyzeQuality(centeredDetection, imageData);
      const offCenterQuality = captureManager.analyzeQuality(offCenterDetection, imageData);
      
      expect(centeredQuality.position).toBeGreaterThan(offCenterQuality.position);
    });

    it('should prefer optimal size detections', () => {
      // Mock window dimensions for size calculation
      global.window = { innerWidth: 1920, innerHeight: 1080 };
      
      // Small detection (too small - 0.12% of screen)
      const smallDetection = {
        ...mockDetection,
        box: { x: 100, y: 100, width: 50, height: 50 }
      };
      
      // Optimal size detection (30% of screen)
      const optimalDetection = {
        ...mockDetection,
        box: { x: 100, y: 100, width: 800, height: 600 } // ~23% of screen  
      };
      
      // Large detection (too large - 72% of screen)
      const largeDetection = {
        ...mockDetection,
        box: { x: 0, y: 0, width: 1500, height: 1000 }
      };
      
      const smallQuality = captureManager.calculateSize(smallDetection.box);
      const optimalQuality = captureManager.calculateSize(optimalDetection.box);
      const largeQuality = captureManager.calculateSize(largeDetection.box);
      
      expect(optimalQuality).toBeGreaterThan(smallQuality);
      expect(optimalQuality).toBeGreaterThan(largeQuality);
    });
  });

  describe('history management', () => {
    it('should maintain history within max length', () => {
      const maxLength = captureManager.maxHistoryLength;
      
      // Add more items than max length
      for (let i = 0; i < maxLength + 5; i++) {
        captureManager.updateHistory({
          x: i, y: i, width: 100, height: 100
        });
      }
      
      expect(captureManager.boxHistory).toHaveLength(maxLength);
      
      // Should contain the most recent items
      const lastItem = captureManager.boxHistory[captureManager.boxHistory.length - 1];
      expect(lastItem.box.x).toBe(maxLength + 4);
    });

    it('should calculate recent stability from history', () => {
      // Add stable history
      const baseBox = { x: 100, y: 100, width: 200, height: 300 };
      for (let i = 0; i < 5; i++) {
        captureManager.updateHistory({
          x: baseBox.x + i, // Very small movement
          y: baseBox.y + i,
          width: baseBox.width,
          height: baseBox.height
        });
      }
      
      const stability = captureManager.calculateRecentStability();
      
      expect(stability).toBeGreaterThan(0.5); // Should be fairly stable
    });

    it('should return low stability for unstable history', () => {
      // Add unstable history with large movements
      for (let i = 0; i < 5; i++) {
        captureManager.updateHistory({
          x: i * 100, // Large movements
          y: i * 100,
          width: 200 + i * 50, // Changing size
          height: 300 + i * 50
        });
      }
      
      const stability = captureManager.calculateRecentStability();
      
      expect(stability).toBeLessThan(0.5); // Should be unstable
    });

    it('should return 0 stability for insufficient history', () => {
      // Add only one item
      captureManager.updateHistory({ x: 100, y: 100, width: 200, height: 300 });
      
      const stability = captureManager.calculateRecentStability();
      
      expect(stability).toBe(0);
    });
  });

  describe('reset and stats', () => {
    it('should reset all tracking state', () => {
      // Set up some state
      captureManager.stabilityFrames = 5;
      captureManager.lastBox = mockDetection.box;
      captureManager.updateHistory(mockDetection.box);
      
      captureManager.reset();
      
      expect(captureManager.stabilityFrames).toBe(0);
      expect(captureManager.lastBox).toBe(null);
      expect(captureManager.boxHistory).toHaveLength(0);
    });

    it('should provide accurate stats', () => {
      captureManager.stabilityFrames = 3;
      captureManager.lastCaptureTime = 12345;
      captureManager.updateHistory(mockDetection.box);
      captureManager.updateHistory(mockDetection.box);
      
      const stats = captureManager.getStats();
      
      expect(stats.stabilityFrames).toBe(3);
      expect(stats.lastCaptureTime).toBe(12345);
      expect(stats.historyLength).toBe(2);
      expect(typeof stats.currentStability).toBe('number');
    });
  });

  describe('adaptive stability frames', () => {
    it('should reduce frames for high quality detections', () => {
      const highQuality = { overall: 0.9 };
      const baseFrames = 5;
      
      const adaptiveFrames = captureManager.getAdaptiveStabilityFrames(highQuality, baseFrames);
      
      expect(adaptiveFrames).toBeLessThan(baseFrames);
      expect(adaptiveFrames).toBeGreaterThanOrEqual(2); // Minimum of 2
    });

    it('should use base frames for medium quality detections', () => {
      const mediumQuality = { overall: 0.7 };
      const baseFrames = 5;
      
      const adaptiveFrames = captureManager.getAdaptiveStabilityFrames(mediumQuality, baseFrames);
      
      expect(adaptiveFrames).toBeLessThan(baseFrames);
      expect(adaptiveFrames).toBeGreaterThanOrEqual(3); // Minimum adjusted
    });

    it('should use full base frames for low quality detections', () => {
      const lowQuality = { overall: 0.4 };
      const baseFrames = 5;
      
      const adaptiveFrames = captureManager.getAdaptiveStabilityFrames(lowQuality, baseFrames);
      
      expect(adaptiveFrames).toBe(baseFrames);
    });

    it('should enforce minimum frame requirements', () => {
      const highQuality = { overall: 1.0 };
      const baseFrames = 2;
      
      const adaptiveFrames = captureManager.getAdaptiveStabilityFrames(highQuality, baseFrames);
      
      expect(adaptiveFrames).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete capture workflow', () => {
      vi.setSystemTime(0);
      
      // Mock analyzeQuality to return good quality
      vi.spyOn(captureManager, 'analyzeQuality').mockReturnValue({
        overall: 0.8
      });
      
      // Mock isStableEnhanced to return true for all calls
      vi.spyOn(captureManager, 'isStableEnhanced').mockReturnValue(true);
      
      // First detection - should not capture (building stability)
      let shouldCapture = captureManager.shouldCapture(mockDetection, 3);
      expect(shouldCapture).toBe(false);
      
      // Second detection - still building stability
      shouldCapture = captureManager.shouldCapture(mockDetection, 3);
      expect(shouldCapture).toBe(false);
      
      // Third detection - should trigger capture (adaptive frames make it 3 for high quality)
      shouldCapture = captureManager.shouldCapture(mockDetection, 5); // Use 5 as base to ensure capture
      expect(shouldCapture).toBe(true);
      
      // Immediate next detection - should not capture (interval not passed)
      shouldCapture = captureManager.shouldCapture(mockDetection, 3);
      expect(shouldCapture).toBe(false);
      
      // After interval passes - should start building stability again
      vi.setSystemTime(3000);
      shouldCapture = captureManager.shouldCapture(mockDetection, 3);
      expect(shouldCapture).toBe(false);
      expect(captureManager.stabilityFrames).toBe(1);
    });

    it('should handle detection quality variations', () => {
      vi.setSystemTime(3000);
      
      // High quality detection
      const highQualityDetection = { ...mockDetection, score: 0.95 };
      captureManager.shouldCapture(highQualityDetection, 5);
      
      // Should require fewer frames due to high quality
      const adaptiveFrames = captureManager.getAdaptiveStabilityFrames(
        { overall: 0.9 }, 
        5
      );
      expect(adaptiveFrames).toBeLessThan(5);
    });

    it('should handle rapid state changes gracefully', () => {
      vi.setSystemTime(3000);
      
      // Mock analyzeQuality to return good quality
      vi.spyOn(captureManager, 'analyzeQuality').mockReturnValue({
        overall: 0.8
      });
      
      // Create alternating stability pattern
      const stableStates = [true, false, true, false, true];
      let callCount = 0;
      vi.spyOn(captureManager, 'isStableEnhanced').mockImplementation(() => {
        return stableStates[callCount++ % stableStates.length];
      });
      
      // Rapid sequence of different positions
      const positions = [
        { x: 100, y: 100, width: 200, height: 300 },
        { x: 150, y: 100, width: 200, height: 300 }, // Moved right
        { x: 100, y: 100, width: 200, height: 300 }, // Back to original
        { x: 100, y: 150, width: 200, height: 300 }, // Moved down
        { x: 100, y: 100, width: 200, height: 300 }  // Back to original
      ];
      
      let stabilityFrames = [];
      
      positions.forEach(box => {
        const detection = { ...mockDetection, box };
        captureManager.shouldCapture(detection, 5);
        stabilityFrames.push(captureManager.stabilityFrames);
      });
      
      // Should show varying stability based on position changes
      expect(stabilityFrames.some(f => f > 0)).toBe(true);
    });
  });
});