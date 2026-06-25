// KSP Sentinel AI — Global state store

import { create } from "zustand";
import type { ViewType, AuthUser, CrimeDataset, ChatMessage } from "./types";

interface AppState {
  // Auth
  user: AuthUser | null;
  login: (username: string, role: string) => void;
  logout: () => void;

  // Navigation
  currentView: ViewType;
  selectedAccusedId: string | null;
  selectedFirId: string | null;
  commandPaletteOpen: boolean;
  setView: (view: ViewType) => void;
  setSelectedAccusedId: (id: string | null) => void;
  setSelectedFirId: (id: string | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;

  // Data
  crimeData: CrimeDataset | null;
  setCrimeData: (data: CrimeDataset) => void;
  dataLoading: boolean;
  setDataLoading: (loading: boolean) => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  clearChat: () => void;
  chatLoading: boolean;
  setChatLoading: (loading: boolean) => void;

  // Language
  lang: "en" | "kn";
  toggleLang: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  login: (username, role) => {
    const user = { username, role };
    if (typeof window !== "undefined") {
      localStorage.setItem("ksp_user", JSON.stringify(user));
    }
    set({ user, currentView: "dashboard" });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ksp_user");
    }
    set({ user: null, currentView: "login" });
  },

  // Navigation
  currentView: "login",
  selectedAccusedId: null,
  selectedFirId: null,
  commandPaletteOpen: false,
  setView: (view) => set({ currentView: view }),
  setSelectedAccusedId: (id) => set({ selectedAccusedId: id }),
  setSelectedFirId: (id) => set({ selectedFirId: id }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  // Data
  crimeData: null,
  setCrimeData: (data) => set({ crimeData: data }),
  dataLoading: false,
  setDataLoading: (loading) => set({ dataLoading: loading }),

  // Chat
  chatMessages: [],
  addChatMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, msg] })),
  clearChat: () => set({ chatMessages: [] }),
  chatLoading: false,
  setChatLoading: (loading) => set({ chatLoading: loading }),

  // Language
  lang: "en",
  toggleLang: () => set((s) => ({ lang: s.lang === "en" ? "kn" : "en" })),
}));