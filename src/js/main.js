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
      // Show loading overlay
      this.ui.showLoading('Initializing camera...');
      
      // Initialize storage
      await this.storage.init();
      
      // Initialize camera
      const stream = await this.camera.init();
      this.ui.setVideoStream(stream);
      
      // Initialize detector with selected model
      this.ui.showLoading('Loading AI model...');
      await this.detector.init(this.settings.model);
      
      // Initialize UI
      this.ui.init();
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
    
    const canvas = document.getElementById('camera-feed');
    const overlay = document.getElementById('detection-overlay');
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
      
      // Run detection every 3rd frame for performance
      if (frameCount % 3 === 0) {
        const detections = await this.detector.detect(canvas);
        
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
    const color = confidence > 0.9 ? '#00ff00' : confidence > 0.7 ? '#ffff00' : '#ff9900';
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Draw label
    ctx.fillStyle = color;
    ctx.font = '14px system-ui';
    const label = `${detection.label} ${Math.round(confidence * 100)}%`;
    const textWidth = ctx.measureText(label).width;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y - 20, textWidth + 8, 20);
    
    ctx.fillStyle = color;
    ctx.fillText(label, x + 4, y - 5);
  }

  async performCapture() {
    const canvas = document.getElementById('camera-feed');
    
    // Capture image
    const blob = await this.camera.captureImage(canvas);
    
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

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new ReceiptScanner();
  app.init();
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service worker registered'))
      .catch(err => console.error('Service worker registration failed:', err));
  });
}