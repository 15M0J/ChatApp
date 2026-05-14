export function normalizeTerm(value: string) {
  return value.trim().toLowerCase();
}

export function buildSearchTokens(...values: string[]) {
  const tokens = new Set<string>();

  values
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9@._+-]+/)
    .filter(Boolean)
    .forEach((word) => {
      for (let index = 1; index <= word.length; index += 1) {
        tokens.add(word.slice(0, index));
      }
    });

  return [...tokens].slice(0, 250);
}

export function formatMillis(ms = 0) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = `${totalSeconds % 60}`.padStart(2, "0");
  return `${minutes}:${seconds}`;
}
