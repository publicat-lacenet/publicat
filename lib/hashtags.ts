/**
 * Parses raw hashtag input into an array of clean, individual hashtag names.
 *
 * Handles multiple input formats users may use:
 * - "calgravat, egipte, tutankamon"  (comma-separated, correct)
 * - "calgravat #egipte #tutankamon"  (# as separator)
 * - "#calgravat #egipte"             (# prefix)
 * - "@calgravat #festuc"             (@ prefix)
 * - "#calgravat, #egipte"            (mixed)
 *
 * Returns lowercase, trimmed, deduplicated hashtag names WITHOUT # prefix.
 */
export function parseHashtagInput(input: string): string[] {
  if (!input || !input.trim()) return [];

  return input
    // Replace # and @ with commas (they act as separators)
    .replace(/[#@]/g, ',')
    // Split by commas
    .split(',')
    // Trim and lowercase each part
    .map(h => h.trim().toLowerCase())
    // Remove empty strings
    .filter(h => h.length > 0)
    // Deduplicate
    .filter((h, i, arr) => arr.indexOf(h) === i);
}

/**
 * Formats an array of hashtag names for display as comma-separated string.
 * Used when loading existing hashtags into the input field.
 */
export function formatHashtagsForInput(names: string[]): string {
  return names.map(n => n.replace(/^#/, '')).join(', ');
}
