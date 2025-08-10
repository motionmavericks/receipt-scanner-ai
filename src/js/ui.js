export class UIManager {
  constructor() {
    this.elements = {};
    this.statusTimeout = null;
  }

  init() {
    // Cache DOM elements
    this.elements = {
      loadingOverlay: document.getElementById('loading-overlay'),
      loadingText: document.getElementById('loading-text'),
      modelStatus: document.getElementById('model-status'),
      fpsCounter: document.getElementById('fps-counter'),
      captureFlash: document.getElementById('capture-flash'),
      settingsPanel: document.getElementById('settings-panel'),
      galleryPanel: document.getElementById('gallery-panel'),
      imageViewer: document.getElementById('image-viewer'),
      viewerImage: document.getElementById('viewer-image'),
      cameraFeed: document.getElementById('camera-feed')
    };
    
    // Setup event listeners
    this.setupPanelListeners();
    
    // Listen for model loading progress
    window.addEventListener('model-progress', (e) => {
      this.updateLoadingProgress(e.detail);
    });
  }

  setupPanelListeners() {
    // Close panels when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('panel')) {
        this.closeAllPanels();
      }
    });
    
    // Prevent panel content clicks from closing
    document.querySelectorAll('.panel-content').forEach(content => {
      content.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });
    
    // Image viewer controls
    document.getElementById('close-viewer').addEventListener('click', () => {
      this.hideImageViewer();
    });
    
    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllPanels();
        this.hideImageViewer();
      }
    });
  }

  showLoading(message = 'Loading...') {
    // Ensure elements are available
    if (!this.elements.loadingOverlay) {
      this.elements.loadingOverlay = document.getElementById('loading-overlay');
      this.elements.loadingText = document.getElementById('loading-text');
    }
    
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.classList.add('visible');
    }
    if (this.elements.loadingText) {
      this.elements.loadingText.textContent = message;
    }
  }

  hideLoading() {
    if (!this.elements.loadingOverlay) {
      this.elements.loadingOverlay = document.getElementById('loading-overlay');
    }
    
    if (this.elements.loadingOverlay) {
      this.elements.loadingOverlay.classList.remove('visible');
    }
  }

  updateLoadingProgress(progress) {
    const percentage = Math.round(progress * 100);
    this.elements.loadingText.textContent = `Loading model... ${percentage}%`;
  }

  updateStatus(message, type = 'info') {
    const statusEl = this.elements.modelStatus;
    
    // Clear existing timeout
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
    }
    
    // Update status
    statusEl.textContent = message;
    statusEl.className = `status-indicator ${type}`;
    
    // Auto-hide after 3 seconds for non-error messages
    if (type !== 'error') {
      this.statusTimeout = setTimeout(() => {
        statusEl.textContent = 'Ready';
        statusEl.className = 'status-indicator success';
      }, 3000);
    }
  }

  updateFPS(fps) {
    this.elements.fpsCounter.textContent = `${fps} FPS`;
  }

  flashCapture() {
    const flash = this.elements.captureFlash;
    flash.classList.add('active');
    
    setTimeout(() => {
      flash.classList.remove('active');
    }, 200);
  }

  showSettings() {
    this.elements.settingsPanel.classList.add('visible');
  }

  hideSettings() {
    this.elements.settingsPanel.classList.remove('visible');
  }

  showGallery() {
    this.elements.galleryPanel.classList.add('visible');
  }

  hideGallery() {
    this.elements.galleryPanel.classList.remove('visible');
  }

  showImageViewer(imageSrc, index = 0, total = 1) {
    this.elements.imageViewer.classList.add('visible');
    this.elements.viewerImage.src = imageSrc;
    document.getElementById('viewer-index').textContent = `${index + 1} / ${total}`;
  }

  hideImageViewer() {
    this.elements.imageViewer.classList.remove('visible');
    this.elements.viewerImage.src = '';
  }

  closeAllPanels() {
    this.hideSettings();
    this.hideGallery();
  }

  setVideoStream(stream) {
    this.elements.cameraFeed.srcObject = stream;
  }

  showError(message) {
    // Create error toast
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 5000);
  }

  showSuccess(message) {
    // Create success toast
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  createReceiptThumbnail(receipt) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.dataset.receiptId = receipt.id;
    
    const img = document.createElement('img');
    img.src = receipt.image;
    img.alt = `Receipt ${receipt.id}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'gallery-checkbox';
    checkbox.dataset.receiptId = receipt.id;
    
    const info = document.createElement('div');
    info.className = 'gallery-item-info';
    
    const date = new Date(receipt.timestamp);
    info.innerHTML = `
      <span class="receipt-date">${date.toLocaleDateString()}</span>
      <span class="receipt-time">${date.toLocaleTimeString()}</span>
    `;
    
    item.appendChild(checkbox);
    item.appendChild(img);
    item.appendChild(info);
    
    return item;
  }

  updateSelectionCount(count) {
    const exportBtn = document.getElementById('export-selected-btn');
    const deleteBtn = document.getElementById('delete-selected-btn');
    
    if (count > 0) {
      exportBtn.disabled = false;
      deleteBtn.disabled = false;
      exportBtn.textContent = `Export (${count})`;
      deleteBtn.textContent = `Delete (${count})`;
    } else {
      exportBtn.disabled = true;
      deleteBtn.disabled = true;
      exportBtn.textContent = 'Export Selected';
      deleteBtn.textContent = 'Delete Selected';
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.log('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  showConfirmDialog(message) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog';
      
      dialog.innerHTML = `
        <div class="dialog-content">
          <p>${message}</p>
          <div class="dialog-buttons">
            <button class="btn-cancel">Cancel</button>
            <button class="btn-confirm">Confirm</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      // Animate in
      setTimeout(() => {
        dialog.classList.add('visible');
      }, 10);
      
      // Handle buttons
      dialog.querySelector('.btn-cancel').addEventListener('click', () => {
        this.closeDialog(dialog);
        resolve(false);
      });
      
      dialog.querySelector('.btn-confirm').addEventListener('click', () => {
        this.closeDialog(dialog);
        resolve(true);
      });
    });
  }

  closeDialog(dialog) {
    dialog.classList.remove('visible');
    setTimeout(() => {
      document.body.removeChild(dialog);
    }, 300);
  }
}