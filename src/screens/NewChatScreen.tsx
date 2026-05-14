import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncState from "../components/AsyncState";
import { createConversation, searchUsers } from "../services/firebaseChat";
import { useChatStore } from "../store/chatStore";
import type { UserProfile } from "../types";

export default function NewChatScreen() {
  const currentUser = useChatStore((state) => state.currentUser);
  const setScreen = useChatStore((state) => state.setScreen);
  const setSelectedConversationId = useChatStore((state) => state.setSelectedConversationId);
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
        setError(err instanceof Error ? err.message : "Unable to search users.");
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
      setSelectedConversationId(conversationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create chat.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => setScreen("conversations")}>
          <Ionicons name="arrow-back" size={22} color="#e5eefb" />
        </TouchableOpacity>
        <Text style={styles.title}>New chat</Text>
      </View>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#64748b" />
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Search email or display name"
          placeholderTextColor="#64748b"
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
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => startChat(item)}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.displayName.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.itemBody}>
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.email}>{item.email}</Text>
              </View>
              <Ionicons name="chatbubble-ellipses-outline" size={21} color="#38bdf8" />
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
    backgroundColor: "#020617"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
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
  title: {
    color: "#e5eefb",
    fontSize: 24,
    fontWeight: "800"
  },
  searchWrap: {
    margin: 14,
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12
  },
  searchInput: {
    flex: 1,
    color: "#e5eefb",
    fontSize: 15
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#164e63",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: "#e5eefb",
    fontSize: 18,
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
  email: {
    color: "#94a3b8",
    marginTop: 4
  }
});
