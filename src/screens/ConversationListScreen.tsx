import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncState from "../components/AsyncState";
import { listenConversations, logoutUser, markConversationsDelivered } from "../services/firebaseChat";
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
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);

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
        const unopen = items
          .map((c) => c.id)
          .filter((id) => id !== selectedConversationId);
        if (unopen.length > 0) {
          markConversationsDelivered(unopen, currentUser.uid).catch(() => undefined);
        }
      },
      (err) => {
        setError(friendlyError(err));
        setLoading(false);
        setRefreshing(false);
      }
    );
  }, [currentUser, setConversations]);

  function signOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: async () => { await logoutUser(); clearSession(); } }
    ]);
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
        <Ionicons name="chevron-forward" size={18} color="#C4C4C4" />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>ChatApp</Text>
          <Text style={styles.status}>{isOnline ? "Online" : "Offline"}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setScreen("newChat")}>
            <Ionicons name="create-outline" size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={signOut}>
            <Ionicons name="log-out-outline" size={21} color="#FFFFFF" />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} tintColor="#25D366" />}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F0F2F5"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#075E54"
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800"
  },
  status: {
    color: "#B2DFDB",
    marginTop: 2,
    fontSize: 12
  },
  headerButtons: {
    flexDirection: "row",
    gap: 20
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  },
  list: {
    paddingVertical: 0
  },
  separator: {
    height: 1,
    backgroundColor: "#E9EDEF",
    marginLeft: 78
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF"
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#DFE5E7",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: "#075E54",
    fontSize: 20,
    fontWeight: "800"
  },
  itemBody: {
    flex: 1
  },
  name: {
    color: "#111B21",
    fontSize: 16,
    fontWeight: "700"
  },
  preview: {
    color: "#667781",
    marginTop: 3,
    fontSize: 14
  }
});
