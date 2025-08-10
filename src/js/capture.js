export class CaptureManager {
  constructor() {
    this.lastBox = null;
    this.stabilityFrames = 0;
    this.lastCaptureTime = 0;
    this.minCaptureInterval = 2000; // Minimum 2 seconds between captures
    this.boxHistory = [];
    this.maxHistoryLength = 10;
  }

  shouldCapture(detection, requiredStabilityFrames = 5) {
    // Check if enough time has passed since last capture
    const now = Date.now();
    if (now - this.lastCaptureTime < this.minCaptureInterval) {
      return false;
    }
    
    // Analyze detection quality first
    const quality = this.analyzeQuality(detection, { width: 1920, height: 1080 }); // Use reasonable default
    
    // Only proceed if quality is decent
    if (quality.overall < 0.3) {
      this.stabilityFrames = 0;
      this.lastBox = { ...detection.box };
      return false;
    }
    
    // Enhanced stability check with multiple criteria
    if (this.isStableEnhanced(detection.box, detection.score)) {
      this.stabilityFrames++;
      
      // Adaptive stability requirements based on quality
      const adaptiveFrames = this.getAdaptiveStabilityFrames(quality, requiredStabilityFrames);
      
      // Capture if stable for required frames
      if (this.stabilityFrames >= adaptiveFrames) {
        this.lastCaptureTime = now;
        this.reset();
        return true;
      }
    } else {
      // Decay stability frames instead of resetting to 0
      this.stabilityFrames = Math.max(0, this.stabilityFrames - 2);
    }
    
    // Update last box and history
    this.lastBox = { ...detection.box };
    this.updateHistory(detection.box);
    
    return false;
  }

  getAdaptiveStabilityFrames(quality, baseFrames) {
    // Reduce required frames for high-quality detections
    if (quality.overall > 0.8) {
      return Math.max(2, Math.floor(baseFrames * 0.6));
    } else if (quality.overall > 0.6) {
      return Math.max(3, Math.floor(baseFrames * 0.8));
    }
    return baseFrames;
  }

  isStableEnhanced(currentBox, confidence) {
    if (!this.lastBox) {
      this.lastBox = { ...currentBox };
      return false;
    }
    
    // Calculate movement between frames
    const movement = this.calculateMovement(this.lastBox, currentBox);
    
    // Dynamic threshold based on confidence and box size
    const baseThreshold = 10;
    const confidenceMultiplier = Math.max(0.5, 2 - confidence * 2); // Higher confidence = lower threshold
    const sizeMultiplier = Math.min(2, Math.sqrt(currentBox.width * currentBox.height) / 100); // Larger boxes allow more movement
    const threshold = baseThreshold * confidenceMultiplier * sizeMultiplier;
    
    // Check multiple stability criteria
    const positionStable = movement.distance < threshold;
    const sizeStable = movement.sizeChange < (currentBox.width + currentBox.height) * 0.1; // 10% size change tolerance
    const recentStability = this.calculateRecentStability() > 0.7;
    
    return positionStable && sizeStable && recentStability;
  }

  calculateRecentStability() {
    if (this.boxHistory.length < 3) return 0;
    
    // Analyze last few frames for stability
    const recentFrames = this.boxHistory.slice(-5);
    let totalMovement = 0;
    let totalSizeChange = 0;
    
    for (let i = 1; i < recentFrames.length; i++) {
      const movement = this.calculateMovement(
        recentFrames[i - 1].box,
        recentFrames[i].box
      );
      totalMovement += movement.distance;
      totalSizeChange += movement.sizeChange;
    }
    
    const avgMovement = totalMovement / (recentFrames.length - 1);
    const avgSizeChange = totalSizeChange / (recentFrames.length - 1);
    
    // Stability score based on movement and size consistency
    const movementScore = Math.max(0, 1 - avgMovement / 30);
    const sizeScore = Math.max(0, 1 - avgSizeChange / 50);
    
    return (movementScore + sizeScore) / 2;
  }

  isStable(currentBox) {
    if (!this.lastBox) {
      this.lastBox = { ...currentBox };
      return false;
    }
    
    // Calculate movement between frames
    const movement = this.calculateMovement(this.lastBox, currentBox);
    
    // Consider stable if movement is minimal
    const threshold = 10; // pixels
    return movement.distance < threshold;
  }

  calculateMovement(box1, box2) {
    const dx = box2.x - box1.x;
    const dy = box2.y - box1.y;
    const dw = box2.width - box1.width;
    const dh = box2.height - box1.height;
    
    // Calculate center points
    const center1 = {
      x: box1.x + box1.width / 2,
      y: box1.y + box1.height / 2
    };
    
    const center2 = {
      x: box2.x + box2.width / 2,
      y: box2.y + box2.height / 2
    };
    
    // Calculate distance between centers
    const centerDistance = Math.sqrt(
      Math.pow(center2.x - center1.x, 2) + 
      Math.pow(center2.y - center1.y, 2)
    );
    
    // Calculate size change
    const sizeChange = Math.abs(dw) + Math.abs(dh);
    
    return {
      distance: centerDistance,
      sizeChange: sizeChange,
      dx: dx,
      dy: dy
    };
  }

  updateHistory(box) {
    this.boxHistory.push({
      box: { ...box },
      timestamp: Date.now()
    });
    
    // Keep history limited
    if (this.boxHistory.length > this.maxHistoryLength) {
      this.boxHistory.shift();
    }
  }

  analyzeQuality(detection, imageData) {
    // Analyze detection quality for better capture decisions
    const quality = {
      confidence: detection.score,
      size: this.calculateSize(detection.box),
      position: this.analyzePosition(detection.box, imageData),
      stability: this.calculateStability(),
      blur: this.estimateBlur(imageData, detection.box)
    };
    
    // Calculate overall quality score
    quality.overall = this.calculateQualityScore(quality);
    
    return quality;
  }

  calculateSize(box) {
    const area = box.width * box.height;
    const totalArea = window.innerWidth * window.innerHeight;
    const percentage = (area / totalArea) * 100;
    
    // Ideal size is 20-60% of screen
    if (percentage >= 20 && percentage <= 60) {
      return 1.0;
    } else if (percentage < 20) {
      return percentage / 20;
    } else {
      return Math.max(0.5, 1 - (percentage - 60) / 40);
    }
  }

  analyzePosition(box, imageData) {
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    
    const imageCenterX = imageData.width / 2;
    const imageCenterY = imageData.height / 2;
    
    // Calculate distance from center
    const distance = Math.sqrt(
      Math.pow(centerX - imageCenterX, 2) + 
      Math.pow(centerY - imageCenterY, 2)
    );
    
    const maxDistance = Math.sqrt(
      Math.pow(imageCenterX, 2) + 
      Math.pow(imageCenterY, 2)
    );
    
    // Normalize to 0-1 (1 being perfectly centered)
    return 1 - (distance / maxDistance);
  }

  calculateStability() {
    if (this.boxHistory.length < 2) return 0;
    
    let totalMovement = 0;
    for (let i = 1; i < this.boxHistory.length; i++) {
      const movement = this.calculateMovement(
        this.boxHistory[i - 1].box,
        this.boxHistory[i].box
      );
      totalMovement += movement.distance;
    }
    
    const avgMovement = totalMovement / (this.boxHistory.length - 1);
    
    // Convert to stability score (lower movement = higher stability)
    const maxMovement = 50; // pixels
    return Math.max(0, 1 - (avgMovement / maxMovement));
  }

  estimateBlur(imageData, box) {
    // Simple blur estimation using edge detection
    // This is a simplified version - real implementation would analyze pixels
    
    // For now, return a reasonable default
    // In production, you'd analyze the image data within the box
    return 0.8; // Assume reasonably sharp
  }

  calculateQualityScore(quality) {
    // Weighted average of quality factors
    const weights = {
      confidence: 0.3,
      size: 0.2,
      position: 0.2,
      stability: 0.2,
      blur: 0.1
    };
    
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      if (quality[key] !== undefined) {
        score += quality[key] * weight;
      }
    }
    
    return score;
  }

  reset() {
    this.stabilityFrames = 0;
    this.lastBox = null;
    this.boxHistory = [];
  }

  getStats() {
    return {
      stabilityFrames: this.stabilityFrames,
      lastCaptureTime: this.lastCaptureTime,
      historyLength: this.boxHistory.length,
      currentStability: this.calculateStability()
    };
  }
}