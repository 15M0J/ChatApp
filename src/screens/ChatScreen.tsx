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
import { friendlyError } from "../utils/friendlyError";

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
  const [searchVisible, setSearchVisible] = useState(false);
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
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 80);
      },
      (err) => {
        setError(friendlyError(err));
        setLoading(false);
      }
    );
  }, [currentUser, selectedConversationId]);

  useEffect(() => {
    setSearching(Boolean(searchTerm.trim()));
    const handle = setTimeout(() => setSearching(false), 220);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    if (otherTyping) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.typing]);

  function toggleSearch() {
    setSearchVisible((v) => {
      if (v) setSearchTerm("");
      return !v;
    });
  }

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
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
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
      Alert.alert("Couldn't send media", friendlyError(err));
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
      Alert.alert("Couldn't send audio", friendlyError(err));
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
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setSelectedConversationId(null)}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerBody}>
            <Text style={styles.title} numberOfLines={1}>{other?.displayName ?? "Chat"}</Text>
            <View style={styles.statusRow}>
              <View style={[styles.dot, isOnline && styles.dotOnline]} />
              <Text style={styles.statusText}>{isOnline ? "Online" : "Offline"}</Text>
              {otherTyping ? <Text style={styles.statusText}>· typing</Text> : null}
            </View>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={toggleSearch}>
            <Ionicons name={searchVisible ? "close" : "search"} size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {searchVisible ? (
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color="#8696A0" />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search in chat"
              placeholderTextColor="#8696A0"
              style={styles.searchInput}
              autoFocus
            />
            {searchTerm ? (
              <TouchableOpacity onPress={() => setSearchTerm("")}>
                <Ionicons name="close-circle" size={18} color="#8696A0" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

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
            renderItem={({ item, index }) => {
              const prev = index > 0 ? visibleMessages[index - 1] : null;
              const next = index < visibleMessages.length - 1 ? visibleMessages[index + 1] : null;
              const isFirst = !prev || prev.senderId !== item.senderId;
              const isLast = !next || next.senderId !== item.senderId;
              return (
                <MessageBubble
                  message={item}
                  currentUid={currentUser?.uid ?? ""}
                  otherUid={otherUid}
                  searchTerm={searchTerm}
                  isFirst={isFirst}
                  isLast={isLast}
                  onReact={(message, emoji) => currentUser && setReaction(message.conversationId, message.id, currentUser.uid, emoji)}
                  onEdit={setEditingMessage}
                  onDeleteForMe={(message) => currentUser && deleteMessageForMe(message.conversationId, message.id, currentUser.uid)}
                  onDeleteForEveryone={confirmDeleteForEveryone}
                  onOpenMedia={setViewerMessage}
                />
              );
            }}
            ListFooterComponent={
              otherTyping ? (
                <View style={styles.typingRow}>
                  <View style={styles.typingBubble}>
                    <AnimatedDots />
                  </View>
                </View>
              ) : null
            }
            contentContainerStyle={styles.messages}
            style={styles.messageList}
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
    backgroundColor: "#075E54"
  },
  keyboard: {
    flex: 1
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#075E54"
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  },
  headerBody: {
    flex: 1,
    gap: 2
  },
  title: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700"
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#B2DFDB"
  },
  dotOnline: {
    backgroundColor: "#25D366"
  },
  statusText: {
    color: "#B2DFDB",
    fontSize: 12
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 6,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 20,
    backgroundColor: "#FFFFFF"
  },
  searchInput: {
    flex: 1,
    color: "#111B21",
    fontSize: 14
  },
  messageList: {
    backgroundColor: "#E8EDD4"
  },
  messages: {
    paddingTop: 8,
    paddingBottom: 10
  },
  typingRow: {
    paddingHorizontal: 12,
    paddingTop: 6
  },
  typingBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10
  }
});
