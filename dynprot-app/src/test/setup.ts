import '@testing-library/jest-dom';

// Mock environment variables for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_APP_NAME: 'DynProt',
    VITE_APP_VERSION: '1.0.0',
    VITE_NODE_ENV: 'test',
    VITE_DEMO_EMAIL: 'demo@dynprot.com',
    VITE_DEMO_PASSWORD: 'Demo123!',
    VITE_DEMO_NAME: 'Demo User',
    VITE_ENCRYPTION_SECRET: 'test-secret',
    VITE_ENCRYPTION_ITERATIONS: '1000',
    VITE_ENABLE_DEMO_MODE: 'true',
    VITE_ENABLE_VOICE_INPUT: 'true',
    VITE_ENABLE_CAMERA_SCAN: 'true',
    VITE_ENABLE_AI_ANALYSIS: 'true',
    VITE_ENABLE_ENCRYPTION: 'true',
    VITE_STORAGE_PREFIX: 'dynprot-test',
    VITE_DEBUG_MODE: 'false',
  },
  writable: true,
});

// Mock Web Speech API for voice input tests
global.SpeechRecognition = class SpeechRecognition {
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  continuous = false;
  interimResults = false;
  lang = 'fr-FR';
  maxAlternatives = 1;
  serviceURI = '';
  grammars = null;
  onstart = null;
  onend = null;
  onerror = null;
  onresult = null;
  onnomatch = null;
  onsoundstart = null;
  onsoundend = null;
  onspeechstart = null;
  onspeechend = null;
  onaudiostart = null;
  onaudioend = null;
};

global.webkitSpeechRecognition = global.SpeechRecognition;

// Mock crypto.subtle for encryption tests
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      importKey: vi.fn().mockResolvedValue({}),
      encrypt: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
      decrypt: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
    },
    getRandomValues: vi.fn((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
  writable: true,
});

// Mock localStorage and sessionStorage
const createStorage = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
};

Object.defineProperty(window, 'localStorage', {
  value: createStorage(),
});

Object.defineProperty(window, 'sessionStorage', {
  value: createStorage(),
});

// Mock navigator.mediaDevices for camera tests
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
    enumerateDevices: vi.fn().mockResolvedValue([]),
  },
  writable: true,
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(callback: ResizeObserverCallback) {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Suppress console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('React Router')
  ) {
    return;
  }
  originalWarn(...args);
};