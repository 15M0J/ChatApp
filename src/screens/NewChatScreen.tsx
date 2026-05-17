import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncState from "../components/AsyncState";
import { createConversation, searchUsers } from "../services/firebaseChat";
import { useChatStore } from "../store/chatStore";
import { friendlyError } from "../utils/friendlyError";
import type { UserProfile } from "../types";

export default function NewChatScreen() {
  const currentUser = useChatStore((state) => state.currentUser);
  const setScreen = useChatStore((state) => state.setScreen);
  const setSelectedConversationId = useChatStore((state) => state.setSelectedConversationId);
  const upsertConversation = useChatStore((state) => state.upsertConversation);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return undefined;
    const handle = setTimeout(async () => {
      if (!term.trim()) {
        setResults([]);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        setResults(await searchUsers(term, currentUser.uid));
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => clearTimeout(handle);
  }, [currentUser, term]);

  async function startChat(profile: UserProfile) {
    if (!currentUser) return;
    setLoading(true);
    try {
      const conversationId = await createConversation(currentUser, profile);
      const now = Date.now();
      upsertConversation({
        id: conversationId,
        members: [currentUser.uid, profile.uid].sort(),
        memberInfo: {
          [currentUser.uid]: {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName
          },
          [profile.uid]: {
            uid: profile.uid,
            email: profile.email,
            displayName: profile.displayName
          }
        },
        typing: {},
        lastMessageText: "New chat",
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
        isDraft: true
      });
      setSelectedConversationId(conversationId);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => setScreen("conversations")}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>New chat</Text>
      </View>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#8696A0" />
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Search email or display name"
          placeholderTextColor="#8696A0"
          autoCapitalize="none"
          style={styles.searchInput}
        />
      </View>
      <AsyncState
        loading={loading}
        error={error}
        empty={!loading && !error && (term.trim() ? results.length === 0 : true)}
        emptyTitle={term.trim() ? "No users found" : "Search for a user"}
        emptyBody={term.trim() ? "Try a different email or display name." : "Create accounts on both devices before starting the demo chat."}
      />
      {!loading && !error && results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.uid}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => startChat(item)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.displayName.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.itemBody}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.email}>{item.email}</Text>
              </View>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#25D366" />
            </TouchableOpacity>
          )}
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
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#075E54"
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700"
  },
  searchWrap: {
    margin: 12,
    height: 46,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9EDEF",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14
  },
  searchInput: {
    flex: 1,
    color: "#111B21",
    fontSize: 15
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
    fontSize: 18,
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
  email: {
    color: "#667781",
    marginTop: 3,
    fontSize: 14
  }
});
