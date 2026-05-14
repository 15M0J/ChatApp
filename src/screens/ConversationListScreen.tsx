import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncState from "../components/AsyncState";
import { listenConversations, logoutUser } from "../services/firebaseChat";
import { useChatStore } from "../store/chatStore";
import { friendlyError } from "../utils/friendlyError";
import type { Conversation } from "../types";

export default function ConversationListScreen() {
  const currentUser = useChatStore((state) => state.currentUser);
  const conversations = useChatStore((state) => state.conversations);
  const setConversations = useChatStore((state) => state.setConversations);
  const setScreen = useChatStore((state) => state.setScreen);
  const setSelectedConversationId = useChatStore((state) => state.setSelectedConversationId);
  const clearSession = useChatStore((state) => state.clearSession);
  const pendingMessages = useChatStore((state) => state.pendingMessages);
  const isOnline = useChatStore((state) => state.isOnline);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!currentUser) return undefined;
    setLoading(true);
    return listenConversations(
      currentUser.uid,
      (items) => {
        setConversations(items);
        setLoading(false);
        setRefreshing(false);
        setError(null);
      },
      (err) => {
        setError(friendlyError(err));
        setLoading(false);
        setRefreshing(false);
      }
    );
  }, [currentUser, setConversations]);

  async function signOut() {
    await logoutUser();
    clearSession();
  }

  function renderItem({ item }: { item: Conversation }) {
    const otherUid = item.members.find((uid) => uid !== currentUser?.uid) ?? "";
    const other = item.memberInfo[otherUid];
    const queuedCount = pendingMessages.filter((message) => message.conversationId === item.id).length;

    return (
      <TouchableOpacity style={styles.item} onPress={() => setSelectedConversationId(item.id)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(other?.displayName ?? "?").slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={styles.itemBody}>
          <Text style={styles.name}>{other?.displayName ?? "Unknown user"}</Text>
          <Text style={styles.preview} numberOfLines={1}>
            {queuedCount ? `${queuedCount} queued message${queuedCount > 1 ? "s" : ""}` : item.lastMessageText ?? "No messages yet"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748b" />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Chats</Text>
          <Text style={styles.status}>{isOnline ? "Online" : "Offline queue active"}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setScreen("newChat")}>
            <Ionicons name="create-outline" size={21} color="#e5eefb" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={signOut}>
            <Ionicons name="log-out-outline" size={21} color="#e5eefb" />
          </TouchableOpacity>
        </View>
      </View>
      <AsyncState
        loading={loading}
        error={error}
        empty={!loading && conversations.length === 0}
        emptyTitle="No conversations yet"
        emptyBody="Start a new chat by searching for another user's email or display name."
      />
      {!loading && !error && conversations.length > 0 ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} tintColor="#38bdf8" />}
          contentContainerStyle={styles.list}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b"
  },
  title: {
    color: "#e5eefb",
    fontSize: 28,
    fontWeight: "800"
  },
  status: {
    color: "#94a3b8",
    marginTop: 3
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center"
  },
  list: {
    paddingVertical: 8
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#164e63",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: "#e5eefb",
    fontSize: 20,
    fontWeight: "800"
  },
  itemBody: {
    flex: 1
  },
  name: {
    color: "#e5eefb",
    fontSize: 16,
    fontWeight: "800"
  },
  preview: {
    color: "#94a3b8",
    marginTop: 4
  }
});
