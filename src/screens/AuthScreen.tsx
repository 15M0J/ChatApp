import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { loginUser, registerUser } from "../services/firebaseChat";
import { useChatStore } from "../store/chatStore";
import { friendlyError } from "../utils/friendlyError";

export default function AuthScreen() {
  const setCurrentUser = useChatStore((state) => state.setCurrentUser);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const profile =
        mode === "register" ? await registerUser(email, password, displayName || email.split("@")[0]) : await loginUser(email, password);
      setCurrentUser(profile);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>ChatApp</Text>
          <Text style={styles.subtitle}>Realtime messaging</Text>
        </View>
        {mode === "register" ? (
          <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Display name" placeholderTextColor="#8696A0" style={styles.input} />
        ) : null}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#8696A0"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#8696A0"
          secureTextEntry
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.primary} onPress={submit} disabled={loading || !email || !password}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{mode === "login" ? "Sign in" : "Create account"}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => setMode(mode === "login" ? "register" : "login")}>
          <Text style={styles.secondaryText}>{mode === "login" ? "Create a new account" : "I already have an account"}</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F0F2F5"
  },
  wrap: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
    gap: 12
  },
  header: {
    marginBottom: 20
  },
  title: {
    color: "#075E54",
    fontSize: 34,
    fontWeight: "800"
  },
  subtitle: {
    color: "#667781",
    marginTop: 6,
    fontSize: 15
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9EDEF",
    color: "#111B21",
    paddingHorizontal: 14,
    fontSize: 15
  },
  error: {
    color: "#DC2626",
    lineHeight: 20,
    fontSize: 14
  },
  primary: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6
  },
  primaryText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15
  },
  secondary: {
    alignItems: "center",
    padding: 12
  },
  secondaryText: {
    color: "#075E54",
    fontWeight: "700"
  }
});
