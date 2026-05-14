import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Conversation, PendingOutboundMessage, Screen, UserProfile } from "../types";

type ChatStore = {
  screen: Screen;
  currentUser: UserProfile | null;
  selectedConversationId: string | null;
  conversations: Conversation[];
  isOnline: boolean;
  pendingMessages: PendingOutboundMessage[];
  setScreen: (screen: Screen) => void;
  setCurrentUser: (user: UserProfile | null) => void;
  setSelectedConversationId: (conversationId: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  setOnline: (isOnline: boolean) => void;
  enqueueMessage: (message: PendingOutboundMessage) => void;
  removePendingMessage: (clientId: string) => void;
  clearSession: () => void;
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      screen: "auth",
      currentUser: null,
      selectedConversationId: null,
      conversations: [],
      isOnline: true,
      pendingMessages: [],
      setScreen: (screen) => set({ screen }),
      setCurrentUser: (currentUser) => set({ currentUser, screen: currentUser ? "conversations" : "auth" }),
      setSelectedConversationId: (selectedConversationId) => set({ selectedConversationId, screen: selectedConversationId ? "chat" : "conversations" }),
      setConversations: (conversations) => set({ conversations }),
      setOnline: (isOnline) => set({ isOnline }),
      enqueueMessage: (message) =>
        set((state) => ({
          pendingMessages: state.pendingMessages.some((item) => item.clientId === message.clientId)
            ? state.pendingMessages
            : [...state.pendingMessages, message]
        })),
      removePendingMessage: (clientId) =>
        set((state) => ({
          pendingMessages: state.pendingMessages.filter((item) => item.clientId !== clientId)
        })),
      clearSession: () =>
        set({
          currentUser: null,
          selectedConversationId: null,
          conversations: [],
          screen: "auth"
        })
    }),
    {
      name: "stage-5-chat-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentUser: state.currentUser,
        pendingMessages: state.pendingMessages
      })
    }
  )
);
