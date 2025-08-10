import { CameraManager } from './camera.js';
import { Detector } from './detector.js';
import { CaptureManager } from './capture.js';
import { StorageManager } from './storage.js';
import { UIManager } from './ui.js';
import { GalleryManager } from './gallery.js';

class ReceiptScanner {
  constructor() {
    this.camera = new CameraManager();
    this.detector = new Detector();
    this.capture = new CaptureManager();
    this.storage = new StorageManager();
    this.ui = new UIManager();
    this.gallery = new GalleryManager(this.storage);
    
    this.isAutoMode = true;
    this.settings = {
      confidenceThreshold: 0.85,
      stabilityFrames: 5,
      soundEnabled: true,
      vibrationEnabled: true,
      model: 'yolos-tiny'
    };
    
    this.detectionLoop = null;
    this.lastDetection = null;
  }

  async init() {
    try {
      // Initialize UI first to ensure DOM elements are cached
      this.ui.init();
      
      // Show loading overlay
      this.ui.showLoading('Initializing camera...');
      
      // Initialize storage
      await this.storage.init();
      
      // Initialize camera
      const stream = await this.camera.init();
      await this.ui.setVideoStream(stream);
      
      // Initialize detector with selected model
      this.ui.showLoading('Loading AI model...');
      await this.detector.init(this.settings.model);
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Initialize gallery
      await this.gallery.init();
      await this.updateGalleryCount();
      
      // Hide loading and start detection
      this.ui.hideLoading();
      this.startDetection();
      
      // Update status
      this.ui.updateStatus('Ready', 'success');
      
    } catch (error) {
      console.error('Initialization error:', error);
      this.ui.showError(`Failed to initialize: ${error.message}`);
    }
  }

