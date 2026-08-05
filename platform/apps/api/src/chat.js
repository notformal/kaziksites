// Chat message hygiene for the public lobby room. Pure + deterministic so it is
// unit-testable and applied identically on every post. Entertainment-only room:
// text only, capped length, light profanity masking, no markup passthrough.
export const CHAT_MAX = 280;

// A deliberately small, high-signal list — masked rather than rejected so a
// message still posts. Word-boundary matched, case-insensitive.
const PROFANITY = /\b(fuck(?:er|ing)?|shit|bitch|asshole|cunt|nigger|faggot|whore|slut)\b/gi;
// Control characters (incl. tabs/newlines) and DEL — normalised to spaces.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x1f\x7f]+/g;

/**
 * Normalise a raw chat body. Returns the cleaned string, or `null` if it is not
 * a usable message (non-string, or empty after trimming). Never throws.
 *   - strips control characters (incl. newlines) -> single spaces
 *   - collapses runs of whitespace
 *   - hard-caps at CHAT_MAX characters
 *   - masks profanity (keeps first letter: "shit" -> "s***")
 */
export function sanitizeChat(raw) {
  if (typeof raw !== "string") return null;
  let s = raw.replace(CONTROL, " ").replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (s.length > CHAT_MAX) s = s.slice(0, CHAT_MAX).trim();
  s = s.replace(PROFANITY, (w) => w[0] + "*".repeat(w.length - 1));
  return s;
}
