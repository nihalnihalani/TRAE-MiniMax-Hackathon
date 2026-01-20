import { create } from 'zustand'

interface State {
  bears: number
  increase: (by: number) => void
}

export const useStore = create<State>((set) => ({
  bears: 0,
  increase: (by) => set((state) => ({ bears: state.bears + by })),
}))
