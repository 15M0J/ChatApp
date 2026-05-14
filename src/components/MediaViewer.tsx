import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { Image, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import type { ChatMessage } from "../types";

type Props = {
  message: ChatMessage | null;
  onClose: () => void;
};

export default function MediaViewer({ message, onClose }: Props) {
  const videoSource = message?.type === "video" && message.mediaUrl ? { uri: message.mediaUrl } : null;
  const videoPlayer = useVideoPlayer(videoSource, (player) => {
    player.play();
  });

  return (
    <Modal visible={Boolean(message)} animationType="fade" transparent>
      <View style={styles.wrap}>
        <TouchableOpacity style={styles.close} onPress={onClose}>
          <Ionicons name="close" size={24} color="#e5eefb" />
        </TouchableOpacity>
        {message?.type === "image" && message.mediaUrl ? <Image source={{ uri: message.mediaUrl }} style={styles.media} resizeMode="contain" /> : null}
        {message?.type === "video" && message.mediaUrl ? (
          <VideoView player={videoPlayer} style={styles.media} nativeControls />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.96)",
    alignItems: "center",
    justifyContent: "center"
  },
  close: {
    position: "absolute",
    top: 54,
    right: 20,
    zIndex: 2,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    alignItems: "center",
    justifyContent: "center"
  },
  media: {
    width: "100%",
    height: "80%"
  }
});
