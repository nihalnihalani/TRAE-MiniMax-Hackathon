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

  // Integrity
  integrity: {
    blurCount: number;
    pasteCount: number;
    largePasteEvents: { timestamp: number, length: number }[];
  };
  addBlurEvent: () => void;
  addPasteEvent: (length: number) => void;
  getIntegrityReport: () => string;

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

      // Integrity
      integrity: {
        blurCount: 0,
        pasteCount: 0,
        largePasteEvents: []
      },
      addBlurEvent: () => set((state) => ({
        integrity: {
            ...state.integrity,
            blurCount: state.integrity.blurCount + 1
        }
      })),
      addPasteEvent: (length) => set((state) => {
        const isLarge = length > 50;
        return {
            integrity: {
                ...state.integrity,
                pasteCount: state.integrity.pasteCount + 1,
                largePasteEvents: isLarge 
                    ? [...state.integrity.largePasteEvents, { timestamp: Date.now(), length }] 
                    : state.integrity.largePasteEvents
            }
        };
      }),
      getIntegrityReport: () => {
        const state = get();
        const { blurCount, pasteCount, largePasteEvents } = state.integrity;
        return `Integrity Report: User has left the tab ${blurCount} times. Detected ${pasteCount} paste events, with ${largePasteEvents.length} large pastes (>50 chars).`;
      },

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
