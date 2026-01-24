import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { CodeRabbitReview } from './coderabbit';

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
  language: string; 
  code: string;
  workspaceId: string | null;
  setCode: (code: string) => void;
  setLanguage: (lang: string) => void;
  setWorkspaceId: (id: string | null) => void;
  
  // Console
  consoleOutput: string[];
  addLog: (log: string) => void;
  clearLogs: () => void;

  // Analysis
  latestReview: ReviewResult | null;
  setReview: (review: ReviewResult | null) => void;
  
  // CodeRabbit Analysis
  coderabbitReview: CodeRabbitReview | null;
  setCodeRabbitReview: (review: CodeRabbitReview | null) => void;

  // Demo / Wizard Mode
  isWizardMode: boolean;
  toggleWizardMode: () => void;
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
      workspaceId: null,
      setCode: (code) => set({ code }),
      setLanguage: (language) => set({ language }),
      setWorkspaceId: (id) => set({ workspaceId: id }),

      // Console
      consoleOutput: [],
      addLog: (log) => set((state) => ({ consoleOutput: [...state.consoleOutput, log] })),
      clearLogs: () => set({ consoleOutput: [] }),

      // Analysis
      latestReview: null,
      setReview: (review) => set({ latestReview: review }),

      // CodeRabbit Analysis
      coderabbitReview: null,
      setCodeRabbitReview: (review) => set({ coderabbitReview: review }),

      // Wizard Mode
      isWizardMode: false,
      toggleWizardMode: () => set((state) => ({ isWizardMode: !state.isWizardMode })),
    }),
    {
      name: 'interview-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        code: state.code,
        language: state.language,
        isWizardMode: state.isWizardMode // Persist wizard mode preference
      }), 
    }
  )
);
