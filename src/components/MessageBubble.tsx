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

function ReceiptIcon({ status }: { status?: ReceiptStatus }) {
  if (status === "seen") return <Ionicons name="checkmark-done" size={14} color="#53BDEB" />;
  if (status === "delivered") return <Ionicons name="checkmark-done" size={14} color="#8696A0" />;
  return <Ionicons name="checkmark" size={14} color="#8696A0" />;
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
                <Ionicons name="play" size={26} color="#FFFFFF" />
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
          {message.editedAt && !deleted ? <Text style={styles.meta}>edited</Text> : null}
          {message.localState ? <Text style={styles.meta}>{message.localState}</Text> : null}
          <Text style={styles.meta}>{formatTime(message.createdAt)}</Text>
          {mine && !message.localState ? <ReceiptIcon status={otherStatus} /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 10,
    marginBottom: 1
  },
  mineRow: {
    justifyContent: "flex-end"
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 10,
    paddingVertical: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1
  },
  mineBubble: {
    backgroundColor: "#D9FDD3"
  },
  theirBubble: {
    backgroundColor: "#FFFFFF"
  },
  deletedBubble: {
    opacity: 0.6
  },
  sender: {
    color: "#075E54",
    fontSize: 12,
    marginBottom: 3,
    fontWeight: "700"
  },
  messageText: {
    color: "#111B21",
    fontSize: 15,
    lineHeight: 22
  },
  mineText: {
    color: "#111B21"
  },
  highlight: {
    backgroundColor: "#FAE68A",
    color: "#111B21"
  },
  thumbnail: {
    width: 230,
    height: 170,
    borderRadius: 10,
    backgroundColor: "#E9EDEF"
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.22)"
  },
  reactions: {
    flexDirection: "row",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.06)",
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
    gap: 3,
    marginTop: 3
  },
  meta: {
    color: "#8696A0",
    fontSize: 11
  }
});
