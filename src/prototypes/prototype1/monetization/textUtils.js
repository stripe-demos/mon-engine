// Small deterministic text helpers shared by the analyzer and extraction layer.

export function splitSentences(text) {
  if (!text) return [];
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function findSentence(sentences, patterns) {
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (patterns.some((p) => (p instanceof RegExp ? p.test(lower) : lower.includes(p)))) {
      return sentence;
    }
  }
  return null;
}

export function truncate(text, max = 220) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}
