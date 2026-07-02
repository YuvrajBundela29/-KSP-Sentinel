// KSP Sentinel AI — Global state store

import { create } from "zustand";
import type { ViewType, AuthUser, CrimeDataset, ChatMessage, AuditLogEntry, EvidenceItem, ImportJob, AIQueueItem } from "./types";
import type { LangCode } from "./translations";
import { LANGUAGES } from "./translations";

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
  sidebarCollapsed: boolean;
  setView: (view: ViewType) => void;
  setSelectedAccusedId: (id: string | null) => void;
  setSelectedFirId: (id: string | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

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
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  toggleLang: () => void;

  // Data Management
  auditLogs: AuditLogEntry[];
  addAuditLog: (log: Omit<AuditLogEntry, "id" | "timestamp" | "ip">) => void;
  evidenceItems: EvidenceItem[];
  addEvidenceItem: (item: EvidenceItem) => void;
  importJobs: ImportJob[];
  addImportJob: (job: ImportJob) => void;
  aiQueue: AIQueueItem[];
  addAIQueueItem: (item: AIQueueItem) => void;
  updateAIQueueItem: (id: string, updates: Partial<AIQueueItem>) => void;
  notifications: { id: string; title: string; message: string; timestamp: string; read: boolean; type: "info" | "warning" | "error" | "success" }[];
  addNotification: (n: Omit<{ id: string; title: string; message: string; timestamp: string; read: boolean; type: "info" | "warning" | "error" | "success" }, "id" | "timestamp">) => void;
  markNotificationRead: (id: string) => void;

  // Onboarding
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  completeOnboarding: () => void;

  // Theme
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
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
  sidebarCollapsed: false,
  setView: (view) => set({ currentView: view }),
  setSelectedAccusedId: (id) => set({ selectedAccusedId: id }),
  setSelectedFirId: (id) => set({ selectedFirId: id }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

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
  lang: (typeof window !== "undefined" ? (localStorage.getItem("ksp_lang") as LangCode) : null) || "en",
  setLang: (lang) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ksp_lang", lang);
    }
    set({ lang });
  },
  toggleLang: () => {
    const langs = LANGUAGES.map((l) => l.code);
    const cur = useAppStore.getState().lang;
    const idx = langs.indexOf(cur);
    const next = langs[(idx + 1) % langs.length];
    useAppStore.getState().setLang(next);
  },

  // Data Management
  auditLogs: [],
  addAuditLog: (log) =>
    set((s) => ({
      auditLogs: [
        {
          ...log,
          id: `AL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          ip: "192.168.1." + Math.floor(Math.random() * 255),
        },
        ...s.auditLogs,
      ],
    })),
  evidenceItems: [],
  addEvidenceItem: (item) =>
    set((s) => ({ evidenceItems: [...s.evidenceItems, item] })),
  importJobs: [],
  addImportJob: (job) =>
    set((s) => ({ importJobs: [...s.importJobs, job] })),
  aiQueue: [],
  addAIQueueItem: (item) =>
    set((s) => ({ aiQueue: [...s.aiQueue, item] })),
  updateAIQueueItem: (id, updates) =>
    set((s) => ({
      aiQueue: s.aiQueue.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),
  notifications: [
    { id: "n1", title: "FIR Processing Complete", message: "FIR-2024-KA-0042 has been processed by AI", timestamp: new Date(Date.now() - 300000).toISOString(), read: false, type: "success" },
    { id: "n2", title: "Duplicate Detected", message: "Possible duplicate FIR in Bengaluru district", timestamp: new Date(Date.now() - 900000).toISOString(), read: false, type: "warning" },
    { id: "n3", title: "Risk Alert", message: "High-risk suspect A005 linked to new case", timestamp: new Date(Date.now() - 1800000).toISOString(), read: true, type: "error" },
  ],
  addNotification: (n) =>
    set((s) => ({
      notifications: [
        { ...n, id: `n-${Date.now()}`, timestamp: new Date().toISOString(), read: false },
        ...s.notifications,
      ],
    })),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),

  // Onboarding — always start true to match SSR, client useEffect in WelcomeOnboarding dismisses if done
  showOnboarding: true,
  setShowOnboarding: (show) => set({ showOnboarding: show }),
  completeOnboarding: () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ksp_onboarding_done", "1");
    }
    set({ showOnboarding: false });
  },

  // Theme
  theme: (typeof window !== "undefined" ? localStorage.getItem("ksp_theme") : null) as "dark" | "light" || "dark",
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ksp_theme", theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.classList.toggle("light", theme === "light");
    }
    set({ theme });
  },
  toggleTheme: () => {
    const next = useAppStore.getState().theme === "dark" ? "light" : "dark";
    useAppStore.getState().setTheme(next);
  },
}));