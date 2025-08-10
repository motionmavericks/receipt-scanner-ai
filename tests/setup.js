// Test setup file for global configurations
import { vi } from 'vitest';

// Mock HTMLMediaElement constants
global.HTMLMediaElement = {
  HAVE_NOTHING: 0,
  HAVE_METADATA: 1,
  HAVE_CURRENT_DATA: 2,
  HAVE_FUTURE_DATA: 3,
  HAVE_ENOUGH_DATA: 4
};

// Mock HTMLVideoElement
global.HTMLVideoElement = class HTMLVideoElement extends EventTarget {
  constructor() {
    super();
    this.videoWidth = 0;
    this.videoHeight = 0;
    this.readyState = HTMLMediaElement.HAVE_NOTHING;
    this.networkState = 0;
    this.currentTime = 0;
    this.srcObject = null;
    this.tagName = 'VIDEO';
  }
};

// Mock HTMLCanvasElement
global.HTMLCanvasElement = class HTMLCanvasElement extends EventTarget {
  constructor() {
    super();
    this.width = 0;
    this.height = 0;
    this.tagName = 'CANVAS';
  }

  getContext(type) {
    if (type === '2d') {
      return {
        drawImage: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(() => ({ width: 100 })),
        clearRect: vi.fn(),
        strokeStyle: '#000000',
        fillStyle: '#000000',
        lineWidth: 1,
        font: '12px Arial',
        textAlign: 'start'
      };
    }
    return null;
  }
};

// Mock HTMLImageElement
global.HTMLImageElement = class HTMLImageElement extends EventTarget {
  constructor() {
    super();
    this.naturalWidth = 0;
    this.naturalHeight = 0;
    this.tagName = 'IMG';
  }
};

// Mock DOM elements
global.Element = class Element extends EventTarget {
  constructor() {
    super();
    this.tagName = '';
  }
};

global.Node = class Node extends EventTarget {};

// Mock document.createElement
global.document = {
  createElement: vi.fn((tagName) => {
    if (tagName === 'canvas') {
      return new HTMLCanvasElement();
    } else if (tagName === 'video') {
      return new HTMLVideoElement();
    } else if (tagName === 'img') {
      return new HTMLImageElement();
    }
    return new Element();
  }),
  getElementById: vi.fn(),
  addEventListener: vi.fn()
};

// Mock window
global.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 16)),
  cancelAnimationFrame: vi.fn(),
  navigator: {
    vibrate: vi.fn()
  },
  AudioContext: vi.fn(),
  webkitAudioContext: vi.fn(),
  dispatchEvent: vi.fn()
};

// Mock MediaStream
global.MediaStream = class MediaStream extends EventTarget {
  constructor(tracks = []) {
    super();
    this.tracks = tracks;
  }
  
  getVideoTracks() {
    return this.tracks.filter(track => track.kind === 'video');
  }
  
  getAudioTracks() {
    return this.tracks.filter(track => track.kind === 'audio');
  }
  
  getTracks() {
    return [...this.tracks];
  }
};

// Mock MediaStreamTrack
global.MediaStreamTrack = class MediaStreamTrack extends EventTarget {
  constructor(kind = 'video') {
    super();
    this.kind = kind;
    this.enabled = true;
    this.readyState = 'live';
  }
};

// Mock Blob
global.Blob = class Blob {
  constructor(parts = [], options = {}) {
    this.parts = parts;
    this.type = options.type || '';
    this.size = 0;
  }
};

// Mock console methods to reduce noise during testing
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};