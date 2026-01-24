import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface ReviewResult {
  score: number;
  complexity: string;
  issues: string[];
  reasoning_trace: string;
}

interface InterviewState {
  // Session
  status: 'idle' | 'active' | 'completed';
  startSession: () => void;
  endSession: () => void;
  setStatus: (status: 'idle' | 'active' | 'completed') => void;

  // Code
  language: string; // 'python' | 'typescript'
  code: string;
  setCode: (code: string) => void;
  setLanguage: (lang: string) => void;
  
  // Console
  consoleOutput: string[];
  addLog: (log: string) => void;
  clearLogs: () => void;

  // Analysis
  latestReview: ReviewResult | null;
  setReview: (review: ReviewResult | null) => void;
}

export const useInterviewStore = create<InterviewState>()(
  persist(
    (set) => ({
      // Session
      status: 'idle',
      startSession: () => set({ status: 'active' }),
      endSession: () => set({ status: 'completed' }),
      setStatus: (status) => set({ status }),

      // Code
      language: 'python',
      code: "// Write your solution here\nprint('Hello World')",
      setCode: (code) => set({ code }),
      setLanguage: (language) => set({ language }),

      // Console
      consoleOutput: [],
      addLog: (log) => set((state) => ({ consoleOutput: [...state.consoleOutput, log] })),
      clearLogs: () => set({ consoleOutput: [] }),

      // Analysis
      latestReview: null,
      setReview: (review) => set({ latestReview: review }),
    }),
    {
      name: 'interview-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        code: state.code,
        language: state.language 
      }), // Only persist code and language
    }
  )
);
