import { Ionicons } from "@expo/vector-icons";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

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

export default function ChatComposer({ disabled, uploading, editingText, onSendText, onChangeTyping, onPickMedia, onSendAudio, onCancelEdit }: Props) {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  async function toggleRecording() {
    if (isRecording) {
      const durationMillis = Math.round(recorder.currentTime * 1000);
      await recorder.stop();
      setIsRecording(false);
      const uri = recorder.uri;
      if (uri) onSendAudio(uri, durationMillis);
      return;
    }

    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
  }

  return (
    <View style={styles.wrap}>
      {editingText !== null ? (
        <TouchableOpacity style={styles.iconButton} onPress={onCancelEdit}>
          <Ionicons name="close" size={22} color="#e5eefb" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.iconButton} onPress={onPickMedia} disabled={disabled || uploading}>
          {uploading ? <ActivityIndicator color="#38bdf8" /> : <Ionicons name="image" size={22} color="#e5eefb" />}
        </TouchableOpacity>
      )}
      <TextInput
        value={text}
        onChangeText={changeText}
        placeholder={editingText !== null ? "Edit message" : "Message"}
        placeholderTextColor="#64748b"
        style={styles.input}
        multiline
      />
      <TouchableOpacity style={[styles.iconButton, isRecording && styles.recording]} onPress={toggleRecording} disabled={disabled || uploading || editingText !== null}>
        <Ionicons name={isRecording ? "stop" : "mic"} size={22} color="#e5eefb" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.sendButton} onPress={submit} disabled={disabled || uploading}>
        <Ionicons name="send" size={19} color="#082f49" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    backgroundColor: "#0f172a"
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center"
  },
  recording: {
    backgroundColor: "#dc2626"
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: "#111827",
    color: "#e5eefb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#38bdf8",
    alignItems: "center",
    justifyContent: "center"
  }
});
