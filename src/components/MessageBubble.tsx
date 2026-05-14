import { Ionicons } from "@expo/vector-icons";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View, type AlertButton } from "react-native";
import type { ChatMessage, ReceiptStatus } from "../types";
import AudioMessage from "./AudioMessage";

type Props = {
  message: ChatMessage;
  currentUid: string;
  otherUid?: string;
  searchTerm: string;
  onReact: (message: ChatMessage, emoji: string | null) => void;
  onEdit: (message: ChatMessage) => void;
  onDeleteForMe: (message: ChatMessage) => void;
  onDeleteForEveryone: (message: ChatMessage) => void;
  onOpenMedia: (message: ChatMessage) => void;
};

const reactions = ["👍", "❤️", "😂", "🔥", "🎉"];

function receiptLabel(status?: ReceiptStatus) {
  if (status === "seen") return "Seen";
  if (status === "delivered") return "Delivered";
  return "Sent";
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
  const { message, currentUid, otherUid, searchTerm, onReact, onEdit, onDeleteForMe, onDeleteForEveryone, onOpenMedia } = props;
  const mine = message.senderId === currentUid;
  const deleted = message.deletedForEveryone;
  const text = deleted ? "Message deleted" : message.text ?? "";
  const otherStatus = otherUid ? message.statusByUser?.[otherUid] : undefined;
  const ownReaction = message.reactions?.[currentUid] ?? null;
  const reactionList = Object.values(message.reactions ?? {});

  function openMenu() {
    const buttons: AlertButton[] = reactions.map((emoji) => ({
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
    <TouchableOpacity activeOpacity={0.82} onLongPress={openMenu} style={[styles.row, mine && styles.mineRow]}>
      <View style={[styles.bubble, mine ? styles.mineBubble : styles.theirBubble, deleted && styles.deletedBubble]}>
        {!mine ? <Text style={styles.sender}>{message.senderName}</Text> : null}
        {message.type === "text" || deleted ? <HighlightedText text={text} term={searchTerm} mine={mine} /> : null}
        {message.type === "audio" && message.mediaUrl && !deleted ? <AudioMessage uri={message.mediaUrl} durationMillis={message.durationMillis} mine={mine} /> : null}
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
              <Text key={`${emoji}_${index}`} style={styles.reactionText}>
                {emoji}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={styles.metaRow}>
          {message.editedAt && !deleted ? <Text style={[styles.meta, mine && styles.mineMeta]}>Edited</Text> : null}
          {message.localState ? <Text style={[styles.meta, mine && styles.mineMeta]}>{message.localState}</Text> : null}
          {mine && !message.localState ? <Text style={[styles.meta, styles.mineMeta]}>{receiptLabel(otherStatus)}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginVertical: 5,
    paddingHorizontal: 14
  },
  mineRow: {
    justifyContent: "flex-end"
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: 8,
    padding: 10
  },
  mineBubble: {
    backgroundColor: "#38bdf8"
  },
  theirBubble: {
    backgroundColor: "#1e293b"
  },
  deletedBubble: {
    opacity: 0.72
  },
  sender: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "700"
  },
  messageText: {
    color: "#e5eefb",
    fontSize: 15,
    lineHeight: 21
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
    borderRadius: 7,
    backgroundColor: "#0f172a"
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2, 6, 23, 0.22)"
  },
  reactions: {
    flexDirection: "row",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.38)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 6
  },
  reactionText: {
    fontSize: 13
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 5
  },
  meta: {
    color: "#94a3b8",
    fontSize: 11
  },
  mineMeta: {
    color: "#075985"
  }
});
