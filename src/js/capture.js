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
    
    // Check if detection is stable
    if (this.isStable(detection.box)) {
      this.stabilityFrames++;
      
      // Capture if stable for required frames
      if (this.stabilityFrames >= requiredStabilityFrames) {
        this.lastCaptureTime = now;
        this.reset();
        return true;
      }
    } else {
      this.stabilityFrames = 0;
    }
    
    // Update last box for next comparison
    this.lastBox = { ...detection.box };
    this.updateHistory(detection.box);
    
    return false;
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