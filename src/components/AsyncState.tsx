import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  onRetry?: () => void;
};

export default function AsyncState({ loading, error, empty, emptyTitle, emptyBody, onRetry }: Props) {
  if (loading) {
    return (
      <View style={styles.wrap}>
        <ActivityIndicator color="#25D366" size="large" />
        <Text style={styles.body}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>{error}</Text>
        {onRetry ? (
          <TouchableOpacity style={styles.button} onPress={onRetry}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  if (empty) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>{emptyTitle ?? "Nothing here yet"}</Text>
        {emptyBody ? <Text style={styles.body}>{emptyBody}</Text> : null}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  title: {
    color: "#111B21",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center"
  },
  body: {
    color: "#667781",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 6
  },
  button: {
    marginTop: 16,
    backgroundColor: "#25D366",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700"
  }
});
