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
          <Ionicons name="close" size={22} color="#667781" />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.iconButton} onPress={onPickMedia} disabled={disabled || uploading}>
          {uploading ? <ActivityIndicator color="#25D366" /> : <Ionicons name="attach" size={24} color="#8696A0" />}
        </TouchableOpacity>
      )}
      <TextInput
        value={text}
        onChangeText={changeText}
        placeholder={editingText !== null ? "Edit message" : "Message"}
        placeholderTextColor="#8696A0"
        style={styles.input}
        multiline
      />
      <TouchableOpacity
        style={[styles.micButton, isRecording && styles.micRecording]}
        onPress={isRecording || !text.trim() ? toggleRecording : submit}
        disabled={disabled || uploading || editingText !== null}
      >
        {isRecording ? (
          <Ionicons name="stop" size={20} color="#FFFFFF" />
        ) : text.trim() ? (
          <Ionicons name="send" size={18} color="#FFFFFF" />
        ) : (
          <Ionicons name="mic" size={20} color="#FFFFFF" />
        )}
      </TouchableOpacity>
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
  micButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center"
  },
  micRecording: {
    backgroundColor: "#EA0038"
  }
});
