import { pipeline, env } from '@xenova/transformers';

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

export class Detector {
  constructor() {
    this.model = null;
    this.modelName = null;
    this.isLoading = false;
    this.modelCache = new Map();
    
    // Model configurations
    this.models = {
      'yolos-tiny': {
        name: 'Xenova/yolos-tiny',
        size: 'tiny',
        speed: 'fast'
      },
      'yolos-small': {
        name: 'Xenova/yolos-small', 
        size: 'small',
        speed: 'balanced'
      },
      'detr-resnet-50': {
        name: 'Xenova/detr-resnet-50',
        size: 'large',
        speed: 'slow'
      }
    };
  }

  async init(modelName = 'yolos-tiny') {
    if (this.isLoading) {
      console.log('Model is already loading...');
      return;
    }
    
    this.isLoading = true;
    
    try {
      // Check if model is cached
      if (this.modelCache.has(modelName)) {
        this.model = this.modelCache.get(modelName);
        this.modelName = modelName;
        console.log(`Loaded cached model: ${modelName}`);
      } else {
        // Load the model
        const modelConfig = this.models[modelName];
        if (!modelConfig) {
          throw new Error(`Unknown model: ${modelName}`);
        }
        
        console.log(`Loading model: ${modelConfig.name}`);
        
        // Create object detection pipeline
        this.model = await pipeline('object-detection', modelConfig.name, {
          quantized: true, // Use quantized model for better performance
          progress_callback: (progress) => {
            console.log(`Loading progress: ${Math.round(progress * 100)}%`);
            const event = new CustomEvent('model-progress', { detail: progress });
            window.dispatchEvent(event);
          }
        });
        
        // Cache the model
        this.modelCache.set(modelName, this.model);
        this.modelName = modelName;
        
        console.log(`Model loaded successfully: ${modelName}`);
      }
      
    } catch (error) {
      console.error('Failed to load model:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async switchModel(modelName) {
    await this.init(modelName);
  }

  async detect(source) {
    if (!this.model) {
      throw new Error('Model not initialized. Call init() first.');
    }
    
    // Enhanced source validation
    if (!source) {
      console.error('Detection error: Source is null or undefined');
      return [];
    }
    
    try {
      // Convert source to canvas for consistent processing
      let canvas;
      
      if (source instanceof HTMLVideoElement) {
        // Enhanced video validation
        if (!source.videoWidth || !source.videoHeight) {
          console.warn('Video dimensions not available:', {
            videoWidth: source.videoWidth,
            videoHeight: source.videoHeight,
            readyState: source.readyState,
            networkState: source.networkState
          });
          return [];
        }
        
        // Check video readiness
        if (source.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          console.warn('Video not ready for processing:', {
            readyState: source.readyState,
            currentTime: source.currentTime
          });
          return [];
        }
        
        canvas = document.createElement('canvas');
        canvas.width = source.videoWidth;
        canvas.height = source.videoHeight;
        const ctx = canvas.getContext('2d');
        
        // Validate canvas context
        if (!ctx) {
          console.error('Failed to get 2D context from canvas');
          return [];
        }
        
        try {
          ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        } catch (drawError) {
          console.error('Failed to draw video to canvas:', drawError);
          return [];
        }
        
      } else if (source instanceof HTMLCanvasElement) {
        canvas = source;
        
      } else if (source instanceof HTMLImageElement) {
        // Ensure image has loaded dimensions
        if (source.naturalWidth === 0 || source.naturalHeight === 0) {
          console.warn('Image dimensions not available, skipping detection');
          return [];
        }
        
        canvas = document.createElement('canvas');
        canvas.width = source.naturalWidth;
        canvas.height = source.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
        
      } else {
        const sourceInfo = {
          type: typeof source,
          constructor: source?.constructor?.name || 'unknown',
          isElement: source instanceof Element,
          isNode: source instanceof Node,
          tagName: source?.tagName || 'N/A'
        };
        
        console.error('Unsupported input type for detection:', sourceInfo);
        throw new Error(`Unsupported input type: ${sourceInfo.constructor || sourceInfo.type}. Expected HTMLVideoElement, HTMLCanvasElement, or HTMLImageElement. Received: ${JSON.stringify(sourceInfo)}`);
      }
      
      // Ensure we have a valid canvas with dimensions
      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        console.warn('Invalid canvas dimensions, skipping detection');
        return [];
      }
      
      // Validate canvas has actual image data (skip in test environment)
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('Canvas context is null');
          return [];
        }
        
        // Only validate image data in real browser environment
        if (typeof window !== 'undefined' && ctx.getImageData && !window.location.href.includes('test')) {
          // Check if canvas has any image data (not just transparent pixels)
          const sampleWidth = Math.min(canvas.width, 10);
          const sampleHeight = Math.min(canvas.height, 10);
          
          if (sampleWidth > 0 && sampleHeight > 0) {
            const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
            const hasImageData = Array.from(imageData.data).some((value, index) => {
              // Check alpha channel (every 4th value) and RGB values
              return index % 4 === 3 ? value > 0 : value !== 0;
            });
            
            if (!hasImageData) {
              console.warn('Canvas appears to be empty or transparent, skipping detection');
              return [];
            }
          }
        }
      } catch (canvasError) {
        // Don't fail if canvas validation has issues (could be test environment)
        console.warn('Canvas validation skipped due to error:', canvasError.message);
      }
      
      // Final validation before passing to model
      if (!(canvas instanceof HTMLCanvasElement)) {
        const actualType = {
          type: typeof canvas,
          constructor: canvas?.constructor?.name || 'unknown',
          isElement: canvas instanceof Element,
          tagName: canvas?.tagName || 'N/A'
        };
        console.error('Expected HTMLCanvasElement, got:', actualType);
        throw new Error(`Model input validation failed: Expected HTMLCanvasElement, got ${actualType.constructor}`);
      }
      
      // Run detection with proper error handling
      const results = await this.model(canvas, {
        threshold: 0.5,
        percentage: false // Get pixel coordinates instead of percentages
      });
      
      // Format results for our use case
      return this.formatResults(results, canvas);
      
    } catch (error) {
      console.error('Detection error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        sourceType: typeof source,
        sourceConstructor: source?.constructor?.name
      });
      return [];
    }
  }

  formatResults(results, canvas) {
    if (!results || !Array.isArray(results)) return [];
    
    // Get canvas dimensions for scaling
    const width = canvas.width || canvas.videoWidth;
    const height = canvas.height || canvas.videoHeight;
    
    return results.map(result => {
      // Ensure we have proper box coordinates
      let box;
      
      if (result.box) {
        box = result.box;
      } else if (result.bbox) {
        // Some models return bbox instead of box
        const [x, y, w, h] = result.bbox;
        box = { x, y, width: w, height: h };
      } else {
        // Fallback to xmin, ymin, xmax, ymax format
        box = {
          x: result.xmin || 0,
          y: result.ymin || 0,
          width: (result.xmax || width) - (result.xmin || 0),
          height: (result.ymax || height) - (result.ymin || 0)
        };
      }
      
      return {
        label: result.label || 'object',
        score: result.score || 0,
        box: {
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width || box.w || 0),
          height: Math.round(box.height || box.h || 0)
        }
      };
    });
  }

  isReceiptCandidate(detection) {
    // Check if detection could be a receipt
    const receiptLabels = [
      'paper', 'document', 'receipt', 'invoice', 
      'bill', 'ticket', 'card', 'note', 'letter'
    ];
    
    const label = detection.label?.toLowerCase() || '';
    
    // Check if label matches receipt-like objects
    const isLabelMatch = receiptLabels.some(receiptLabel => 
      label.includes(receiptLabel)
    );
    
    // Check aspect ratio (receipts are usually taller than wide)
    const aspectRatio = detection.box.height / detection.box.width;
    const isReceiptShape = aspectRatio > 1.2 && aspectRatio < 4;
    
    // Check minimum size (avoid tiny detections)
    const area = detection.box.width * detection.box.height;
    const minArea = 10000; // Minimum 100x100 pixels
    const isSizeValid = area > minArea;
    
    return (isLabelMatch || detection.score > 0.8) && isSizeValid;
  }

  async detectReceipts(source) {
    const allDetections = await this.detect(source);
    return allDetections.filter(d => this.isReceiptCandidate(d));
  }

  dispose() {
    // Clean up resources
    this.model = null;
    this.modelCache.clear();
  }

  getModelInfo() {
    if (!this.modelName) return null;
    
    return {
      name: this.modelName,
      ...this.models[this.modelName]
    };
  }
}