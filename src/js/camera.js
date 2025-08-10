export class CameraManager {
  constructor() {
    this.stream = null;
    this.video = null;
    this.constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 },
        aspectRatio: { ideal: 16/9 }
      },
      audio: false
    };
  }

  async init() {
    try {
      // Request camera permission
      this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
      
      // Set up video element
      this.video = document.getElementById('camera-feed');
      this.video.srcObject = this.stream;
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play();
          this.setupOverlay();
          resolve();
        };
      });
      
      return this.stream;
      
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Camera permission denied. Please allow camera access.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No camera found. Please connect a camera.');
      } else if (error.name === 'NotReadableError') {
        throw new Error('Camera is already in use by another application.');
      } else {
        throw new Error(`Camera initialization failed: ${error.message}`);
      }
    }
  }

  setupOverlay() {
    const overlay = document.getElementById('detection-overlay');
    const container = document.getElementById('camera-container');
    
    // Match overlay size to video
    const resizeOverlay = () => {
      const rect = this.video.getBoundingClientRect();
      overlay.width = rect.width;
      overlay.height = rect.height;
    };
    
    // Initial resize
    resizeOverlay();
    
    // Resize on window change
    window.addEventListener('resize', resizeOverlay);
    window.addEventListener('orientationchange', resizeOverlay);
  }

  async captureImage(sourceElement = null) {
    const source = sourceElement || this.video;
    
    // Create a canvas for capturing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to video dimensions
    canvas.width = source.videoWidth || source.width;
    canvas.height = source.videoHeight || source.height;
    
    // Draw video frame to canvas
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  }

  async switchCamera() {
    // Toggle between front and back camera
    const currentFacingMode = this.constraints.video.facingMode;
    this.constraints.video.facingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    
    // Stop current stream
    this.stop();
    
    // Reinitialize with new constraints
    await this.init();
  }

  getVideoElement() {
    return this.video;
  }

  getStream() {
    return this.stream;
  }

  pause() {
    if (this.video) {
      this.video.pause();
    }
  }

  resume() {
    if (this.video) {
      this.video.play();
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  async getCapabilities() {
    if (!this.stream) return null;
    
    const videoTrack = this.stream.getVideoTracks()[0];
    if (videoTrack && videoTrack.getCapabilities) {
      return videoTrack.getCapabilities();
    }
    
    return null;
  }

  async applyConstraints(newConstraints) {
    if (!this.stream) return;
    
    const videoTrack = this.stream.getVideoTracks()[0];
    if (videoTrack) {
      await videoTrack.applyConstraints(newConstraints);
    }
  }

  async setZoom(zoomLevel) {
    const capabilities = await this.getCapabilities();
    
    if (capabilities && capabilities.zoom) {
      const { min, max } = capabilities.zoom;
      const zoom = Math.min(max, Math.max(min, zoomLevel));
      
      await this.applyConstraints({
        advanced: [{ zoom }]
      });
    }
  }

  async setTorch(enabled) {
    const capabilities = await this.getCapabilities();
    
    if (capabilities && capabilities.torch) {
      await this.applyConstraints({
        advanced: [{ torch: enabled }]
      });
    }
  }

  async setFocus(mode = 'continuous') {
    const capabilities = await this.getCapabilities();
    
    if (capabilities && capabilities.focusMode) {
      await this.applyConstraints({
        advanced: [{ focusMode: mode }]
      });
    }
  }
}