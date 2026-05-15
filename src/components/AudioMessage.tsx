import { Ionicons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatMillis } from "../utils/searchTokens";

type Props = {
  uri: string;
  durationMillis?: number;
  mine: boolean;
};

export default function AudioMessage({ uri, durationMillis, mine }: Props) {
  const player = useAudioPlayer(uri ? { uri } : null, {
    downloadFirst: true,
    updateInterval: 250
  });
  const status = useAudioPlayerStatus(player);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    setRate(1);
  }, [uri]);

  async function togglePlay() {
    if (!uri || !status.isLoaded) return;
    if (status.playing) {
      player.pause();
      return;
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (status.didJustFinish) {
      await player.seekTo(0);
    }
    player.play();
  }

  function toggleRate() {
    if (!status.isLoaded) return;
    const nextRate = rate === 1 ? 2 : 1;
    setRate(nextRate);
    player.setPlaybackRate(nextRate, "medium");
  }

  const isReady = Boolean(uri) && status.isLoaded;
  const showSpinner = Boolean(uri) && !status.isLoaded;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.iconButton, mine ? styles.mineButton : styles.theirButton]}
        onPress={togglePlay}
        disabled={!isReady}
      >
        {showSpinner ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name={status.playing ? "pause" : "play"} size={18} color="#FFFFFF" />
        )}
      </TouchableOpacity>
      <View style={styles.wave}>
        <View style={[styles.bar, { height: 14 }]} />
        <View style={[styles.bar, { height: 24 }]} />
        <View style={[styles.bar, { height: 18 }]} />
        <View style={[styles.bar, { height: 30 }]} />
        <View style={[styles.bar, { height: 16 }]} />
      </View>
      <Text style={styles.time}>{formatMillis(durationMillis)}</Text>
      {isReady ? (
        <TouchableOpacity style={styles.rateButton} onPress={toggleRate}>
          <Text style={styles.rateText}>{rate}x</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 220
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  mineButton: {
    backgroundColor: "#25D366"
  },
  theirButton: {
    backgroundColor: "#8696A0"
  },
  wave: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flex: 1
  },
  bar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: "#8696A0"
  },
  time: {
    color: "#8696A0",
    fontSize: 12
  },
  rateButton: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#C4C4C4",
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  rateText: {
    color: "#667781",
    fontWeight: "700",
    fontSize: 12
  }
});
