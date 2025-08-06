import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RecognitionResult } from '../components/ResultDisplay';

interface AppSettings {
  language: 'zh-CN' | 'en-US';
  qrCodeFormats: ('QR_CODE' | 'DATA_MATRIX' | 'AZTEC' | 'PDF_417')[];
  confidence: number;
  autoSave: boolean;
  maxBatchSize: number;
  processingDelay: number;
  imageQuality: number;
  enableFlash: boolean;
  autoFocus: boolean;
  enableVibration: boolean;
  enableSound: boolean;
}

interface AppState {
  // 识别结果
  results: RecognitionResult[];
  
  // 应用设置
  settings: AppSettings;
  
  // 操作方法
  addResult: (result: RecognitionResult) => void;
  removeResult: (id: string) => void;
  clearHistory: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
  language: 'zh-CN',
  qrCodeFormats: ['QR_CODE'],
  confidence: 0.7,
  autoSave: true,
  maxBatchSize: 20,
  processingDelay: 500,
  imageQuality: 0.8,
  enableFlash: true,
  autoFocus: true,
  enableVibration: true,
  enableSound: false
};

export const useAppStore = create<AppState>()(persist(
  (set, get) => ({
    results: [],
    settings: defaultSettings,
    
    addResult: (result) => {
      set((state) => ({
        results: [result, ...state.results]
      }));
    },
    
    removeResult: (id) => {
      set((state) => ({
        results: state.results.filter(result => result.id !== id)
      }));
    },
    
    clearHistory: () => {
      set({ results: [] });
    },
    
    updateSettings: (newSettings) => {
      set((state) => ({
        settings: { ...state.settings, ...newSettings }
      }));
    }
  }),
  {
    name: 'qr-code-scanner-storage',
    partialize: (state) => ({
      results: state.results,
      settings: state.settings
    })
  }
));