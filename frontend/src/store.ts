import { create } from "zustand";

interface AppState {
  submittedEntries: Record<string, string>[];
  addSubmittedEntry: (entry: Record<string, string>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  submittedEntries: [],
  addSubmittedEntry: (entry) =>
    set((state) => ({ submittedEntries: [...state.submittedEntries, entry] })),
}));
