import { Ionicons } from "@expo/vector-icons";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  disabled?: boolean;
  uploading?: boolean;
  editingText?: string | null;
  onSendText: (text: string) => void;
  onChangeTyping: (isTyping: boolean) => void;
  onPickMedia: () => void;
  onSendAudio: (uri: string, durationMillis?: number) => void;
  onCancelEdit: () => void;
};

type PendingAudio = { uri: string; durationMillis: number };

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function ChatComposer({ disabled, uploading, editingText, onSendText, onChangeTyping, onPickMedia, onSendAudio, onCancelEdit }: Props) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [pendingAudio, setPendingAudio] = useState<PendingAudio | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const wrapStyle = [styles.wrap, { paddingBottom: Math.max(insets.bottom, 8) }];

  useEffect(() => {
    if (typeof editingText === "string") {
      setText(editingText);
    }
  }, [editingText]);

  function changeText(value: string) {
    setText(value);
    onChangeTyping(value.trim().length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onChangeTyping(false), 1500);
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendText(trimmed);
    setText("");
    onChangeTyping(false);
  }

  async function startRecording() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Microphone access is needed to send audio messages.");
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      recorder.record();
      setIsRecording(true);
    } catch {
      Alert.alert("Couldn't start recording", "Please try again.");
    }
  }

  async function stopRecording() {
    try {
      const durationMillis = Math.round(recorder.currentTime * 1000);
      await recorder.stop();
      // Reset audio session back to playback mode so other audio plays correctly
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      setIsRecording(false);
      const uri = recorder.uri;
      if (uri) {
        setPendingAudio({ uri, durationMillis });
      } else {
        Alert.alert("Recording failed", "No audio was captured. Please try again.");
      }
    } catch {
      setIsRecording(false);
      Alert.alert("Couldn't stop recording", "Please try again.");
    }
  }

  function confirmAudio() {
    if (!pendingAudio) return;
    onSendAudio(pendingAudio.uri, pendingAudio.durationMillis);
    setPendingAudio(null);
  }

  function discardAudio() {
    setPendingAudio(null);
  }

  const hasText = text.trim().length > 0;

  // Audio confirmation row
  if (pendingAudio) {
    return (
      <View style={wrapStyle}>
        <TouchableOpacity style={styles.iconButton} onPress={discardAudio}>
          <Ionicons name="trash-outline" size={22} color="#EA0038" />
        </TouchableOpacity>
        <View style={styles.audioPreview}>
          <Ionicons name="mic" size={16} color="#667781" />
          <Text style={styles.audioPreviewText}>
            {formatDuration(pendingAudio.durationMillis)} — tap ✓ to send
          </Text>
        </View>
        <TouchableOpacity style={[styles.roundButton, styles.sendButton]} onPress={confirmAudio}>
          <Ionicons name="checkmark" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={wrapStyle}>
      {editingText !== null ? (
        <TouchableOpacity style={styles.iconButton} onPress={onCancelEdit}>
          <Ionicons name="close" size={22} color="#667781" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.iconButton} onPress={onPickMedia} disabled={disabled || uploading || isRecording}>
          {uploading ? <ActivityIndicator color="#25D366" /> : <Ionicons name="attach" size={24} color="#8696A0" />}
        </TouchableOpacity>
      )}

      <TextInput
        value={text}
        onChangeText={changeText}
        placeholder={isRecording ? "Recording…" : editingText !== null ? "Edit message" : "Message"}
        placeholderTextColor={isRecording ? "#EA0038" : "#8696A0"}
        style={[styles.input, isRecording && styles.inputRecording]}
        multiline
        editable={!isRecording}
      />

      {!hasText || isRecording ? (
        <TouchableOpacity
          style={[styles.roundButton, isRecording ? styles.stopButton : styles.micButton]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={disabled || uploading || editingText !== null}
        >
          <Ionicons name={isRecording ? "stop" : "mic"} size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}

      {hasText && !isRecording ? (
        <TouchableOpacity style={[styles.roundButton, styles.sendButton]} onPress={submit} disabled={disabled || uploading}>
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: "#F0F2F5"
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center"
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    color: "#111B21",
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E9EDEF"
  },
  inputRecording: {
    borderColor: "#EA0038",
    color: "#EA0038"
  },
  audioPreview: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E9EDEF"
  },
  audioPreviewText: {
    color: "#667781",
    fontSize: 14
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center"
  },
  micButton: {
    backgroundColor: "#25D366"
  },
  stopButton: {
    backgroundColor: "#EA0038"
  },
  sendButton: {
    backgroundColor: "#25D366"
  }
});
