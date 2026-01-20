import { create } from 'zustand'

interface InterviewState {
  code: string;
  language: string;
  setCode: (code: string) => void;
  setLanguage: (lang: string) => void;
}

export const useInterviewStore = create<InterviewState>((set) => ({
  code: "// Start coding...",
  language: "python",
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
}))