  setupEventListeners() {
    // Manual capture button
    document.getElementById('manual-capture-btn').addEventListener('click', () => {
      this.manualCapture();
    });
    
    // Mode toggle
    document.getElementById('capture-mode-btn').addEventListener('click', () => {
      this.toggleMode();
    });
    
    // Settings panel
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.ui.showSettings();
    });
    
    document.getElementById('close-settings').addEventListener('click', () => {
      this.ui.hideSettings();
    });
    
    // Gallery panel
    document.getElementById('gallery-btn').addEventListener('click', () => {
      this.gallery.show();
    });
    
    document.getElementById('close-gallery').addEventListener('click', () => {
      this.gallery.hide();
    });
    
    // Settings controls
    document.getElementById('confidence-threshold').addEventListener('input', (e) => {
      this.settings.confidenceThreshold = parseFloat(e.target.value);
      document.getElementById('confidence-value').textContent = `${Math.round(this.settings.confidenceThreshold * 100)}%`;
    });
    
    document.getElementById('stability-frames').addEventListener('input', (e) => {
      this.settings.stabilityFrames = parseInt(e.target.value);
      document.getElementById('stability-value').textContent = e.target.value;
    });
    
    document.getElementById('sound-enabled').addEventListener('change', (e) => {
      this.settings.soundEnabled = e.target.checked;
    });
    
    document.getElementById('vibration-enabled').addEventListener('change', (e) => {
      this.settings.vibrationEnabled = e.target.checked;
    });
    
    document.getElementById('model-select').addEventListener('change', async (e) => {
      this.settings.model = e.target.value;
      await this.switchModel(e.target.value);
    });
    
    // Gallery actions
    document.getElementById('select-all-btn').addEventListener('click', () => {
      this.gallery.selectAll();
    });
    
    document.getElementById('export-selected-btn').addEventListener('click', () => {
      this.gallery.exportSelected();
    });
    
    document.getElementById('delete-selected-btn').addEventListener('click', () => {
      this.gallery.deleteSelected();
    });
  }

  async switchModel(modelName) {
    this.ui.showLoading(`Switching to ${modelName}...`);
    this.stopDetection();
    await this.detector.switchModel(modelName);
    this.ui.hideLoading();
    this.startDetection();
  }

  startDetection() {
    if (this.detectionLoop) return;
    
    const video = document.getElementById('camera-feed');
    const overlay = document.getElementById('detection-overlay');
    
    if (!video) {
      console.error('Camera feed element not found for detection');
      return;
    }
    
    if (!(video instanceof HTMLVideoElement)) {
      console.error('Camera feed element is not a video element:', video.constructor?.name);
      return;
    }
    
    if (!overlay) {
      console.error('Detection overlay element not found');
      return;
    }
    
    // Wait for video to be ready before starting detection
    if (!this.isVideoReady(video)) {
      console.log('Video not ready yet, waiting for video to load...');
      
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds maximum wait time
      
      const waitForVideo = () => {
        attempts++;
        if (this.isVideoReady(video)) {
          console.log('Video is now ready, starting detection');
          this.startDetectionLoop(video, overlay);
        } else if (attempts >= maxAttempts) {
          console.error('Video failed to become ready within timeout period');
          this.ui.showError('Camera failed to initialize properly. Please refresh the page.');
          return;
        } else {
          // Retry in 100ms
          setTimeout(waitForVideo, 100);
        }
      };
      
      waitForVideo();
      return;
    }
    
    this.startDetectionLoop(video, overlay);
  }

  startDetectionLoop(video, overlay) {
    const ctx = overlay.getContext('2d');
    
    let frameCount = 0;
    let lastFpsUpdate = Date.now();
    let fps = 0;
    
    const detectFrame = async () => {
      frameCount++;
      
      // Update FPS counter
      const now = Date.now();
      if (now - lastFpsUpdate >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastFpsUpdate = now;
        this.ui.updateFPS(fps);
      }
      
      // Ensure overlay matches video dimensions
      if (video.videoWidth && video.videoHeight) {
        if (overlay.width !== video.videoWidth || overlay.height !== video.videoHeight) {
          overlay.width = video.videoWidth;
          overlay.height = video.videoHeight;
        }
      }
      
      // Run detection every 3rd frame for performance
      if (frameCount % 3 === 0) {
        // Validate video element before detection
        if (!this.isVideoReady(video)) {
          console.warn('Video not ready for detection, skipping frame');
          this.detectionLoop = requestAnimationFrame(detectFrame);
          return;
        }
        
        let detections = [];
        try {
          detections = await this.detector.detect(video);
        } catch (detectionError) {
          console.error('Detection failed:', detectionError.message);
          
          // If it's an input type error, re-validate the video element
          if (detectionError.message.includes('Unsupported input type') || 
              detectionError.message.includes('object')) {
            console.warn('Video element validation failed during detection, re-checking...');
            
            if (!this.isVideoReady(video)) {
              console.warn('Video is no longer ready, pausing detection');
              this.ui.updateStatus('Camera connection lost - reconnecting...', 'warning');
              
              // Try to reinitialize after a delay
              setTimeout(() => {
                this.startDetection();
              }, 1000);
              
              return; // Exit this detection loop
            }
          }
          
          // For other errors, continue but log them
          console.warn('Continuing detection despite error:', detectionError.message);
          detections = []; // Set to empty array to continue
        }
        
        // Clear overlay
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        
        // Process detections
        if (detections && detections.length > 0) {
          for (const detection of detections) {
            // Filter for receipt-like objects
            if (this.isReceiptLike(detection) && detection.score >= this.settings.confidenceThreshold) {
              // Draw bounding box
              this.drawBoundingBox(ctx, detection);
              
              // Auto-capture if enabled
              if (this.isAutoMode) {
                const shouldCapture = this.capture.shouldCapture(detection, this.settings.stabilityFrames);
                if (shouldCapture) {
                  await this.performCapture();
                } else {
                  // Update UI with stability info
                  this.updateStabilityStatus(detection);
                }
              }
              
              this.lastDetection = detection;
            }
          }
        }
      }
      
      this.detectionLoop = requestAnimationFrame(detectFrame);
    };
    
    this.detectionLoop = requestAnimationFrame(detectFrame);
  }

  stopDetection() {
    if (this.detectionLoop) {
      cancelAnimationFrame(this.detectionLoop);
      this.detectionLoop = null;
    }
  }

  isVideoReady(video) {
    // Comprehensive video element validation
    if (!video) {
      console.warn('Video element is null or undefined');
      return false;
    }
    
    if (!(video instanceof HTMLVideoElement)) {
      console.error('Expected HTMLVideoElement, got:', video.constructor?.name || typeof video);
      return false;
    }
    
    // Check if video has proper dimensions
    if (!video.videoWidth || !video.videoHeight) {
      console.warn('Video dimensions not available:', { 
        videoWidth: video.videoWidth, 
        videoHeight: video.videoHeight,
        readyState: video.readyState 
      });
      return false;
    }
    
    // Check if video is actually playing/ready
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      console.warn('Video not ready for reading:', { 
        readyState: video.readyState,
        networkState: video.networkState,
        currentTime: video.currentTime
      });
      return false;
    }
    
    // Check if video stream is active
    if (video.srcObject) {
      const tracks = video.srcObject.getVideoTracks();
      if (tracks.length === 0 || !tracks[0].enabled) {
        console.warn('No active video tracks found');
        return false;
      }
    }
    
    return true;
  }

  isReceiptLike(detection) {
    const receiptLabels = ['paper', 'document', 'receipt', 'invoice', 'bill', 'ticket'];
    return receiptLabels.some(label => 
      detection.label?.toLowerCase().includes(label)
    ) || detection.score > 0.8;
  }

  drawBoundingBox(ctx, detection) {
    const { x, y, width, height } = detection.box;
    
    // Set style based on confidence
    const confidence = detection.score;
    const stabilityStats = this.capture.getStats();
    const isStable = stabilityStats.stabilityFrames > 0;
    const stabilityProgress = Math.min(stabilityStats.stabilityFrames / this.settings.stabilityFrames, 1);
    
    // Color based on stability and confidence
    let color;
    if (stabilityProgress >= 1) {
      color = '#00ff00'; // Green when ready to capture
    } else if (isStable) {
      color = '#ffff00'; // Yellow when stabilizing
    } else {
      color = confidence > 0.9 ? '#00ff00' : confidence > 0.7 ? '#ffff00' : '#ff9900';
    }
    
    // Draw main bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = isStable ? 3 : 2;
    ctx.strokeRect(x, y, width, height);
    
    // Draw stability progress bar if stabilizing
    if (isStable && stabilityProgress < 1) {
      const barWidth = width * 0.8;
      const barHeight = 6;
      const barX = x + (width - barWidth) / 2;
      const barY = y + height + 8;
      
      // Background bar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX, barY, barWidth, barHeight);
      
      // Progress bar
      ctx.fillStyle = color;
      ctx.fillRect(barX, barY, barWidth * stabilityProgress, barHeight);
      
      // Progress text
      ctx.fillStyle = color;
      ctx.font = '12px system-ui';
      const progressText = `Stabilizing... ${Math.round(stabilityProgress * 100)}%`;
      const progressTextWidth = ctx.measureText(progressText).width;
      ctx.fillText(progressText, barX + (barWidth - progressTextWidth) / 2, barY + barHeight + 14);
    }
    
    // Draw countdown circle if almost ready
    if (stabilityProgress >= 0.8 && stabilityProgress < 1) {
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      const radius = 20;
      
      // Countdown circle background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Countdown arc
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 2, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * stabilityProgress));
      ctx.stroke();
      
      // Countdown text
      const countdown = Math.max(1, this.settings.stabilityFrames - stabilityStats.stabilityFrames);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(countdown.toString(), centerX, centerY + 5);
      ctx.textAlign = 'start'; // Reset alignment
    }
    
    // Draw label with enhanced info
    ctx.fillStyle = color;
    ctx.font = '14px system-ui';
    const confidence_text = `${Math.round(confidence * 100)}%`;
    const status_text = stabilityProgress >= 1 ? 'READY' : isStable ? 'STABILIZING' : 'DETECTING';
    const label = `${detection.label} ${confidence_text} - ${status_text}`;
    const textWidth = ctx.measureText(label).width;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(x, y - 24, textWidth + 8, 24);
    
    ctx.fillStyle = color;
    ctx.fillText(label, x + 4, y - 6);
    
    // Draw corner indicators for better visibility
    if (stabilityProgress >= 0.5) {
      this.drawCornerIndicators(ctx, { x, y, width, height }, color, stabilityProgress);
    }
  }

  drawCornerIndicators(ctx, box, color, progress) {
    const { x, y, width, height } = box;
    const cornerSize = 15 + (progress * 5); // Grow with stability
    const thickness = 2 + progress; // Thicker when more stable
    
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    
    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + cornerSize);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerSize, y);
    ctx.stroke();
    
    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + width - cornerSize, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + cornerSize);
    ctx.stroke();
    
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + height - cornerSize);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + cornerSize, y + height);
    ctx.stroke();
    
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + width - cornerSize, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + width, y + height - cornerSize);
    ctx.stroke();
  }

  async performCapture() {
    const video = document.getElementById('camera-feed');
    
    if (!video) {
      console.error('Camera feed not found for capture');
      return;
    }
    
    // Capture image
    const blob = await this.camera.captureImage(video);
    
    // Save to storage
    const metadata = {
      timestamp: Date.now(),
      detection: this.lastDetection,
      settings: this.settings
    };
    
    const id = await this.storage.saveReceipt(blob, metadata);
    
    // Update UI
    this.ui.flashCapture();
    await this.updateGalleryCount();
    
    // Feedback
    if (this.settings.soundEnabled) {
      this.playSound();
    }
    
    if (this.settings.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(100);
    }
    
    // Reset capture manager for next detection
    this.capture.reset();
    
    console.log(`Receipt captured: ${id}`);
  }

  async manualCapture() {
    await this.performCapture();
  }

  toggleMode() {
    this.isAutoMode = !this.isAutoMode;
    const btn = document.getElementById('capture-mode-btn');
    const modeText = btn.querySelector('.mode-text');
    
    if (this.isAutoMode) {
      btn.classList.add('active');
      modeText.textContent = 'AUTO';
      this.ui.updateStatus('Auto-capture enabled', 'info');
    } else {
      btn.classList.remove('active');
      modeText.textContent = 'MANUAL';
      this.ui.updateStatus('Manual capture mode', 'info');
    }
  }

  async updateGalleryCount() {
    const count = await this.storage.getReceiptCount();
    document.getElementById('capture-count').textContent = count;
    document.getElementById('gallery-count').textContent = count;
  }

  updateStabilityStatus(detection) {
    const stabilityStats = this.capture.getStats();
    const progress = Math.min(stabilityStats.stabilityFrames / this.settings.stabilityFrames, 1);
    
    if (stabilityStats.stabilityFrames > 0) {
      const remainingFrames = Math.max(0, this.settings.stabilityFrames - stabilityStats.stabilityFrames);
      const message = remainingFrames > 0 
        ? `Stabilizing... ${remainingFrames} frames remaining`
        : 'Ready to capture!';
      
      this.ui.updateStatus(message, progress >= 1 ? 'success' : 'info');
    } else if (detection.score >= this.settings.confidenceThreshold) {
      this.ui.updateStatus('Receipt detected - keep steady', 'info');
    }
  }

  playSound() {
    // Create a simple capture sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }
}

// Export for testing
export { ReceiptScanner };

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new ReceiptScanner();
  app.init();
});

// Service worker registration is handled automatically by VitePWA plugin