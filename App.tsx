import NetInfo from "@react-native-community/netinfo";
import { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { listenAuth, sendTextNow } from "./src/services/firebaseChat";
import { useChatStore } from "./src/store/chatStore";
import AuthScreen from "./src/screens/AuthScreen";
import ConversationListScreen from "./src/screens/ConversationListScreen";
import NewChatScreen from "./src/screens/NewChatScreen";
import ChatScreen from "./src/screens/ChatScreen";

export default function App() {
  const screen = useChatStore((state) => state.screen);
  const currentUser = useChatStore((state) => state.currentUser);
  const conversations = useChatStore((state) => state.conversations);
  const pendingMessages = useChatStore((state) => state.pendingMessages);
  const isOnline = useChatStore((state) => state.isOnline);
  const setCurrentUser = useChatStore((state) => state.setCurrentUser);
  const setOnline = useChatStore((state) => state.setOnline);
  const removePendingMessage = useChatStore((state) => state.removePendingMessage);
  const flushingRef = useRef(false);

  useEffect(() => listenAuth(setCurrentUser), [setCurrentUser]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return unsubscribe;
  }, [setOnline]);

  useEffect(() => {
    if (!isOnline || !currentUser || pendingMessages.length === 0 || flushingRef.current) return;
    flushingRef.current = true;

    Promise.allSettled(
      pendingMessages.map(async (message) => {
        const conversation = conversations.find((item) => item.id === message.conversationId);
        if (!conversation) return;
        await sendTextNow(message, conversation.members);
        removePendingMessage(message.clientId);
      })
    ).finally(() => {
      flushingRef.current = false;
    });
  }, [conversations, currentUser, isOnline, pendingMessages, removePendingMessage]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {screen === "auth" && <AuthScreen />}
      {screen === "conversations" && <ConversationListScreen />}
      {screen === "newChat" && <NewChatScreen />}
      {screen === "chat" && <ChatScreen />}
    </SafeAreaProvider>
  );
}
