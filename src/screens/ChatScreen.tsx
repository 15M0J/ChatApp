import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AnimatedDots from "../components/AnimatedDots";
import AsyncState from "../components/AsyncState";
import ChatComposer from "../components/ChatComposer";
import MediaViewer from "../components/MediaViewer";
import MessageBubble from "../components/MessageBubble";
import {
  deleteMessageForEveryone,
  deleteMessageForMe,
  editMessage,
  listenMessages,
  pickAndSendMedia,
  sendAudioMessage,
  sendTextNow,
  setReaction,
  updateTypingStatus
} from "../services/firebaseChat";
import { useChatStore } from "../store/chatStore";
import type { ChatMessage } from "../types";

export default function ChatScreen() {
  const currentUser = useChatStore((state) => state.currentUser);
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const setSelectedConversationId = useChatStore((state) => state.setSelectedConversationId);
  const conversations = useChatStore((state) => state.conversations);
  const isOnline = useChatStore((state) => state.isOnline);
  const enqueueMessage = useChatStore((state) => state.enqueueMessage);
  const pendingMessages = useChatStore((state) => state.pendingMessages);
  const conversation = conversations.find((item) => item.id === selectedConversationId);
  const otherUid = conversation?.members.find((uid) => uid !== currentUser?.uid);
  const other = otherUid ? conversation?.memberInfo[otherUid] : undefined;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [viewerMessage, setViewerMessage] = useState<ChatMessage | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (!selectedConversationId || !currentUser) return undefined;
    setLoading(true);
    return listenMessages(
      selectedConversationId,
      currentUser.uid,
      (items) => {
        setMessages(items);
        setLoading(false);
        setError(null);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  }, [currentUser, selectedConversationId]);

  useEffect(() => {
    setSearching(Boolean(searchTerm.trim()));
    const handle = setTimeout(() => setSearching(false), 220);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const localQueuedMessages = useMemo<ChatMessage[]>(() => {
    if (!selectedConversationId) return [];
    return pendingMessages
      .filter((message) => message.conversationId === selectedConversationId)
      .map((message) => ({
        id: message.clientId,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderName: message.senderName,
        type: "text",
        text: message.text,
        localState: "queued",
        createdAt: message.queuedAt
      }));
  }, [pendingMessages, selectedConversationId]);

  const visibleMessages = useMemo(() => {
    const all = [...messages, ...localQueuedMessages].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    const term = searchTerm.trim().toLowerCase();
    if (!term) return all;
    return all.filter((message) => (message.text ?? "").toLowerCase().includes(term));
  }, [localQueuedMessages, messages, searchTerm]);

  const otherTyping = Boolean(otherUid && conversation?.typing?.[otherUid]);

  async function sendText(text: string) {
    if (!currentUser || !conversation) return;
    if (editingMessage) {
      await editMessage(conversation.id, editingMessage.id, text);
      setEditingMessage(null);
      return;
    }

    const pending = {
      clientId: `${Date.now()}_${currentUser.uid}`,
      conversationId: conversation.id,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      text,
      queuedAt: Date.now()
    };

    if (!isOnline) {
      enqueueMessage(pending);
      return;
    }

    await sendTextNow(pending, conversation.members);
  }

  async function handleTyping(isTyping: boolean) {
    if (!currentUser || !conversation || !isOnline) return;
    await updateTypingStatus(conversation.id, currentUser.uid, isTyping).catch(() => undefined);
  }

  async function pickMedia() {
    if (!conversation || !currentUser) return;
    setUploading(true);
    try {
      await pickAndSendMedia(conversation, currentUser);
    } catch (err) {
      Alert.alert("Media failed", err instanceof Error ? err.message : "Unable to send media.");
    } finally {
      setUploading(false);
    }
  }

  async function sendAudio(uri: string, durationMillis?: number) {
    if (!conversation || !currentUser) return;
    setUploading(true);
    try {
      await sendAudioMessage(conversation, currentUser, uri, durationMillis);
    } catch (err) {
      Alert.alert("Audio failed", err instanceof Error ? err.message : "Unable to send audio.");
    } finally {
      setUploading(false);
    }
  }

  function confirmDeleteForEveryone(message: ChatMessage) {
    Alert.alert("Delete for everyone?", "This removes the message for all chat members.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMessageForEveryone(message.conversationId, message.id) }
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setSelectedConversationId(null)}>
            <Ionicons name="arrow-back" size={22} color="#e5eefb" />
          </TouchableOpacity>
          <View style={styles.headerBody}>
            <Text style={styles.title}>{other?.displayName ?? "Chat"}</Text>
            <View style={styles.presenceRow}>
              <Text style={styles.status}>{isOnline ? "Realtime sync" : "Offline"}</Text>
              {otherTyping ? (
                <View style={styles.typingWrap}>
                  <Text style={styles.status}>typing</Text>
                  <AnimatedDots />
                </View>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color="#64748b" />
          <TextInput value={searchTerm} onChangeText={setSearchTerm} placeholder="Search in chat" placeholderTextColor="#64748b" style={styles.searchInput} />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <Ionicons name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <AsyncState
          loading={loading || searching}
          error={error}
          empty={!loading && !error && visibleMessages.length === 0}
          emptyTitle={searchTerm ? "No matching messages" : "No messages yet"}
          emptyBody={searchTerm ? "Try another search term." : "Send the first message to start the conversation."}
        />
        {!loading && !error && visibleMessages.length > 0 ? (
          <FlatList
            ref={listRef}
            data={visibleMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                currentUid={currentUser?.uid ?? ""}
                otherUid={otherUid}
                searchTerm={searchTerm}
                onReact={(message, emoji) => currentUser && setReaction(message.conversationId, message.id, currentUser.uid, emoji)}
                onEdit={setEditingMessage}
                onDeleteForMe={(message) => currentUser && deleteMessageForMe(message.conversationId, message.id, currentUser.uid)}
                onDeleteForEveryone={confirmDeleteForEveryone}
                onOpenMedia={setViewerMessage}
              />
            )}
            contentContainerStyle={styles.messages}
          />
        ) : null}
        <ChatComposer
          disabled={!conversation || !currentUser}
          uploading={uploading}
          editingText={editingMessage ? editingMessage.text ?? "" : null}
          onSendText={sendText}
          onChangeTyping={handleTyping}
          onPickMedia={pickMedia}
          onSendAudio={sendAudio}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </KeyboardAvoidingView>
      <MediaViewer message={viewerMessage} onClose={() => setViewerMessage(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },
  keyboard: {
    flex: 1
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b"
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center"
  },
  headerBody: {
    flex: 1
  },
  title: {
    color: "#e5eefb",
    fontSize: 19,
    fontWeight: "800"
  },
  presenceRow: {
    minHeight: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  status: {
    color: "#94a3b8",
    fontSize: 12
  },
  typingWrap: {
    flexDirection: "row",
    alignItems: "center"
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 14,
    marginVertical: 10,
    paddingHorizontal: 10,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#111827"
  },
  searchInput: {
    flex: 1,
    color: "#e5eefb",
    fontSize: 14
  },
  messages: {
    paddingVertical: 8
  }
});
