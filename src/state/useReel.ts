import { create } from 'zustand'

export type Phase = 'loading' | 'idle' | 'roll' | 'focus' | 'feed' | 'lead' | 'play' | 'return'

type Command = { kind: 'goto'; film: number; id: number } | { kind: 'back'; id: number }

type ReelState = {
  phase: Phase
  target: number
  paused: boolean
  command: Command | null
  goTo: (film: number) => void
  back: () => void
  setPaused: (paused: boolean) => void
  /** Called by the scene when the animation moves to a new phase. */
  reportPhase: (phase: Phase, target?: number) => void
}

let nextId = 0

// The UI writes commands; the scene reads them each frame and reports phases back.
export const useReel = create<ReelState>((set) => ({
  phase: 'loading',
  target: 0,
  paused: false,
  command: null,
  goTo: (film) => set({ command: { kind: 'goto', film, id: ++nextId }, paused: false }),
  back: () => set({ command: { kind: 'back', id: ++nextId } }),
  setPaused: (paused) => set({ paused }),
  reportPhase: (phase, target) => set(target === undefined ? { phase } : { phase, target }),
}))

// handy in the browser console while developing: __reel.getState()
if (import.meta.env.DEV) (window as unknown as { __reel: typeof useReel }).__reel = useReel
