export class GalleryManager {
  constructor(storageManager) {
    this.storage = storageManager;
    this.selectedReceipts = new Set();
    this.receipts = [];
    this.currentViewIndex = 0;
  }

  async init() {
    // Load receipts on init
    await this.loadReceipts();
    
    // Setup gallery event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Gallery grid click handler
    const grid = document.getElementById('gallery-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const item = e.target.closest('.gallery-item');
        const checkbox = e.target.closest('.gallery-checkbox');
        
        if (checkbox) {
          this.toggleSelection(checkbox.dataset.receiptId);
        } else if (item) {
          this.viewReceipt(item.dataset.receiptId);
        }
      });
    }
  }

  async loadReceipts() {
    try {
      this.receipts = await this.storage.getAllReceipts();
      this.renderGallery();
    } catch (error) {
      console.error('Failed to load receipts:', error);
    }
  }

  renderGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    
    // Clear existing content
    grid.innerHTML = '';
    
    // Sort receipts by timestamp (newest first)
    const sortedReceipts = [...this.receipts].sort((a, b) => b.timestamp - a.timestamp);
    
    // Create thumbnail for each receipt
    sortedReceipts.forEach(receipt => {
      const thumbnail = this.createThumbnail(receipt);
      grid.appendChild(thumbnail);
    });
    
    // Update count
    document.getElementById('gallery-count').textContent = this.receipts.length;
  }

  createThumbnail(receipt) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.dataset.receiptId = receipt.id;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'gallery-checkbox';
    checkbox.dataset.receiptId = receipt.id;
    checkbox.checked = this.selectedReceipts.has(receipt.id);
    
    const img = document.createElement('img');
    img.src = receipt.image;
    img.alt = `Receipt ${receipt.id}`;
    img.loading = 'lazy';
    
    const info = document.createElement('div');
    info.className = 'gallery-item-info';
    
    const date = new Date(receipt.timestamp);
    info.innerHTML = `
      <span class="receipt-date">${date.toLocaleDateString()}</span>
      <span class="receipt-time">${date.toLocaleTimeString()}</span>
      ${receipt.tags && receipt.tags.length > 0 ? 
        `<span class="receipt-tags">${receipt.tags.join(', ')}</span>` : ''}
    `;
    
    item.appendChild(checkbox);
    item.appendChild(img);
    item.appendChild(info);
    
    return item;
  }

  toggleSelection(receiptId) {
    receiptId = parseInt(receiptId);
    
    if (this.selectedReceipts.has(receiptId)) {
      this.selectedReceipts.delete(receiptId);
    } else {
      this.selectedReceipts.add(receiptId);
    }
    
    this.updateSelectionUI();
  }

  selectAll() {
    const checkboxes = document.querySelectorAll('.gallery-checkbox');
    
    if (this.selectedReceipts.size === this.receipts.length) {
      // Deselect all
      this.selectedReceipts.clear();
      checkboxes.forEach(cb => cb.checked = false);
    } else {
      // Select all
      this.receipts.forEach(r => this.selectedReceipts.add(r.id));
      checkboxes.forEach(cb => cb.checked = true);
    }
    
    this.updateSelectionUI();
  }

  updateSelectionUI() {
    const count = this.selectedReceipts.size;
    const exportBtn = document.getElementById('export-selected-btn');
    const deleteBtn = document.getElementById('delete-selected-btn');
    const selectAllBtn = document.getElementById('select-all-btn');
    
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
    
    // Update select all button
    if (count === this.receipts.length && count > 0) {
      selectAllBtn.textContent = 'Deselect All';
    } else {
      selectAllBtn.textContent = 'Select All';
    }
  }

  async exportSelected() {
    if (this.selectedReceipts.size === 0) return;
    
    const receiptIds = Array.from(this.selectedReceipts);
    
    try {
      // Get receipts from storage
      const receipts = await this.storage.exportReceipts(receiptIds);
      
      // Create zip file
      await this.createAndDownloadZip(receipts);
      
      // Show success message
      this.showSuccess(`Exported ${receipts.length} receipts`);
      
      // Clear selection
      this.selectedReceipts.clear();
      this.updateSelectionUI();
      
    } catch (error) {
      console.error('Export failed:', error);
      this.showError('Failed to export receipts');
    }
  }

  async createAndDownloadZip(receipts) {
    // For simple implementation, we'll download receipts individually
    // In production, you'd use a library like JSZip
    
    if (receipts.length === 1) {
      // Single receipt - download directly
      const receipt = receipts[0];
      const blob = this.storage.base64ToBlob(receipt.image);
      const date = new Date(receipt.timestamp);
      const filename = `receipt_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}.jpg`;
      
      this.downloadBlob(blob, filename);
      
    } else {
      // Multiple receipts - create download links
      const container = document.createElement('div');
      container.style.display = 'none';
      document.body.appendChild(container);
      
      receipts.forEach((receipt, index) => {
        const blob = this.storage.base64ToBlob(receipt.image);
        const date = new Date(receipt.timestamp);
        const filename = `receipt_${index + 1}_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.jpg`;
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        container.appendChild(link);
        
        // Trigger download with delay to avoid blocking
        setTimeout(() => {
          link.click();
          URL.revokeObjectURL(link.href);
        }, index * 100);
      });
      
      // Clean up after downloads
      setTimeout(() => {
        document.body.removeChild(container);
      }, receipts.length * 100 + 1000);
    }
  }

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async deleteSelected() {
    if (this.selectedReceipts.size === 0) return;
    
    // Confirm deletion
    const confirmed = await this.showConfirm(`Delete ${this.selectedReceipts.size} receipts?`);
    if (!confirmed) return;
    
    try {
      const receiptIds = Array.from(this.selectedReceipts);
      await this.storage.deleteMultipleReceipts(receiptIds);
      
      // Reload gallery
      await this.loadReceipts();
      
      // Clear selection
      this.selectedReceipts.clear();
      this.updateSelectionUI();
      
      // Update counts
      const count = await this.storage.getReceiptCount();
      document.getElementById('capture-count').textContent = count;
      document.getElementById('gallery-count').textContent = count;
      
      this.showSuccess(`Deleted ${receiptIds.length} receipts`);
      
    } catch (error) {
      console.error('Delete failed:', error);
      this.showError('Failed to delete receipts');
    }
  }

  viewReceipt(receiptId) {
    const receipt = this.receipts.find(r => r.id == receiptId);
    if (!receipt) return;
    
    // Find index in sorted array
    const sortedReceipts = [...this.receipts].sort((a, b) => b.timestamp - a.timestamp);
    this.currentViewIndex = sortedReceipts.findIndex(r => r.id == receiptId);
    
    // Show image viewer
    this.showImageViewer(receipt);
    
    // Setup navigation
    this.setupViewerNavigation(sortedReceipts);
  }

  showImageViewer(receipt) {
    const viewer = document.getElementById('image-viewer');
    const image = document.getElementById('viewer-image');
    const indexSpan = document.getElementById('viewer-index');
    
    image.src = receipt.image;
    indexSpan.textContent = `${this.currentViewIndex + 1} / ${this.receipts.length}`;
    
    viewer.classList.add('visible');
  }

  setupViewerNavigation(sortedReceipts) {
    const prevBtn = document.getElementById('viewer-prev');
    const nextBtn = document.getElementById('viewer-next');
    
    // Remove old listeners
    const newPrevBtn = prevBtn.cloneNode(true);
    const newNextBtn = nextBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    
    // Add new listeners
    newPrevBtn.addEventListener('click', () => {
      if (this.currentViewIndex > 0) {
        this.currentViewIndex--;
        this.showImageViewer(sortedReceipts[this.currentViewIndex]);
      }
    });
    
    newNextBtn.addEventListener('click', () => {
      if (this.currentViewIndex < sortedReceipts.length - 1) {
        this.currentViewIndex++;
        this.showImageViewer(sortedReceipts[this.currentViewIndex]);
      }
    });
    
    // Handle keyboard navigation
    const handleKeyboard = (e) => {
      if (e.key === 'ArrowLeft' && this.currentViewIndex > 0) {
        this.currentViewIndex--;
        this.showImageViewer(sortedReceipts[this.currentViewIndex]);
      } else if (e.key === 'ArrowRight' && this.currentViewIndex < sortedReceipts.length - 1) {
        this.currentViewIndex++;
        this.showImageViewer(sortedReceipts[this.currentViewIndex]);
      } else if (e.key === 'Escape') {
        this.hideImageViewer();
        document.removeEventListener('keydown', handleKeyboard);
      }
    };
    
    document.addEventListener('keydown', handleKeyboard);
  }

  hideImageViewer() {
    const viewer = document.getElementById('image-viewer');
    viewer.classList.remove('visible');
  }

  show() {
    const panel = document.getElementById('gallery-panel');
    panel.classList.add('visible');
    
    // Reload receipts when showing gallery
    this.loadReceipts();
  }

  hide() {
    const panel = document.getElementById('gallery-panel');
    panel.classList.remove('visible');
  }

  // UI feedback methods
  showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  showError(message) {
    const toast = document.createElement('div');
    toast.className = 'error-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 5000);
  }

  async showConfirm(message) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog';
      
      dialog.innerHTML = `
        <div class="dialog-content">
          <p>${message}</p>
          <div class="dialog-buttons">
            <button class="btn-cancel">Cancel</button>
            <button class="btn-confirm danger">Delete</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(dialog);
      
      setTimeout(() => {
        dialog.classList.add('visible');
      }, 10);
      
      dialog.querySelector('.btn-cancel').addEventListener('click', () => {
        dialog.classList.remove('visible');
        setTimeout(() => {
          document.body.removeChild(dialog);
        }, 300);
        resolve(false);
      });
      
      dialog.querySelector('.btn-confirm').addEventListener('click', () => {
        dialog.classList.remove('visible');
        setTimeout(() => {
          document.body.removeChild(dialog);
        }, 300);
        resolve(true);
      });
    });
  }
}