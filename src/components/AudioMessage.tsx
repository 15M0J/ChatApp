import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatMillis } from "../utils/searchTokens";

type Props = {
  uri: string;
  durationMillis?: number;
  mine: boolean;
};

export default function AudioMessage({ uri, durationMillis, mine }: Props) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);
  const [rate, setRate] = useState(1);

  function togglePlay() {
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish) {
      player.seekTo(0);
    }
    player.play();
  }

  function toggleRate() {
    const nextRate = rate === 1 ? 2 : 1;
    setRate(nextRate);
    player.setPlaybackRate(nextRate, "medium");
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity style={[styles.iconButton, mine ? styles.mineButton : styles.theirButton]} onPress={togglePlay}>
        <Ionicons name={status.playing ? "pause" : "play"} size={18} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.wave}>
        <View style={[styles.bar, { height: 14 }]} />
        <View style={[styles.bar, { height: 24 }]} />
        <View style={[styles.bar, { height: 18 }]} />
        <View style={[styles.bar, { height: 30 }]} />
        <View style={[styles.bar, { height: 16 }]} />
      </View>
      <Text style={styles.time}>{formatMillis(durationMillis)}</Text>
      <TouchableOpacity style={styles.rateButton} onPress={toggleRate}>
        <Text style={styles.rateText}>{rate}x</Text>
      </TouchableOpacity>
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
