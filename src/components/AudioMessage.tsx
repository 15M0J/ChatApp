import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatMillis } from "../utils/searchTokens";

type Props = {
  uri: string;
  durationMillis?: number;
  mine: boolean;
};

export default function AudioMessage({ uri, durationMillis, mine }: Props) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  async function togglePlay() {
    if (playing) {
      await soundRef.current?.pauseAsync();
      setPlaying(false);
      return;
    }

    if (!soundRef.current) {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, rate, shouldCorrectPitch: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlaying(false);
          }
        }
      );
      soundRef.current = sound;
    } else {
      await soundRef.current.setRateAsync(rate, true);
      await soundRef.current.replayAsync();
    }
    setPlaying(true);
  }

  async function toggleRate() {
    const nextRate = rate === 1 ? 2 : 1;
    setRate(nextRate);
    await soundRef.current?.setRateAsync(nextRate, true);
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity style={[styles.iconButton, mine ? styles.mineButton : styles.theirButton]} onPress={togglePlay}>
        <Ionicons name={playing ? "pause" : "play"} size={18} color={mine ? "#082f49" : "#e5eefb"} />
      </TouchableOpacity>
      <View style={styles.wave}>
        <View style={[styles.bar, { height: 14 }]} />
        <View style={[styles.bar, { height: 24 }]} />
        <View style={[styles.bar, { height: 18 }]} />
        <View style={[styles.bar, { height: 30 }]} />
        <View style={[styles.bar, { height: 16 }]} />
      </View>
      <Text style={[styles.time, mine && styles.mineText]}>{formatMillis(durationMillis)}</Text>
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
    minWidth: 230
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  mineButton: {
    backgroundColor: "#bae6fd"
  },
  theirButton: {
    backgroundColor: "#334155"
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
    backgroundColor: "#38bdf8"
  },
  time: {
    color: "#94a3b8",
    fontSize: 12
  },
  mineText: {
    color: "#075985"
  },
  rateButton: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#64748b",
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  rateText: {
    color: "#e5eefb",
    fontWeight: "700",
    fontSize: 12
  }
});
