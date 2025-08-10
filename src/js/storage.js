import { openDB } from 'idb';

export class StorageManager {
  constructor() {
    this.db = null;
    this.dbName = 'ReceiptScannerDB';
    this.version = 1;
    this.storeName = 'receipts';
  }

  async init() {
    try {
      this.db = await openDB(this.dbName, this.version, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Create receipts store if it doesn't exist
          if (!db.objectStoreNames.contains('receipts')) {
            const store = db.createObjectStore('receipts', {
              keyPath: 'id',
              autoIncrement: true
            });
            
            // Create indexes for efficient querying
            store.createIndex('timestamp', 'timestamp');
            store.createIndex('sessionId', 'sessionId');
            store.createIndex('tags', 'tags', { multiEntry: true });
          }
          
          // Create sessions store
          if (!db.objectStoreNames.contains('sessions')) {
            const sessionStore = db.createObjectStore('sessions', {
              keyPath: 'id',
              autoIncrement: true
            });
            sessionStore.createIndex('startTime', 'startTime');
          }
        }
      });
      
      console.log('Storage initialized successfully');
      
      // Start a new session
      await this.startSession();
      
    } catch (error) {
      console.error('Failed to initialize storage:', error);
      throw error;
    }
  }

  async startSession() {
    this.currentSessionId = `session_${Date.now()}`;
    
    const session = {
      id: this.currentSessionId,
      startTime: Date.now(),
      receiptCount: 0
    };
    
    await this.db.add('sessions', session);
    
    return this.currentSessionId;
  }

  async saveReceipt(blob, metadata = {}) {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }
    
    try {
      // Convert blob to base64 for storage
      const base64 = await this.blobToBase64(blob);
      
      const receipt = {
        timestamp: Date.now(),
        sessionId: this.currentSessionId,
        image: base64,
        size: blob.size,
        type: blob.type,
        metadata: {
          ...metadata,
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`
        },
        tags: [],
        notes: '',
        exported: false
      };
      
      const id = await this.db.add(this.storeName, receipt);
      
      // Update session count
      await this.incrementSessionCount();
      
      console.log(`Receipt saved with ID: ${id}`);
      return id;
      
    } catch (error) {
      console.error('Failed to save receipt:', error);
      throw error;
    }
  }

  async incrementSessionCount() {
    const session = await this.db.get('sessions', this.currentSessionId);
    if (session) {
      session.receiptCount++;
      await this.db.put('sessions', session);
    }
  }

  async getReceipt(id) {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }
    
    return await this.db.get(this.storeName, id);
  }

  async getAllReceipts() {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }
    
    return await this.db.getAll(this.storeName);
  }

  async getReceiptsBySession(sessionId = null) {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }
    
    const targetSessionId = sessionId || this.currentSessionId;
    return await this.db.getAllFromIndex(this.storeName, 'sessionId', targetSessionId);
  }

  async getRecentReceipts(limit = 10) {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }
    
    const receipts = await this.db.getAll(this.storeName);
    
    // Sort by timestamp descending and limit
    return receipts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  async deleteReceipt(id) {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }
    
    await this.db.delete(this.storeName, id);
    console.log(`Receipt ${id} deleted`);
  }

  async deleteMultipleReceipts(ids) {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }
    
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    
    for (const id of ids) {
      await store.delete(id);
    }
    
    await tx.complete;
    console.log(`Deleted ${ids.length} receipts`);
  }

  async updateReceipt(id, updates) {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }
    
    const receipt = await this.getReceipt(id);
    if (!receipt) {
      throw new Error(`Receipt ${id} not found`);
    }
    
    // Merge updates
    const updatedReceipt = {
      ...receipt,
      ...updates,
      lastModified: Date.now()
    };
    
    await this.db.put(this.storeName, updatedReceipt);
    console.log(`Receipt ${id} updated`);
    
    return updatedReceipt;
  }

  async addTag(receiptId, tag) {
    const receipt = await this.getReceipt(receiptId);
    if (!receipt) return;
    
    if (!receipt.tags.includes(tag)) {
      receipt.tags.push(tag);
      await this.db.put(this.storeName, receipt);
    }
  }

  async removeTag(receiptId, tag) {
    const receipt = await this.getReceipt(receiptId);
    if (!receipt) return;
    
    receipt.tags = receipt.tags.filter(t => t !== tag);
    await this.db.put(this.storeName, receipt);
  }

  async getReceiptsByTag(tag) {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }
    
    return await this.db.getAllFromIndex(this.storeName, 'tags', tag);
  }

  async getReceiptCount() {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }
    
    return await this.db.count(this.storeName);
  }

  async getStorageSize() {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }
    
    const receipts = await this.getAllReceipts();
    let totalSize = 0;
    
    for (const receipt of receipts) {
      // Estimate size (base64 is ~1.33x original size)
      totalSize += receipt.size || 0;
    }
    
    return {
      count: receipts.length,
      bytes: totalSize,
      megabytes: (totalSize / (1024 * 1024)).toFixed(2)
    };
  }

  async exportReceipts(receiptIds = null) {
    const receipts = receiptIds 
      ? await Promise.all(receiptIds.map(id => this.getReceipt(id)))
      : await this.getAllReceipts();
    
    // Filter out null receipts
    const validReceipts = receipts.filter(r => r !== null);
    
    // Mark as exported
    for (const receipt of validReceipts) {
      receipt.exported = true;
      receipt.exportedAt = Date.now();
      await this.db.put(this.storeName, receipt);
    }
    
    return validReceipts;
  }

  async clearAll() {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }
    
    await this.db.clear(this.storeName);
    console.log('All receipts cleared');
  }

  // Utility methods
  async blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  base64ToBlob(base64) {
    const parts = base64.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  }

  async getReceiptAsBlob(id) {
    const receipt = await this.getReceipt(id);
    if (!receipt) return null;
    
    return this.base64ToBlob(receipt.image);
  }
}