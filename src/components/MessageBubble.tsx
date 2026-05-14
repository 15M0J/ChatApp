import { Ionicons } from "@expo/vector-icons";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View, type AlertButton } from "react-native";
import type { ChatMessage, ReceiptStatus } from "../types";
import AudioMessage from "./AudioMessage";

type Props = {
  message: ChatMessage;
  currentUid: string;
  otherUid?: string;
  searchTerm: string;
  isFirst: boolean;
  isLast: boolean;
  onReact: (message: ChatMessage, emoji: string | null) => void;
  onEdit: (message: ChatMessage) => void;
  onDeleteForMe: (message: ChatMessage) => void;
  onDeleteForEveryone: (message: ChatMessage) => void;
  onOpenMedia: (message: ChatMessage) => void;
};

const REACTIONS = ["👍", "❤️", "😂", "🔥", "🎉"];
const R = 18;
const TAIL = 4;

function formatTime(ms?: number) {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ReceiptIcon({ status, mine }: { status?: ReceiptStatus; mine: boolean }) {
  const seenColor = mine ? "#075985" : "#0ea5e9";
  const defaultColor = mine ? "#93c5d8" : "#64748b";
  if (status === "seen") return <Ionicons name="checkmark-done" size={13} color={seenColor} />;
  if (status === "delivered") return <Ionicons name="checkmark-done" size={13} color={defaultColor} />;
  return <Ionicons name="checkmark" size={13} color={defaultColor} />;
}

function HighlightedText({ text, term, mine }: { text: string; term: string; mine: boolean }) {
  const normalized = term.trim().toLowerCase();
  if (!normalized || !text.toLowerCase().includes(normalized)) {
    return <Text style={[styles.messageText, mine && styles.mineText]}>{text}</Text>;
  }
  const parts = text.split(new RegExp(`(${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return (
    <Text style={[styles.messageText, mine && styles.mineText]}>
      {parts.map((part, index) => (
        <Text key={`${part}_${index}`} style={part.toLowerCase() === normalized ? styles.highlight : undefined}>
          {part}
        </Text>
      ))}
    </Text>
  );
}

export default function MessageBubble(props: Props) {
  const { message, currentUid, otherUid, searchTerm, isFirst, isLast, onReact, onEdit, onDeleteForMe, onDeleteForEveryone, onOpenMedia } = props;
  const mine = message.senderId === currentUid;
  const deleted = message.deletedForEveryone;
  const text = deleted ? "Message deleted" : (message.text ?? "");
  const otherStatus = otherUid ? message.statusByUser?.[otherUid] : undefined;
  const ownReaction = message.reactions?.[currentUid] ?? null;
  const reactionList = Object.values(message.reactions ?? {});

  const bubbleRadius = mine
    ? { borderTopLeftRadius: R, borderTopRightRadius: isFirst ? R : TAIL, borderBottomLeftRadius: R, borderBottomRightRadius: isLast ? TAIL : R }
    : { borderTopLeftRadius: isFirst ? R : TAIL, borderTopRightRadius: R, borderBottomLeftRadius: isLast ? TAIL : R, borderBottomRightRadius: R };

  function openMenu() {
    const buttons: AlertButton[] = REACTIONS.map((emoji) => ({
      text: emoji,
      onPress: () => onReact(message, emoji)
    }));
    if (ownReaction) {
      buttons.push({ text: "Remove reaction", onPress: () => onReact(message, null) });
    }
    if (mine && message.type === "text" && !deleted) {
      buttons.push({ text: "Edit", onPress: () => onEdit(message) });
    }
    buttons.push({ text: "Delete for me", onPress: () => onDeleteForMe(message) });
    if (mine && !deleted) {
      buttons.push({ text: "Delete for everyone", onPress: () => onDeleteForEveryone(message) });
    }
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Message actions", undefined, buttons);
  }

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onLongPress={openMenu}
      style={[styles.row, mine && styles.mineRow, { marginTop: isFirst ? 10 : 2 }]}
    >
      <View style={[styles.bubble, mine ? styles.mineBubble : styles.theirBubble, deleted && styles.deletedBubble, bubbleRadius]}>
        {!mine && isFirst ? <Text style={styles.sender}>{message.senderName}</Text> : null}
        {message.type === "text" || deleted ? <HighlightedText text={text} term={searchTerm} mine={mine} /> : null}
        {message.type === "audio" && message.mediaUrl && !deleted ? (
          <AudioMessage uri={message.mediaUrl} durationMillis={message.durationMillis} mine={mine} />
        ) : null}
        {(message.type === "image" || message.type === "video") && !deleted ? (
          <TouchableOpacity onPress={() => onOpenMedia(message)} activeOpacity={0.9}>
            <Image source={{ uri: message.thumbnailUrl || message.mediaUrl }} style={styles.thumbnail} />
            {message.type === "video" ? (
              <View style={styles.playOverlay}>
                <Ionicons name="play" size={26} color="#e5eefb" />
              </View>
            ) : null}
          </TouchableOpacity>
        ) : null}
        {reactionList.length > 0 ? (
          <View style={styles.reactions}>
            {reactionList.map((emoji, index) => (
              <Text key={`${emoji}_${index}`} style={styles.reactionText}>{emoji}</Text>
            ))}
          </View>
        ) : null}
        <View style={styles.metaRow}>
          {message.editedAt && !deleted ? <Text style={[styles.meta, mine && styles.mineMeta]}>edited</Text> : null}
          {message.localState ? <Text style={[styles.meta, mine && styles.mineMeta]}>{message.localState}</Text> : null}
          <Text style={[styles.meta, mine && styles.mineMeta]}>{formatTime(message.createdAt)}</Text>
          {mine && !message.localState ? <ReceiptIcon status={otherStatus} mine={mine} /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 12,
    marginBottom: 1
  },
  mineRow: {
    justifyContent: "flex-end"
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  mineBubble: {
    backgroundColor: "#38bdf8"
  },
  theirBubble: {
    backgroundColor: "#1e293b"
  },
  deletedBubble: {
    opacity: 0.6
  },
  sender: {
    color: "#38bdf8",
    fontSize: 12,
    marginBottom: 3,
    fontWeight: "700"
  },
  messageText: {
    color: "#e5eefb",
    fontSize: 15,
    lineHeight: 22
  },
  mineText: {
    color: "#082f49"
  },
  highlight: {
    backgroundColor: "#facc15",
    color: "#082f49"
  },
  thumbnail: {
    width: 230,
    height: 170,
    borderRadius: 10,
    backgroundColor: "#0f172a"
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2, 6, 23, 0.28)"
  },
  reactions: {
    flexDirection: "row",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.32)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 5
  },
  reactionText: {
    fontSize: 13
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
    marginTop: 4
  },
  meta: {
    color: "#64748b",
    fontSize: 11
  },
  mineMeta: {
    color: "#075985"
  }
});
