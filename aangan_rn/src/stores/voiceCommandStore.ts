import { create } from 'zustand';

interface VoiceCommandState {
  isCommandMode: boolean;
  lastCommand: string | null;
  commandResult: { success: boolean; message: string } | null;

  setCommandMode: (isCommandMode: boolean) => void;
  setLastCommand: (lastCommand: string | null) => void;
  setCommandResult: (commandResult: { success: boolean; message: string } | null) => void;
  reset: () => void;
}

export const useVoiceCommandStore = create<VoiceCommandState>((set) => ({
  isCommandMode: false,
  lastCommand: null,
  commandResult: null,

  setCommandMode: (isCommandMode) => set({ isCommandMode }),
  setLastCommand: (lastCommand) => set({ lastCommand }),
  setCommandResult: (commandResult) => set({ commandResult }),
  reset: () =>
    set({
      isCommandMode: false,
      lastCommand: null,
      commandResult: null,
    }),
}));
