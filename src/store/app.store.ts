import { create } from "zustand";
import type { MessageLog } from "@/types";

interface AppStore {
  // Mobile nav open state (sidebar on mobile)
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;

  // Currently watched campaign for live progress
  activeCampaignId: string | null;
  setActiveCampaignId: (id: string | null) => void;

  // Recent sends in this session (shown as an in-page activity feed)
  pendingLogs: Pick<
    MessageLog,
    "id" | "toPhone" | "messageType" | "status" | "wamid" | "sentAt"
  >[];
  addPendingLog: (
    log: Pick<
      MessageLog,
      "id" | "toPhone" | "messageType" | "status" | "wamid" | "sentAt"
    >
  ) => void;
  clearPendingLogs: () => void;
}

export const useAppStore = create<AppStore>((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  activeCampaignId: null,
  setActiveCampaignId: (id) => set({ activeCampaignId: id }),

  pendingLogs: [],
  addPendingLog: (log) =>
    set((state) => ({
      pendingLogs: [log, ...state.pendingLogs].slice(0, 50),
    })),
  clearPendingLogs: () => set({ pendingLogs: [] }),
}));
